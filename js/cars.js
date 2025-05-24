import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as CarPhysics from "./carPhysics.js";

// DEBUG
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

// CAR MODELS CONFIGURATION
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
let currentFinishPointMarker = null; // To store the visual marker for the finish point
let currentMissionDestination = null; // To store the Vector3 of the current destination

// Recording and Replay State
const recordedMovements = {}; // { missionIndex: [ { time, position, rotation } ] }
let currentRecording = [];

// Physics State (tied to the active car)
let carSpeed = 0;
let carAcceleration = 0;
let steeringAngle = 0;
let isAccelerating = false;
let isBraking = false;
let isTurningLeft = false;
let isTurningRight = false;

// Rewind State
let isRewinding = false;
const REWIND_SPEED_FACTOR = 3.0;
let elapsedTime = 0; // Current simulation time for the active car

const CAMERA_FOLLOW_SPEED = 2.0;
const CAMERA_DISTANCE = 18;
const CAMERA_HEIGHT = 10;

export function loadCarModels(processedLevelData) { // Renamed parameter for clarity
    levels = processedLevelData; // Store the processed data
    const loadModelPromises = levels.map((mission, index) => {
        if (!mission) return Promise.resolve(); // Skip if mission is null (e.g. due to processing error)

        const name = mission[0];
        const path = carModels[name]?.[0]; // Use optional chaining for safety
        if (!path) {
            console.error(`Model path for "${name}" not found in carModels config.`);
            return Promise.reject(`Missing model path for ${name}`);
        }
        const startingPoint = mission[3]; // This is now world coordinates
        const initialRotationY = mission[5] !== undefined ? mission[5] : 0; // Get initial rotation

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
                    model.scale.set(1, 1, 1); // Ensure consistent scale
                    model.position.set(
                        startingPoint[0],
                        startingPoint[1],
                        startingPoint[2],
                    );
                    // Apply initial rotation
                    model.rotation.y = THREE.MathUtils.degToRad(initialRotationY);


                    scene.add(model);
                    loadedCarModels[index] = model;

                    console.debug(
                        `Loaded car model ${index + 1}/${levels.length} - ${name} at [${startingPoint.join(',')}] rotY: ${initialRotationY}`,
                    );
                    resolve();
                },
                undefined,
                (error) => {
                    console.error(`Error loading car model ${name} (index ${index}):`, error);
                    reject(error);
                },
            );
        });
    });

    return Promise.all(loadModelPromises.filter(p => p)).then(() => { // Filter out any undefined promises
        if (Object.keys(loadedCarModels).length > 0) {
            setActiveCar(0); // missionIndex is already 0 here
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
        console.log("createFinishPointMarker: No position provided, marker not created.");
        return;
    }

    const markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 16); // Radius top, radius bottom, height, radial segments
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Bright green
        transparent: true,
        opacity: 0.5,
        depthWrite: false // So it doesn't obscure things behind it as much
    });
    currentFinishPointMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    currentFinishPointMarker.position.set(position.x, position.y + 5, position.z); // Elevate slightly so it's visible
    scene.add(currentFinishPointMarker);
    console.log("createFinishPointMarker - Marker added to scene at:", currentFinishPointMarker.position, "Visible:", currentFinishPointMarker.visible);
}

