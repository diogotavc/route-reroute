import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as CarPhysics from "./carPhysics.js";
import { 
    DEBUG_CAR_COORDS, 
    DEBUG_MODEL_LOADING, 
    DEBUG_MAP_LEVEL_LOGIC,
    DEBUG_REWIND,
    DEBUG_GENERAL,
    DEBUG_CAR_REACTIONS,
    DEBUG_CAR_HEALTH,
    HEADLIGHT_INTENSITY,
    HEADLIGHT_DISTANCE,
    HEADLIGHT_ANGLE,
    HEADLIGHT_PENUMBRA,
    HEADLIGHT_COLOR,
    HEADLIGHT_AUTO_MODE,
    HEADLIGHT_TURN_ON_TIME,
    HEADLIGHT_TURN_OFF_TIME,
    TARGET_REWIND_DURATION,
    REWIND_INTERPOLATION,
    CAR_REACTION_DISTANCE,
    CAR_REACTION_ANGLE_THRESHOLD,
    CAR_HONK_TIMES,
    CAR_FLASH_DURATION,
    CAR_FLASH_INTERVALS,
    CAR_REACTION_COOLDOWN,
    CAR_MAX_HEALTH,
    CAR_COLLISION_DAMAGE,
    CAR_COLLISION_DAMAGE_COOLDOWN
} from './config.js';

let debug_coordinateLogInterval = 1.0;
let debug_timeSinceLastCoordinateLog = 0;


let scene = null;
let camera = null;
let controls = null;

export function initCars(sceneObj, cameraObj, controlsObj) {
    scene = sceneObj;
    camera = cameraObj;
    controls = controlsObj;
    
    initAudioSystem();
}

const modelLoader = new GLTFLoader();

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
let currentFinishPointMarker = null;
let currentMissionDestination = null;

let carHeadlights = {};
let headlightsEnabled = HEADLIGHT_AUTO_MODE;
let currentTimeOfDay = 0.5;

let carReactions = {};
let honkAudio = null;
let audioInitialized = false;

let carHealth = CAR_MAX_HEALTH;
let lastDamageTime = 0;

function updateCarHealth(deltaTime, collisionDetected) {
    const currentTime = elapsedTime;
    
    if (collisionDetected) {
        if (currentTime - lastDamageTime >= CAR_COLLISION_DAMAGE_COOLDOWN) {
            const oldHealth = carHealth;
            carHealth -= CAR_COLLISION_DAMAGE;
            carHealth = Math.max(0, carHealth);
            lastDamageTime = currentTime;
            
            if (DEBUG_CAR_HEALTH) console.log(`Collision damage! Health: ${oldHealth} → ${carHealth} (-${CAR_COLLISION_DAMAGE})`);

            if (carHealth <= 0) {
                if (DEBUG_CAR_HEALTH) console.log("Health depleted! Auto-rewind triggered.");
                setRewinding();
                carHealth = CAR_MAX_HEALTH;
                return;
            }
        }
    }
}

function resetCarHealth() {
    carHealth = CAR_MAX_HEALTH;
    lastDamageTime = 0;
    if (DEBUG_CAR_HEALTH) console.log("Health reset to maximum");
}

export function getCarHealth() {
    return {
        current: carHealth,
        max: CAR_MAX_HEALTH,
        percentage: (carHealth / CAR_MAX_HEALTH) * 100
    };
}

function initAudioSystem() {
    try {
        honkAudio = new Audio('assets/audio/honk.mp3');
        honkAudio.preload = 'auto';
        honkAudio.volume = 0.7;

        const enableAudio = () => {
            if (!audioInitialized) {
                audioInitialized = true;
                if (DEBUG_CAR_REACTIONS) console.log("Audio system enabled after user interaction");
            }
        };

        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        if (DEBUG_CAR_REACTIONS) console.log("Audio system initialized for car reactions");
    } catch (error) {
        console.warn("Could not load honk audio file:", error);
    }
}

function playHonkSound() {
    if (!honkAudio || !audioInitialized) {
        if (DEBUG_CAR_REACTIONS) console.log("Audio not available - user interaction required or audio not loaded");
        return;
    }
    
    try {
        honkAudio.currentTime = 0;
        const playPromise = honkAudio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                if (DEBUG_CAR_REACTIONS) console.log("Playing honk sound");
            }).catch(error => {
                if (DEBUG_CAR_REACTIONS) console.warn("Could not play honk sound:", error);
            });
        }
    } catch (error) {
        if (DEBUG_CAR_REACTIONS) console.warn("Could not play honk sound:", error);
    }
}

