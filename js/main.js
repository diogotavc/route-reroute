import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    AUTO_PAUSE_ON_FOCUS_LOST, 
    RENDERER_PIXEL_RATIO,
    RESOLUTION_SCALE,
    ADAPTIVE_RESOLUTION,
    MIN_RESOLUTION_SCALE,
    MAX_RESOLUTION_SCALE,
    TARGET_FPS,
    TIMER_REWIND_PENALTY,
    TIMER_GRASS_SPEED_MULTIPLIER,
    TIMER_HINTS_ENABLED,
    TIMER_HINT_DURATION,
    TIMER_RANDOM_HINTS,
    TIMER_HINT_MIN_INTERVAL,
    TIMER_HINT_MAX_INTERVAL,
    TIMER_GRACE_PERIOD
} from './config.js';

import { setupLights, updateDayNightCycle } from './lights.js';
import * as Achievements from './achievements.js';
import { initMusicSystem, setIdleMode as setMusicIdleMode } from './music.js';
import {
    initCars,
    loadCarModels,
    cleanupAllCars,
    nextCar,
    setAccelerating,
    setBraking,
    setTurningLeft,
    setTurningRight,
    setRewinding,
    updateCarPhysics,
    isRewinding,
    toggleCameraMode,
    getActiveCar,
    getCarSpeed,
    getCarHealth,
    getCurrentMissionInfo,
    setOnMissionChangeCallback
} from './cars.js';
import { loadMap, getWorldCoordinates, isOnGrass } from './mapLoader.js';
import { mapData as MapData } from './maps/map_1.js';
import { createOverlayElements, createAchievementNotification, animateAchievementNotification, updateLevelIndicator, showLoadingOverlay, hideLoadingOverlay, hideAllOverlaysDuringLoading, showAllOverlaysAfterLoading, createHUDElements, updateHUD, updateTimerDisplay, animateTimerBonus, animateTimerPenalty, animateTimerGrass, initializePauseMenu, updatePauseMenuSelection, navigatePauseMenu, activatePauseMenuItem, resetPauseMenuSelection, isInAnySubmenu, clearActiveConfirmation, showLevelSelectMenu } from './interface.js';
import {
    initCamera,
    setCameraPaused,
    startIdleCameraAnimation,
    stopIdleCameraAnimation,
    updateIdleCameraAnimation,
    checkIdleTimeout,
    updateFireflyPosition,
    isIdleCameraSystemActive,
    isIdleCameraReturning,
    getIdleCameraTimeScale
} from './camera.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance"
});

let currentResolutionScale = RESOLUTION_SCALE;
let frameCount = 0;
let lastFPSCheck = 0;
let recentFrameTimes = [];

function applyResolutionScale(scale = currentResolutionScale) {
    const scaledWidth = Math.floor(window.innerWidth * scale);
    const scaledHeight = Math.floor(window.innerHeight * scale);
    renderer.setSize(scaledWidth, scaledHeight, false);
    renderer.domElement.style.width = window.innerWidth + 'px';
    renderer.domElement.style.height = window.innerHeight + 'px';
    currentResolutionScale = scale;
}

function updateAdaptiveResolution(deltaTime) {
    if (!ADAPTIVE_RESOLUTION) return;

    recentFrameTimes.push(deltaTime);
    if (recentFrameTimes.length > 60) {
        recentFrameTimes.shift();
    }

    frameCount++;
    const now = performance.now();

    if (now - lastFPSCheck >= 1000 && recentFrameTimes.length >= 30) {
        const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b) / recentFrameTimes.length;
        const currentFPS = 1 / avgFrameTime;

        if (currentFPS < TARGET_FPS * 0.9 && currentResolutionScale > MIN_RESOLUTION_SCALE) {
            const newScale = Math.max(MIN_RESOLUTION_SCALE, currentResolutionScale - 0.1);
            if (newScale !== currentResolutionScale) {
                applyResolutionScale(newScale);
                console.log(`Adaptive resolution: Reduced to ${(newScale * 100).toFixed(0)}% (FPS: ${currentFPS.toFixed(1)})`);
            }
        } else if (currentFPS > TARGET_FPS * 1.1 && currentResolutionScale < MAX_RESOLUTION_SCALE) {
            const newScale = Math.min(MAX_RESOLUTION_SCALE, currentResolutionScale + 0.05);
            if (newScale !== currentResolutionScale) {
                applyResolutionScale(newScale);
                console.log(`Adaptive resolution: Increased to ${(newScale * 100).toFixed(0)}% (FPS: ${currentFPS.toFixed(1)})`);
            }
        }
        
        lastFPSCheck = now;
        recentFrameTimes = [];
    }
}

