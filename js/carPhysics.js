import * as THREE from "three";
import * as Achievements from "./achievements.js";
import {
    GRASS_SPEED_SCALE,
    GRASS_HEIGHT,
    MAX_SPEED,
    ACCELERATION_RATE,
    BRAKING_RATE,
    STEERING_RATE,
    FRICTION,
    STEERING_FRICTION,
    COLLISION_RESTITUTION,
    COLLISION_SEPARATION_FACTOR,
    EPSILON,
    HITBOX_SCALE_FACTOR
} from './config.js';
import { isOnGrass, getGridCoordinates } from './mapLoader.js';

let collisionNormal = new THREE.Vector3();
let separationVector = new THREE.Vector3();

const satBoxA = { center: new THREE.Vector3(), halfExtents: new THREE.Vector3(), axes: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
const satBoxB = { center: new THREE.Vector3(), halfExtents: new THREE.Vector3(), axes: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
const satVec = new THREE.Vector3();
const satCenterDiff = new THREE.Vector3();
const satAxes = [];
const satIntervalA = { min: 0, max: 0 };
const satIntervalB = { min: 0, max: 0 };
const satTempBox = new THREE.Box3();

function getOBBData(car, obbData, positionOverride = null, isStaticTile = false) {
    if (car.userData.halfExtents) {
        obbData.halfExtents.copy(car.userData.halfExtents);
    } else {
        satTempBox.setFromObject(car); 
        satTempBox.getSize(obbData.halfExtents).multiplyScalar(0.5);
    }

    if (!isStaticTile) {
        obbData.halfExtents.multiplyScalar(HITBOX_SCALE_FACTOR);
    }

    obbData.center.copy(positionOverride ? positionOverride : car.position);

    obbData.axes[0].setFromMatrixColumn(car.matrixWorld, 0).normalize();
    obbData.axes[1].setFromMatrixColumn(car.matrixWorld, 1).normalize();
    obbData.axes[2].setFromMatrixColumn(car.matrixWorld, 2).normalize();
}

function projectOBB(obbData, axis, interval) {
    const centerProjection = obbData.center.dot(axis);

    const extentProjection =
        obbData.halfExtents.x * Math.abs(obbData.axes[0].dot(axis)) +
        obbData.halfExtents.y * Math.abs(obbData.axes[1].dot(axis)) +
        obbData.halfExtents.z * Math.abs(obbData.axes[2].dot(axis));

    interval.min = centerProjection - extentProjection;
    interval.max = centerProjection + extentProjection;
}

function getIntervalOverlap(intervalA, intervalB) {
    const minMax = Math.min(intervalA.max, intervalB.max);
    const maxMin = Math.max(intervalA.min, intervalB.min);
    const overlap = minMax - maxMin;
    return overlap > EPSILON ? overlap : 0;
}

function checkOBBCollisionSAT(carA, carB, positionAOverride = null, isCarBStaticTile = false) {
    getOBBData(carA, satBoxA, positionAOverride, false); 
    getOBBData(carB, satBoxB, null, isCarBStaticTile); 

    satAxes.length = 0; 

    satAxes.push(satBoxA.axes[0]);
    satAxes.push(satBoxA.axes[1]);
    satAxes.push(satBoxA.axes[2]);

    satAxes.push(satBoxB.axes[0]);
    satAxes.push(satBoxB.axes[1]);
    satAxes.push(satBoxB.axes[2]);

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            satVec.crossVectors(satBoxA.axes[i], satBoxB.axes[j]);
            if (satVec.lengthSq() > EPSILON * EPSILON) { 
                satAxes.push(satVec.clone().normalize());
            }
        }
    }

    let minOverlap = Infinity;
    let mtvAxis = null;

    for (let i = 0; i < satAxes.length; i++) {
        const axis = satAxes[i];
        if (axis.lengthSq() < EPSILON * EPSILON) continue; 

        projectOBB(satBoxA, axis, satIntervalA);
        projectOBB(satBoxB, axis, satIntervalB);

        const overlap = getIntervalOverlap(satIntervalA, satIntervalB);

        if (overlap === 0) {
            return { collision: false, mtvAxis: null, mtvDepth: null };
        } else {
            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtvAxis = axis;
            }
        }
    }

    satCenterDiff.subVectors(satBoxA.center, satBoxB.center);
    if (mtvAxis && satCenterDiff.dot(mtvAxis) < 0) {
        mtvAxis.negate();
    }

    if (!mtvAxis || mtvAxis.lengthSq() < EPSILON * EPSILON) {
        return { collision: false, mtvAxis: null, mtvDepth: null };
    }

    return { collision: true, mtvAxis: mtvAxis, mtvDepth: minOverlap };
}