function isPassingInFront(activeCar, otherCar) {
    const activePos = activeCar.position;
    const otherPos = otherCar.position;

    const distance = activePos.distanceTo(otherPos);
    if (distance > CAR_REACTION_DISTANCE) return false;

    const activeForward = new THREE.Vector3(0, 0, 1).applyQuaternion(activeCar.quaternion);
    const otherForward = new THREE.Vector3(0, 0, 1).applyQuaternion(otherCar.quaternion);

    const toActive = new THREE.Vector3().subVectors(activePos, otherPos).normalize();

    const frontDot = otherForward.dot(toActive);
    if (frontDot < Math.cos(CAR_REACTION_ANGLE_THRESHOLD)) return false;

    const activeSpeed = Math.abs(carSpeed);
    if (activeSpeed < 0.5) return false;

    const activeVelocity = activeForward.clone().multiplyScalar(activeSpeed);
    const crossProduct = activeVelocity.cross(toActive);
    const isCrossing = crossProduct.length() > 0.1;
    
    return isCrossing;
}

function initCarReaction(carIndex) {
    if (!carReactions[carIndex]) {
        carReactions[carIndex] = {
            lastReactionTime: 0,
            isHonking: false,
            honkCount: 0,
            isFlashing: false,
            flashStartTime: 0,
            originalLeftIntensity: 0,
            originalRightIntensity: 0
        };
    }
}

function triggerCarReaction(carIndex, isDaytime) {
    const currentTime = elapsedTime;
    const reaction = carReactions[carIndex];

    if (currentTime - reaction.lastReactionTime < CAR_REACTION_COOLDOWN) return;

    reaction.lastReactionTime = currentTime;

    if (isDaytime) {
        reaction.isHonking = true;
        reaction.honkCount = CAR_HONK_TIMES;
        
        for (let i = 0; i < CAR_HONK_TIMES; i++) {
            setTimeout(() => playHonkSound(), i * 800);
        }

        setTimeout(() => {
            reaction.isHonking = false;
        }, CAR_HONK_TIMES * 800 + 500);
        
        if (DEBUG_CAR_REACTIONS) console.log(`Car ${carIndex} honking ${CAR_HONK_TIMES} times (daytime)${!audioInitialized ? ' - Audio disabled until user interaction' : ''}`);
    } else {
        const headlightSet = carHeadlights[carIndex];
        if (headlightSet) {
            reaction.isFlashing = true;
            reaction.flashStartTime = currentTime;
            reaction.originalLeftIntensity = headlightSet.left.intensity;
            reaction.originalRightIntensity = headlightSet.right.intensity;
            if (DEBUG_CAR_REACTIONS) console.log(`Car ${carIndex} flashing headlights (nighttime)`);
        }
    }
}

function updateCarReactions(deltaTime) {
    if (isRewinding) return;

    const currentTime = elapsedTime;

    for (const carIndex in carReactions) {
        const reaction = carReactions[carIndex];

        if (reaction.isFlashing) {
            const flashElapsed = currentTime - reaction.flashStartTime;
            const headlightSet = carHeadlights[carIndex];
            
            if (headlightSet && flashElapsed < CAR_FLASH_DURATION) {
                const flashInterval = CAR_FLASH_DURATION / (CAR_FLASH_INTERVALS * 2);
                const shouldBeOn = Math.floor(flashElapsed / flashInterval) % 2 === 0;

                if (shouldBeOn) {
                    headlightSet.left.intensity = HEADLIGHT_INTENSITY * 1.5;
                    headlightSet.right.intensity = HEADLIGHT_INTENSITY * 1.5;
                } else {
                    headlightSet.left.intensity = 0;
                    headlightSet.right.intensity = 0;
                }
            } else {
                if (headlightSet) {
                    headlightSet.left.intensity = reaction.originalLeftIntensity;
                    headlightSet.right.intensity = reaction.originalRightIntensity;
                }
                reaction.isFlashing = false;
                if (DEBUG_CAR_REACTIONS) console.log(`Car ${carIndex} finished flashing headlights`);
            }
        }
    }
}