applyResolutionScale();
renderer.setPixelRatio(RENDERER_PIXEL_RATIO);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0x212121);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const overlayElements = createOverlayElements();
const { rewindOverlay, pauseOverlay, pauseDimOverlay, loadingOverlay, idleFadeOverlay, rewindDimOverlay, achievementNotificationContainer, levelIndicator, timerOverlay } = overlayElements;

const hudElements = createHUDElements();
const { combinedHUD, speedometer, healthBar } = hudElements;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = false;
controls.enableRotate = false;
controls.enableZoom = false;

initCamera(camera, scene, controls, idleFadeOverlay);
initMusicSystem();

initCars(scene, camera, controls);

let collidableMapElements = []; 

loadMap(scene, MapData).then((mapGroup) => {
    if (mapGroup && mapGroup.userData && mapGroup.userData.collidableTiles) {
        collidableMapElements = mapGroup.userData.collidableTiles;
    }

    initCars(scene, camera, controls);

    setOnMissionChangeCallback(updateLevelIndicatorWithMission);

    setupLights(scene);

    hideAllOverlaysDuringLoading();
    
    if (!showInitialLevelSelection()) {
        loadCarModelsAndSetupLevel();
    }
}).catch(error => {
    console.error("Failed to load map in main.js:", error);
});

const exampleLevel1_Missions = [
    ["ambulance", "Dr. Healmore", "Rushing to save a critical patient.", "start1", "finish1", {
        maxSpeed: 12,
        accelerationRate: 4,
        brakingRate: 8,
        steeringRate: 1.2,
        friction: 0.8,
        steeringFriction: 1.8
    }],
    ["firetruck", "Chief Blaze", "A fire broke out.", "start2", "finish2", {
        maxSpeed: 10,
        accelerationRate: 3,
        brakingRate: 12,
        steeringRate: 1.0,
        friction: 1.2,
        steeringFriction: 2.5
    }],
];

const exampleLevel2_Missions = [
    ["police", "Officer Justice", "Pursuing a speeding vehicle through the city.", "start3", "finish3", {
        maxSpeed: 18,
        accelerationRate: 6,
        brakingRate: 10,
        steeringRate: 1.8,
        friction: 0.9,
        steeringFriction: 1.5
    }],
    ["taxi", "Taxi Driver", "Getting passengers to their destination on time.", "start4", "finish4", {
        maxSpeed: 14,
        accelerationRate: 5,
        brakingRate: 9,
        steeringRate: 1.6,
        friction: 1.0,
        steeringFriction: 2.0
    }],
    ["delivery", "Express Courier", "Rush delivery before the store closes.", "start5", "finish5", {
        maxSpeed: 13,
        accelerationRate: 4.5,
        brakingRate: 8,
        steeringRate: 1.4,
        friction: 1.1,
        steeringFriction: 2.2
    }],
    ["sedan", "Commuter Carl", "Late for an important business meeting.", "start6", "finish6", {
        maxSpeed: 15,
        accelerationRate: 5,
        brakingRate: 10,
        steeringRate: 1.5,
        friction: 1.0,
        steeringFriction: 2.0
    }],
];