export function updatePhysics(activeCar, physicsState, inputState, deltaTime, otherCars, collidableMapTiles = [], mapDefinition = null) {
    let { speed, acceleration, steeringAngle } = physicsState;
    const { isAccelerating, isBraking, isTurningLeft, isTurningRight } = inputState;

    let steeringChange = 0;
    if (isTurningLeft) steeringChange += STEERING_RATE * deltaTime;
    if (isTurningRight) steeringChange -= STEERING_RATE * deltaTime;
    steeringAngle += steeringChange;

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

    let maxSpeedForTerrain = MAX_SPEED;
    if (mapDefinition && isOnGrass(activeCar.position.x, activeCar.position.z, mapDefinition)) {
        maxSpeedForTerrain = MAX_SPEED * GRASS_SPEED_SCALE;
    }

    speed = Math.max(-maxSpeedForTerrain / 2, Math.min(maxSpeedForTerrain, speed)); 
    if (isBraking && Math.abs(speed) < 0.1) speed = 0; 

    if (Math.abs(speed) >= MAX_SPEED) {
        Achievements.onMaxSpeedReached({ 
            speed: Math.abs(speed), 
            maxSpeed: MAX_SPEED,
            percentage: (Math.abs(speed) / MAX_SPEED) * 100
        });
    } 

    if (Math.abs(speed) > 0.01) {
        const rotationAmount = steeringAngle * deltaTime * Math.sign(speed);
        const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAmount);
        activeCar.quaternion.multiplyQuaternions(deltaRotation, activeCar.quaternion);
        activeCar.updateMatrixWorld();

        if (speed < 0) {
            const reverseDistance = Math.abs(speed * deltaTime);
            Achievements.trackReverseDistance(reverseDistance);
        } else {
            Achievements.resetContinuousReverseDistance();
        }
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion).normalize();
    const originalPosition = activeCar.position.clone();
    const potentialNewPosition = originalPosition.clone().addScaledVector(forward, speed * deltaTime);

    let collisionDetectedThisFrame = false;
    let collidedObject = null; 
    let isStaticCollision = false;
    let penetrationDepth = 0;
    collisionNormal.set(0, 0, 0);

    for (const key in otherCars) {
        const otherCar = otherCars[key];
        if (!otherCar || !otherCar.visible || otherCar === activeCar) continue;

        const collisionResult = checkOBBCollisionSAT(activeCar, otherCar, potentialNewPosition, false);

        if (collisionResult.collision) {
            collisionDetectedThisFrame = true;
            collidedObject = otherCar;
            isStaticCollision = false;
            penetrationDepth = collisionResult.mtvDepth;
            collisionNormal.copy(collisionResult.mtvAxis);

            const activeForward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion);
            const activeRight = new THREE.Vector3(1, 0, 0).applyQuaternion(activeCar.quaternion);
            const otherForward = new THREE.Vector3(0, 0, 1).applyQuaternion(otherCar.quaternion);
            const collisionAngle = Math.acos(Math.abs(activeForward.dot(otherForward))) * (180 / Math.PI);

            Achievements.onCarCollision({ 
                angle: collisionAngle,
                speed: speed,
                otherCarName: otherCar.name || 'unknown',
                penetrationDepth: penetrationDepth,
                collisionNormal: collisionNormal.clone(),
                activeCarRight: activeRight.clone()
            });

            break; 
        }
    }

    if (!collisionDetectedThisFrame && collidableMapTiles) {
        for (const tile of collidableMapTiles) {
            if (!tile || !tile.visible || !tile.userData.isCollidable || !tile.userData.halfExtents) continue;

            const collisionResult = checkOBBCollisionSAT(activeCar, tile, potentialNewPosition, true);

            if (collisionResult.collision) {
                collisionDetectedThisFrame = true;
                collidedObject = tile;
                isStaticCollision = true;
                penetrationDepth = collisionResult.mtvDepth;
                collisionNormal.copy(collisionResult.mtvAxis);

                Achievements.onBuildingCollision({
                    speed: speed,
                    tileName: tile.name || tile.uuid,
                    penetrationDepth: penetrationDepth
                });
                
                break; 
            }
        }
    }

    if (collisionDetectedThisFrame && collidedObject) {
        if (collisionNormal.lengthSq() > EPSILON * EPSILON && penetrationDepth > EPSILON) {
            const relativeVelocity = forward.clone().multiplyScalar(speed); 
            const separatingVelocity = relativeVelocity.dot(collisionNormal); 

            if (separatingVelocity < 0) { 
                const restitution = COLLISION_RESTITUTION;
                const impulseMagnitude = -(1 + restitution) * separatingVelocity;
                const impulse = collisionNormal.clone().multiplyScalar(impulseMagnitude);

                const newVelocityVec = relativeVelocity.add(impulse); 

                const newSpeedMagnitude = newVelocityVec.length();
                if (newSpeedMagnitude > EPSILON) {
                    const directionSign = Math.sign(newVelocityVec.dot(forward)); 
                    speed = newSpeedMagnitude * directionSign;
                } else {
                    speed = 0; 
                }
                speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, speed));
            }

            separationVector.copy(collisionNormal).multiplyScalar(penetrationDepth * COLLISION_SEPARATION_FACTOR);
            activeCar.position.copy(originalPosition).add(separationVector); 

        } else {
            if (!isStaticCollision) speed *= -COLLISION_RESTITUTION;
            else speed = 0; 
            activeCar.position.copy(originalPosition);
        }
    } else {
        activeCar.position.copy(potentialNewPosition);
    }

    if (mapDefinition) {
        const isCarOnGrass = isOnGrass(activeCar.position.x, activeCar.position.z, mapDefinition);
        const targetHeight = isCarOnGrass ? GRASS_HEIGHT : 0;
        activeCar.position.y = targetHeight;

        if (isCarOnGrass) {
            const layout = mapDefinition.layout;
            const gridCoords = getGridCoordinates(activeCar.position.x, activeCar.position.z, mapDefinition);
            const isOutOfBounds = gridCoords.z < 0 || gridCoords.z >= layout.length || gridCoords.x < 0 || gridCoords.x >= layout[0].length;

            if (isOutOfBounds) {
                Achievements.onOutOfBounds({
                    position: { x: activeCar.position.x, y: activeCar.position.y, z: activeCar.position.z },
                    gridCoords: gridCoords
                });
            } else {
                Achievements.onGrassDetected({
                    position: { x: activeCar.position.x, y: activeCar.position.y, z: activeCar.position.z }
                });
            }
        }
    }

    return {
        speed: speed,
        acceleration: acceleration,
        steeringAngle: steeringAngle,
        collisionDetected: collisionDetectedThisFrame
    };
}
