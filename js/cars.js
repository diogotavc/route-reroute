import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
let carStartTime = 0; // Timestamp (performance.now()) when the current car became active

// Physics State
let carSpeed = 0;
let carAcceleration = 0; // Can be positive (accelerating) or negative (braking)
let steeringAngle = 0;
let isAccelerating = false;
let isBraking = false;
let isTurningLeft = false;
let isTurningRight = false;
const MAX_SPEED = 15;
const ACCELERATION_RATE = 5;
const BRAKING_RATE = 10;
const STEERING_RATE = 1.5;
const FRICTION = 1; // Speed decay per second when not accelerating/braking
const STEERING_FRICTION = 2; // How quickly steering returns to center
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
                (progress) => {},
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
    carStartTime = performance.now(); // Record the start time for this car's control period

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
    currentRecording.push({
        time: 0,
        position: activeCar.position.clone(),
        rotation: activeCar.quaternion.clone(),
    });


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

// --- Physics Update ---

let activeCarBox = new THREE.Box3();
let otherCarBox = new THREE.Box3();
let tempReplayPosition = new THREE.Vector3(); // To avoid creating vectors in the loop
let tempReplayQuaternion = new THREE.Quaternion(); // To avoid creating quaternions in the loop

export function updateCarPhysics(deltaTime) {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;

    const currentTime = performance.now();
    const elapsedTime = (currentTime - carStartTime) / 1000; // Elapsed time in seconds since this car became active

    // --- Update Active Car Physics (Steering, Speed, Position) ---
    // --- Update Steering ---
    let steeringChange = 0;
    if (isTurningLeft) {
        steeringChange += STEERING_RATE * deltaTime;
    }
    if (isTurningRight) {
        steeringChange -= STEERING_RATE * deltaTime;
    }
    steeringAngle += steeringChange;

    // Apply steering friction (return to center)
    if (!isTurningLeft && !isTurningRight) {
        steeringAngle -= steeringAngle * STEERING_FRICTION * deltaTime;
        // Prevent overshooting center
        if (Math.abs(steeringAngle) < 0.01) {
            steeringAngle = 0;
        }
    }
    // Clamp steering angle (optional)
    steeringAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, steeringAngle)); // Limit to +/- 45 degrees

    // --- Update Speed ---
    if (isAccelerating) {
        carAcceleration = ACCELERATION_RATE;
    } else if (isBraking) {
        carAcceleration = -BRAKING_RATE;
    } else {
        // Apply friction when not accelerating or braking
        carAcceleration = -Math.sign(carSpeed) * FRICTION;
        // Prevent friction from reversing direction at low speeds
        if (Math.abs(carSpeed) < FRICTION * deltaTime) {
            carSpeed = 0;
            carAcceleration = 0;
        }
    }

    carSpeed += carAcceleration * deltaTime;
    carSpeed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, carSpeed)); // Clamp speed (allow slower reverse)

    // Stop if braking brings speed close to zero
    if (isBraking && Math.abs(carSpeed) < 0.1) {
        carSpeed = 0;
    }

    // --- Update Position & Rotation ---
    // Only rotate if moving
    if (Math.abs(carSpeed) > 0.01) {
        // Adjust rotation based on steering angle and speed (more speed = less turn influence needed for same radius)
        // Simplified: Rotate directly by steering angle scaled by deltaTime and speed sign
        activeCar.rotation.y += steeringAngle * deltaTime * Math.sign(carSpeed);
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion).normalize();
    activeCar.position.addScaledVector(forward, carSpeed * deltaTime);

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
            let state2 = recording[recording.length - 1]; // Default to last state if time exceeds recording

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
                interpFactor = 1; // If exactly on or past the last state
            }

            interpFactor = Math.max(0, Math.min(1, interpFactor)); // Clamp factor

            tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
            tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

            // Apply interpolated state
            carToReplay.position.copy(tempReplayPosition);
            carToReplay.quaternion.copy(tempReplayQuaternion);

        } else {
             // If no recording, ensure it's visible but static at its starting point (or hide it)
             // carToReplay.visible = false; // Option to hide cars without recordings
        }
    }


    // --- Update Camera ---
    // Calculate desired camera position: behind and above the car
    const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE); // Offset in car's local space
    const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion); // Rotate offset to world space
    const desiredCameraPosition = activeCar.position.clone().add(worldOffset); // Add world offset to car's world position

    // Calculate desired look-at point (car's position)
    const desiredLookAt = activeCar.position.clone(); // Look directly at the car's current position

    // Smoothly interpolate camera position
    const lerpFactor = Math.min(CAMERA_FOLLOW_SPEED * deltaTime, 1); // Ensure lerp factor doesn't exceed 1
    camera.position.lerp(desiredCameraPosition, lerpFactor);

    // Set the OrbitControls target *after* lerping camera position
    // This tells OrbitControls where the center of interest is, even if we don't use its movement.
    controls.target.copy(desiredLookAt);

    // Ensure camera always looks at the target *after* interpolation and setting controls.target
    camera.lookAt(controls.target);


    // --- Collision Detection (Active Car vs Replaying Cars) ---
    activeCarBox.setFromObject(activeCar); // Bounding box of the player-controlled car
    let collisionDetected = false;

    for (const key in loadedCarModels) {
        const carIndex = parseInt(key);
        if (carIndex === missionIndex) continue; // Don't check against self

        const otherCar = loadedCarModels[carIndex];
        if (!otherCar.visible) continue; // Skip inactive/hidden cars

        // Use the current (potentially replaying) position for collision check
        otherCarBox.setFromObject(otherCar); // Get bounding box based on current position

        if (activeCarBox.intersectsBox(otherCarBox)) {
            collisionDetected = true;
            break; // Stop checking after first collision
        }
    }

    // --- Collision Response ---
    if (collisionDetected) {
        console.log("Collision!");
        // Simple response: Stop the car immediately
        carSpeed = 0;
        // Optional: Move car back slightly
        // activeCar.position.addScaledVector(forward, -0.1); // Nudge back (using the 'forward' calculated earlier)
    }
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
