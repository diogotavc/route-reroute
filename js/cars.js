import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as CarPhysics from "./carPhysics.js";
import { 
    DEBUG_CAR_COORDS, 
    DEBUG_MODEL_LOADING, 
    DEBUG_MAP_LEVEL_LOGIC,
    DEBUG_REWIND,
    DEBUG_GENERAL
} from './config.js';

let debug_coordinateLogInterval = 1.0;
let debug_timeSinceLastCoordinateLog = 0;


let scene = null;
let camera = null;
let controls = null;

export function initCars(sceneObj, cameraObj, controlsObj) {
    scene = sceneObj;
    camera = cameraObj;
    controls = controlsObj;
}

const modelLoader = new GLTFLoader();

const carModels = {
    ambulance: ["assets/kenney_car-kit/Models/ambulance.glb"],
    firetruck: ["assets/kenney_car-kit/Models/firetruck.glb"],
    police: ["assets/kenney_car-kit/Models/police.glb"],
    sedan: ["assets/kenney_car-kit/Models/sedan.glb"],
    "suv-luxury": ["assets/kenney_car-kit/Models/suv-luxury.glb"],
    "tractor-police": [
        "assets/kenney_car-kit/Models/tractor-police.glb",
    ],
    "truck-flat": ["assets/kenney_car-kit/Models/truck-flat.glb"],
    delivery: ["assets/kenney_car-kit/Models/delivery.glb"],
    "garbage-truck": [
        "assets/kenney_car-kit/Models/garbage-truck.glb",
    ],
    race: ["assets/kenney_car-kit/Models/race.glb"],
    "sedan-sports": [
        "assets/kenney_car-kit/Models/sedan-sports.glb",
    ],
    taxi: ["assets/kenney_car-kit/Models/taxi.glb"],
    "tractor-shovel": [
        "assets/kenney_car-kit/Models/tractor-shovel.glb",
    ],
    van: ["assets/kenney_car-kit/Models/van.glb"],
    "delivery-flat": [
        "assets/kenney_car-kit/Models/delivery-flat.glb",
    ],
    "hatchback-sports": [
        "assets/kenney_car-kit/Models/hatchback-sports.glb",
    ],
    "race-future": [
        "assets/kenney_car-kit/Models/race-future.glb",
    ],
    suv: ["assets/kenney_car-kit/Models/suv.glb"],
    tractor: ["assets/kenney_car-kit/Models/tractor.glb"],
    truck: ["assets/kenney_car-kit/Models/truck.glb"],
};

const loadedCarModels = {};
let missionIndex = 0;
let levels;
let currentFinishPointMarker = null;
let currentMissionDestination = null;

const recordedMovements = {};
let currentRecording = [];

let carSpeed = 0;
let carAcceleration = 0;
let steeringAngle = 0;
let isAccelerating = false;
let isBraking = false;
let isTurningLeft = false;
let isTurningRight = false;

let isRewinding = false;
const REWIND_SPEED_FACTOR = 3.0;
let elapsedTime = 0;

const CAMERA_FOLLOW_SPEED = 2.0;
const CAMERA_DISTANCE = 18;
const CAMERA_HEIGHT = 10;
const LOOK_AT_Y_OFFSET = 3.5;

export function loadCarModels(processedLevelData) {
    levels = processedLevelData;
    const loadModelPromises = levels.map((mission, index) => {
        if (!mission) return Promise.resolve();

        const name = mission[0];
        const path = carModels[name]?.[0];
        if (!path) {
            if (DEBUG_MODEL_LOADING) console.error(`Model path for "${name}" not found in carModels config.`);
            return Promise.reject(`Missing model path for ${name}`);
        }
        const startingPoint = mission[3];
        const initialRotationY = mission[5] !== undefined ? mission[5] : 0;

        return new Promise((resolve, reject) => {
            modelLoader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });

                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    model.userData.halfExtents = size.multiplyScalar(0.5);

                    model.visible = false;
                    model.scale.set(1, 1, 1);
                    model.position.set(
                        startingPoint[0],
                        startingPoint[1],
                        startingPoint[2],
                    );
                    model.rotation.y = THREE.MathUtils.degToRad(initialRotationY);


                    scene.add(model);
                    loadedCarModels[index] = model;

                    if (DEBUG_MODEL_LOADING) console.debug(
                        `Loaded car model ${index + 1}/${levels.length} - ${name} at [${startingPoint.join(',')}] rotY: ${initialRotationY}`,
                    );
                    resolve();
                },
                undefined,
                (error) => {
                    if (DEBUG_MODEL_LOADING) console.error(`Error loading car model ${name} (index ${index}):`, error);
                    reject(error);
                },
            );
        });
    });

    return Promise.all(loadModelPromises.filter(p => p)).then(() => {
        if (Object.keys(loadedCarModels).length > 0) {
            setActiveCar(0);
        }
    });
}