const exampleLevel3_Missions = [
    ["garbage-truck", "Sanitation Sam", "Emergency garbage collection before the storm.", "start7", "finish7", {
        maxSpeed: 8,
        accelerationRate: 2.5,
        brakingRate: 15,
        steeringRate: 0.8,
        friction: 1.5,
        steeringFriction: 3.0
    }],
    ["van", "Moving Mike", "Urgent furniture delivery across town.", "start8", "finish8", {
        maxSpeed: 11,
        accelerationRate: 3.5,
        brakingRate: 12,
        steeringRate: 1.1,
        friction: 1.3,
        steeringFriction: 2.4
    }],
    ["suv", "Soccer Mom", "Racing to pick up kids from practice.", "start9", "finish9", {
        maxSpeed: 16,
        accelerationRate: 4.8,
        brakingRate: 9,
        steeringRate: 1.7,
        friction: 0.9,
        steeringFriction: 1.8
    }],
    ["truck", "Trucker Tom", "Heavy cargo delivery to the construction site.", "start10", "finish10", {
        maxSpeed: 9,
        accelerationRate: 2.8,
        brakingRate: 18,
        steeringRate: 0.9,
        friction: 1.8,
        steeringFriction: 3.5
    }],
    ["sedan-sports", "Speed Racer", "Testing the new sports car around the city.", "start11", "finish11", {
        maxSpeed: 20,
        accelerationRate: 7,
        brakingRate: 8,
        steeringRate: 2.2,
        friction: 0.7,
        steeringFriction: 1.2
    }],
    ["race", "Pro Driver", "Training run through the urban circuit.", "start12", "finish12", {
        maxSpeed: 22,
        accelerationRate: 8,
        brakingRate: 7,
        steeringRate: 2.5,
        friction: 0.6,
        steeringFriction: 1.0
    }],
];

const exampleLevel4_Missions = [
    ["tractor-police", "Night Patrol", "Special police tractor patrolling the quiet streets.", "start13", "finish13", {
        maxSpeed: 7,
        accelerationRate: 2.2,
        brakingRate: 14,
        steeringRate: 0.7,
        friction: 2.0,
        steeringFriction: 4.0
    }],
    ["suv-luxury", "VIP Transport", "Luxury ride for an important client.", "start14", "finish14", {
        maxSpeed: 17,
        accelerationRate: 5.5,
        brakingRate: 11,
        steeringRate: 1.9,
        friction: 0.8,
        steeringFriction: 1.6
    }],
    ["hatchback-sports", "Street Racer", "Underground racing through the night.", "start15", "finish15", {
        maxSpeed: 25,
        accelerationRate: 9,
        brakingRate: 6,
        steeringRate: 2.8,
        friction: 0.5,
        steeringFriction: 0.8
    }],
    ["race-future", "Future Racer", "Testing tomorrow's racing technology.", "start16", "finish16", {
        maxSpeed: 30,
        accelerationRate: 12,
        brakingRate: 5,
        steeringRate: 3.2,
        friction: 0.4,
        steeringFriction: 0.6
    }],
    ["truck-flat", "Night Hauler", "Moving heavy equipment under cover of darkness.", "start17", "finish17", {
        maxSpeed: 6,
        accelerationRate: 1.8,
        brakingRate: 20,
        steeringRate: 0.5,
        friction: 2.5,
        steeringFriction: 5.0
    }],
];

let currentLevelData;

function processLevelMissions(missions, mapDefinition) {
    return missions.map(mission => {
        const [modelName, character, backstory, startPointName, finishPointName, physicsConfig] = mission;
        const startPointInfo = mapDefinition.startPoints[startPointName];
        let finishPointInfo = null;

        if (finishPointName) {
            finishPointInfo = mapDefinition.startPoints[finishPointName];
        }

        if (!startPointInfo) {
            return null;
        }

        if (finishPointName && !finishPointInfo) {
            console.warn(`Finish point "${finishPointName}" for mission "${modelName}" not found in map data. Car will not have a specific destination.`);
        }

        const startWorldPos = getWorldCoordinates(startPointInfo.x, startPointInfo.z, mapDefinition);
        startWorldPos.y = 0;

        let finishWorldPosArray = null;
        if (finishPointInfo) {
            const finishWPos = getWorldCoordinates(finishPointInfo.x, finishPointInfo.z, mapDefinition);
            finishWPos.y = 0;
            finishWorldPosArray = [finishWPos.x, finishWPos.y, finishWPos.z];
        }

        return [
            modelName,
            character,
            backstory,
            [startWorldPos.x, startWorldPos.y, startWorldPos.z],
            finishWorldPosArray,
            startPointInfo.carRotationY !== undefined ? startPointInfo.carRotationY : 0,
            physicsConfig || {
                maxSpeed: 15,
                accelerationRate: 5,
                brakingRate: 10,
                steeringRate: 1.5,
                friction: 1,
                steeringFriction: 2
            }
        ];
    }).filter(mission => mission !== null);
}

