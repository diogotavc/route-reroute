import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as CarPhysics from "./carPhysics.js";
import { 
    DEBUG_MODEL_LOADING,
    HEADLIGHT_INTENSITY,
    HEADLIGHT_AUTO_MODE,
    HEADLIGHT_TURN_ON_TIME,
    HEADLIGHT_TURN_OFF_TIME,
    TARGET_REWIND_DURATION,
    CAR_MAX_HEALTH,
    CAR_COLLISION_DAMAGE
} from './config.js';

let scene = null;
let camera = null;
let controls = null;

const loadedCarModels = {};
const carHeadlights = {};
let missionIndex = 0;
let levels = [];
let currentMissionDestination = null;
let currentFinishPointMarker = null;

let carSpeed = 0;
let carAcceleration = 0;
let steeringAngle = 0;
let isAccelerating = false;
let isBraking = false;
let isTurningLeft = false;
let isTurningRight = false;

const recordedMovements = {};
let currentRecording = [];
let isRewinding = false;
let rewindSpeedFactor = 1.0;
let elapsedTime = 0;

let carHealth = CAR_MAX_HEALTH;

const CAMERA_DISTANCE = 18;
const CAMERA_HEIGHT = 10;
const LOOK_AT_Y_OFFSET = 3.5;
const CAMERA_FOLLOW_SPEED = 2.0;
let isFirstPersonMode = false;

let headlightsEnabled = HEADLIGHT_AUTO_MODE;
let currentTimeOfDay = 0.5;

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

const modelLoader = new GLTFLoader();

export function initCars(sceneObj, cameraObj, controlsObj) {
    scene = sceneObj;
    camera = cameraObj;
    controls = controlsObj;
}

function updateCarHealth(deltaTime, collisionDetected) {
    if (collisionDetected) {
        carHealth -= CAR_COLLISION_DAMAGE;
        carHealth = Math.max(0, carHealth);
        
        if (carHealth <= 0) {
            setRewinding();
            carHealth = CAR_MAX_HEALTH;
        }
    }
}

function resetCarHealth() {
    carHealth = CAR_MAX_HEALTH;
}

export function getCarHealth() {
    return {
        current: carHealth,
        max: CAR_MAX_HEALTH,
        percentage: (carHealth / CAR_MAX_HEALTH) * 100
    };
}

function createHeadlights(carModel, carIndex) {
    const bbox = new THREE.Box3().setFromObject(carModel);
    const size = bbox.getSize(new THREE.Vector3());
    
    const frontDistance = size.z * 0.5;
    const sideDistance = Math.max(size.x * 0.3, 0.4);
    const heightOffset = Math.max(size.y * 0.25, 0.3);

    const leftHeadlight = new THREE.SpotLight(0xfff8dc, 0, 30, Math.PI / 5, 0.4);
    const rightHeadlight = new THREE.SpotLight(0xfff8dc, 0, 30, Math.PI / 5, 0.4);

    leftHeadlight.position.set(-sideDistance, heightOffset, frontDistance);
    rightHeadlight.position.set(sideDistance, heightOffset, frontDistance);

    const leftTarget = new THREE.Object3D();
    const rightTarget = new THREE.Object3D();
    leftTarget.position.set(-sideDistance * 0.3, -0.5, frontDistance + 15);
    rightTarget.position.set(sideDistance * 0.3, -0.5, frontDistance + 15);

    leftHeadlight.target = leftTarget;
    rightHeadlight.target = rightTarget;

    carModel.add(leftHeadlight);
    carModel.add(rightHeadlight);
    carModel.add(leftTarget);
    carModel.add(rightTarget);

    carHeadlights[carIndex] = {
        left: leftHeadlight,
        right: rightHeadlight
    };
}

export function loadCarModels(processedLevelData) {
    levels = processedLevelData;
    
    const loadPromises = levels.map((mission, index) => {
        if (!mission) return Promise.resolve();

        const [name, , , startingPoint, , initialRotationY = 0] = mission;
        const path = carModels[name]?.[0];
        
        if (!path) {
            console.error(`Model path for "${name}" not found`);
            return Promise.reject(`Missing model path for ${name}`);
        }

        return new Promise((resolve, reject) => {
            modelLoader.load(path, (gltf) => {
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
                model.position.set(...startingPoint);
                model.rotation.y = THREE.MathUtils.degToRad(initialRotationY);

                createHeadlights(model, index);
                
                scene.add(model);
                loadedCarModels[index] = model;
                
                if (DEBUG_MODEL_LOADING) {
                    console.log(`Loaded car ${index + 1}/${levels.length} - ${name}`);
                }
                resolve();
            }, undefined, reject);
        });
    });

    return Promise.all(loadPromises.filter(p => p)).then(() => {
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

    if (!position) return;

    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5
    });
    
    currentFinishPointMarker = new THREE.Mesh(geometry, material);
    currentFinishPointMarker.position.set(position.x, position.y + 5, position.z);
    scene.add(currentFinishPointMarker);
}