function createFinishPointMarker(position) {
    if (currentFinishPointMarker) {
        scene.remove(currentFinishPointMarker);
        currentFinishPointMarker.geometry.dispose();
        currentFinishPointMarker.material.dispose();
        currentFinishPointMarker = null;
    }

    if (!position) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("createFinishPointMarker: No position provided, marker not created.");
        return;
    }

    const markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    currentFinishPointMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    currentFinishPointMarker.position.set(position.x, position.y + 5, position.z); 
    scene.add(currentFinishPointMarker);
    if (DEBUG_MAP_LEVEL_LOGIC) console.log("createFinishPointMarker - Marker added to scene at:", currentFinishPointMarker.position, "Visible:", currentFinishPointMarker.visible);
}

function setActiveCar(index) {
    var carCount = Object.keys(loadedCarModels).length;
    if (index < 0 || index >= carCount) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.error("Invalid car index:", index);
        return;
    }

    if (currentRecording.length > 0) {
        recordedMovements[missionIndex] = currentRecording;
        if (DEBUG_REWIND) console.log(`Stored recording for car index ${missionIndex} with ${currentRecording.length} states.`);
    }

    currentRecording = [];
    elapsedTime = 0;
    isRewinding = false;

    if (loadedCarModels[missionIndex] && missionIndex !== index) {
    }

    const missionData = levels[index];
    if (!missionData) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.error(`setActiveCar: No mission data found for index ${index}.`);
        currentMissionDestination = null;
        createFinishPointMarker(null);
        return null;
    }
    if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - Full Mission Data for index", index, ":", missionData);

    var [modelName, character, backstory, startingPoint, finishingPoint, initialRotationY] = missionData;
    if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - Raw finishingPoint from missionData:", finishingPoint);

    var characterName =
        String(character).charAt(0).toUpperCase() + String(character).slice(1);
    if (DEBUG_GENERAL) console.log(`${characterName}: ${backstory}`);
    if (DEBUG_MAP_LEVEL_LOGIC) console.log(
        `Drive ${modelName} from ${startingPoint.join(',')} to ${finishingPoint && Array.isArray(finishingPoint) ? finishingPoint.join(',') : 'an open area'}.`
    );

    if (finishingPoint && Array.isArray(finishingPoint) && finishingPoint.length === 3) {
        currentMissionDestination = new THREE.Vector3(finishingPoint[0], finishingPoint[1], finishingPoint[2]);
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - currentMissionDestination successfully set to:", currentMissionDestination);
        createFinishPointMarker(currentMissionDestination);
    } else {
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - No valid finishingPoint data. No destination marker will be created. finishingPoint was:", finishingPoint);
        currentMissionDestination = null;
        createFinishPointMarker(null);
    }

    const activeCar = loadedCarModels[index];
    activeCar.visible = true;
    const previousMissionIndex = missionIndex;
    missionIndex = index;

    if (previousMissionIndex !== index && loadedCarModels[previousMissionIndex]) {
        loadedCarModels[previousMissionIndex].visible = true;
    }

    activeCar.position.set(startingPoint[0], startingPoint[1], startingPoint[2]);
    activeCar.rotation.y = THREE.MathUtils.degToRad(initialRotationY || 0);

    const initialPosition = activeCar.position.clone();
    const initialRotation = activeCar.quaternion.clone();
    currentRecording.push({
        time: 0,
        position: initialPosition,
        rotation: initialRotation,
    });

    const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion);
    const desiredCameraPosition = activeCar.position.clone().add(worldOffset);

    camera.position.copy(desiredCameraPosition);

    const initialLookAtPoint = activeCar.position.clone();
    initialLookAtPoint.y += LOOK_AT_Y_OFFSET;
    controls.target.copy(initialLookAtPoint);
    camera.lookAt(controls.target);

    carSpeed = 0;
    carAcceleration = 0;
    steeringAngle = 0;
    isAccelerating = false;
    isBraking = false;
    isTurningLeft = false;
    isTurningRight = false;

    return activeCar;
}