function stopAllCarReactions() {
    for (const carIndex in carReactions) {
        const reaction = carReactions[carIndex];

        reaction.isHonking = false;
        reaction.honkCount = 0;

        if (reaction.isFlashing) {
            reaction.isFlashing = false;
            const headlightSet = carHeadlights[carIndex];
            if (headlightSet) {
                headlightSet.left.intensity = reaction.originalLeftIntensity;
                headlightSet.right.intensity = reaction.originalRightIntensity;
            }
            if (DEBUG_CAR_REACTIONS) console.log(`Car ${carIndex} stopped flashing due to rewind`);
        }
    }
}

function checkCarReactions() {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar || isRewinding) return;

    const isDaytime = currentTimeOfDay > HEADLIGHT_TURN_OFF_TIME && currentTimeOfDay < HEADLIGHT_TURN_ON_TIME;

    for (const key in loadedCarModels) {
        const carIndex = parseInt(key);
        if (carIndex === missionIndex) continue; // Skip active car

        const otherCar = loadedCarModels[carIndex];
        if (!otherCar || !otherCar.visible) continue;

        const recording = recordedMovements[carIndex];
        if (recording && recording.length > 0) {
            const lastRecordedTime = recording[recording.length - 1].time;
            if (elapsedTime > lastRecordedTime) {
                continue;
            }
        }

        initCarReaction(carIndex);

        if (isPassingInFront(activeCar, otherCar)) {
            triggerCarReaction(carIndex, isDaytime);
        }
    }
}

const recordedMovements = {};
let currentRecording = [];

let carSpeed = 0;
let carAcceleration = 0;
let steeringAngle = 0;
let isAccelerating = false;
let isBraking = false;
let isTurningLeft = false;
let isTurningRight = false;

let isRewinding = false;
let rewindSpeedFactor;
let elapsedTime = 0;

const CAMERA_FOLLOW_SPEED = 2.0;
const CAMERA_DISTANCE = 18;
const CAMERA_HEIGHT = 10;
const LOOK_AT_Y_OFFSET = 3.5;

const FIRST_PERSON_HEIGHT_OFFSET = 1.2;
const FIRST_PERSON_FORWARD_OFFSET = 0.3;

let isFirstPersonMode = false;

function createHeadlights(carModel, carIndex) {
    const bbox = new THREE.Box3().setFromObject(carModel);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    
    const frontDistance = size.z * 0.5;
    const sideDistance = Math.max(size.x * 0.3, 0.4);
    const heightOffset = Math.max(size.y * 0.25, 0.3);

    const leftHeadlight = new THREE.SpotLight(
        HEADLIGHT_COLOR,
        HEADLIGHT_INTENSITY,
        HEADLIGHT_DISTANCE,
        HEADLIGHT_ANGLE,
        HEADLIGHT_PENUMBRA
    );

    const rightHeadlight = new THREE.SpotLight(
        HEADLIGHT_COLOR,
        HEADLIGHT_INTENSITY,
        HEADLIGHT_DISTANCE,
        HEADLIGHT_ANGLE,
        HEADLIGHT_PENUMBRA
    );

    leftHeadlight.position.set(-sideDistance, heightOffset, frontDistance);
    rightHeadlight.position.set(sideDistance, heightOffset, frontDistance);

    const leftTarget = new THREE.Object3D();
    const rightTarget = new THREE.Object3D();

    const targetDistance = 15;
    const convergenceAngle = 0.1;
    leftTarget.position.set(
        -sideDistance * 0.3,
        -0.5,
        frontDistance + targetDistance
    );
    rightTarget.position.set(
        sideDistance * 0.3,
        -0.5,
        frontDistance + targetDistance
    );

    leftHeadlight.target = leftTarget;
    rightHeadlight.target = rightTarget;

    leftHeadlight.castShadow = true;
    rightHeadlight.castShadow = true;

    leftHeadlight.shadow.mapSize.width = 2048;
    leftHeadlight.shadow.mapSize.height = 2048;
    leftHeadlight.shadow.camera.near = 0.1;
    leftHeadlight.shadow.camera.far = HEADLIGHT_DISTANCE;
    leftHeadlight.shadow.bias = -0.0001;
    leftHeadlight.shadow.normalBias = 0.02;

    rightHeadlight.shadow.mapSize.width = 2048;
    rightHeadlight.shadow.mapSize.height = 2048;
    rightHeadlight.shadow.camera.near = 0.1;
    rightHeadlight.shadow.camera.far = HEADLIGHT_DISTANCE;
    rightHeadlight.shadow.bias = -0.0001;
    rightHeadlight.shadow.normalBias = 0.02;

    carModel.add(leftHeadlight);
    carModel.add(rightHeadlight);
    carModel.add(leftTarget);
    carModel.add(rightTarget);

    carHeadlights[carIndex] = {
        left: leftHeadlight,
        right: rightHeadlight,
        leftTarget: leftTarget,
        rightTarget: rightTarget
    };

    leftHeadlight.intensity = 0;
    rightHeadlight.intensity = 0;
    
    if (DEBUG_MODEL_LOADING) {
        console.log(`Created headlights for car ${carIndex} (${carModel.name || 'unnamed'}) at positions:`, 
                   `Left: (${leftHeadlight.position.x.toFixed(2)}, ${leftHeadlight.position.y.toFixed(2)}, ${leftHeadlight.position.z.toFixed(2)})`,
                   `Right: (${rightHeadlight.position.x.toFixed(2)}, ${rightHeadlight.position.y.toFixed(2)}, ${rightHeadlight.position.z.toFixed(2)})`,
                   `Car size: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`);
    }
}

