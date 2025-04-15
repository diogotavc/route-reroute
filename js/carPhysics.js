import * as THREE from "three";

// --- Physics Constants ---
export const MAX_SPEED = 15;
export const ACCELERATION_RATE = 5;
export const BRAKING_RATE = 10;
export const STEERING_RATE = 1.5;
export const FRICTION = 1; // Speed decay per second when not accelerating/braking
export const STEERING_FRICTION = 2; // How quickly steering returns to center
const COLLISION_RESTITUTION = 0.4; // How much speed is reversed on collision (0=stop, 1=perfect bounce)
const COLLISION_SEPARATION_FACTOR = 1.1; // Multiplier for separation push


let collisionNormal = new THREE.Vector3(); // Reuse vector for normal calculation
let separationVector = new THREE.Vector3(); // Reuse vector for separation

/**
 * Updates the physics state of the active car based on input and deltaTime.
 * Handles collision detection and response against other cars using OBB concept.
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
        // Apply rotation based on steering angle and speed direction
        const rotationAmount = steeringAngle * deltaTime * Math.sign(speed);
        const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAmount);
        activeCar.quaternion.multiplyQuaternions(deltaRotation, activeCar.quaternion);
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion).normalize();
    const originalPosition = activeCar.position.clone();
    const potentialNewPosition = activeCar.position.clone().addScaledVector(forward, speed * deltaTime);

    // --- OBB Collision Detection Placeholder ---
    // OBB (Oriented Bounding Box) detection is more accurate for rotated objects than AABB.
    // It typically involves the Separating Axis Theorem (SAT).
    // SAT checks for overlap along potential separating axes derived from both boxes' orientations.
    // Implementation Steps:
    // 1. Define OBBs: For each car, get center (position), orientation (quaternion/matrix), and half-extents (size/2).
    //    - Calculate extents once or cache them. Use a Box3 helper initially:
    //      const box = new THREE.Box3().setFromObject(car);
    //      const halfExtents = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    // 2. Implement SAT:
    //    - Get the 15 potential separating axes (3 from car A, 3 from car B, 9 from cross products).
    //    - For each axis, project both OBBs onto it to get intervals.
    //    - If intervals don't overlap for *any* axis, there's no collision.
    //    - If intervals overlap for *all* axes, there *is* a collision.
    // 3. Calculate MTV (Minimum Translation Vector): The axis with the minimum overlap gives the direction
    //    and magnitude to separate the boxes. This should ideally inform the collision response.

    let collisionDetected = false;
    let collidedOtherCar = null;
    let penetrationDepth = Infinity; // Will be calculated by SAT if implemented
    // collisionNormal will be set by SAT (axis of minimum overlap)

    // --- Placeholder Loop ---
    // This loop structure remains, but the intersection test needs replacement.
    for (const key in otherCars) {
        const otherCar = otherCars[key];
        if (!otherCar || !otherCar.visible) continue;

        // --- OBB Intersection Test (Placeholder) ---
        // Replace this with your SAT implementation
        // const areColliding = checkOBBCollision(activeCar, otherCar); // Your SAT function
        const areColliding = false; // Default to no collision until SAT is implemented

        if (areColliding) {
            collisionDetected = true;
            collidedOtherCar = otherCar;

            // --- Get Collision Details from SAT ---
            // Your SAT function should ideally return the MTV (normal and depth)
            // penetrationDepth = mtv.depth;
            // collisionNormal.copy(mtv.axis);

            // --- TEMPORARY: Keep AABB-based response calculation for now ---
            // Recalculate original boxes at the point of impact (originalPosition)
            // This response part should ideally use the OBB's MTV from SAT.
            const tempActiveCarBox = new THREE.Box3().setFromObject(activeCar); // Need temporary boxes here
            const tempOtherCarBox = new THREE.Box3().setFromObject(collidedOtherCar);
            activeCar.position.copy(originalPosition); // Temporarily move back for AABB calculation
            tempActiveCarBox.setFromObject(activeCar);     // Get full box at original pos
            tempOtherCarBox.setFromObject(collidedOtherCar); // Get full box of the other car

            // Calculate AABB overlap (as fallback/approximation)
            const overlapX = Math.min(tempActiveCarBox.max.x, tempOtherCarBox.max.x) - Math.max(tempActiveCarBox.min.x, tempOtherCarBox.min.x);
            const overlapZ = Math.min(tempActiveCarBox.max.z, tempOtherCarBox.max.z) - Math.max(tempActiveCarBox.min.z, tempOtherCarBox.min.z);

            if (overlapX < overlapZ) {
                penetrationDepth = overlapX;
                const sign = Math.sign(tempActiveCarBox.getCenter(new THREE.Vector3()).x - tempOtherCarBox.getCenter(new THREE.Vector3()).x);
                collisionNormal.set(sign, 0, 0);
            } else {
                penetrationDepth = overlapZ;
                const sign = Math.sign(tempActiveCarBox.getCenter(new THREE.Vector3()).z - tempOtherCarBox.getCenter(new THREE.Vector3()).z);
                collisionNormal.set(0, 0, sign);
            }
            // --- End of Temporary AABB response calculation ---


            break; // Handle one collision per frame
        }
    }

    // --- Collision Response ---
    if (collisionDetected && collidedOtherCar) {
        console.log("Collision (OBB check placeholder)!");

        // Ensure normal is valid (using the temporary AABB calculation for now)
        if (collisionNormal.lengthSq() > 0.001 && penetrationDepth < Infinity && penetrationDepth > 0) {
            // ... (rest of the response logic remains the same for now) ...
            // Calculate how much the car was moving into the collision normal
            const dot = forward.dot(collisionNormal);

            // Apply bounce if moving towards
            if (dot < 0) {
                speed *= -COLLISION_RESTITUTION;
                console.log(`Collision bounce applied along ${collisionNormal.toArray().map(n=>n.toFixed(1))}. New speed: ${speed.toFixed(2)}`);
            } else {
                speed *= (1 - COLLISION_RESTITUTION * 0.5); // Dampen speed even if not moving directly towards
            }

            // Apply separation push based on penetration depth
            // Ideally, use penetrationDepth from SAT
            separationVector.copy(collisionNormal).multiplyScalar(penetrationDepth * COLLISION_SEPARATION_FACTOR);
            activeCar.position.add(separationVector); // Apply separation to originalPosition
            console.log(`Applying separation push: ${separationVector.toArray().map(n => n.toFixed(2)).join(',')}`);

        } else {
            // Fallback (if temporary AABB calculation failed)
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