export function nextCar() {
    var carCount = Object.keys(loadedCarModels).length;
    if (carCount == missionIndex + 1) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("All missions for this level completed!");
        if (currentFinishPointMarker) {
            scene.remove(currentFinishPointMarker);
            currentFinishPointMarker.geometry.dispose();
            currentFinishPointMarker.material.dispose();
            currentFinishPointMarker = null;
        }
        currentMissionDestination = null;
        return -1;
    }
    const nextIndex = (missionIndex + 1) % carCount;
    setActiveCar(nextIndex);
    return loadedCarModels[nextIndex];
}

export function setAccelerating(value) {
    isAccelerating = value;
    if (value) isBraking = false;
}

export function setBraking(value) {
    isBraking = value;
    if (value) isAccelerating = false;
}

export function setTurningLeft(value) {
    isTurningLeft = value;
}

export function setTurningRight(value) {
    isTurningRight = value;
}

export function setRewinding() {
    if (!isRewinding) {
        if (DEBUG_REWIND) console.log("Starting rewind...");
        isRewinding = true;
        isAccelerating = false;
        isBraking = false;
        isTurningLeft = false;
        isTurningRight = false;
    } else {
        if (DEBUG_REWIND) console.log("Rewind already in progress.");
    }
}

let tempReplayPosition = new THREE.Vector3();
let tempReplayQuaternion = new THREE.Quaternion();