export function loadCarModels(processedLevelData) {
    levels = processedLevelData;
    const loadModelPromises = levels.map((mission, index) => {
        if (!mission) return Promise.resolve();

        const name = mission[0];
        const path = carModels[name]?.[0];
        if (!path) {
            if (DEBUG_MODEL_LOADING) console.error(`Model path for "${name}" not found in carModels config.`);
            return Promise.reject(`Missing model path for ${name}`);
        }
        const startingPoint = mission[3];
        const initialRotationY = mission[5] !== undefined ? mission[5] : 0;

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

                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    model.userData.halfExtents = size.multiplyScalar(0.5);

                    model.visible = false;
                    model.scale.set(1, 1, 1);
                    model.position.set(
                        startingPoint[0],
                        startingPoint[1],
                        startingPoint[2],
                    );
                    model.rotation.y = THREE.MathUtils.degToRad(initialRotationY);

                    createHeadlights(model, index);

                    scene.add(model);
                    loadedCarModels[index] = model;

                    if (DEBUG_MODEL_LOADING) console.debug(
                        `Loaded car model ${index + 1}/${levels.length} - ${name} at [${startingPoint.join(',')}] rotY: ${initialRotationY}`,
                    );
                    resolve();
                },
                undefined,
                (error) => {
                    if (DEBUG_MODEL_LOADING) console.error(`Error loading car model ${name} (index ${index}):`, error);
                    reject(error);
                },
            );
        });
    });

    return Promise.all(loadModelPromises.filter(p => p)).then(() => {
        if (Object.keys(loadedCarModels).length > 0) {
            setActiveCar(0);
        }
    });
}

function createFinishPointMarker(position) {
    if (currentFinishPointMarker) {
        scene.remove(currentFinishPointMarker);
        currentFinishPointMarker.geometry.dispose();
        currentFinishPointMarker.material.dispose();
        currentFinishPointMarker = null;
    }

    if (!position) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("createFinishPointMarker: No position provided, marker not created.");
        return;
    }

    const markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    currentFinishPointMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    currentFinishPointMarker.position.set(position.x, position.y + 5, position.z); 
    scene.add(currentFinishPointMarker);
    if (DEBUG_MAP_LEVEL_LOGIC) console.log("createFinishPointMarker - Marker added to scene at:", currentFinishPointMarker.position, "Visible:", currentFinishPointMarker.visible);
}