const levels = [
    { 
        name: "Basic Tutorial",
        missions: exampleLevel1_Missions, 
        map: MapData, 
        cameraStart: [0, 20, 30], 
        initialTimeOfDay: 0.3, 
        timeIncrementPerMission: 0.05,
        timeSpeed: 0.005,
        timer: {
            totalTime: 120,
            missionTimeBonus: 30
        }
    },
    { 
        name: "Rush Hour",
        missions: exampleLevel2_Missions, 
        map: MapData, 
        cameraStart: [0, 20, 30], 
        initialTimeOfDay: 0.45, 
        timeIncrementPerMission: 0.04,
        timeSpeed: 0.008,
        timer: {
            totalTime: 180,
            missionTimeBonus: 25
        }
    },
    { 
        name: "Traffic Chaos",
        missions: exampleLevel3_Missions, 
        map: MapData, 
        cameraStart: [0, 20, 30], 
        initialTimeOfDay: 0.6, 
        timeIncrementPerMission: 0.03,
        timeSpeed: 0.012,
        timer: {
            totalTime: 240,
            missionTimeBonus: 20
        }
    },
    { 
        name: "Night Shift",
        missions: exampleLevel4_Missions, 
        map: MapData, 
        cameraStart: [0, 20, 30], 
        initialTimeOfDay: 0.85, 
        timeIncrementPerMission: 0.02,
        timeSpeed: 0,
        timer: {
            totalTime: 300,
            missionTimeBonus: 15
        }
    }
];

window.levels = levels;

let currentLevelIndex = 0;
let currentTimeOfDay = 0.25;
let currentMapDefinition = null;
let isLoading = false;

let completedLevels = JSON.parse(localStorage.getItem('completedLevels') || '[]');
let hasAskedForLevelSelection = false;

let currentLevelTimer = 0;
let isOnGrassPrevFrame = false;
let nextHintTime = 0;
let missionStartTimer = 0;
let cumulativeRewindPenalty = 0;
let currentHint = null;
let hintEndTime = 0;
let rewindGracePeriodEnd = 0;

function applyTimerRewindPenalty() {
    cumulativeRewindPenalty += TIMER_REWIND_PENALTY;
}

function restoreTimerAfterRewind() {
    currentLevelTimer = Math.max(0, missionStartTimer - cumulativeRewindPenalty);

    rewindGracePeriodEnd = Date.now() + TIMER_GRACE_PERIOD;

    updateTimerDisplay(currentLevelTimer);
    
    if (cumulativeRewindPenalty > 0) {
        setTimeout(() => {
            animateTimerPenalty();
        }, 50);
    }
}

function getRandomHint() {
    const randomIndex = Math.floor(Math.random() * TIMER_RANDOM_HINTS.length);
    return TIMER_RANDOM_HINTS[randomIndex];
}

function scheduleNextHint() {
    const interval = TIMER_HINT_MIN_INTERVAL + Math.random() * (TIMER_HINT_MAX_INTERVAL - TIMER_HINT_MIN_INTERVAL);
    nextHintTime = Date.now() + interval;
}