function setActiveCar(index) {
    var carCount = Object.keys(loadedCarModels).length;
    if (index < 0 || index >= carCount) {
        console.error("Invalid car index:", index);
        return;
    }

    // Store the recording of the previous car
    if (currentRecording.length > 0) {
        recordedMovements[missionIndex] = currentRecording;
        console.log(`Stored recording for car index ${missionIndex} with ${currentRecording.length} states.`);
    }

    // Reset state for the new car
    currentRecording = [];
    elapsedTime = 0;
    isRewinding = false;
    // currentMissionDestination = null; // Reset current destination - will be set below

    if (loadedCarModels[missionIndex] && missionIndex !== index) {
         //loadedCarModels[missionIndex].userData.isActiveCar = false; // Example flag
    }

    const missionData = levels[index]; // 'levels' is the processed data from loadCarModels
    if (!missionData) {
        console.error(`setActiveCar: No mission data found for index ${index}.`);
        currentMissionDestination = null; // Ensure it's null if no mission data
        createFinishPointMarker(null); // Attempt to remove any existing marker
        return null; // or handle error appropriately
    }
    console.log("setActiveCar - Full Mission Data for index", index, ":", missionData);


    var [modelName, character, backstory, startingPoint, finishingPoint, initialRotationY] = missionData;
    console.log("setActiveCar - Raw finishingPoint from missionData:", finishingPoint);

    var characterName =
        String(character).charAt(0).toUpperCase() + String(character).slice(1);
    console.log(`${characterName}: ${backstory}`);
    console.log(
        `Drive ${modelName} from ${startingPoint.join(',')} to ${finishingPoint && Array.isArray(finishingPoint) ? finishingPoint.join(',') : 'an open area'}.`
    );

    if (finishingPoint && Array.isArray(finishingPoint) && finishingPoint.length === 3) {
        currentMissionDestination = new THREE.Vector3(finishingPoint[0], finishingPoint[1], finishingPoint[2]);
        console.log("setActiveCar - currentMissionDestination successfully set to:", currentMissionDestination);
        createFinishPointMarker(currentMissionDestination);
    } else {
        console.log("setActiveCar - No valid finishingPoint data. No destination marker will be created. finishingPoint was:", finishingPoint);
        currentMissionDestination = null;
        createFinishPointMarker(null); // This will call scene.remove if marker exists and then not create a new one
    }

    const activeCar = loadedCarModels[index];
    activeCar.visible = true;
    const previousMissionIndex = missionIndex;
    missionIndex = index;

    // Ensure previously active car is visible for replay
    if (previousMissionIndex !== index && loadedCarModels[previousMissionIndex]) {
        loadedCarModels[previousMissionIndex].visible = true;
    }

    activeCar.position.set(startingPoint[0], startingPoint[1], startingPoint[2]);
    activeCar.rotation.y = THREE.MathUtils.degToRad(initialRotationY || 0);         // 0 as fallback

    // Add initial state to the recording
    const initialPosition = activeCar.position.clone();
    const initialRotation = activeCar.quaternion.clone();
    currentRecording.push({
        time: 0,
        position: initialPosition,
        rotation: initialRotation,
    });

    // Instantly position camera behind the new car
    const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion);
    const desiredCameraPosition = activeCar.position.clone().add(worldOffset);

    camera.position.copy(desiredCameraPosition);
    controls.target.copy(activeCar.position);
    camera.lookAt(controls.target);

    // Reset physics state
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
        console.log("All missions for this level completed!");
        if (currentFinishPointMarker) {
            scene.remove(currentFinishPointMarker);
            currentFinishPointMarker.geometry.dispose();
            currentFinishPointMarker.material.dispose();
            currentFinishPointMarker = null;
        }
        currentMissionDestination = null;
        // Potentially trigger level completion logic here in the future
        return -1; // Indicate last car reached
    }
    const nextIndex = (missionIndex + 1) % carCount;
    setActiveCar(nextIndex); // Directly call setActiveCar
    return loadedCarModels[nextIndex]; // Return the new active car
}

// --- Input State Setters ---

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

// --- Rewind Control ---
export function setRewinding() {
    if (!isRewinding) {
        console.log("Starting rewind...");
        isRewinding = true;
        // Reset input flags immediately
        isAccelerating = false;
        isBraking = false;
        isTurningLeft = false;
        isTurningRight = false;
    } else {
        console.log("Rewind already in progress.");
    }
}

// --- Physics Update ---

let tempReplayPosition = new THREE.Vector3();
let tempReplayQuaternion = new THREE.Quaternion();

