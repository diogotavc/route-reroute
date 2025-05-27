import * as THREE from "three";
import { 
    DEBUG_COLLISIONS, 
    GRASS_SPEED_SCALE,
    GRASS_HEIGHT
} from './config.js';
import { isOnGrass } from './mapLoader.js';

export const MAX_SPEED = 15;
export const ACCELERATION_RATE = 5;
export const BRAKING_RATE = 10;
export const STEERING_RATE = 1.5;
export const FRICTION = 1;
export const STEERING_FRICTION = 2;
const COLLISION_BOUNCE_FACTOR = 0.5;
const HITBOX_SCALE = 0.8;

// Reusable vectors for calculations
const tempBox = new THREE.Box3();
const tempVector = new THREE.Vector3();

// Simple bounding box collision detection
function checkCollision(carA, carB, positionOverride = null) {
    // Get bounding boxes
    tempBox.setFromObject(carA);
    if (positionOverride) {
        const offset = tempVector.subVectors(positionOverride, carA.position);
        tempBox.translate(offset);
    }
    tempBox.expandByScalar(-tempBox.getSize(tempVector).length() * (1 - HITBOX_SCALE) * 0.5);
    
    const boxB = new THREE.Box3().setFromObject(carB);
    
    return tempBox.intersectsBox(boxB);
}

export function updatePhysics(activeCar, physicsState, inputState, deltaTime, otherCars, collidableMapTiles = [], mapDefinition = null) {
    let { speed, acceleration, steeringAngle } = physicsState;
    const { isAccelerating, isBraking, isTurningLeft, isTurningRight } = inputState;

    // Handle steering
    if (isTurningLeft) steeringAngle += STEERING_RATE * deltaTime;
    if (isTurningRight) steeringAngle -= STEERING_RATE * deltaTime;
    
    // Apply steering friction when not turning
    if (!isTurningLeft && !isTurningRight) {
        steeringAngle *= Math.max(0, 1 - STEERING_FRICTION * deltaTime);
    }
    
    // Clamp steering angle
    steeringAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, steeringAngle));

    // Handle acceleration
    if (isAccelerating) {
        acceleration = ACCELERATION_RATE;
    } else if (isBraking) {
        acceleration = -BRAKING_RATE;
    } else {
        // Natural friction
        acceleration = -Math.sign(speed) * FRICTION;
        if (Math.abs(speed) < FRICTION * deltaTime) {
            speed = 0;
            acceleration = 0;
        }
    }
    
    speed += acceleration * deltaTime;

    // Apply terrain speed limits
    let maxSpeed = MAX_SPEED;
    if (mapDefinition && isOnGrass(activeCar.position.x, activeCar.position.z, mapDefinition)) {
        maxSpeed *= GRASS_SPEED_SCALE;
    }
    
    speed = Math.max(-maxSpeed / 2, Math.min(maxSpeed, speed));
    
    // Hard stop when braking at low speeds
    if (isBraking && Math.abs(speed) < 0.1) speed = 0;

    // Apply rotation if moving
    if (Math.abs(speed) > 0.01) {
        const rotationAmount = steeringAngle * deltaTime * Math.sign(speed);
        activeCar.rotateY(rotationAmount);
    }

    // Calculate new position
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion);
    const originalPosition = activeCar.position.clone();
    const newPosition = originalPosition.clone().addScaledVector(forward, speed * deltaTime);

    // Check collisions
    let hasCollision = false;

    // Check car-to-car collisions
    for (const otherCar of Object.values(otherCars)) {
        if (otherCar && otherCar.visible && otherCar !== activeCar) {
            if (checkCollision(activeCar, otherCar, newPosition)) {
                hasCollision = true;
                if (DEBUG_COLLISIONS) {
                    console.log("Car collision detected with:", {
                        name: otherCar.name || "unnamed car",
                        uuid: otherCar.uuid,
                        position: otherCar.position,
                        activeCar: activeCar.name || activeCar.uuid,
                        activeCarPos: activeCar.position,
                        newPosition: newPosition
                    });
                }
                break;
            }
        }
    }

    // Check map tile collisions
    if (!hasCollision && collidableMapTiles) {
        for (const tile of collidableMapTiles) {
            if (tile?.visible && tile.userData?.isCollidable) {
                if (checkCollision(activeCar, tile, newPosition)) {
                    hasCollision = true;
                    if (DEBUG_COLLISIONS) {
                        console.log("Map collision detected with:", {
                            name: tile.name || "unnamed tile",
                            uuid: tile.uuid,
                            position: tile.position,
                            userData: tile.userData,
                            activeCar: activeCar.name || activeCar.uuid,
                            activeCarPos: activeCar.position,
                            newPosition: newPosition
                        });
                    }
                    break;
                }
            }
        }
    }

    // Handle collision response
    if (hasCollision) {
        // Simple bounce back
        speed *= -COLLISION_BOUNCE_FACTOR;
        // Keep original position
        activeCar.position.copy(originalPosition);
    } else {
        // Move to new position
        activeCar.position.copy(newPosition);
    }

    // Set height based on terrain
    if (mapDefinition) {
        const onGrass = isOnGrass(activeCar.position.x, activeCar.position.z, mapDefinition);
        activeCar.position.y = onGrass ? GRASS_HEIGHT : 0;
    }

    return {
        speed,
        acceleration,
        steeringAngle,
        collisionDetected: hasCollision
    };
}
