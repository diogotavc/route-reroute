import * as THREE from "three";

// --- Physics Constants ---
export const MAX_SPEED = 15;
export const ACCELERATION_RATE = 5;
export const BRAKING_RATE = 10;
export const STEERING_RATE = 1.5;
export const FRICTION = 1; // Speed decay per second when not accelerating/braking
export const STEERING_FRICTION = 2; // How quickly steering returns to center
const COLLISION_RESTITUTION = 0.4; // How much speed is reversed on collision (0=stop, 1=perfect bounce)
const COLLISION_SEPARATION_FACTOR = 1.1; // Multiplier for separation push (increase slightly from 1.05)
const HITBOX_SHRINK_FACTOR = 0.75; // Shrink AABB size by this factor (e.g., 0.8 = 80% of original size)

// --- Helper Variables ---
let activeCarBox = new THREE.Box3();
let otherCarBox = new THREE.Box3();
let collisionNormal = new THREE.Vector3(); // Reuse vector for normal calculation
let separationVector = new THREE.Vector3(); // Reuse vector for separation
let tempBox = new THREE.Box3(); // Temporary box for calculations
let boxCenter = new THREE.Vector3(); // Reuse vector for box center
let boxSize = new THREE.Vector3(); // Reuse vector for box size

/**
 * Shrinks a Box3 towards its center by a given factor.
 * @param {THREE.Box3} box - The box to shrink.
 * @param {number} factor - The factor to shrink by (e.g., 0.8).
 * @returns {THREE.Box3} - The original box, now shrunk.
 */
function shrinkBox(box, factor) {
    if (factor >= 1.0 || factor <= 0) return box; // No shrinking or invalid factor
    box.getCenter(boxCenter);
    box.getSize(boxSize);
    const newSize = boxSize.multiplyScalar(factor);
    const halfNewSize = newSize.multiplyScalar(0.5);
    box.min.copy(boxCenter).sub(halfNewSize);
    box.max.copy(boxCenter).add(halfNewSize);
    return box;
}

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
    const originalPosition = activeCar.position.clone();
    const potentialNewPosition = activeCar.position.clone().addScaledVector(forward, speed * deltaTime);

    // --- Collision Detection ---
    // Uses Axis-Aligned Bounding Boxes (AABB) shrunk slightly for detection.
    // This is fast but less accurate for rotated objects.
    // Consider Oriented Bounding Boxes (OBB) or Sphere collisions for more accuracy
    // if needed, at the cost of performance.
    let collisionDetected = false;
    let collidedOtherCar = null;
    let penetrationDepth = Infinity;

    // Calculate potential box for the active car *at its potential new position*
    // Create a temporary object or manually calculate the box for the potential position
    // For simplicity, let's calculate based on current position and check against others
    // This isn't perfect but avoids predicting the box precisely.
    // We will use the *shrunk* boxes for the intersection test.

    activeCarBox.setFromObject(activeCar); // Get current full box
    shrinkBox(activeCarBox, HITBOX_SHRINK_FACTOR); // Shrink it

    for (const key in otherCars) {
        const otherCar = otherCars[key];
        if (!otherCar || !otherCar.visible) continue;

        // Calculate and shrink the other car's box
        tempBox.setFromObject(otherCar);
        shrinkBox(tempBox, HITBOX_SHRINK_FACTOR); // Use tempBox for the shrunk other car box

        // Check intersection between the *shrunk* boxes
        if (activeCarBox.intersectsBox(tempBox)) {
            collisionDetected = true;
            collidedOtherCar = otherCar;

            // --- IMPORTANT: For response, use the ORIGINAL (unshrunk) boxes ---
            // Recalculate original boxes at the point of impact (originalPosition)
            activeCar.position.copy(originalPosition); // Temporarily move back
            activeCarBox.setFromObject(activeCar);     // Get full box at original pos
            otherCarBox.setFromObject(collidedOtherCar); // Get full box of the other car

            // Restore potential position for further calculations if needed,
            // or just proceed with response based on originalPosition.
            // Let's proceed with response based on originalPosition.
            // activeCar.position.copy(potentialNewPosition); // Not needed if we base response on original

            break; // Handle one collision per frame
        }
    }

    // --- Collision Response ---
    if (collisionDetected && collidedOtherCar) {
        console.log("Collision!");

        // Calculate AABB overlap using the FULL boxes calculated above
        const overlapX = Math.min(activeCarBox.max.x, otherCarBox.max.x) - Math.max(activeCarBox.min.x, otherCarBox.min.x);
        const overlapZ = Math.min(activeCarBox.max.z, otherCarBox.max.z) - Math.max(activeCarBox.min.z, otherCarBox.min.z);

        // Determine minimum penetration axis (X or Z) using FULL boxes
        if (overlapX < overlapZ) {
            penetrationDepth = overlapX;
            const sign = Math.sign(activeCarBox.getCenter(new THREE.Vector3()).x - otherCarBox.getCenter(new THREE.Vector3()).x);
            collisionNormal.set(sign, 0, 0);
        } else {
            penetrationDepth = overlapZ;
            const sign = Math.sign(activeCarBox.getCenter(new THREE.Vector3()).z - otherCarBox.getCenter(new THREE.Vector3()).z);
            collisionNormal.set(0, 0, sign);
        }

        // Ensure normal is valid
        if (collisionNormal.lengthSq() > 0.001 && penetrationDepth < Infinity && penetrationDepth > 0) {
            // Calculate how much the car was moving into the collision normal
            // Use forward vector calculated before collision check
            const dot = forward.dot(collisionNormal);

            // Apply bounce if moving towards
            if (dot < 0) {
                speed *= -COLLISION_RESTITUTION;
                console.log(`Collision bounce applied along ${collisionNormal.toArray().map(n=>n.toFixed(1))}. New speed: ${speed.toFixed(2)}`);
            } else {
                speed *= (1 - COLLISION_RESTITUTION * 0.5);
            }

            // Apply separation push based on penetration depth of FULL boxes
            separationVector.copy(collisionNormal).multiplyScalar(penetrationDepth * COLLISION_SEPARATION_FACTOR);
            activeCar.position.add(separationVector); // Apply separation to originalPosition
            console.log(`Applying separation push: ${separationVector.toArray().map(n => n.toFixed(2)).join(',')}`);

        } else {
            // Fallback
            console.warn("Collision detected but MTV calculation failed or penetration zero. Applying fallback.");
            speed *= -COLLISION_RESTITUTION;
            activeCar.position.x += (Math.random() - 0.5) * 0.1;
            activeCar.position.z += (Math.random() - 0.5) * 0.1;
        }

        // After response (position adjusted, speed modified), we don't re-apply movement this frame.
        // The modified speed will affect the *next* frame's movement calculation.

    } else {
        // No collision detected, apply the potential movement
        activeCar.position.copy(potentialNewPosition);
    }

    return {
        speed: speed,
        acceleration: acceleration,
        steeringAngle: steeringAngle,
        collisionDetected: collisionDetected // Report if a collision *was handled* this frame
    };
}