function setActiveCar(index) {
    var carCount = Object.keys(loadedCarModels).length;
    if (index < 0 || index >= carCount) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.error("Invalid car index:", index);
        return;
    }

    if (currentRecording.length > 0) {
        recordedMovements[missionIndex] = currentRecording;
        if (DEBUG_REWIND) console.log(`Stored recording for car index ${missionIndex} with ${currentRecording.length} states.`);
    }

    currentRecording = [];
    elapsedTime = 0;
    isRewinding = false;

    if (loadedCarModels[missionIndex] && missionIndex !== index) {
    }

    const missionData = levels[index];
    if (!missionData) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.error(`setActiveCar: No mission data found for index ${index}.`);
        currentMissionDestination = null;
        createFinishPointMarker(null);
        return null;
    }
    if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - Full Mission Data for index", index, ":", missionData);

    var [modelName, character, backstory, startingPoint, finishingPoint, initialRotationY] = missionData;
    if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - Raw finishingPoint from missionData:", finishingPoint);

    var characterName =
        String(character).charAt(0).toUpperCase() + String(character).slice(1);
    if (DEBUG_GENERAL) console.log(`${characterName}: ${backstory}`);
    if (DEBUG_MAP_LEVEL_LOGIC) console.log(
        `Drive ${modelName} from ${startingPoint.join(',')} to ${finishingPoint && Array.isArray(finishingPoint) ? finishingPoint.join(',') : 'an open area'}.`
    );

    if (finishingPoint && Array.isArray(finishingPoint) && finishingPoint.length === 3) {
        currentMissionDestination = new THREE.Vector3(finishingPoint[0], finishingPoint[1], finishingPoint[2]);
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - currentMissionDestination successfully set to:", currentMissionDestination);
        createFinishPointMarker(currentMissionDestination);
    } else {
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("setActiveCar - No valid finishingPoint data. No destination marker will be created. finishingPoint was:", finishingPoint);
        currentMissionDestination = null;
        createFinishPointMarker(null);
    }

    const activeCar = loadedCarModels[index];
    const previousMissionIndex = missionIndex;
    missionIndex = index;

    if (previousMissionIndex !== index && loadedCarModels[previousMissionIndex]) {
        loadedCarModels[previousMissionIndex].visible = true;
    }

    activeCar.position.set(startingPoint[0], startingPoint[1], startingPoint[2]);
    activeCar.rotation.y = THREE.MathUtils.degToRad(initialRotationY || 0);

    const initialPosition = activeCar.position.clone();
    const initialRotation = activeCar.quaternion.clone();
    currentRecording.push({
        time: 0,
        position: initialPosition,
        rotation: initialRotation,
        timeOfDay: window.getCurrentTimeOfDay(),
    });

    if (isFirstPersonMode) {
        const firstPersonOffset = new THREE.Vector3(0, FIRST_PERSON_HEIGHT_OFFSET, FIRST_PERSON_FORWARD_OFFSET);
        const worldOffset = firstPersonOffset.applyQuaternion(activeCar.quaternion);
        const desiredCameraPosition = activeCar.position.clone().add(worldOffset);

        camera.position.copy(desiredCameraPosition);

        const forward = new THREE.Vector3(0, 0, 10).applyQuaternion(activeCar.quaternion);
        const lookAtPoint = activeCar.position.clone().add(forward);
        lookAtPoint.y += FIRST_PERSON_HEIGHT_OFFSET;

        controls.target.copy(lookAtPoint);
        camera.lookAt(controls.target);

        activeCar.visible = false;
    } else {
        const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
        const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion);
        const desiredCameraPosition = activeCar.position.clone().add(worldOffset);

        camera.position.copy(desiredCameraPosition);

        const initialLookAtPoint = activeCar.position.clone();
        initialLookAtPoint.y += LOOK_AT_Y_OFFSET;
        controls.target.copy(initialLookAtPoint);
        camera.lookAt(controls.target);
        
        activeCar.visible = true;
    }

    carSpeed = 0;
    carAcceleration = 0;
    steeringAngle = 0;
    isAccelerating = false;
    isBraking = false;
    isTurningLeft = false;
    isTurningRight = false;

    resetCarHealth();

    return activeCar;
}

export function nextCar() {
    var carCount = Object.keys(loadedCarModels).length;
    if (carCount == missionIndex + 1) {
        if (DEBUG_MAP_LEVEL_LOGIC) console.log("All missions for this level completed!");
        if (currentFinishPointMarker) {
            scene.remove(currentFinishPointMarker);
            currentFinishPointMarker.geometry.dispose();
            currentFinishPointMarker.material.dispose();
            currentFinishPointMarker = null;
        }
        currentMissionDestination = null;
        return -1;
    }
    const nextIndex = (missionIndex + 1) % carCount;
    setActiveCar(nextIndex);
    return loadedCarModels[nextIndex];
}

export function setAccelerating(value) {
    isAccelerating = value;
    if (value) isBraking = false;
}

export function setBraking(value) {
    isBraking = value;
    if (value) isAccelerating = false;
}

export function setTurningLeft(value) {
    isTurningLeft = value;
}

