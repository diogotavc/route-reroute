import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { 
    DEBUG_GENERAL, 
    DEBUG_MODEL_LOADING, 
    DEBUG_MAP_LEVEL_LOGIC, 
    DAY_CYCLE, 
    AUTO_PAUSE_ON_FOCUS_LOST, 
    IDLE_CAMERA_ENABLED, 
    IDLE_CAMERA_TRIGGER_TIME,
    IDLE_CAMERA_FADE_DURATION,
    IDLE_CAMERA_BLACK_DURATION,
    IDLE_CAMERA_TIME_SCALE_MIN,
    IDLE_CAMERA_RETURN_DURATION,
    IDLE_CAMERA_DEBUG,
    IDLE_CAMERA_ANIMATIONS,
    CAMERA_FOLLOW_SPEED, 
    CAMERA_DISTANCE, 
    CAMERA_HEIGHT, 
    LOOK_AT_Y_OFFSET 
} from './config.js';

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

const idleFadeOverlay = document.createElement('div');
idleFadeOverlay.id = 'idle-fade-overlay';
idleFadeOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    z-index: 1500;
    opacity: 0;
    pointer-events: none;
    transition: none;
`;
document.body.appendChild(idleFadeOverlay);

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

let idleCameraState = {
    phase: 'inactive', // 'inactive', 'active', 'returning'
    timer: 0,
    animationTimer: 0,
    currentAnimationIndex: 0,
    fadeOpacity: 0,
    originalControlsEnabled: true
};

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

    isIdleCameraActive = true;
    idleCameraState.phase = 'active';
    idleCameraState.timer = 0;
    idleCameraState.animationTimer = 0;
    idleCameraState.currentAnimationIndex = 0;
    idleCameraState.fadeOpacity = 0;
    idleCameraState.originalControlsEnabled = controls.enabled;

    controls.enabled = false;
    Achievements.onIdleCameraTriggered();

    if (IDLE_CAMERA_DEBUG) console.log('🎬 Idle camera started');
}

function stopIdleCameraAnimation() {
    if (!isIdleCameraActive) return;

    idleCameraState.phase = 'returning';
    idleCameraState.timer = 0;
    
    if (IDLE_CAMERA_DEBUG) console.log('🎬 Idle camera stopping - returning to normal');
}

function updateIdleCameraAnimation(deltaTime) {
    if (!isIdleCameraActive || !IDLE_CAMERA_ENABLED) return;

    switch (idleCameraState.phase) {
        case 'active':
            updateActiveIdleCamera(deltaTime);
            break;
        case 'returning':
            updateCameraReturn(deltaTime);
            break;
    }

    updateFadeOverlay();
}

function updateActiveIdleCamera(deltaTime) {
    const fadeInDuration = IDLE_CAMERA_FADE_DURATION;
    const fadeOutStart = IDLE_CAMERA_FADE_DURATION;
    const totalFadeTime = fadeInDuration * 2;
    
    idleCameraState.timer += deltaTime;
    
    if (idleCameraState.timer < fadeInDuration) {
        idleCameraState.fadeOpacity = idleCameraState.timer / fadeInDuration;
    } else if (idleCameraState.timer < fadeOutStart + IDLE_CAMERA_BLACK_DURATION) {
        idleCameraState.fadeOpacity = 1;
    } else if (idleCameraState.timer < totalFadeTime + IDLE_CAMERA_BLACK_DURATION) {
        const fadeOutProgress = (idleCameraState.timer - fadeOutStart - IDLE_CAMERA_BLACK_DURATION) / fadeInDuration;
        idleCameraState.fadeOpacity = 1 - fadeOutProgress;
    } else {
        idleCameraState.fadeOpacity = 0;
        updateCameraAnimation(deltaTime);
    }
}

function updateCameraAnimation(deltaTime) {
    const currentAnim = IDLE_CAMERA_ANIMATIONS[idleCameraState.currentAnimationIndex];
    idleCameraState.animationTimer += deltaTime;

    const progress = Math.min(idleCameraState.animationTimer / currentAnim.duration, 1);
    const easedProgress = easeInOut(progress);

    const activeCar = getActiveCar();
    let centerPoint = new THREE.Vector3(0, 0, 0);
    if (activeCar) {
        centerPoint.copy(activeCar.position);
    }

    const startRadius = 20;
    const endRadius = 25;
    
    const startPos = new THREE.Vector3(
        centerPoint.x + Math.cos(currentAnim.initialYRotation) * startRadius,
        centerPoint.y + currentAnim.initialHeight,
        centerPoint.z + Math.sin(currentAnim.initialYRotation) * startRadius
    );
    
    const endPos = new THREE.Vector3(
        centerPoint.x + Math.cos(currentAnim.finalYRotation) * endRadius,
        centerPoint.y + currentAnim.finalHeight,
        centerPoint.z + Math.sin(currentAnim.finalYRotation) * endRadius
    );

    camera.position.lerpVectors(startPos, endPos, easedProgress);
    controls.target.copy(centerPoint);
    controls.target.y += Math.sin(THREE.MathUtils.lerp(currentAnim.initialXRotation, currentAnim.finalXRotation, easedProgress)) * 10;
    
    camera.lookAt(controls.target);
    
    if (progress >= 1) {
        idleCameraState.currentAnimationIndex = (idleCameraState.currentAnimationIndex + 1) % IDLE_CAMERA_ANIMATIONS.length;
        idleCameraState.animationTimer = 0;
        
        if (IDLE_CAMERA_DEBUG) console.log(`🎬 Animation ${idleCameraState.currentAnimationIndex} started`);
    }
}

function updateCameraReturn(deltaTime) {
    idleCameraState.timer += deltaTime;
    const progress = Math.min(idleCameraState.timer / IDLE_CAMERA_RETURN_DURATION, 1);
    
    if (progress >= 1) {
        isIdleCameraActive = false;
        idleCameraState.phase = 'inactive';
        idleCameraState.fadeOpacity = 0;
        controls.enabled = idleCameraState.originalControlsEnabled;

        if (IDLE_CAMERA_DEBUG) console.log('🎬 Camera return complete - idle camera deactivated');
    }
}

function updateFadeOverlay() {
    const targetOpacity = idleCameraState.fadeOpacity || 0;
    idleFadeOverlay.style.opacity = Math.max(0, Math.min(1, targetOpacity)).toString();
}

function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

    const rawDeltaTime = clock.getDelta();
    
    // Check for idle timeout and manage idle camera
    checkIdleTimeout();

    currentTimeOfDay += rawDeltaTime * DAY_CYCLE.SPEED;
    if (currentTimeOfDay > 1) currentTimeOfDay -= 1;
    updateDayNightCycle(scene, currentTimeOfDay);

    Achievements.updateDayNightCycleTracking(currentTimeOfDay, isRewinding);

    if (currentLevelData) {
        updateCarPhysics(rawDeltaTime, collidableMapElements, currentMapDefinition);
    }

    rewindOverlay.style.display = isRewinding ? 'block' : 'none';

    const notification = Achievements.getNextNotification();
    if (notification) {
        showAchievementNotification(notification);
    }

    updateIdleCameraAnimation(rawDeltaTime);

    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
    Achievements.onInputDetected();

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

export function isIdleCameraSystemActive() {
    return isIdleCameraActive;
}

export function isIdleCameraReturning() {
    return isIdleCameraActive && idleCameraState.phase === 'returning';
}