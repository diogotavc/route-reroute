import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as CarPhysics from "./carPhysics.js"; // Import the new physics module

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

// Recording and Replay State
const recordedMovements = {}; // Stores recordings for completed cars { missionIndex: [ { time, position, rotation } ] }
let currentRecording = []; // Stores the recording for the currently active car

// Physics State (managed per active car, but stored here for simplicity for now)
let carSpeed = 0;
let carAcceleration = 0;
let steeringAngle = 0;
let isAccelerating = false;
let isBraking = false;
let isTurningLeft = false;
let isTurningRight = false;

// Rewind State
let isRewinding = false;
const REWIND_SPEED_FACTOR = 3.0; // How much faster to rewind than real-time
let elapsedTime = 0; // Tracks the current time for the active car's simulation/recording

const CAMERA_FOLLOW_SPEED = 2.0; // How quickly the camera catches up (higher is faster)
// Adjust these values for zoom and angle
const CAMERA_DISTANCE = 18; // Increased distance for zoom out
const CAMERA_HEIGHT = 10; // Increased height for a higher angle

export function loadCarModels(level) {
    levels = level;
    const loadModelPromises = level.map((mission, index) => {
        const name = mission[0];
        const path = carModels[name][0];
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

                    model.visible = false;
                    model.scale.set(1, 1, 1);
                    const startingPoint = mission[3];
                    model.position.set(
                        startingPoint[0],
                        startingPoint[1],
                        startingPoint[2],
                    );

                    scene.add(model);
                    loadedCarModels[index] = model;

                    console.debug(
                        `Loaded car model ${index + 1}/${level.length} - ${name}`,
                    );
                    resolve();
                },
                (progress) => { },
                (error) => {
                    console.error(`Error loading car model ${index}:`, error);
                    reject(error);
                },
            );
        });
    });

    return Promise.all(loadModelPromises).then(() => {
        if (Object.keys(loadedCarModels).length > 0) {
            setActiveCar(0);
        }
    });
}

function setActiveCar(index) {
    var carCount = Object.keys(loadedCarModels).length;
    if (index < 0 || index >= carCount) {
        console.error("Invalid car index:", index);
        return;
    }

    // Store the recording of the PREVIOUS car before switching
    if (currentRecording.length > 0) {
        recordedMovements[missionIndex] = currentRecording;
        console.log(`Stored recording for car index ${missionIndex} with ${currentRecording.length} states.`);
    }

    // Reset recording for the NEW car
    currentRecording = [];
    // carStartTime = performance.now(); // No longer primary time source, but keep for potential reference
    elapsedTime = 0; // Reset elapsed time for the new car
    isRewinding = false; // Ensure rewind is off when switching cars

    var [modelName, character, backstory, startingPoint, finishingPoint] =
        levels[index];
    var characterName =
        String(character).charAt(0).toUpperCase() + String(character).slice(1);
    console.log(`${characterName}: ${backstory}`);
    console.log(
        `Drive ${modelName} from ${startingPoint} to ${finishingPoint}.`,
    );

    // REMOVE LATER
    // Object.values(loadedCarModels).forEach(car => car.visible = false);

    const activeCar = loadedCarModels[index];
    activeCar.visible = true;
    const previousMissionIndex = missionIndex; // Store previous index before updating
    missionIndex = index;

    // Make previously active car visible again for replay (if it exists)
    // This assumes we want all previous cars to replay simultaneously
    // Alternatively, hide all cars except the active one initially
    // Object.values(loadedCarModels).forEach((car, idx) => car.visible = (idx === index));
    if (previousMissionIndex !== index && loadedCarModels[previousMissionIndex]) {
        loadedCarModels[previousMissionIndex].visible = true;
    }


    // Add the initial state to the new recording
    const initialPosition = activeCar.position.clone();
    const initialRotation = activeCar.quaternion.clone();
    currentRecording.push({
        time: 0, // Start time is 0
        position: initialPosition,
        rotation: initialRotation,
    });

    // --- Instant Camera Positioning ---
    // Calculate desired camera position based on the car's initial state
    const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE); // Offset in car's local space
    const worldOffset = desiredCameraOffset.applyQuaternion(initialRotation); // Rotate offset to world space based on initial rotation
    const desiredCameraPosition = initialPosition.clone().add(worldOffset); // Add world offset to car's initial world position

    // Calculate desired look-at point (car's initial position)
    const desiredLookAt = initialPosition.clone();

    // Set camera position and target instantly
    camera.position.copy(desiredCameraPosition);
    controls.target.copy(desiredLookAt);
    camera.lookAt(controls.target); // Ensure camera looks at the target immediately
    // --- End Instant Camera Positioning ---


    // Reset physics state for the new car
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
        return -1;
    }
    const nextIndex = (missionIndex + 1) % carCount;
    return setActiveCar(nextIndex);
}