export function setTurningRight(value) {
    isTurningRight = value;
}

export function toggleCameraMode() {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;
    
    isFirstPersonMode = !isFirstPersonMode;
    
    if (isFirstPersonMode) {
        activeCar.visible = false;
        console.log("Switched to first-person camera mode");
    } else {
        activeCar.visible = true;
        console.log("Switched to third-person camera mode");
    }
}

export function setRewinding() {
    isRewinding = true;
    
    // Stop all ongoing car reactions (honking and flashing)
    stopAllCarReactions();
    
    const totalRecordedTime = Math.max(0, currentRecording.length > 0 ? currentRecording[currentRecording.length - 1].time : 0);
    elapsedTime = totalRecordedTime;

    rewindSpeedFactor = totalRecordedTime > 0 ? totalRecordedTime / TARGET_REWIND_DURATION : 1.0;
    
    console.log(`Starting rewind. Total recorded time: ${totalRecordedTime.toFixed(2)}s, Speed factor: ${rewindSpeedFactor.toFixed(2)}, Rewind duration: ${TARGET_REWIND_DURATION}s, Interpolation: ${REWIND_INTERPOLATION}`);
}

export function updateHeadlights(timeOfDay) {
    currentTimeOfDay = timeOfDay;

    if (!HEADLIGHT_AUTO_MODE) return;

    const shouldBeOn = timeOfDay >= HEADLIGHT_TURN_ON_TIME || timeOfDay <= HEADLIGHT_TURN_OFF_TIME;
    const targetIntensity = shouldBeOn ? HEADLIGHT_INTENSITY : 0;

    for (const carIndex in carHeadlights) {
        const headlightSet = carHeadlights[carIndex];
        headlightSet.left.intensity = targetIntensity;
        headlightSet.right.intensity = targetIntensity;
    }
}

export function toggleHeadlights() {
    headlightsEnabled = !headlightsEnabled;
    const targetIntensity = headlightsEnabled ? HEADLIGHT_INTENSITY : 0;

    for (const carIndex in carHeadlights) {
        const headlightSet = carHeadlights[carIndex];
        headlightSet.left.intensity = targetIntensity;
        headlightSet.right.intensity = targetIntensity;
    }

    console.log(`Headlights ${headlightsEnabled ? 'enabled' : 'disabled'}`);
}

export function setHeadlightsEnabled(enabled) {
    headlightsEnabled = enabled;
    const targetIntensity = enabled ? HEADLIGHT_INTENSITY : 0;
    
    for (const carIndex in carHeadlights) {
        const headlightSet = carHeadlights[carIndex];
        headlightSet.left.intensity = targetIntensity;
        headlightSet.right.intensity = targetIntensity;
    }
}

let tempReplayPosition = new THREE.Vector3();
let tempReplayQuaternion = new THREE.Quaternion();

function applyEasing(t, type) {
    switch (type) {
        case 'linear':
            return t;
        case 'ease':
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        case 'ease-in':
            return t * t * t;
        case 'ease-out':
            return 1 - Math.pow(1 - t, 3);
        case 'ease-in-out':
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        default:
            return t;
    }
}

