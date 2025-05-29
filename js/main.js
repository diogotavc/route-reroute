import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEBUG_GENERAL, DEBUG_MODEL_LOADING, DEBUG_MAP_LEVEL_LOGIC, DAY_CYCLE, AUTO_PAUSE_ON_FOCUS_LOST, IDLE_CAMERA_ENABLED, IDLE_CAMERA_TRIGGER_TIME, IDLE_CAMERA_FADE_OUT_DURATION, IDLE_CAMERA_FADE_IN_DURATION, IDLE_CAMERA_ROTATION_DURATION, IDLE_CAMERA_CLOSE_DISTANCE, IDLE_CAMERA_LOW_HEIGHT, IDLE_CAMERA_TIME_SLOWDOWN, IDLE_CAMERA_AUTO_PAUSE, CAMERA_FOLLOW_SPEED, CAMERA_DISTANCE, CAMERA_HEIGHT, LOOK_AT_Y_OFFSET } from './config.js';

import { setupLights, updateDayNightCycle } from './lights.js';
import * as Achievements from './achievements.js';
import {
    initCars,
    loadCarModels,
    nextCar,
    setAccelerating,
    setBraking,
    setTurningLeft,
    setTurningRight,
    setRewinding,
    updateCarPhysics,
    isRewinding,
    toggleCameraMode,
    getActiveCar
} from './cars.js';
import { loadMap, getWorldCoordinates } from './mapLoader.js';
import { mapData as level1MapData } from './maps/level1_map.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0x212121);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const rewindOverlay = document.createElement('div');
rewindOverlay.id = 'rewind-overlay';
rewindOverlay.textContent = 'Rewinding...';
rewindOverlay.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    z-index: 1000;
    display: none;
    pointer-events: none;
    animation: rewindBlink 0.8s infinite;
`;

const style = document.createElement('style');
style.textContent = `
    @keyframes rewindBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
    }
    @keyframes achievementSlide {
        0% { transform: translateX(100%); opacity: 0; }
        10%, 90% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(100%); opacity: 0; }
    }
    @keyframes achievementPushDown {
        0% { transform: translateY(0); }
        100% { transform: translateY(calc(100% + 10px)); }
    }

`;
document.head.appendChild(style);
document.body.appendChild(rewindOverlay);

const pauseOverlay = document.createElement('div');
pauseOverlay.id = 'pause-overlay';
pauseOverlay.textContent = 'PAUSED';
pauseOverlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 48px;
    font-weight: bold;
    text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: none;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.3);
    padding: 20px 40px;
    border-radius: 10px;
    border: 2px solid rgba(255, 255, 255, 0.5);
`;
document.body.appendChild(pauseOverlay);