function applyTimerMissionBonus() {
    const currentLevelConfig = levels[currentLevelIndex];
    if (currentLevelConfig && currentLevelConfig.timer && currentLevelConfig.timer.missionTimeBonus > 0) {
        currentLevelTimer += currentLevelConfig.timer.missionTimeBonus;

        missionStartTimer = currentLevelTimer;
        cumulativeRewindPenalty = 0;
        
        updateTimerDisplay(currentLevelTimer);

        setTimeout(() => {
            animateTimerBonus();
        }, 10);
    }
}

function resetMissionTimer() {
    cumulativeRewindPenalty = 0;
}

window.applyTimerRewindPenalty = applyTimerRewindPenalty;
window.restoreTimerAfterRewind = restoreTimerAfterRewind;
window.applyTimerMissionBonus = applyTimerMissionBonus;
window.resetMissionTimer = resetMissionTimer;

window.getCurrentLevelIndex = () => currentLevelIndex;

function markLevelCompleted(levelIndex) {
    if (!completedLevels.includes(levelIndex)) {
        completedLevels.push(levelIndex);
        localStorage.setItem('completedLevels', JSON.stringify(completedLevels));
    }
}

function isLevelCompleted(levelIndex) {
    return completedLevels.includes(levelIndex);
}

function getHighestCompletedLevel() {
    return completedLevels.length > 0 ? Math.max(...completedLevels) : -1;
}

function setCurrentLevel(levelIndex) {
    if (levelIndex >= 0 && levelIndex < levels.length) {
        currentLevelIndex = levelIndex;
        loadCarModelsAndSetupLevel();
    }
}

window.markLevelCompleted = markLevelCompleted;
window.isLevelCompleted = isLevelCompleted;
window.getHighestCompletedLevel = getHighestCompletedLevel;
window.setCurrentLevel = setCurrentLevel;
window.unpauseGame = unpauseGame;
window.levels = levels;

function resetAllData() {
    completedLevels = [];
    localStorage.removeItem('completedLevels');

    currentLevelIndex = 0;
    hasAskedForLevelSelection = false;

    if (Achievements.resetAchievements) {
        Achievements.resetAchievements();
    }

    loadCarModelsAndSetupLevel();
}

window.resetAllData = resetAllData;

