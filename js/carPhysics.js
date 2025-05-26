import * as THREE from "three";

export const MAX_SPEED = 15;
export const ACCELERATION_RATE = 5;
export const BRAKING_RATE = 10;
export const STEERING_RATE = 1.5;
export const FRICTION = 1;
export const STEERING_FRICTION = 2;

export function updatePhysics(activeCar, physicsState, inputState, deltaTime) {
    let { speed, acceleration, steeringAngle } = physicsState;
    const { isAccelerating, isBraking, isTurningLeft, isTurningRight } = inputState;

    if (isTurningLeft) steeringAngle += STEERING_RATE * deltaTime;
    if (isTurningRight) steeringAngle -= STEERING_RATE * deltaTime;

    if (!isTurningLeft && !isTurningRight) {
        steeringAngle -= steeringAngle * STEERING_FRICTION * deltaTime;
        if (Math.abs(steeringAngle) < 0.01) steeringAngle = 0;
    }
    steeringAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, steeringAngle));

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
    speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, speed));
    if (isBraking && Math.abs(speed) < 0.1) speed = 0;

    if (Math.abs(speed) > 0.01) {
        const rotationAmount = steeringAngle * deltaTime * Math.sign(speed);
        activeCar.rotateY(rotationAmount);
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion);
    activeCar.position.addScaledVector(forward, speed * deltaTime);

    return {
        speed,
        acceleration,
        steeringAngle,
        collisionDetected: false
    };
}