export function updateCarPhysics(deltaTime, collidableMapTiles = []) { // Added collidableMapTiles parameter
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;

    debug_timeSinceLastCoordinateLog += deltaTime;
    if (debug_timeSinceLastCoordinateLog >= debug_coordinateLogInterval) {
        const pos = activeCar.position;
        console.log(
            `Active Car Coords: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(
                2
            )}, Z=${pos.z.toFixed(2)}`
        );
        if (currentMissionDestination) {
            const distanceToDestination = pos.distanceTo(currentMissionDestination);
            console.log(`  Mission Dest: ${currentMissionDestination.x.toFixed(2)},${currentMissionDestination.y.toFixed(2)},${currentMissionDestination.z.toFixed(2)}. Dist: ${distanceToDestination.toFixed(2)}`);
        }
        debug_timeSinceLastCoordinateLog -= debug_coordinateLogInterval; // Reset timer
    }

    if (isRewinding) {
        // --- Handle Rewind ---
        elapsedTime -= deltaTime * REWIND_SPEED_FACTOR;
        elapsedTime = Math.max(0, elapsedTime);

        if (currentRecording.length > 1) {
            // Find surrounding states for interpolation
            let state1 = currentRecording[0];
            let state2 = currentRecording[currentRecording.length - 1];
            for (let i = 0; i < currentRecording.length - 1; i++) {
                if (currentRecording[i].time <= elapsedTime && currentRecording[i + 1].time >= elapsedTime) {
                    state1 = currentRecording[i];
                    state2 = currentRecording[i + 1];
                    break;
                }
            }

            // Interpolate between states
            const timeDiff = state2.time - state1.time;
            let interpFactor = (timeDiff > 0) ? (elapsedTime - state1.time) / timeDiff : (elapsedTime >= state2.time ? 1 : 0);
            interpFactor = Math.max(0, Math.min(1, interpFactor));

            tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
            tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

            activeCar.position.copy(tempReplayPosition);
            activeCar.quaternion.copy(tempReplayQuaternion);

        } else if (currentRecording.length === 1) {
            // Snap to initial state
            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);
        }

        // Stop rewinding at the beginning
        if (elapsedTime <= 0 && currentRecording.length > 0) {
            console.log("Rewind finished.");
            isRewinding = false;

            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);

            // Reset physics state
            carSpeed = 0;
            carAcceleration = 0;
            steeringAngle = 0;

            // Truncate recording to only the initial state
            currentRecording = [currentRecording[0]];
            console.log(`Recording reset to initial state at time 0.`);
        }
        // Skip physics, recording, and replay during rewind

    } else {
        // --- Handle Normal Update and Recording ---
        elapsedTime += deltaTime;

        // Mission Completion Check
        if (currentMissionDestination) { // !isRewinding is implied by being in the else block
            const distanceToDestination = activeCar.position.distanceTo(currentMissionDestination);
            const completionThreshold = 2.0; // How close the car needs to be to finish (in world units)

            if (distanceToDestination < completionThreshold) {
                console.log(`Mission ${missionIndex + 1} (index ${missionIndex}) completed! Reached destination. Distance: ${distanceToDestination.toFixed(2)}`);
                if (currentFinishPointMarker) {
                    scene.remove(currentFinishPointMarker);
                    currentFinishPointMarker.geometry.dispose();
                    currentFinishPointMarker.material.dispose();
                    currentFinishPointMarker = null;
                }
                currentMissionDestination = null; // Clear destination to prevent re-triggering

                const nextCarResult = nextCar();
                if (nextCarResult === -1) {
                    console.log("All missions finished for the current level.");
                    // Potentially disable controls or show a level complete message
                }
                return; // Skip the rest of the physics update for this frame as we are switching cars/ending
            }
        }

        const currentPhysicsState = { speed: carSpeed, acceleration: carAcceleration, steeringAngle: steeringAngle };
        const currentInputState = { isAccelerating, isBraking, isTurningLeft, isTurningRight };

        // Prepare list of other cars for collision detection
        const otherCars = {};
        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex !== missionIndex) {
                otherCars[carIndex] = loadedCarModels[carIndex];
            }
        }

        // Call external physics update
        const updatedPhysicsState = CarPhysics.updatePhysics(
            activeCar,
            currentPhysicsState,
            currentInputState,
            deltaTime,
            otherCars,
            collidableMapTiles // Pass collidable map tiles here
        );

        // Update local physics state from result
        carSpeed = updatedPhysicsState.speed;
        carAcceleration = updatedPhysicsState.acceleration;
        steeringAngle = updatedPhysicsState.steeringAngle;

        // Record Active Car State
        currentRecording.push({
            time: elapsedTime,
            position: activeCar.position.clone(),
            rotation: activeCar.quaternion.clone(),
        });

        // --- Replay Inactive Cars ---
        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex === missionIndex) continue;

            const carToReplay = loadedCarModels[carIndex];
            const recording = recordedMovements[carIndex];

            if (recording && recording.length > 0) {
                carToReplay.visible = true;

                // Find surrounding states for interpolation
                let state1 = recording[0];
                let state2 = recording[recording.length - 1];
                for (let i = 0; i < recording.length - 1; i++) {
                    if (recording[i].time <= elapsedTime && recording[i + 1].time >= elapsedTime) {
                        state1 = recording[i];
                        state2 = recording[i + 1];
                        break;
                    }
                }

                // Interpolate between states
                const timeDiff = state2.time - state1.time;
                let interpFactor = (timeDiff > 0) ? (elapsedTime - state1.time) / timeDiff : (elapsedTime >= state2.time ? 1 : 0);
                interpFactor = Math.max(0, Math.min(1, interpFactor));

                tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
                tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

                carToReplay.position.copy(tempReplayPosition);
                carToReplay.quaternion.copy(tempReplayQuaternion);

            }
            // else { carToReplay.visible = false; } // Option to hide cars without recordings
        }
    }

    // --- Update Camera ---
    const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion);
    const desiredCameraPosition = activeCar.position.clone().add(worldOffset);
    const desiredLookAt = activeCar.position.clone();

    const lerpFactor = Math.min(CAMERA_FOLLOW_SPEED * deltaTime, 1);
    camera.position.lerp(desiredCameraPosition, lerpFactor);
    controls.target.copy(desiredLookAt); // Ensure controls target is updated for lookAt
    camera.lookAt(controls.target);
}

