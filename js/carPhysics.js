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
const EPSILON = 0.0001; // Small value for float comparisons
const HITBOX_SCALE_FACTOR = 0.8; // Adjusted scale factor - tune as needed

// --- Helper Variables ---
let collisionNormal = new THREE.Vector3(); // Reuse vector for normal calculation
let separationVector = new THREE.Vector3(); // Reuse vector for separation

// --- SAT Helper Variables ---
const satBoxA = { center: new THREE.Vector3(), halfExtents: new THREE.Vector3(), axes: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
const satBoxB = { center: new THREE.Vector3(), halfExtents: new THREE.Vector3(), axes: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
const satVec = new THREE.Vector3(); // General purpose vector
const satCenterDiff = new THREE.Vector3(); // Difference between centers
const satAxes = []; // Array to hold the 15 potential separating axes
const satIntervalA = { min: 0, max: 0 }; // Projection interval for box A
const satIntervalB = { min: 0, max: 0 }; // Projection interval for box B
const satTempBox = new THREE.Box3(); // To calculate initial extents

/**
 * Gets OBB data (center, half-extents, local axes) for a car object.
 * NOTE: Requires car.userData.halfExtents to be set during model loading
 * with the model's local half-dimensions for accurate OBB.
 * @param {THREE.Object3D} car - The car object.
 * @param {object} obbData - The object to store OBB data in.
 * @param {THREE.Vector3} [positionOverride] - Optional position to use instead of car.position.
 */
function getOBBData(car, obbData, positionOverride = null) {
    if (car.userData.halfExtents) {
        // Use cached local half-extents if available (Preferred)
        obbData.halfExtents.copy(car.userData.halfExtents);
    } else {
        // Fallback: Use Box3 size (Less accurate for rotated objects)
        console.warn(`Car ${car.uuid} missing userData.halfExtents. Falling back to less accurate AABB sizing for OBB.`);
        satTempBox.setFromObject(car); // Inefficient
        satTempBox.getSize(obbData.halfExtents).multiplyScalar(0.5);
    }

    // --- Apply Scaling Factor ---
    // Apply scaling *after* getting the base half-extents
    obbData.halfExtents.multiplyScalar(HITBOX_SCALE_FACTOR);

    obbData.center.copy(positionOverride ? positionOverride : car.position); // Use override if provided

    // Extract local axes from the car's world matrix
    car.updateMatrixWorld(); // Ensure matrix is up-to-date
    obbData.axes[0].setFromMatrixColumn(car.matrixWorld, 0).normalize(); // World X-axis of car
    obbData.axes[1].setFromMatrixColumn(car.matrixWorld, 1).normalize(); // World Y-axis of car
    obbData.axes[2].setFromMatrixColumn(car.matrixWorld, 2).normalize(); // World Z-axis of car
}

/**
 * Projects an OBB onto a given axis and returns the interval [min, max].
 * @param {object} obbData - OBB data { center, halfExtents, axes }.
 * @param {THREE.Vector3} axis - The axis to project onto.
 * @param {object} interval - The object to store the interval { min, max }.
 */
function projectOBB(obbData, axis, interval) {
    // Project the center onto the axis
    const centerProjection = obbData.center.dot(axis);

    // Project the LOCAL half-extents along the OBB's WORLD axes onto the separation axis
    const extentProjection =
        obbData.halfExtents.x * Math.abs(obbData.axes[0].dot(axis)) +
        obbData.halfExtents.y * Math.abs(obbData.axes[1].dot(axis)) + // Include Y extent
        obbData.halfExtents.z * Math.abs(obbData.axes[2].dot(axis));

    interval.min = centerProjection - extentProjection;
    interval.max = centerProjection + extentProjection;
}

/**
 * Calculates the overlap between two intervals.
 * @param {object} intervalA - { min, max }.
 * @param {object} intervalB - { min, max }.
 * @returns {number} - The overlap amount, or 0 if no overlap.
 */
function getIntervalOverlap(intervalA, intervalB) {
    const minMax = Math.min(intervalA.max, intervalB.max);
    const maxMin = Math.max(intervalA.min, intervalB.min);
    // Add epsilon check: if overlap is extremely small, treat as no overlap
    const overlap = minMax - maxMin;
    return overlap > EPSILON ? overlap : 0;
}

/**
 * Checks for collision between two OBBs using the Separating Axis Theorem (SAT).
 * @param {THREE.Object3D} carA
 * @param {THREE.Object3D} carB
 * @param {THREE.Vector3} positionAOverride - Optional position override for carA.
 * @returns {object} - { collision: boolean, mtvAxis: THREE.Vector3 | null, mtvDepth: number | null }
 */
function checkOBBCollisionSAT(carA, carB, positionAOverride = null) {
    getOBBData(carA, satBoxA, positionAOverride); // Use potential position for active car
    getOBBData(carB, satBoxB); // Use current position for other car

    satAxes.length = 0; // Clear previous axes

    // 1. Add axes from Box A
    satAxes.push(satBoxA.axes[0]);
    satAxes.push(satBoxA.axes[1]);
    satAxes.push(satBoxA.axes[2]);

    // 2. Add axes from Box B
    satAxes.push(satBoxB.axes[0]);
    satAxes.push(satBoxB.axes[1]);
    satAxes.push(satBoxB.axes[2]);

    // 3. Add cross products (only need 9 unique combinations)
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            satVec.crossVectors(satBoxA.axes[i], satBoxB.axes[j]);
            // Avoid adding zero vectors or redundant axes
            if (satVec.lengthSq() > 0.0001) {
                satAxes.push(satVec.clone().normalize()); // Add normalized axis
            }
        }
    }

    let minOverlap = Infinity;
    let mtvAxis = null;

    // Test each axis
    for (let i = 0; i < satAxes.length; i++) {
        const axis = satAxes[i];
        // Ensure axis is valid before projecting
        if (axis.lengthSq() < EPSILON * EPSILON) continue;

        projectOBB(satBoxA, axis, satIntervalA);
        projectOBB(satBoxB, axis, satIntervalB);

        const overlap = getIntervalOverlap(satIntervalA, satIntervalB);

        if (overlap === 0) {
            // Found a separating axis, no collision
            return { collision: false, mtvAxis: null, mtvDepth: null };
        } else {
            // Check if this is the minimum overlap so far
            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtvAxis = axis; // Store the axis associated with minimum overlap
            }
        }
    }

    // If we got here, intervals overlapped on all axes - collision detected.
    // Ensure MTV axis points consistently (e.g., from B to A)
    satCenterDiff.subVectors(satBoxA.center, satBoxB.center);
    if (mtvAxis && satCenterDiff.dot(mtvAxis) < 0) { // Check mtvAxis is not null
        mtvAxis.negate(); // Flip axis to point from B towards A
    }

    // Check if mtvAxis is valid before returning
    if (!mtvAxis || mtvAxis.lengthSq() < EPSILON * EPSILON) {
         console.warn("SAT collision detected but MTV axis is invalid.");
         return { collision: false, mtvAxis: null, mtvDepth: null }; // Treat as no collision if axis is bad
    }

    return { collision: true, mtvAxis: mtvAxis, mtvDepth: minOverlap };
}


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

    // --- Update Rotation ---
    if (Math.abs(speed) > 0.01) {
        const rotationAmount = steeringAngle * deltaTime * Math.sign(speed);
        const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAmount);
        activeCar.quaternion.multiplyQuaternions(deltaRotation, activeCar.quaternion);
        activeCar.updateMatrixWorld(); // Update matrix after rotation
    }

    // --- Calculate Potential Position ---
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion).normalize();
    const originalPosition = activeCar.position.clone(); // Store position before potential collision response
    const potentialNewPosition = originalPosition.clone().addScaledVector(forward, speed * deltaTime);

    // --- Predictive OBB Collision Detection ---
    let collisionDetected = false;
    let collidedOtherCar = null;
    let penetrationDepth = 0;
    collisionNormal.set(0, 0, 0);

    for (const key in otherCars) {
        const otherCar = otherCars[key];
        if (!otherCar || !otherCar.visible) continue;

        // --- Check if potential position causes collision ---
        const collisionResult = checkOBBCollisionSAT(activeCar, otherCar, potentialNewPosition);

        if (collisionResult.collision) {
            collisionDetected = true;
            collidedOtherCar = otherCar;
            penetrationDepth = collisionResult.mtvDepth;
            collisionNormal.copy(collisionResult.mtvAxis);

            // Collision found, stop checking other cars for this frame
            break;
        }
    }

    // --- Apply Movement or Response ---
    if (collisionDetected && collidedOtherCar) {
        // --- Collision Response ---
        console.log("Collision detected (OBB SAT)!");

        // Ensure MTV is valid
        if (collisionNormal.lengthSq() > EPSILON * EPSILON && penetrationDepth > EPSILON) {
            // Calculate how much the car was moving into the collision normal
            const relativeVelocity = forward.clone().multiplyScalar(speed); // Use current speed
            const separatingVelocity = relativeVelocity.dot(collisionNormal);

            // Apply bounce only if moving towards each other along the normal
            if (separatingVelocity < 0) {
                 // Simplified impulse-like response
                const restitution = COLLISION_RESTITUTION;
                const impulseMagnitude = -(1 + restitution) * separatingVelocity;

                // Apply impulse to speed along the collision normal
                const impulse = collisionNormal.clone().multiplyScalar(impulseMagnitude);
                const newVelocityVec = relativeVelocity.add(impulse);
                speed = newVelocityVec.length() * Math.sign(newVelocityVec.dot(forward)); // Update speed based on new velocity vector
                speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, speed)); // Re-clamp speed

                console.log(`Collision bounce applied. New speed: ${speed.toFixed(2)}`);
            }

            // Apply separation push based on MTV depth to the *original* position
            separationVector.copy(collisionNormal).multiplyScalar(penetrationDepth * COLLISION_SEPARATION_FACTOR);
            activeCar.position.copy(originalPosition).add(separationVector); // Apply separation from original position
            console.log(`Applying separation push: ${separationVector.toArray().map(n => n.toFixed(2)).join(',')}`);

        } else {
            // Fallback if MTV calculation somehow failed
            console.warn("Collision detected but MTV invalid. Applying fallback response.");
            speed *= -COLLISION_RESTITUTION; // Simple bounce
            activeCar.position.copy(originalPosition); // Stay at original position before fallback push
            activeCar.position.x += (Math.random() - 0.5) * 0.05; // Smaller random push
            activeCar.position.z += (Math.random() - 0.5) * 0.05;
        }
        // Car position is now set based on response

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