const fadeOverlay = document.createElement('div');
fadeOverlay.id = 'fade-overlay';
fadeOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    z-index: 1500;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.1s ease-in-out;
`;
document.body.appendChild(fadeOverlay);

const achievementNotificationContainer = document.createElement('div');
achievementNotificationContainer.id = 'achievement-notification-container';
achievementNotificationContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1001;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;
document.body.appendChild(achievementNotificationContainer);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = false;
controls.enableRotate = false;
controls.enableZoom = false;

initCars(scene, camera, controls);

let collidableMapElements = []; 

loadMap(scene, level1MapData).then((mapGroup) => { 
    if (DEBUG_GENERAL) console.log("Map loaded successfully!");
    if (mapGroup && mapGroup.userData && mapGroup.userData.collidableTiles) {
        collidableMapElements = mapGroup.userData.collidableTiles;
        if (DEBUG_MAP_LEVEL_LOGIC) console.log(`Found ${collidableMapElements.length} collidable map elements.`);
    }

    initCars(scene, camera, controls);
    setupLights(scene);

    loadCarModelsAndSetupLevel();
}).catch(error => {
    if (DEBUG_GENERAL) console.error("Failed to load map in main.js:", error);
});

const exampleLevel1_Missions = [
    ["ambulance", "Dr. Healmore", "Rushing to save a critical patient.", "start1", "finish1"],
    ["firetruck", "Chief Blaze", "A fire broke out.", "start_fireStation", "finish_apartment"],
];

let currentLevelData;

function processLevelMissions(missions, mapDefinition) {
    return missions.map(mission => {
        const [modelName, character, backstory, startPointName, finishPointName] = mission;
        const startPointInfo = mapDefinition.startPoints[startPointName];
        let finishPointInfo = null;

        if (finishPointName) {
            finishPointInfo = mapDefinition.startPoints[finishPointName];
        }

        if (!startPointInfo) {
            if (DEBUG_MAP_LEVEL_LOGIC) console.error(`Start point "${startPointName}" not found in map data for mission "${modelName}"! This mission will be skipped.`);
            return null;
        }

        if (finishPointName && !finishPointInfo) {
             if (DEBUG_MAP_LEVEL_LOGIC) console.warn(`Finish point "${finishPointName}" for mission "${modelName}" not found in map data. Car will not have a specific destination.`);
        }

        const startWorldPos = getWorldCoordinates(startPointInfo.x, startPointInfo.z, mapDefinition);
        startWorldPos.y = startPointInfo.yOffset || 0;

        let finishWorldPosArray = null;
        if (finishPointInfo) {
            const finishWPos = getWorldCoordinates(finishPointInfo.x, finishPointInfo.z, mapDefinition);
            finishWPos.y = finishPointInfo.yOffset || 0;
            finishWorldPosArray = [finishWPos.x, finishWPos.y, finishWPos.z];
        }

        return [
            modelName,
            character,
            backstory,
            [startWorldPos.x, startWorldPos.y, startWorldPos.z],
            finishWorldPosArray,
            startPointInfo.carRotationY !== undefined ? startPointInfo.carRotationY : 0
        ];
    }).filter(mission => mission !== null);
}

const levels = [
    { missions: exampleLevel1_Missions, map: level1MapData, cameraStart: [0, 20, 30], initialTimeOfDay: 0.9, timeIncrementPerMission: 0.05 },
];

let currentLevelIndex = 0;
let currentTimeOfDay = 0.25;
let currentMapDefinition = null;

window.getCurrentLevelIndex = () => currentLevelIndex;

function loadCarModelsAndSetupLevel() {
    const levelConfig = levels[currentLevelIndex];
    currentLevelData = processLevelMissions(levelConfig.missions, levelConfig.map);
    currentMapDefinition = levelConfig.map;

    currentTimeOfDay = levelConfig.initialTimeOfDay !== undefined ? levelConfig.initialTimeOfDay : 0.25;
    updateDayNightCycle(scene, currentTimeOfDay);

    Achievements.initDayNightTracking(currentTimeOfDay);

    if (levelConfig.cameraStart) {
        camera.position.set(...levelConfig.cameraStart);
    } else if (levelConfig.map.startPoints && levelConfig.map.startPoints.playerSpawn) {
        const spawnWorldPos = getWorldCoordinates(levelConfig.map.startPoints.playerSpawn.x, levelConfig.map.startPoints.playerSpawn.z, levelConfig.map);
        camera.position.set(spawnWorldPos.x, 20, spawnWorldPos.z + 15);
        controls.target.set(spawnWorldPos.x, 0, spawnWorldPos.z);
    } else {
        camera.position.set(0,20,30);
    }
    controls.update();

    loadCarModels(currentLevelData).then(() => { 
        if (DEBUG_MODEL_LOADING) console.debug("All car models loaded successfully for the current level.");
    }).catch(error => {
        if (DEBUG_MODEL_LOADING) console.error("Failed to load all car models for the current level:", error);
    });
}

const clock = new THREE.Clock();

let isPaused = false;

let isIdleCameraActive = false;
let idleCameraPhase = 'inactive'; // 'fadeOut', 'snapToFront', 'fadeIn', 'rotating', 'complete'
let idleCameraStartTime = 0;
let idleCameraPhaseStartTime = 0;
let idleCameraRotationAngle = 0; // Start at 180 degrees (front view)
let originalCameraPosition = new THREE.Vector3();
let originalCameraTarget = new THREE.Vector3();
let originalControlsEnabled = null;
let originalDayCycleSpeed = null;

function togglePause() {
    isPaused = !isPaused;
    pauseOverlay.style.display = isPaused ? 'block' : 'none';
    
    if (isPaused) {
        clock.stop();
        if (DEBUG_GENERAL) console.log('Game paused');
    } else {
        clock.start();
        if (DEBUG_GENERAL) console.log('Game resumed');
    }
}

function startIdleCameraAnimation() {
    if (!IDLE_CAMERA_ENABLED || isIdleCameraActive) return;

    const activeCar = getActiveCar();
    if (!activeCar) return;

    originalCameraPosition.copy(camera.position);
    originalCameraTarget.copy(controls.target);
    originalControlsEnabled = {
        enablePan: controls.enablePan,
        enableRotate: controls.enableRotate,
        enableZoom: controls.enableZoom
    };

    originalDayCycleSpeed = DAY_CYCLE.SPEED;
    DAY_CYCLE.SPEED = originalDayCycleSpeed * IDLE_CAMERA_TIME_SLOWDOWN;

    controls.enablePan = false;
    controls.enableRotate = false;
    controls.enableZoom = false;
    
    isIdleCameraActive = true;
    idleCameraPhase = 'fadeOut';
    idleCameraStartTime = Date.now();
    idleCameraPhaseStartTime = Date.now();
    idleCameraRotationAngle = -Math.PI / 2; // Start at -90 degrees (left side view)
    
    Achievements.onIdleCameraTriggered();

    if (DEBUG_GENERAL) console.log('🎬 Starting idle camera showcase - Phase: Fade Out');
}

function stopIdleCameraAnimation() {
    if (!isIdleCameraActive) return;

    camera.position.copy(originalCameraPosition);
    controls.target.copy(originalCameraTarget);
    
    if (originalControlsEnabled) {
        controls.enablePan = originalControlsEnabled.enablePan;
        controls.enableRotate = originalControlsEnabled.enableRotate;
        controls.enableZoom = originalControlsEnabled.enableZoom;
    }

    if (originalDayCycleSpeed !== null) {
        DAY_CYCLE.SPEED = originalDayCycleSpeed;
        originalDayCycleSpeed = null;
    }

    fadeOverlay.style.opacity = '0';
    
    isIdleCameraActive = false;
    idleCameraPhase = 'inactive';
    
    if (DEBUG_GENERAL) console.log('🎬 Stopped idle camera showcase animation');
}

function updateIdleCameraAnimation(deltaTime) {
    if (!isIdleCameraActive || !IDLE_CAMERA_ENABLED) return;
    
    const activeCar = getActiveCar();
    if (!activeCar) {
        stopIdleCameraAnimation();
        return;
    }
    
    const totalElapsed = (Date.now() - idleCameraStartTime) / 1000;
    const phaseElapsed = (Date.now() - idleCameraPhaseStartTime) / 1000;
    
    switch (idleCameraPhase) {
        case 'fadeOut':
            const fadeOutProgress = Math.min(phaseElapsed / IDLE_CAMERA_FADE_OUT_DURATION, 1);
            fadeOverlay.style.opacity = fadeOutProgress.toString();

            if (fadeOutProgress >= 1) {
                idleCameraPhase = 'snapToFront';
                idleCameraPhaseStartTime = Date.now();
                if (DEBUG_GENERAL) console.log('🎬 Phase: Snap to Left Side');
            }
            break;
            
        case 'snapToFront':
            const carPosition = activeCar.position;
            const carRotation = activeCar.rotation.y;

            const leftAngle = carRotation - Math.PI / 2;
            const leftX = carPosition.x + Math.cos(leftAngle) * IDLE_CAMERA_CLOSE_DISTANCE;
            const leftZ = carPosition.z + Math.sin(leftAngle) * IDLE_CAMERA_CLOSE_DISTANCE;
            const leftY = carPosition.y + IDLE_CAMERA_LOW_HEIGHT;

            camera.position.set(leftX, leftY, leftZ);

            const lookAtPoint = carPosition.clone();
            lookAtPoint.y += 1;
            controls.target.copy(lookAtPoint);
            camera.lookAt(controls.target);

            idleCameraRotationAngle = -Math.PI / 2;

            idleCameraPhase = 'fadeIn';
            idleCameraPhaseStartTime = Date.now();
            if (DEBUG_GENERAL) console.log('🎬 Phase: Fade In');
            break;
            
        case 'fadeIn':
            const fadeInProgress = Math.min(phaseElapsed / IDLE_CAMERA_FADE_IN_DURATION, 1);
            fadeOverlay.style.opacity = (1 - fadeInProgress).toString();

            if (fadeInProgress >= 1) {
                idleCameraPhase = 'rotating';
                idleCameraPhaseStartTime = Date.now();
                if (DEBUG_GENERAL) console.log('🎬 Phase: Rotating Around Car');
            }
            break;
            
        case 'rotating':
            const rotationProgress = Math.min(phaseElapsed / IDLE_CAMERA_ROTATION_DURATION, 1);

            const easedProgress = 1 - Math.pow(1 - rotationProgress, 3); // ease-out cubic
            
            const carPos = activeCar.position;
            const carRot = activeCar.rotation.y;

            const totalRotation = Math.PI;
            const currentAngle = Math.PI / 2  + (easedProgress * totalRotation);

            const startDistance = IDLE_CAMERA_CLOSE_DISTANCE;
            const endDistance = CAMERA_DISTANCE;
            const startHeight = IDLE_CAMERA_LOW_HEIGHT;
            const endHeight = CAMERA_HEIGHT;

            let heightProgress = rotationProgress;
            if (rotationProgress > 0.5) {
                heightProgress = 0.5 + (rotationProgress - 0.5) * 1.5;
            }
            heightProgress = Math.min(heightProgress, 1);

            const currentDistance = THREE.MathUtils.lerp(startDistance, endDistance, easedProgress);
            const currentHeight = THREE.MathUtils.lerp(startHeight, endHeight, heightProgress);

            const cameraAngle = carRot + currentAngle;
            const cameraX = carPos.x + Math.cos(cameraAngle) * currentDistance;
            const cameraZ = carPos.z + Math.sin(cameraAngle) * currentDistance;
            const cameraY = carPos.y + currentHeight;
            
            camera.position.set(cameraX, cameraY, cameraZ);

            const lookTarget = carPos.clone();
            lookTarget.y += THREE.MathUtils.lerp(1, LOOK_AT_Y_OFFSET, heightProgress);
            controls.target.copy(lookTarget);
            camera.lookAt(controls.target);

            if (rotationProgress >= 1) {
                idleCameraPhase = 'complete';
                idleCameraPhaseStartTime = Date.now();
                if (DEBUG_GENERAL) console.log('🎬 Phase: Complete');

                if (IDLE_CAMERA_AUTO_PAUSE && !isPaused) {
                    togglePause();
                    if (DEBUG_GENERAL) console.log('🎬 Auto-paused after idle camera showcase completed');
                }

                stopIdleCameraAnimation();
            }
            break;
    }
}

function checkIdleTimeout() {
    if (!IDLE_CAMERA_ENABLED || isPaused || isRewinding || isIdleCameraActive) return;
    
    const now = Date.now();
    const lastInputTime = Achievements.getLastInputTime();
    
    if (lastInputTime > 0) {
        const timeSinceInput = (now - lastInputTime) / 1000;
        if (timeSinceInput >= IDLE_CAMERA_TRIGGER_TIME) {
            startIdleCameraAnimation();
        }
    }
}

let notificationIdCounter = 0;

function showAchievementNotification(notification) {
    const container = document.getElementById('achievement-notification-container');

    const notificationElement = document.createElement('div');
    const notificationId = `achievement-notification-${++notificationIdCounter}`;
    notificationElement.id = notificationId;
    notificationElement.style.cssText = `
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        min-width: 250px;
        max-width: 350px;
        border: 2px solid #FFD700;
        transform: translateX(100%);
        opacity: 0;
        transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
    `;
    
    notificationElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">${notification.icon}</span>
            <div>
                <div style="font-size: 18px; font-weight: bold;">🏆 Achievement Unlocked!</div>
                <div style="font-size: 16px; margin-top: 3px;">${notification.name}</div>
                <div style="font-size: 13px; opacity: 0.9; margin-top: 2px;">${notification.description}</div>
            </div>
        </div>
    `;
    
    container.insertBefore(notificationElement, container.firstChild);

    setTimeout(() => {
        notificationElement.style.transform = 'translateX(0)';
        notificationElement.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        if (notificationElement.parentNode) {
            notificationElement.style.transform = 'translateX(100%)';
            notificationElement.style.opacity = '0';

            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.remove();
                }
            }, 300);
        }
    }, 4000);
}