/**
 * Moves the current car to the destination with logarithmic speed.
 * @param {THREE.Vector3 | [number, number, number]} destination - The target position
 * @param {number} duration - Duration of the movement in milliseconds
 * @returns {Promise<boolean>} - Resolves with true on completion
 */
export function moveCurrentCar(destination, duration = 3000) {
    return new Promise((resolve) => {
        const car = loadedCarModels[missionIndex];
        if (!car) {
            console.error("No current car to move");
            resolve(false);
            return;
        }

        const targetPos = Array.isArray(destination)
            ? new THREE.Vector3(destination[0], destination[1], destination[2])
            : destination;
        const startPos = car.position.clone();
        const startTime = performance.now();

        function animateMovement(currentTime) {
            const elapsed = currentTime - startTime;
            if (elapsed >= duration) {
                car.position.copy(targetPos);
                console.log("Car movement complete");
                resolve(true);
                return;
            }

            const t = elapsed / duration;
            // Logarithmic easing (starts fast, slows down)
            const progress = 1 - (1 - t) * (1 - Math.log(1 + 9 * t) / Math.log(10));

            car.position.lerpVectors(startPos, targetPos, progress);
            requestAnimationFrame(animateMovement);
        }

        requestAnimationFrame(animateMovement);
        console.log(`Moving car to ${targetPos.toArray().join(',')} over ${duration}ms`);
    });
}