// --- Physics Control Functions ---

export function setAccelerating(value) {
    isAccelerating = value;
    if (value) isBraking = false; // Cannot accelerate and brake simultaneously
}

export function setBraking(value) {
    isBraking = value;
    if (value) isAccelerating = false; // Cannot accelerate and brake simultaneously
}

export function setTurningLeft(value) {
    isTurningLeft = value;
}

export function setTurningRight(value) {
    isTurningRight = value;
}

// --- Rewind Control ---
export function setRewinding() {
    // Only start rewinding if not already doing so
    if (!isRewinding) {
        console.log("Starting rewind...");
        isRewinding = true;
        // Reset input flags immediately when starting rewind
        // to prevent accidental input carrying over
        isAccelerating = false;
        isBraking = false;
        isTurningLeft = false;
        isTurningRight = false;
    } else {
        console.log("Rewind already in progress.");
    }
}


// --- Physics Update ---

let tempReplayPosition = new THREE.Vector3(); // Keep for replay interpolation
let tempReplayQuaternion = new THREE.Quaternion(); // Keep for replay interpolation

export function updateCarPhysics(deltaTime) {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;

    if (isRewinding) {
        // --- Handle Rewind ---
        // Use module-level elapsedTime
        elapsedTime -= deltaTime * REWIND_SPEED_FACTOR;
        elapsedTime = Math.max(0, elapsedTime); // Clamp time to minimum 0

        if (currentRecording.length > 1) {
            // Find the two states surrounding the current elapsedTime
            let state1 = currentRecording[0];
            let state2 = currentRecording[currentRecording.length - 1]; // Default to last state

            for (let i = 0; i < currentRecording.length - 1; i++) {
                if (currentRecording[i].time <= elapsedTime && currentRecording[i + 1].time >= elapsedTime) {
                    state1 = currentRecording[i];
                    state2 = currentRecording[i + 1];
                    break;
                }
            }

            // Interpolate between state1 and state2
            const timeDiff = state2.time - state1.time;
            let interpFactor = 0;
            if (timeDiff > 0) {
                interpFactor = (elapsedTime - state1.time) / timeDiff;
            } else if (elapsedTime >= state2.time) {
                interpFactor = 1;
            }

            interpFactor = Math.max(0, Math.min(1, interpFactor)); // Clamp factor

            tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
            tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

            // Apply interpolated state
            activeCar.position.copy(tempReplayPosition);
            activeCar.quaternion.copy(tempReplayQuaternion);

        } else if (currentRecording.length === 1) {
            // Snap to the initial state if only one state is recorded
            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);
        }

        // If we rewind to the beginning, stop rewinding and reset state
        if (elapsedTime <= 0 && currentRecording.length > 0) {
            console.log("Rewind finished.");
            isRewinding = false; // Stop rewinding

            // Snap to the very first state precisely
            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);

            // Reset physics state after rewind completes
            carSpeed = 0;
            carAcceleration = 0;
            steeringAngle = 0;
            // Input flags are already reset when rewind starts

            // Truncate recording to only the initial state
            currentRecording = [currentRecording[0]];
            console.log(`Recording reset to initial state at time 0.`);
        }

        // Skip physics, recording, and replay during rewind

    } else {
        // --- Handle Normal Update and Recording ---
        // Use module-level elapsedTime
        elapsedTime += deltaTime;

        // --- Prepare data for physics update ---
        const currentPhysicsState = {
            speed: carSpeed,
            acceleration: carAcceleration,
            steeringAngle: steeringAngle
        };
        const currentInputState = {
            isAccelerating: isAccelerating,
            isBraking: isBraking,
            isTurningLeft: isTurningLeft,
            isTurningRight: isTurningRight
        };
        // Prepare list of other cars for collision detection
        const otherCars = {};
        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex !== missionIndex) {
                otherCars[carIndex] = loadedCarModels[carIndex];
            }
        }

        // --- Call external physics update ---
        const updatedPhysicsState = CarPhysics.updatePhysics(
            activeCar,
            currentPhysicsState,
            currentInputState,
            deltaTime,
            otherCars // Pass other cars for collision detection
        );

        // --- Update local physics state from result ---
        carSpeed = updatedPhysicsState.speed;
        carAcceleration = updatedPhysicsState.acceleration;
        steeringAngle = updatedPhysicsState.steeringAngle;

        // Optional: Handle collision result if needed (e.g., specific game logic)
        if (updatedPhysicsState.collisionDetected) {
            // Collision response (like impulse) is handled within updatePhysics
            // Add any additional game logic here if needed
        }


        // --- Record Active Car State ---
        currentRecording.push({
            time: elapsedTime,
            position: activeCar.position.clone(),
            rotation: activeCar.quaternion.clone(),
        });


        // --- Replay Inactive Cars ---
        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex === missionIndex) continue; // Skip the active car

            const carToReplay = loadedCarModels[carIndex];
            const recording = recordedMovements[carIndex];

            if (recording && recording.length > 0) {
                carToReplay.visible = true; // Ensure replaying cars are visible

                // Find the two states surrounding the current elapsedTime
                let state1 = recording[0];
                let state2 = recording[recording.length - 1]; // Default to last state

                for (let i = 0; i < recording.length - 1; i++) {
                    if (recording[i].time <= elapsedTime && recording[i + 1].time >= elapsedTime) {
                        state1 = recording[i];
                        state2 = recording[i + 1];
                        break;
                    }
                }

                // Interpolate between state1 and state2
                const timeDiff = state2.time - state1.time;
                let interpFactor = 0;
                if (timeDiff > 0) {
                    interpFactor = (elapsedTime - state1.time) / timeDiff;
                } else if (elapsedTime >= state2.time) {
                    interpFactor = 1;
                }

                interpFactor = Math.max(0, Math.min(1, interpFactor)); // Clamp factor

                tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
                tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

                // Apply interpolated state
                carToReplay.position.copy(tempReplayPosition);
                carToReplay.quaternion.copy(tempReplayQuaternion);

            } else {
                // carToReplay.visible = false; // Option to hide cars without recordings
            }
        }
    } // End of if(isRewinding) / else block


    // --- Update Camera ---
    const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion);
    const desiredCameraPosition = activeCar.position.clone().add(worldOffset);
    const desiredLookAt = activeCar.position.clone();

    const lerpFactor = Math.min(CAMERA_FOLLOW_SPEED * deltaTime, 1);
    camera.position.lerp(desiredCameraPosition, lerpFactor);
    controls.target.copy(desiredLookAt);
    camera.lookAt(controls.target);

    // --- Collision Detection and Response are now handled within CarPhysics.updatePhysics ---
    // Remove the old collision detection/response block from here
}