function showInitialLevelSelection() {
    if (hasAskedForLevelSelection) return false;

    const highestCompleted = getHighestCompletedLevel();
    if (highestCompleted < 0) return false;

    hasAskedForLevelSelection = true;

    if (!isPaused) {
        pauseGame(false);
    }

    const elementsToHide = [
        'combined-hud',
        'level-indicator', 
        'achievement-notification-container',
        'music-ui',
        'timer-overlay'
    ];

    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden-during-initial-selection');
        }
    });

    const dimOverlay = document.createElement('div');
    dimOverlay.id = 'initial-level-selection-dim';
    dimOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        z-index: 9999;
    `;
    document.body.appendChild(dimOverlay);

    showLevelSelectMenu(true);
    
    return true;
}

function advanceToNextLevel() {
    if (isLoading) {
        return false;
    }

    markLevelCompleted(currentLevelIndex);

    if (currentLevelIndex < levels.length - 1) {
        currentLevelIndex++;
        resetMissionTimer();

        // MISSION COMPLETION / STARTING NEXT ONE LOGIC HERE
        updateLevelIndicatorWithMission();
        loadCarModelsAndSetupLevel();
        return true;
    } else {
        // LEVEL COMPLETION LOGIC WILL GO HERE
        return false;
    }
}

window.advanceToNextLevel = advanceToNextLevel;

function updateLevelIndicatorWithMission() {
    const missionInfo = getCurrentMissionInfo();
    const levelConfig = levels[currentLevelIndex];
    const levelName = levelConfig ? levelConfig.name : null;
    updateLevelIndicator(currentLevelIndex + 1, missionInfo, levelName);
}

function safeUpdateLevelIndicatorWithMission() {
    if (!isIdleCameraSystemActive()) {
        updateLevelIndicatorWithMission();
    }
}

function loadCarModelsAndSetupLevel() {
    if (isLoading) return;

    isLoading = true;
    const levelConfig = levels[currentLevelIndex];
    const levelName = levelConfig ? levelConfig.name : `Level ${currentLevelIndex + 1}`;

    showLoadingOverlay(levelName, "Preparing vehicles and setting up environment...");

    const wasAlreadyPaused = isPaused;
    if (!isPaused) {
        pauseGame(false);
    }

    currentLevelData = processLevelMissions(levelConfig.missions, levelConfig.map);
    currentMapDefinition = levelConfig.map;

    currentTimeOfDay = levelConfig.initialTimeOfDay !== undefined ? levelConfig.initialTimeOfDay : 0.25;
    updateDayNightCycle(scene, currentTimeOfDay);

    Achievements.initDayNightTracking(currentTimeOfDay);
    
    Achievements.onLevelReset();

    if (levelConfig && levelConfig.timer) {
        currentLevelTimer = levelConfig.timer.totalTime;
        missionStartTimer = currentLevelTimer;
        cumulativeRewindPenalty = 0;
        nextHintTime = 0;
        currentHint = null;
        hintEndTime = 0;
        rewindGracePeriodEnd = 0;
        scheduleNextHint();
    }

    updateLevelIndicatorWithMission();

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
        setTimeout(() => {
            hideLoadingOverlay();

            setTimeout(() => {
                if (!wasAlreadyPaused && isPaused) {
                    unpauseGame();
                }
                isLoading = false;
            }, 500);
        }, 800);
    }).catch(error => {
        console.error("Failed to load all car models for the current level:", error);
        hideLoadingOverlay();

        if (!wasAlreadyPaused && isPaused) {
            unpauseGame();
        }
        isLoading = false;
    });
}

const clock = new THREE.Clock();

let isPaused = false;
let isManualPause = false;
let wasPausedByFocusLoss = false;

function togglePause(manual = false) {
    isPaused = !isPaused;
    isManualPause = manual;

    if (!isPaused) {
        wasPausedByFocusLoss = false;
        Achievements.onInputDetected();
    }

    if (pauseOverlay && pauseDimOverlay) {
        const shouldShowMenu = isPaused && isManualPause;
        pauseOverlay.style.display = shouldShowMenu ? 'block' : 'none';
        pauseDimOverlay.style.display = shouldShowMenu ? 'block' : 'none';
        
        if (shouldShowMenu) {
            resetPauseMenuSelection();
        }

        const combinedHUD = document.getElementById('combined-hud');
        const levelIndicator = document.getElementById('level-indicator');
        const timerOverlay = document.getElementById('timer-overlay');

        if (shouldShowMenu) {
            if (combinedHUD) combinedHUD.classList.add('hidden-during-pause');
            if (levelIndicator) levelIndicator.classList.add('hidden-during-pause');
            if (timerOverlay) timerOverlay.classList.add('hidden-during-pause');
        } else {
            if (combinedHUD) combinedHUD.classList.remove('hidden-during-pause');
            if (levelIndicator) levelIndicator.classList.remove('hidden-during-pause');
            if (timerOverlay) timerOverlay.classList.remove('hidden-during-pause');
        }
    }

    setCameraPaused(isPaused);
    
    if (isPaused) {
        clock.stop();
    } else {
        clock.start();
    }
}

function pauseGame(manual = false, dueTo = null) {
    if (!isPaused) {
        if (dueTo === 'focus-loss') {
            wasPausedByFocusLoss = true;
        }
        togglePause(manual);
    }
}

function unpauseGame() {
    if (isPaused) {
        wasPausedByFocusLoss = false;
        togglePause(false);
    }
}

let notificationIdCounter = 0;

function showAchievementNotification(notification) {
    const container = document.getElementById('achievement-notification-container');
    const notificationElement = createAchievementNotification(notification, ++notificationIdCounter);
    animateAchievementNotification(notificationElement, container);
}

initializePauseMenu();

window.pauseMenuActions = {
    continueGame: () => {
        unpauseGame();
    },
    rewindMission: () => {
        if (!isLoading && !isRewinding) {
            unpauseGame();
            setTimeout(() => {
                setRewinding();
            }, 100);
        }
    },
    restartLevel: () => {
        if (window.stopIdleCameraAnimation) {
            window.stopIdleCameraAnimation();
        }
        unpauseGame();
        setTimeout(() => {
            loadCarModelsAndSetupLevel();
        }, 100);
    },
    resetAchievements: () => {
        if (Achievements.resetAchievements) {
            Achievements.resetAchievements();

            const feedbackOverlay = document.createElement('div');
            feedbackOverlay.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(56, 142, 60, 0.9));
                color: white;
                padding: 20px 40px;
                border-radius: 12px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 18px;
                font-weight: 500;
                z-index: 3500;
                text-align: center;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
            `;
            feedbackOverlay.textContent = 'All achievements have been reset!';
            document.body.appendChild(feedbackOverlay);

            setTimeout(() => {
                if (document.body.contains(feedbackOverlay)) {
                    document.body.removeChild(feedbackOverlay);
                }
            }, 2000);
        }
    }
};

