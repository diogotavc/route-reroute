import * as THREE from "three";

// --- Physics Constants ---
export const MAX_SPEED = 15;
export const ACCELERATION_RATE = 5;
export const BRAKING_RATE = 10;
export const STEERING_RATE = 1.5;
export const FRICTION = 1; // Speed decay per second when not accelerating/braking
export const STEERING_FRICTION = 2; // How quickly steering returns to center
const COLLISION_IMPULSE_MAGNITUDE = 0.5; // How strongly the active car is pushed

// --- Helper Variables ---
let activeCarBox = new THREE.Box3();
let otherCarBox = new THREE.Box3();

/**
 * Updates the physics state of the active car based on input and deltaTime.
 * Handles collision detection and response against other cars.
 * @param {THREE.Object3D} activeCar - The car object to update.
 * @param {object} physicsState - Current physics state { speed, acceleration, steeringAngle }.
 * @param {object} inputState - User input { isAccelerating, isBraking, isTurningLeft, isTurningRight }.
 * @param {number} deltaTime - Time elapsed since the last frame.
 * @param {object} otherCars - Dictionary of other car objects { index: car }.
 * @returns {object} - Updated physics state { speed, acceleration, steeringAngle, collisionDetected: boolean }.
 */
export function updatePhysics(activeCar, physicsState, inputState, deltaTime, otherCars) {
    let { speed, acceleration, steeringAngle } = physicsState;
    const { isAccelerating, isBraking, isTurningLeft, isTurningRight } = inputState;

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
        if (Math.abs(steeringAngle) < 0.01) {
            steeringAngle = 0;
        }
    }
    steeringAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, steeringAngle)); // Clamp steering angle

    // --- Update Speed ---
    if (isAccelerating) {
        acceleration = ACCELERATION_RATE;
    } else if (isBraking) {
        acceleration = -BRAKING_RATE;
    } else {
        acceleration = -Math.sign(speed) * FRICTION;
        if (Math.abs(speed) < FRICTION * deltaTime) {
            speed = 0;
            acceleration = 0;
        }
    }

    speed += acceleration * deltaTime;
    speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, speed)); // Clamp speed

    if (isBraking && Math.abs(speed) < 0.1) {
        speed = 0;
    }

    // --- Update Position & Rotation ---
    if (Math.abs(speed) > 0.01) {
        activeCar.rotation.y += steeringAngle * deltaTime * Math.sign(speed);
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion).normalize();
    activeCar.position.addScaledVector(forward, speed * deltaTime);


    // --- Collision Detection (Active Car vs Replaying Cars) ---
    activeCarBox.setFromObject(activeCar);
    let collisionDetected = false;
    let collidedOtherCar = null;

    for (const key in otherCars) {
        const otherCar = otherCars[key];
        if (!otherCar || !otherCar.visible) continue; // Skip inactive/hidden cars

        otherCarBox.setFromObject(otherCar);

        if (activeCarBox.intersectsBox(otherCarBox)) {
            collisionDetected = true;
            collidedOtherCar = otherCar;
            break;
        }
    }

    // --- Collision Response ---
    if (collisionDetected && collidedOtherCar) {
        console.log("Collision!");
        speed = 0; // Stop the active car's controlled movement

        const activeCenter = activeCarBox.getCenter(new THREE.Vector3());
        const otherCenter = otherCarBox.getCenter(new THREE.Vector3());
        const impulseDirection = activeCenter.sub(otherCenter); // Vector from other to active

        // Make impulse horizontal (ignore Y component)
        impulseDirection.y = 0;

        // Apply positional impulse only horizontally
        // Check if impulseDirection is not zero vector before normalizing and applying
        if (impulseDirection.lengthSq() > 0.001) { // Avoid normalizing zero vector
            impulseDirection.normalize();
            activeCar.position.addScaledVector(impulseDirection, COLLISION_IMPULSE_MAGNITUDE);
            console.log(`Applying horizontal impulse in direction: ${impulseDirection.toArray()}`);
        } else {
            // Optional: Handle cases where centers are vertically aligned
            console.log("Collision centers aligned vertically, no horizontal impulse applied.");
            // Maybe apply a small default horizontal push if needed? e.g., activeCar.position.x += 0.1;
        }
    }

    return {
        speed: speed,
        acceleration: acceleration,
        steeringAngle: steeringAngle,
        collisionDetected: collisionDetected
    };
}
