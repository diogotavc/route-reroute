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
    missionIndex = index;

    const boundingBox = new THREE.Box3().setFromObject(activeCar);
    const center = boundingBox.getCenter(new THREE.Vector3());

    // camera.position.set is now done outside of this function
    const startPosition = new THREE.Vector3(center.x, center.y - 5, center.z);
    camera.lookAt(center);
    controls.target.copy(startPosition);

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

export function updateCarPhysics(deltaTime) {
    const car = loadedCarModels[missionIndex];
    if (!car) return;

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
        car.rotation.y += steeringAngle * deltaTime * Math.sign(carSpeed);
    }

    const forward = new THREE.Vector3(0, 0, 1); // Car's local forward
    forward.applyQuaternion(car.quaternion); // Rotate forward vector to world space
    forward.normalize();

    car.position.addScaledVector(forward, carSpeed * deltaTime);

    // --- Collision Detection ---
    activeCarBox.setFromObject(car);
    let collisionDetected = false;

    for (const key in loadedCarModels) {
        if (parseInt(key) === missionIndex) continue; // Don't check against self

        const otherCar = loadedCarModels[key];
        if (!otherCar.visible) continue; // Skip inactive cars (optional)

        otherCarBox.setFromObject(otherCar);

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
        // Optional: Move car back slightly (needs previous position)
        // car.position.addScaledVector(forward, -0.1); // Nudge back
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