window.getAchievementStats = Achievements.getAchievementStats;
window.getAchievementDefinition = Achievements.getAchievementDefinition;

function animate() {
    if (isPaused) {
        renderer.render(scene, camera);
        return;
    }

    const rawDeltaTime = clock.getDelta();

    updateAdaptiveResolution(rawDeltaTime);
    checkIdleTimeout();

    let scaledDeltaTime = rawDeltaTime;
    const timeScale = getIdleCameraTimeScale();
    if (timeScale < 1.0) {
        scaledDeltaTime = rawDeltaTime * timeScale;
    }

    const levelConfig = levels[currentLevelIndex];
    const timeSpeed = levelConfig && levelConfig.timeSpeed !== undefined ? levelConfig.timeSpeed : 0.01;

    currentTimeOfDay += scaledDeltaTime * timeSpeed;
    if (currentTimeOfDay > 1) currentTimeOfDay -= 1;
    updateDayNightCycle(scene, currentTimeOfDay);

    Achievements.updateDayNightCycleTracking(currentTimeOfDay, isRewinding);

    if (currentLevelData && !isLoading) {
        updateCarPhysics(scaledDeltaTime, collidableMapElements, currentMapDefinition);

        const currentSpeed = getCarSpeed();
        const healthData = getCarHealth();
        updateHUD(currentSpeed, healthData.percentage);
    }

    if (currentLevelTimer > 0 && !isLoading) {
        if (!isRewinding) {
            const isInGracePeriod = Date.now() < rewindGracePeriodEnd;

            if (!isInGracePeriod) {
                let timerDecrement = scaledDeltaTime;

                const activeCar = getActiveCar();
                if (activeCar && currentMapDefinition) {
                    const isCurrentlyOnGrass = isOnGrass(activeCar.position.x, activeCar.position.z, currentMapDefinition);

                    if (isCurrentlyOnGrass) {
                        timerDecrement *= TIMER_GRASS_SPEED_MULTIPLIER;

                        if (!isOnGrassPrevFrame) {
                            animateTimerGrass();
                        }
                    }

                    isOnGrassPrevFrame = isCurrentlyOnGrass;
                }

                currentLevelTimer -= timerDecrement;

                if (currentLevelTimer <= 0) {
                    currentLevelTimer = 0;
                    loadCarModelsAndSetupLevel();
                }
            }

            if (TIMER_HINTS_ENABLED) {
                if (nextHintTime === 0) {
                    scheduleNextHint();
                }

                if (Date.now() >= nextHintTime && Date.now() >= hintEndTime) {
                    currentHint = getRandomHint();
                    hintEndTime = Date.now() + TIMER_HINT_DURATION;
                    scheduleNextHint();
                }

                if (Date.now() >= hintEndTime) {
                    currentHint = null;
                }
            }

            updateTimerDisplay(currentLevelTimer, currentHint);
        } else {
            updateTimerDisplay(currentLevelTimer);
        }
    }

    if (isIdleCameraSystemActive()) {
        const activeCar = getActiveCar();
        if (activeCar) {
            updateFireflyPosition(activeCar.position, rawDeltaTime);
        }
    }

    const isCurrentlyRewinding = isRewinding;
    rewindOverlay.style.display = isCurrentlyRewinding ? 'block' : 'none';
    rewindDimOverlay.style.display = isCurrentlyRewinding ? 'block' : 'none';

    const combinedHUD = document.getElementById('combined-hud');
    const levelIndicatorElement = document.getElementById('level-indicator');
    const timerOverlayElement = document.getElementById('timer-overlay');

    if (isCurrentlyRewinding) {
        if (combinedHUD && !combinedHUD.classList.contains('hidden-during-rewind')) {
            combinedHUD.classList.add('hidden-during-rewind');
        }
        if (levelIndicatorElement && !levelIndicatorElement.classList.contains('hidden-during-rewind')) {
            levelIndicatorElement.classList.add('hidden-during-rewind');
        }
        if (timerOverlayElement && !timerOverlayElement.classList.contains('hidden-during-rewind')) {
            timerOverlayElement.classList.add('hidden-during-rewind');
        }
    } else {
        if (combinedHUD) {
            combinedHUD.classList.remove('hidden-during-rewind');
        }
        if (levelIndicatorElement) {
            levelIndicatorElement.classList.remove('hidden-during-rewind');
        }
        if (timerOverlayElement) {
            timerOverlayElement.classList.remove('hidden-during-rewind');
        }
    }

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
    applyResolutionScale();
});