/**
 * Moves the current car to the destination with logarithmic speed
 * @param {THREE.Vector3 | [number, number, number]} destination - The target position 
 * @param {number} duration - Duration of the movement in milliseconds
 * @returns {Promise} - Resolves when the movement completes
 */
export function moveCurrentCar(destination, duration = 3000) {
    return new Promise((resolve) => {
        const car = loadedCarModels[missionIndex];

        if (!car) {
            console.error("No current car to move");
            resolve(false);
            return;
        }

        // Convert array to Vector3 if needed
        const targetPos = Array.isArray(destination)
            ? new THREE.Vector3(destination[0], destination[1], destination[2])
            : destination;

        // Store starting position
        const startPos = car.position.clone();

        // Calculate distance to move
        const distance = startPos.distanceTo(targetPos);

        // Start the animation
        const startTime = performance.now();

        // Logarithmic animation function
        function animateMovement(currentTime) {
            // Calculate elapsed time
            const elapsedTime = currentTime - startTime;

            if (elapsedTime >= duration) {
                // Animation finished
                car.position.copy(targetPos);
                console.log("Car movement complete");
                resolve(true);
                return;
            }

            // Normalized time (0 to 1)
            const t = elapsedTime / duration;

            // Logarithmic easing: starts fast and slows down
            // 1 - Math.log(1 + 9 * t) / Math.log(10) approximates 1 - log10(1 + 9t)
            // This gives us a curve that starts at 1 and goes to 0 in logarithmic fashion
            const progress = 1 - (1 - t) * (1 - Math.log(1 + 9 * t) / Math.log(10));

            // Calculate new position
            const newPos = new THREE.Vector3(
                startPos.x + (targetPos.x - startPos.x) * progress,
                startPos.y + (targetPos.y - startPos.y) * progress,
                startPos.z + (targetPos.z - startPos.z) * progress
            );

            // Update car position
            car.position.copy(newPos);

            // Continue the animation
            requestAnimationFrame(animateMovement);
        }

        // Start the animation loop
        requestAnimationFrame(animateMovement);

        console.log(`Moving car from ${startPos.toArray().join(',')} to ${targetPos.toArray().join(',')} over ${duration}ms`);
    });
}