export function updateCarPhysics(deltaTime, collidableMapTiles = [], mapDefinition = null) {
    const activeCar = loadedCarModels[missionIndex];
    if (!activeCar) return;

    debug_timeSinceLastCoordinateLog += deltaTime;
    if (debug_timeSinceLastCoordinateLog >= debug_coordinateLogInterval) {
        const pos = activeCar.position;
        if (DEBUG_CAR_COORDS) console.log(
            `Active Car Coords: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed( 2 )}, Z=${pos.z.toFixed(2)}`
        );
        if (currentMissionDestination) {
            const distanceToDestination = pos.distanceTo(currentMissionDestination);
            if (DEBUG_CAR_COORDS) console.log(`  Mission Dest: ${currentMissionDestination.x.toFixed(2)},${currentMissionDestination.y.toFixed(2)},${currentMissionDestination.z.toFixed(2)}. Dist: ${distanceToDestination.toFixed(2)}`);
        }
        debug_timeSinceLastCoordinateLog -= debug_coordinateLogInterval;
    }

    if (isRewinding) {
        const totalRecordedTime = currentRecording.length > 0 ? currentRecording[currentRecording.length - 1].time : 0;
        const rawProgress = totalRecordedTime > 0 ? (totalRecordedTime - elapsedTime) / totalRecordedTime : 0;

        const easedProgress = applyEasing(Math.max(0, Math.min(1, rawProgress)), REWIND_INTERPOLATION);

        const easedElapsedTime = totalRecordedTime * (1 - easedProgress);

        elapsedTime -= deltaTime * rewindSpeedFactor;
        elapsedTime = Math.max(0, elapsedTime);

        if (currentRecording.length > 1) {
            let state1 = currentRecording[0];
            let state2 = currentRecording[currentRecording.length - 1];

            for (let i = 0; i < currentRecording.length - 1; i++) {
                if (currentRecording[i].time <= easedElapsedTime && currentRecording[i + 1].time >= easedElapsedTime) {
                    state1 = currentRecording[i];
                    state2 = currentRecording[i + 1];
                    break;
                }
            }

            const timeDiff = state2.time - state1.time;
            let interpFactor = (timeDiff > 0) ? (easedElapsedTime - state1.time) / timeDiff : (easedElapsedTime >= state2.time ? 1 : 0);
            interpFactor = Math.max(0, Math.min(1, interpFactor));

            tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
            tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

            let interpolatedTimeOfDay;
            if (state1.timeOfDay !== undefined && state2.timeOfDay !== undefined) {
                let timeDiff = state2.timeOfDay - state1.timeOfDay;
                if (timeDiff < -0.5) {
                    timeDiff += 1.0;
                } else if (timeDiff > 0.5) {
                    timeDiff -= 1.0;
                }
                interpolatedTimeOfDay = state1.timeOfDay + (timeDiff * interpFactor);
                if (interpolatedTimeOfDay < 0) interpolatedTimeOfDay += 1.0;
                if (interpolatedTimeOfDay > 1) interpolatedTimeOfDay -= 1.0;
                window.setTimeOfDay(interpolatedTimeOfDay);
            }

            activeCar.position.copy(tempReplayPosition);
            activeCar.quaternion.copy(tempReplayQuaternion);

        } else if (currentRecording.length === 1) {
            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);
            if (currentRecording[0].timeOfDay !== undefined) {
                window.setTimeOfDay(currentRecording[0].timeOfDay);
            }
        }

        if (elapsedTime <= 0 && currentRecording.length > 0) {
            console.log("Rewind finished.");
            isRewinding = false;

            activeCar.position.copy(currentRecording[0].position);
            activeCar.quaternion.copy(currentRecording[0].rotation);
            if (currentRecording[0].timeOfDay !== undefined) {
                window.setTimeOfDay(currentRecording[0].timeOfDay);
            }

            carSpeed = 0;
            carAcceleration = 0;
            steeringAngle = 0;

            currentRecording = [currentRecording[0]];
            console.log(`Recording reset to initial state at time 0.`);
        }

    } else {
        elapsedTime += deltaTime;

        if (currentMissionDestination) {
            const distanceToDestination = activeCar.position.distanceTo(currentMissionDestination);
            const completionThreshold = 2.0;

            if (distanceToDestination < completionThreshold) {
                console.log(`Mission ${missionIndex + 1} (index ${missionIndex}) completed! Reached destination. Distance: ${distanceToDestination.toFixed(2)}`);
                if (currentFinishPointMarker) {
                    scene.remove(currentFinishPointMarker);
                    currentFinishPointMarker.geometry.dispose();
                    currentFinishPointMarker.material.dispose();
                    currentFinishPointMarker = null;
                }
                currentMissionDestination = null;

                const nextCarResult = nextCar();
                if (nextCarResult === -1) {
                    console.log("All missions finished for the current level.");
                }
                return;
            }
        }

        const currentPhysicsState = { speed: carSpeed, acceleration: carAcceleration, steeringAngle: steeringAngle };
        const currentInputState = { isAccelerating, isBraking, isTurningLeft, isTurningRight };

        const otherCars = {};
        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex !== missionIndex) {
                otherCars[carIndex] = loadedCarModels[carIndex];
            }
        }

        const updatedPhysicsState = CarPhysics.updatePhysics(
            activeCar,
            currentPhysicsState,
            currentInputState,
            deltaTime,
            otherCars,
            collidableMapTiles,
            mapDefinition
        );

        carSpeed = updatedPhysicsState.speed;
        carAcceleration = updatedPhysicsState.acceleration;
        steeringAngle = updatedPhysicsState.steeringAngle;

        updateCarHealth(deltaTime, updatedPhysicsState.collisionDetected);

        checkCarReactions();

        currentRecording.push({
            time: elapsedTime,
            position: activeCar.position.clone(),
            rotation: activeCar.quaternion.clone(),
            timeOfDay: window.getCurrentTimeOfDay(),
        });

        for (const key in loadedCarModels) {
            const carIndex = parseInt(key);
            if (carIndex === missionIndex) continue;

            const carToReplay = loadedCarModels[carIndex];
            const recording = recordedMovements[carIndex];

            if (recording && recording.length > 0) {
                carToReplay.visible = true;

                let state1 = recording[0];
                let state2 = recording[recording.length - 1];
                for (let i = 0; i < recording.length - 1; i++) {
                    if (recording[i].time <= elapsedTime && recording[i + 1].time >= elapsedTime) {
                        state1 = recording[i];
                        state2 = recording[i + 1];
                        break;
                    }
                }

                const timeDiff = state2.time - state1.time;
                let interpFactor = (timeDiff > 0) ? (elapsedTime - state1.time) / timeDiff : (elapsedTime >= state2.time ? 1 : 0);
                interpFactor = Math.max(0, Math.min(1, interpFactor));

                const easingType = REWIND_INTERPOLATION;
                interpFactor = applyEasing(interpFactor, easingType);

                tempReplayPosition.lerpVectors(state1.position, state2.position, interpFactor);
                tempReplayQuaternion.slerpQuaternions(state1.rotation, state2.rotation, interpFactor);

                carToReplay.position.copy(tempReplayPosition);
                carToReplay.quaternion.copy(tempReplayQuaternion);

                carToReplay.updateMatrixWorld(true);
            } else {
                carToReplay.visible = false;
            }
        }
    }

    updateCarReactions(deltaTime);

    if (isFirstPersonMode) {
        const firstPersonOffset = new THREE.Vector3(0, FIRST_PERSON_HEIGHT_OFFSET, FIRST_PERSON_FORWARD_OFFSET);
        const worldOffset = firstPersonOffset.applyQuaternion(activeCar.quaternion);
        const desiredCameraPosition = activeCar.position.clone().add(worldOffset);

        camera.position.copy(desiredCameraPosition);

        const forward = new THREE.Vector3(0, 0, 10).applyQuaternion(activeCar.quaternion);
        const lookAtPoint = activeCar.position.clone().add(forward);
        lookAtPoint.y += FIRST_PERSON_HEIGHT_OFFSET;
        
        controls.target.copy(lookAtPoint);
    } else {
        const desiredCameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
        const worldOffset = desiredCameraOffset.applyQuaternion(activeCar.quaternion);
        const desiredCameraPosition = activeCar.position.clone().add(worldOffset);

        camera.position.lerp(desiredCameraPosition, deltaTime * CAMERA_FOLLOW_SPEED);

        const desiredLookAtPoint = activeCar.position.clone();
        desiredLookAtPoint.y += LOOK_AT_Y_OFFSET;
        controls.target.lerp(desiredLookAtPoint, deltaTime * CAMERA_FOLLOW_SPEED);
    }
    camera.lookAt(controls.target);
}

export function getActiveCar() {
    return loadedCarModels[missionIndex];
}

export function getActiveCarOBB() {
    const activeCar = getActiveCar();
    if (!activeCar || !activeCar.userData.halfExtents) return null;

    return CarPhysics.getOBBData(activeCar, activeCar.userData.halfExtents);
}

export function getOtherCarOBBs() {
    const obbs = [];
    for (const key in loadedCarModels) {
        const carIndex = parseInt(key);
        if (carIndex === missionIndex) continue;

        const car = loadedCarModels[carIndex];
        if (car.visible && car.userData.halfExtents) {
            obbs.push(CarPhysics.getOBBData(car, car.userData.halfExtents));
        }
    }
    return obbs;
}

export function getCarHeadlights() {
    return carHeadlights;
}

export function getLoadedCarModels() {
    return loadedCarModels;
}

export function getCurrentTimeOfDay() {
    return currentTimeOfDay;
}

export function getHeadlightsEnabled() {
    return headlightsEnabled;
}

export { isRewinding };

export function getCurrentRewindInterpolation() {
    return REWIND_INTERPOLATION;
}