function setActiveCar(index) {
    const carCount = Object.keys(loadedCarModels).length;
    if (index < 0 || index >= carCount) return;

    if (currentRecording.length > 0) {
        recordedMovements[missionIndex] = currentRecording;
    }

    currentRecording = [];
    elapsedTime = 0;
    isRewinding = false;
    
    const missionData = levels[index];
    if (!missionData) return;

    const [, character, backstory, startingPoint, finishingPoint, initialRotationY] = missionData;

    if (finishingPoint && Array.isArray(finishingPoint) && finishingPoint.length === 3) {
        currentMissionDestination = new THREE.Vector3(...finishingPoint);
        createFinishPointMarker(currentMissionDestination);
    } else {
        currentMissionDestination = null;
        createFinishPointMarker(null);
    }

    const activeCar = loadedCarModels[index];
    missionIndex = index;
    
    activeCar.position.set(...startingPoint);
    activeCar.rotation.y = THREE.MathUtils.degToRad(initialRotationY || 0);
    activeCar.visible = !isFirstPersonMode;

    currentRecording.push({
        time: 0,
        position: activeCar.position.clone(),
        rotation: activeCar.quaternion.clone(),
        timeOfDay: window.getCurrentTimeOfDay()
    });

    carSpeed = 0;
    carAcceleration = 0;
    steeringAngle = 0;
    isAccelerating = false;
    isBraking = false;
    isTurningLeft = false;
    isTurningRight = false;

    resetCarHealth();
    
    console.log(`${character}: ${backstory}`);
}