function animate() {
    if (isPaused) {
        renderer.render(scene, camera);
        return;
    }

    const deltaTime = clock.getDelta();

    // Check for idle timeout and manage idle camera
    checkIdleTimeout();

    currentTimeOfDay += deltaTime * DAY_CYCLE.SPEED;
    if (currentTimeOfDay > 1) currentTimeOfDay -= 1;
    updateDayNightCycle(scene, currentTimeOfDay);

    Achievements.updateDayNightCycleTracking(currentTimeOfDay, isRewinding);

    if (currentLevelData) {
        updateCarPhysics(deltaTime, collidableMapElements, currentMapDefinition);
    }

    rewindOverlay.style.display = isRewinding ? 'block' : 'none';

    const notification = Achievements.getNextNotification();
    if (notification) {
        showAchievementNotification(notification);
    }

    updateIdleCameraAnimation(deltaTime);

    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
    Achievements.onInputDetected();
    
    // Stop idle camera on any input
    if (isIdleCameraActive) {
        stopIdleCameraAnimation();
    }

    switch (event.key) {
        case "n":
            const nextCarResult = nextCar();
            if (nextCarResult === -1) {
                if (DEBUG_MAP_LEVEL_LOGIC) console.log("End of missions for this level!");
            } else {
                const levelConfig = levels[currentLevelIndex];
                currentTimeOfDay += levelConfig.timeIncrementPerMission !== undefined ? levelConfig.timeIncrementPerMission : 0.05;
                if (currentTimeOfDay > 1) currentTimeOfDay -= 1;
                updateDayNightCycle(scene, currentTimeOfDay);
            }
            break;
        case "ArrowUp": case "w": setAccelerating(true); break;
        case "ArrowDown": case "s": setBraking(true); break;
        case "ArrowLeft": case "a": setTurningLeft(true); break;
        case "ArrowRight": case "d": setTurningRight(true); break;
        case "r": setRewinding(); break;        case "c": toggleCameraMode(); break;
        case "p": togglePause(); break;
        case "1": Achievements.debug_triggerFirstCrash(); break;
        case "2": Achievements.debug_triggerHealthDepletion(); break;
        case "3": Achievements.debug_triggerTBone(); break;
        case "4": Achievements.debug_triggerOutOfBounds(); break;
        case "5": Achievements.debug_triggerBuildingCrash(); break;
        case "6": Achievements.debug_triggerGrassDetection(); break;
        case "7": Achievements.debug_triggerSpeedDemon(); break;
        case "8": Achievements.debug_triggerRewindMaster(); break;
        case "9": Achievements.debug_triggerHonkedAt(); break;
        case "0": Achievements.debug_triggerFlashedAt(); break;
        case "=": Achievements.debug_triggerNotAScratch(); break;
        case "[": Achievements.debug_triggerPerfectRun(); break;
        case "]": Achievements.debug_triggerReverseDriver(); break;
        case "\\": Achievements.debug_triggerShowcaseMode(); break;
        case "-": Achievements.debug_triggerSevenDaysNights(); break;
    }
});