export function updateCarPhysics(deltaTime, collidableMapTiles = []) {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;

    debug_timeSinceLastCoordinateLog += deltaTime;
    if (debug_timeSinceLastCoordinateLog >= debug_coordinateLogInterval) {
        const pos = activeCar.position;
        if (DEBUG_CAR_COORDS) console.log(
            `Active Car Coords: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(
                2
            )}, Z=${pos.z.toFixed(2)}`
        );
        if (currentMissionDestination) {
            const distanceToDestination = pos.distanceTo(currentMissionDestination);
            if (DEBUG_CAR_COORDS) console.log(`  Mission Dest: ${currentMissionDestination.x.toFixed(2)},${currentMissionDestination.y.toFixed(2)},${currentMissionDestination.z.toFixed(2)}. Dist: ${distanceToDestination.toFixed(2)}`);
        }
        debug_timeSinceLastCoordinateLog -= debug_coordinateLogInterval;
    }

    if (isRewinding) {
        elapsedTime -= deltaTime * REWIND_SPEED_FACTOR;
        elapsedTime = Math.max(0, elapsedTime);

        if (currentRecording.length > 1) {
            let state1 = currentRecording[0];
            let state2 = currentRecording[currentRecording.length - 1];
            for (let i = 0; i < currentRecording.length - 1; i++) {
                if (currentRecording[i].time <= elapsedTime && currentRecording[i + 1].time >= elapsedTime) {
                    state1 = currentRecording[i];
                    state2 = currentRecording[i + 1];
                    break;
                }
            }

            const timeDiff = state2.time - state1.time;
            let interpFactor = (timeDiff > 0) ? (elapsedTime - state1.time) / timeDiff : (elapsedTime >= state2.time ? 1 : 0);
            interpFactor = Math.max(0, Math.min(1, interpFactor));

            tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
            tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

            activeCar.position.copy(tempReplayPosition);
            activeCar.quaternion.copy(tempReplayQuaternion);

        } else if (currentRecording.length === 1) {
            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);
        }

        if (elapsedTime <= 0 && currentRecording.length > 0) {
            console.log("Rewind finished.");
            isRewinding = false;

            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);

            carSpeed = 0;
            carAcceleration = 0;
            steeringAngle = 0;

            currentRecording = [currentRecording[0]];
            console.log(`Recording reset to initial state at time 0.`);
        }

    } else {
        elapsedTime += deltaTime;

        if (currentMissionDestination) {
            const distanceToDestination = activeCar.position.distanceTo(currentMissionDestination);
            const completionThreshold = 2.0;

            if (distanceToDestination < completionThreshold) {
                console.log(`Mission ${missionIndex + 1} (index ${missionIndex}) completed! Reached destination. Distance: ${distanceToDestination.toFixed(2)}`);
                if (currentFinishPointMarker) {
                    scene.remove(currentFinishPointMarker);
                    currentFinishPointMarker.geometry.dispose();
                    currentFinishPointMarker.material.dispose();
                    currentFinishPointMarker = null;
                }
                currentMissionDestination = null;

                const nextCarResult = nextCar();
                if (nextCarResult === -1) {
                    console.log("All missions finished for the current level.");
                }
                return;
            }
        }

        const currentPhysicsState = { speed: carSpeed, acceleration: carAcceleration, steeringAngle: steeringAngle };
        const currentInputState = { isAccelerating, isBraking, isTurningLeft, isTurningRight };

        const otherCars = {};
        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex !== missionIndex) {
                otherCars[carIndex] = loadedCarModels[carIndex];
            }
        }

        const updatedPhysicsState = CarPhysics.updatePhysics(
            activeCar,
            currentPhysicsState,
            currentInputState,
            deltaTime,
            otherCars,
            collidableMapTiles
        );

        carSpeed = updatedPhysicsState.speed;
        carAcceleration = updatedPhysicsState.acceleration;
        steeringAngle = updatedPhysicsState.steeringAngle;

        currentRecording.push({
            time: elapsedTime,
            position: activeCar.position.clone(),
            rotation: activeCar.quaternion.clone(),
        });

        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex === missionIndex) continue;

            const carToReplay = loadedCarModels[carIndex];
            const recording = recordedMovements[carIndex];

            if (recording && recording.length > 0) {
                carToReplay.visible = true;

                let state1 = recording[0];
                let state2 = recording[recording.length - 1];
                for (let i = 0; i < recording.length - 1; i++) {
                    if (recording[i].time <= elapsedTime && recording[i + 1].time >= elapsedTime) {
                        state1 = recording[i];
                        state2 = recording[i + 1];
                        break;
                    }
                }

                const timeDiff = state2.time - state1.time;
                let interpFactor = (timeDiff > 0) ? (elapsedTime - state1.time) / timeDiff : (elapsedTime >= state2.time ? 1 : 0);
                interpFactor = Math.max(0, Math.min(1, interpFactor));

                tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
                tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

                carToReplay.position.copy(tempReplayPosition);
                carToReplay.quaternion.copy(tempReplayQuaternion);

                carToReplay.updateMatrixWorld(true);
            } else {
                carToReplay.visible = false;
            }
        }
    }

    const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion);
    const desiredCameraPosition = activeCar.position.clone().add(worldOffset);

    camera.position.lerp(desiredCameraPosition, deltaTime * CAMERA_FOLLOW_SPEED);

    const desiredLookAtPoint = activeCar.position.clone();
    desiredLookAtPoint.y += LOOK_AT_Y_OFFSET;
    controls.target.lerp(desiredLookAtPoint, deltaTime * CAMERA_FOLLOW_SPEED);
    camera.lookAt(controls.target);
}

export function getActiveCar() {
    return loadedCarModels[missionIndex];
}

export function getActiveCarOBB() {
    const activeCar = getActiveCar();
    if (!activeCar || !activeCar.userData.halfExtents) return null;

    return CarPhysics.getOBBData(activeCar, activeCar.userData.halfExtents);
}

export function getOtherCarOBBs() {
    const obbs = [];
    for (const key in loadedCarModels) {
        const carIndex = parseInt(key);
        if (carIndex === missionIndex) continue;

        const car = loadedCarModels[carIndex];
        if (car.visible && car.userData.halfExtents) {
            obbs.push(CarPhysics.getOBBData(car, car.userData.halfExtents));
        }
    }
    return obbs;
}
