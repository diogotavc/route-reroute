import * as THREE from "three";

// --- Physics Constants ---
export const MAX_SPEED = 15;
export const ACCELERATION_RATE = 5;
export const BRAKING_RATE = 10;
export const STEERING_RATE = 1.5;
export const FRICTION = 1; // Speed decay per second when not accelerating/braking
export const STEERING_FRICTION = 2; // How quickly steering returns to center
const COLLISION_RESTITUTION = 0.4; // How much speed is reversed on collision (0=stop, 1=perfect bounce)
const COLLISION_SEPARATION = 0.05; // Small push to prevent sticking after collision

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
    // Store original position before potential collision adjustment
    const originalPosition = activeCar.position.clone();
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
            // Restore position to before movement step to calculate response from point of impact
            activeCar.position.copy(originalPosition);
            break;
        }
    }

    // --- Collision Response ---
    if (collisionDetected && collidedOtherCar) {
        console.log("Collision!");

        // Calculate collision normal (from other car to active car)
        const activeCenter = activeCarBox.getCenter(new THREE.Vector3());
        const otherCenter = otherCarBox.getCenter(new THREE.Vector3());
        const collisionNormal = activeCenter.sub(otherCenter); // Vector from other to active

        // Make normal horizontal
        collisionNormal.y = 0;

        // Apply bounce and separation only if normal is significant
        if (collisionNormal.lengthSq() > 0.001) { // Avoid normalizing zero vector
            collisionNormal.normalize();

            // Calculate how much the car was moving into the collision normal
            const dot = forward.dot(collisionNormal);

            // If moving towards the other car, apply bounce
            if (dot < 0) {
                // Reverse a portion of the speed based on restitution
                speed *= -COLLISION_RESTITUTION;
                console.log(`Collision bounce applied. New speed: ${speed.toFixed(2)}`);
            }

            // Apply a small separation force regardless of direction to prevent sticking
            activeCar.position.addScaledVector(collisionNormal, COLLISION_SEPARATION);
            console.log(`Applying separation push in direction: ${collisionNormal.toArray().map(n => n.toFixed(2)).join(',')}`);

        } else {
            // Optional: Handle cases where centers are vertically aligned or coincident
            console.log("Collision centers aligned vertically or coincident, applying default separation.");
            // Apply a small default horizontal push if centers are too close
            activeCar.position.x += Math.sign(Math.random() - 0.5) * COLLISION_SEPARATION; // Random small push
            // Apply small speed reduction if centers are aligned
            speed *= (1 - COLLISION_RESTITUTION); // Reduce speed but don't reverse
        }

        // Re-apply movement with potentially modified speed after collision response
        activeCar.position.addScaledVector(forward, speed * deltaTime);
    }

    return {
        speed: speed,
        acceleration: acceleration,
        steeringAngle: steeringAngle,
        collisionDetected: collisionDetected
    };
}