export function nextCar() {
    const carCount = Object.keys(loadedCarModels).length;
    if (carCount == missionIndex + 1) {
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

export function toggleCameraMode() {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;
    
    isFirstPersonMode = !isFirstPersonMode;
    activeCar.visible = !isFirstPersonMode;
    
    console.log(`Switched to ${isFirstPersonMode ? 'first' : 'third'}-person camera mode`);
}

export function setRewinding() {
    isRewinding = true;
    
    const totalRecordedTime = currentRecording.length > 0 ? 
        currentRecording[currentRecording.length - 1].time : 0;
    elapsedTime = totalRecordedTime;
    rewindSpeedFactor = totalRecordedTime > 0 ? totalRecordedTime / TARGET_REWIND_DURATION : 1.0;
    
    console.log(`Starting rewind. Duration: ${totalRecordedTime.toFixed(2)}s`);
}

export function updateHeadlights(timeOfDay) {
    currentTimeOfDay = timeOfDay;
    if (!HEADLIGHT_AUTO_MODE) return;

    const shouldBeOn = timeOfDay >= HEADLIGHT_TURN_ON_TIME || timeOfDay <= HEADLIGHT_TURN_OFF_TIME;
    const intensity = shouldBeOn ? HEADLIGHT_INTENSITY : 0;

    for (const carIndex in carHeadlights) {
        const headlights = carHeadlights[carIndex];
        headlights.left.intensity = intensity;
        headlights.right.intensity = intensity;
    }
}

export function toggleHeadlights() {
    headlightsEnabled = !headlightsEnabled;
    const intensity = headlightsEnabled ? HEADLIGHT_INTENSITY : 0;

    for (const carIndex in carHeadlights) {
        const headlights = carHeadlights[carIndex];
        headlights.left.intensity = intensity;
        headlights.right.intensity = intensity;
    }
}

export function setHeadlightsEnabled(enabled) {
    headlightsEnabled = enabled;
    const intensity = enabled ? HEADLIGHT_INTENSITY : 0;
    
    for (const carIndex in carHeadlights) {
        const headlights = carHeadlights[carIndex];
        headlights.left.intensity = intensity;
        headlights.right.intensity = intensity;
    }
}

let tempPosition = new THREE.Vector3();
let tempQuaternion = new THREE.Quaternion();

export function updateCarPhysics(deltaTime, collidableMapTiles = [], mapDefinition = null) {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;

    if (isRewinding) {
        handleRewind(deltaTime, activeCar);
    } else {
        handleNormalPlay(deltaTime, activeCar, collidableMapTiles, mapDefinition);
    }
    
    updateCamera(deltaTime, activeCar);
}

function handleRewind(deltaTime, activeCar) {
    const totalTime = currentRecording.length > 0 ? 
        currentRecording[currentRecording.length - 1].time : 0;
    
    elapsedTime -= deltaTime * rewindSpeedFactor;
    elapsedTime = Math.max(0, elapsedTime);

    if (currentRecording.length > 1) {
        let state1 = currentRecording[0];
        let state2 = currentRecording[currentRecording.length - 1];

        for (let i = 0; i < currentRecording.length - 1; i++) {
            if (currentRecording[i].time <= elapsedTime && 
                currentRecording[i + 1].time >= elapsedTime) {
                state1 = currentRecording[i];
                state2 = currentRecording[i + 1];
                break;
            }
        }

        const timeDiff = state2.time - state1.time;
        const factor = timeDiff > 0 ? (elapsedTime - state1.time) / timeDiff : 0;

        tempPosition.lerpVectors(state1.position, state2.position, factor);
        tempQuaternion.slerpQuaternions(state1.rotation, state2.rotation, factor);

        activeCar.position.copy(tempPosition);
        activeCar.quaternion.copy(tempQuaternion);

        if (state1.timeOfDay !== undefined && state2.timeOfDay !== undefined) {
            const timeOfDay = state1.timeOfDay + (state2.timeOfDay - state1.timeOfDay) * factor;
            window.setTimeOfDay(timeOfDay);
        }
    }

    if (elapsedTime <= 0 && currentRecording.length > 0) {
        console.log("Rewind finished");
        isRewinding = false;
        
        activeCar.position.copy(currentRecording[0].position);
        activeCar.quaternion.copy(currentRecording[0].rotation);
        
        if (currentRecording[0].timeOfDay !== undefined) {
            window.setTimeOfDay(currentRecording[0].timeOfDay);
        }

        carSpeed = 0;
        carAcceleration = 0;
        steeringAngle = 0;
        currentRecording = [currentRecording[0]];
    }
}

function handleNormalPlay(deltaTime, activeCar, collidableMapTiles, mapDefinition) {
    elapsedTime += deltaTime;

    if (currentMissionDestination) {
        const distance = activeCar.position.distanceTo(currentMissionDestination);
        if (distance < 2.0) {
            console.log(`Mission completed! Distance: ${distance.toFixed(2)}`);
            
            if (currentFinishPointMarker) {
                scene.remove(currentFinishPointMarker);
                currentFinishPointMarker.geometry.dispose();
                currentFinishPointMarker.material.dispose();
                currentFinishPointMarker = null;
            }
            currentMissionDestination = null;
            
            nextCar();
            return;
        }
    }

    const physicsState = { speed: carSpeed, acceleration: carAcceleration, steeringAngle };
    const inputState = { isAccelerating, isBraking, isTurningLeft, isTurningRight };

    const otherCars = {};
    for (const key in loadedCarModels) {
        const carIndex = parseInt(key);
        if (carIndex !== missionIndex) {
            otherCars[carIndex] = loadedCarModels[carIndex];
        }
    }

    const updatedState = CarPhysics.updatePhysics(
        activeCar, physicsState, inputState, deltaTime, 
        otherCars, collidableMapTiles, mapDefinition
    );

    carSpeed = updatedState.speed;
    carAcceleration = updatedState.acceleration;
    steeringAngle = updatedState.steeringAngle;

    updateCarHealth(deltaTime, updatedState.collisionDetected);

    currentRecording.push({
        time: elapsedTime,
        position: activeCar.position.clone(),
        rotation: activeCar.quaternion.clone(),
        timeOfDay: window.getCurrentTimeOfDay()
    });

    updateOtherCars();
}

function updateOtherCars() {
    for (const key in loadedCarModels) {
        const carIndex = parseInt(key);
        if (carIndex === missionIndex) continue;

        const car = loadedCarModels[carIndex];
        const recording = recordedMovements[carIndex];

        if (recording && recording.length > 0) {
            car.visible = true;

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
            const factor = timeDiff > 0 ? (elapsedTime - state1.time) / timeDiff : 0;

            tempPosition.lerpVectors(state1.position, state2.position, factor);
            tempQuaternion.slerpQuaternions(state1.rotation, state2.rotation, factor);

            car.position.copy(tempPosition);
            car.quaternion.copy(tempQuaternion);
        } else {
            car.visible = false;
        }
    }
}

function updateCamera(deltaTime, activeCar) {
    if (isFirstPersonMode) {
        const offset = new THREE.Vector3(0, 1.2, 0.3);
        const worldOffset = offset.applyQuaternion(activeCar.quaternion);
        camera.position.copy(activeCar.position).add(worldOffset);

        const forward = new THREE.Vector3(0, 0, 10).applyQuaternion(activeCar.quaternion);
        const lookAt = activeCar.position.clone().add(forward);
        lookAt.y += 1.2;
        
        controls.target.copy(lookAt);
    } else {
        const offset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
        const worldOffset = offset.applyQuaternion(activeCar.quaternion);
        const desiredPos = activeCar.position.clone().add(worldOffset);

        camera.position.lerp(desiredPos, deltaTime * CAMERA_FOLLOW_SPEED);

        const lookAt = activeCar.position.clone();
        lookAt.y += LOOK_AT_Y_OFFSET;
        controls.target.lerp(lookAt, deltaTime * CAMERA_FOLLOW_SPEED);
    }
    
    camera.lookAt(controls.target);
}

export function getActiveCar() { return loadedCarModels[missionIndex]; }
export function getCarHeadlights() { return carHeadlights; }
export function getLoadedCarModels() { return loadedCarModels; }
export function getCurrentTimeOfDay() { return currentTimeOfDay; }
export function getHeadlightsEnabled() { return headlightsEnabled; }
export { isRewinding };

export function getActiveCarOBB() {
    const activeCar = getActiveCar();
    return activeCar?.userData.halfExtents ? 
        CarPhysics.getOBBData(activeCar, activeCar.userData.halfExtents) : null;
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