function isMovementKey(key) {
    const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd', 'r', 'n'];
    // THIS WILL BE REPLACED WITH CUSTOM KEY VARIABLES AND SUCH
    return movementKeys.includes(key);
}

window.addEventListener("keydown", (event) => {
    if (isInAnySubmenu()) {
        return;
    }

    if (isPaused && isManualPause) {
        switch (event.key) {
            case "ArrowUp":
            case "w":
                event.preventDefault();
                navigatePauseMenu('up');
                return;
            case "ArrowDown":
            case "s":
                event.preventDefault();
                navigatePauseMenu('down');
                return;
            case "Enter":
            case " ":
                event.preventDefault();
                activatePauseMenuItem();
                return;
            case "Escape":
                event.preventDefault();
                if (pauseMenuState.isConfirmationVisible) {
                    clearActiveConfirmation();
                } else {
                    unpauseGame();
                }
                return;
        }
        return;
    }
    
    if (isMovementKey(event.key)) {
        Achievements.onInputDetected();
        
        if (isIdleCameraSystemActive()) {
            stopIdleCameraAnimation();
        }
    }

    switch (event.key) {
        case "ArrowUp": case "w": setAccelerating(true); break;
        case "ArrowDown": case "s": setBraking(true); break;
        case "ArrowLeft": case "a": setTurningLeft(true); break;
        case "ArrowRight": case "d": setTurningRight(true); break;
        case "r": 
            if (!isLoading && !isRewinding) {
                setRewinding(); 
            }
            break;
        case "c": toggleCameraMode(); break;
        case "p": 
        case "Escape":
            togglePause(true); 
            break;
        case "n": 
            const nextCarResult = nextCar();
            if (nextCarResult === -1) {
                advanceToNextLevel();
            }
            break;
    }
});

window.addEventListener("keyup", (event) => {
    if (isInAnySubmenu()) {
        return;
    }

    if (isPaused && isManualPause) {
        return;
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
        pauseGame(false, 'focus-loss');
    }
});

window.addEventListener("focus", () => {
    if (isPaused && wasPausedByFocusLoss && !isManualPause) {
        unpauseGame();
    }
});

window.setTimeOfDay = (time) => {
    if (time >= 0 && time <= 1) {
        currentTimeOfDay = time;
        updateDayNightCycle(scene, currentTimeOfDay);
    } else {
        console.warn("Time must be between 0 and 1");
    }
};

window.getCurrentTimeOfDay = () => {
    return currentTimeOfDay;
};

window.stopIdleCameraAnimation = stopIdleCameraAnimation;

showInitialLevelSelection();