window.addEventListener("keyup", (event) => {
    Achievements.onInputDetected();
    
    // Stop idle camera on any input
    if (isIdleCameraActive) {
        stopIdleCameraAnimation();
    }

    switch (event.key) {
        case "ArrowUp": case "w": setAccelerating(false); break;
        case "ArrowDown": case "s": setBraking(false); break;
        case "ArrowLeft": case "a": setTurningLeft(false); break;
        case "ArrowRight": case "d": setTurningRight(false); break;
    }
});

window.addEventListener("blur", () => {
    if (AUTO_PAUSE_ON_FOCUS_LOST && !isPaused) {
        togglePause();
        if (DEBUG_GENERAL) console.log('Game auto-paused due to tab losing focus');
    }
});

window.addEventListener("focus", () => {
    if (DEBUG_GENERAL) console.log('Tab regained focus - press p to resume if paused');
});

window.setTimeOfDay = (time) => {
    if (time >= 0 && time <= 1) {
        currentTimeOfDay = time;
        updateDayNightCycle(scene, currentTimeOfDay);
        console.log(`Time of day set to: ${time.toFixed(3)}`);
    } else {
        console.log("Time must be between 0 and 1");
    }
};

window.getCurrentTimeOfDay = () => {
    return currentTimeOfDay;
};

console.log("Time controls available:");
console.log("- setTimeOfDay(0.0-1.0) - Set specific time of day");
console.log("- getCurrentTimeOfDay() - Get current time");
console.log("- debugDayPhase(time) - Debug lighting at specific time");