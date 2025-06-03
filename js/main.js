import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    AUTO_PAUSE_ON_FOCUS_LOST, 
    TIMER_REWIND_PENALTY,
    TIMER_GRASS_SPEED_MULTIPLIER,
    TIMER_HINTS_ENABLED,
    TIMER_HINT_DURATION,
    TIMER_RANDOM_HINTS,
    TIMER_HINT_MIN_INTERVAL,
    TIMER_HINT_MAX_INTERVAL,
    TIMER_GRACE_PERIOD
} from './config.js';
import { getCurrentGraphicsSettings } from './graphics.js';

import { setupLights, updateDayNightCycle } from './lights.js';
import * as Achievements from './achievements.js';
import { initMusicSystem, setIdleMode as setMusicIdleMode, startMusic } from './music.js';
import {
    initCars,
    loadCarModels,
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
import { createOverlayElements, createAchievementNotification, animateAchievementNotification, updateLevelIndicator, showLoadingOverlay, hideLoadingOverlay, hideAllOverlaysDuringLoading, showAllOverlaysAfterLoading, createHUDElements, updateHUD, updateTimerDisplay, animateTimerBonus, animateTimerPenalty, animateTimerGrass, initializePauseMenu, updatePauseMenuSelection, navigatePauseMenu, activatePauseMenuItem, resetPauseMenuSelection, isInAnySubmenu, clearActiveConfirmation, isConfirmationVisible, showLevelSelectMenu } from './interface.js';
import {
    initCamera,
    setCameraPaused,
    stopIdleCameraAnimation,
    updateIdleCameraAnimation,
    checkIdleTimeout,
    updateFireflyPosition,
    isIdleCameraSystemActive,
    getIdleCameraTimeScale
} from './camera.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);

const graphicsSettings = getCurrentGraphicsSettings();

const renderer = new THREE.WebGLRenderer({ 
    antialias: graphicsSettings.ANTIALIAS,
    powerPreference: "high-performance"
});

function applyResolutionScale(scale) {
    if (scale === undefined) {
        scale = graphicsSettings.RESOLUTION_SCALE;
    }

    const scaledWidth = Math.floor(window.innerWidth * scale);
    const scaledHeight = Math.floor(window.innerHeight * scale);
    renderer.setSize(scaledWidth, scaledHeight, false);
    renderer.domElement.style.width = window.innerWidth + 'px';
    renderer.domElement.style.height = window.innerHeight + 'px';

    console.log(`Resolution scale set to ${(scale * 100).toFixed(1)}% (${scaledWidth}x${scaledHeight})`);
}

window.applyResolutionScale = applyResolutionScale;
window.getCurrentResolutionScale = () => graphicsSettings.RESOLUTION_SCALE;
window.resetResolutionScale = () => {
    applyResolutionScale(graphicsSettings.RESOLUTION_SCALE);
    console.log(`Resolution scale reset to graphics preset default: ${(graphicsSettings.RESOLUTION_SCALE * 100).toFixed(1)}%`);
};

applyResolutionScale();
renderer.setPixelRatio(graphicsSettings.RENDERER_PIXEL_RATIO);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0x212121);

renderer.shadowMap.enabled = graphicsSettings.ENABLE_SHADOWS;
if (renderer.shadowMap.enabled) {
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = true;
}

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

    const levelConfig = levels[currentLevelIndex];
    currentTimeOfDay = levelConfig.initialTimeOfDay !== undefined ? levelConfig.initialTimeOfDay : 0.25;

    setupLights(scene);

    updateDayNightCycle(scene, currentTimeOfDay);

    hideAllOverlaysDuringLoading();
    
    requestAnimationFrame(animate);
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
    ["sedan-sports", "Speed Racer", "Testing the new sports car around the city.", "start10", "finish10", {
        maxSpeed: 20,
        accelerationRate: 7,
        brakingRate: 8,
        steeringRate: 2.2,
        friction: 0.7,
        steeringFriction: 1.2
    }]
];

const exampleLevel3_Missions = [
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
    ["truck-flat", "Night Hauler", "Moving heavy equipment under cover of darkness.", "start16", "finish16", {
        maxSpeed: 6,
        accelerationRate: 1.8,
        brakingRate: 20,
        steeringRate: 0.5,
        friction: 2.5,
        steeringFriction: 5.0
    }],
    ["race-future", "Future Racer", "Testing tomorrow's racing technology.", "start17", "finish17", {
        maxSpeed: 30,
        accelerationRate: 12,
        brakingRate: 5,
        steeringRate: 3.2,
        friction: 0.4,
        steeringFriction: 0.6
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
            totalTime: 30,
            missionTimeBonus: 5
        }
    },
    { 
        name: "Traffic Chaos",
        missions: exampleLevel2_Missions, 
        map: MapData, 
        cameraStart: [0, 20, 30], 
        initialTimeOfDay: 0.6, 
        timeIncrementPerMission: 0.03,
        timeSpeed: 0.012,
        timer: {
            totalTime: 40,
            missionTimeBonus: 5
        }
    },
    { 
        name: "Rush Hour",
        missions: exampleLevel3_Missions, 
        map: MapData, 
        cameraStart: [0, 20, 30], 
        initialTimeOfDay: 0.45, 
        timeIncrementPerMission: 0.04,
        timeSpeed: 0.008,
        timer: {
            totalTime: 35,
            missionTimeBonus: 5
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
            totalTime: 25,
            missionTimeBonus: 5
        }
    }
];

window.levels = levels;

let currentLevelIndex = 0;
let currentTimeOfDay = 0.25;
let currentMapDefinition = null;
let isLoading = false;

let completedLevels = JSON.parse(localStorage.getItem('route_reroute_completed_levels') || '[]');
let hasAskedForLevelSelection = false;
let isInInitialLevelSelection = false;
let isSandboxMode = false;

window.isSandboxMode = false;
window.isInInitialLevelSelection = () => isInInitialLevelSelection;

let currentLevelTimer = 0;
let isOnGrassPrevFrame = false;
let nextHintTime = 0;
let missionStartTimer = 0;
let cumulativeRewindPenalty = 0;
let currentHint = null;
let hintEndTime = 0;
let rewindGracePeriodEnd = 0;

function applyTimerRewindPenalty() {
    if (isSandboxMode) {
        return;
    }
    
    cumulativeRewindPenalty += TIMER_REWIND_PENALTY;
}

function restoreTimerAfterRewind() {
    if (isSandboxMode) {
        return;
    }

    const newTimer = missionStartTimer - cumulativeRewindPenalty;
    currentLevelTimer = Math.max(0, newTimer);

    rewindGracePeriodEnd = Date.now() + TIMER_GRACE_PERIOD;

    updateTimerDisplay(currentLevelTimer);
    
    if (cumulativeRewindPenalty > 0) {
        setTimeout(() => {
            animateTimerPenalty();
        }, 50);
    }

    if (newTimer <= 0) {
        setTimeout(() => {
            showTimerTimeoutScreen();
        }, 100);
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
        localStorage.setItem('route_reroute_completed_levels', JSON.stringify(completedLevels));
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
window.showSandboxCarSelection = showSandboxCarSelection;

function resetAllData() {
    completedLevels = [];
    localStorage.removeItem('route_reroute_completed_levels');
    localStorage.removeItem('route_reroute_resolution_scale');
    localStorage.removeItem('route_reroute_graphics_preset');
    localStorage.removeItem('route_reroute_custom_resolution_scale');

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
    isInInitialLevelSelection = true;

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

function clearInitialLevelSelection() {
    isInInitialLevelSelection = false;
    
    const dimOverlay = document.getElementById('initial-level-selection-dim');
    if (dimOverlay) {
        document.body.removeChild(dimOverlay);
    }

    const elementsToShow = [
        'combined-hud',
        'level-indicator', 
        'achievement-notification-container',
        'music-ui',
        'timer-overlay'
    ];

    elementsToShow.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden-during-initial-selection');
        }
    });
}

window.clearInitialLevelSelection = clearInitialLevelSelection;

function advanceToNextLevel() {
    if (isLoading) {
        return false;
    }

    markLevelCompleted(currentLevelIndex);

    if (currentLevelIndex < levels.length - 1) {
        showLevelCompletionScreen();
        return true;
    } else {
        showGameCompletionScreen();
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

    isSandboxMode = false;
    window.isSandboxMode = false;

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

                const timerOverlay = document.getElementById('timer-overlay');
                const levelIndicator = document.getElementById('level-indicator');
                const healthBar = document.getElementById('health-bar');
                const combinedHUD = document.getElementById('combined-hud');

                if (timerOverlay) timerOverlay.style.display = '';
                if (levelIndicator) levelIndicator.style.display = '';
                if (healthBar) healthBar.style.display = 'flex';
                if (combinedHUD) combinedHUD.style.display = '';

                startMusic();
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

    if (currentLevelTimer > 0 && !isLoading && !isSandboxMode) {
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
                    showTimerTimeoutScreen();
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

    if (isInInitialLevelSelection && event.key === "Escape") {
        event.preventDefault();
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
            case "p":
                event.preventDefault();
                if (isConfirmationVisible()) {
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

if (!showInitialLevelSelection()) {
    loadCarModelsAndSetupLevel();
}

function showTimerTimeoutScreen() {
    pauseGame(false, "Time's Up");

    const levelConfig = levels[currentLevelIndex];
    const levelName = levelConfig ? levelConfig.name : `Level ${currentLevelIndex + 1}`;

    const timeoutOverlay = document.createElement('div');
    timeoutOverlay.id = 'timer-timeout-overlay';
    timeoutOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const timeoutContent = document.createElement('div');
    timeoutContent.style.cssText = `
        background: linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(183, 28, 28, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 50px;
        color: white;
        font-family: 'Orbitron', 'Courier New', monospace;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        max-width: 500px;
        min-width: 400px;
        transform: scale(0.8);
        opacity: 0;
        transition: all 0.5s ease-out;
    `;

    timeoutContent.innerHTML = `
        <div style="font-size: 1.5em; margin-bottom: 20px; color: #FF5722; font-weight: bold;">TIME OUT</div>
        <h2 style="margin: 0 0 20px 0; font-size: 28px; background: linear-gradient(45deg, #FF5722, #FF8A65); 
           -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
           Time's Up!
        </h2>
        <p style="margin-bottom: 30px; color: #FFEBEE; line-height: 1.6; font-size: 18px;">
            You ran out of time while playing<br>
            <strong>${levelName}</strong>
        </p>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="restart-level-timeout" style="
                padding: 15px 25px;
                background: linear-gradient(45deg, #FF5722, #FF8A65);
                border: none;
                border-radius: 10px;
                color: white;
                font-family: inherit;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(255, 87, 34, 0.3);
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Try Again
            </button>
            <button id="select-level-timeout" style="
                padding: 15px 25px;
                background: linear-gradient(45deg, rgba(96, 125, 139, 0.8), rgba(69, 90, 100, 0.8));
                border: none;
                border-radius: 10px;
                color: white;
                font-family: inherit;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(96, 125, 139, 0.3);
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Select Level
            </button>
        </div>
    `;

    timeoutOverlay.appendChild(timeoutContent);
    document.body.appendChild(timeoutOverlay);

    setTimeout(() => {
        timeoutContent.style.transform = 'scale(1)';
        timeoutContent.style.opacity = '1';
    }, 10);

    document.getElementById('restart-level-timeout').addEventListener('click', () => {
        document.body.removeChild(timeoutOverlay);
        unpauseGame();
        setTimeout(() => {
            loadCarModelsAndSetupLevel();
        }, 100);
    });

    document.getElementById('select-level-timeout').addEventListener('click', () => {
        timeoutOverlay.style.display = 'none';
        setTimeout(() => {
            showLevelSelectMenu(false, true);
        }, 100);
    });
}

function showLevelCompletionScreen() {
    pauseGame("Level Complete");

    const levelConfig = levels[currentLevelIndex];
    const levelName = levelConfig ? levelConfig.name : `Level ${currentLevelIndex + 1}`;

    const completionOverlay = document.createElement('div');
    completionOverlay.id = 'level-completion-overlay';
    completionOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const completionContent = document.createElement('div');
    completionContent.style.cssText = `
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 50px;
        color: white;
        font-family: 'Orbitron', 'Courier New', monospace;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        max-width: 500px;
        min-width: 400px;
        transform: scale(0.8);
        opacity: 0;
        transition: all 0.5s ease-out;
    `;

    completionContent.innerHTML = `
        <div style="font-size: 3em; margin-bottom: 20px;">LEVEL COMPLETE</div>
        <h2 style="margin: 0 0 20px 0; font-size: 28px; background: linear-gradient(45deg, #FFD700, #FFDD33); 
           -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
           Level Complete!
        </h2>
        <p style="margin-bottom: 30px; color: #E8F5E8; line-height: 1.6; font-size: 18px;">
            Congratulations! You've successfully completed<br>
            <strong>${levelName}</strong>
        </p>
        <button id="continue-to-next-level" style="
            padding: 15px 30px;
            background: linear-gradient(45deg, #4CAF50, #5CBF64);
            border: none;
            border-radius: 10px;
            color: white;
            font-family: inherit;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            Continue to Next Level
        </button>
    `;

    completionOverlay.appendChild(completionContent);
    document.body.appendChild(completionOverlay);

    setTimeout(() => {
        completionContent.style.transform = 'scale(1)';
        completionContent.style.opacity = '1';
    }, 100);

    document.getElementById('continue-to-next-level').addEventListener('click', () => {
        document.body.removeChild(completionOverlay);
        unpauseGame();
        proceedToNextLevel();
    });
}

function showGameCompletionScreen() {
    pauseGame("Game Complete");

    const completionOverlay = document.createElement('div');
    completionOverlay.id = 'game-completion-overlay';
    completionOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const completionContent = document.createElement('div');
    completionContent.style.cssText = `
        background: linear-gradient(135deg, rgba(156, 39, 176, 0.95), rgba(168, 56, 196, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 50px;
        color: white;
        font-family: 'Orbitron', 'Courier New', monospace;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        max-width: 600px;
        min-width: 500px;
        transform: scale(0.8);
        opacity: 0;
        transition: all 0.5s ease-out;
    `;

    completionContent.innerHTML = `
        <div style="font-size: 4em; margin-bottom: 20px;">GAME COMPLETE!</div>
        <h2 style="margin: 0 0 20px 0; font-size: 32px; background: linear-gradient(45deg, #FFD700, #FFDD33); 
           -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
           Congratulations!
        </h2>
        <p style="margin-bottom: 30px; color: #F3E5F5; line-height: 1.6; font-size: 20px;">
            You've completed all levels in<br>
            <strong>Route Reroute</strong>!
        </p>
        <p style="margin-bottom: 40px; color: #E1BEE7; line-height: 1.5; font-size: 16px;">
            Thank you for playing! You've mastered the art of<br>
            urban navigation and emergency driving.<br><br>
            <span style="color: #4CAF50; font-weight: bold;">Sandbox Mode has been unlocked!</span><br>
            <span style="color: #C8E6C9; font-size: 14px;">Explore freely with any car and custom physics.</span>
        </p>
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <button id="try-another-level-button" style="
                padding: 15px 30px;
                background: linear-gradient(45deg, #4CAF50, #5CBF64);
                border: none;
                border-radius: 10px;
                color: white;
                font-family: inherit;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Try Another Level
            </button>
            <button id="start-over-button" style="
                padding: 15px 30px;
                background: linear-gradient(45deg, #9C27B0, #A838C4);
                border: none;
                border-radius: 10px;
                color: white;
                font-family: inherit;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(156, 39, 176, 0.3);
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Start Over
            </button>
        </div>
    `;

    completionOverlay.appendChild(completionContent);
    document.body.appendChild(completionOverlay);

    setTimeout(() => {
        completionContent.style.transform = 'scale(1)';
        completionContent.style.opacity = '1';
    }, 100);

    document.getElementById('try-another-level-button').addEventListener('click', () => {
        document.body.removeChild(completionOverlay);
        document.removeEventListener('keydown', gameCompletionKeyHandler);

        const dimOverlay = document.createElement('div');
        dimOverlay.id = 'game-completion-level-select-dim';
        dimOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 9999;
        `;
        document.body.appendChild(dimOverlay);

        setTimeout(() => {
            showLevelSelectMenu(false, false);
        }, 100);
    });

    document.getElementById('start-over-button').addEventListener('click', () => {
        document.body.removeChild(completionOverlay);
        unpauseGame();
        currentLevelIndex = 0;
        loadCarModelsAndSetupLevel();
        document.removeEventListener('keydown', gameCompletionKeyHandler);
    });

    const gameCompletionKeyHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    
    document.addEventListener('keydown', gameCompletionKeyHandler);
}

window.showGameCompletionScreen = showGameCompletionScreen;

function showSandboxCarSelection() {
    pauseGame(false, "Sandbox Mode");

    const sandboxOverlay = document.createElement('div');
    sandboxOverlay.id = 'sandbox-car-selection-overlay';
    sandboxOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const sandboxContent = document.createElement('div');
    sandboxContent.style.cssText = `
        background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 40, 80, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 40px;
        color: white;
        font-family: 'Orbitron', 'Courier New', monospace;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    0 0 30px rgba(76, 175, 80, 0.1);
        max-width: 800px;
        min-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        transform: scale(0.8);
        opacity: 0;
        transition: all 0.5s ease-out;
    `;

    const availableCarModels = {
        'ambulance': 'Ambulance',
        'firetruck': 'Fire Truck',
        'police': 'Police Car',
        'sedan': 'Sedan',
        'suv-luxury': 'Luxury SUV',
        'tractor-police': 'Police Tractor',
        'truck-flat': 'Flatbed Truck',
        'delivery': 'Delivery Van',
        'garbage-truck': 'Garbage Truck',
        'race': 'Race Car',
        'sedan-sports': 'Sports Sedan',
        'taxi': 'Taxi',
        'tractor-shovel': 'Shovel Tractor',
        'van': 'Van',
        'delivery-flat': 'Flat Delivery',
        'hatchback-sports': 'Sports Hatchback',
        'race-future': 'Future Racer',
        'suv': 'SUV',
        'tractor': 'Tractor',
        'truck': 'Truck'
    };

    let carSelectionHTML = `
        <div style="font-size: 3em; margin-bottom: 20px;">SANDBOX MODE</div>
        <h2 style="margin: 0 0 30px 0; font-size: 28px; background: linear-gradient(45deg, #4CAF50, #5CBF64); 
           -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
           Sandbox Mode
        </h2>
        <p style="margin-bottom: 30px; color: #E8F5E8; line-height: 1.6; font-size: 18px;">
            Choose any car and drive freely without time limits!<br>
            <em style="font-size: 14px; opacity: 0.8;">You'll start from the main spawn point</em>
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; max-height: 400px; overflow-y: auto; padding: 10px;">
    `;

    Object.entries(availableCarModels).forEach(([modelId, displayName]) => {
        carSelectionHTML += `
            <button class="sandbox-car-option" data-car="${modelId}" style="
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                color: white;
                font-family: inherit;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
                min-height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
            " onmouseover="this.style.background='rgba(76, 175, 80, 0.2)'; this.style.borderColor='rgba(76, 175, 80, 0.5)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.borderColor='rgba(255, 255, 255, 0.2)'; this.style.transform='scale(1)'">>
                ${displayName}
            </button>
        `;
    });

    carSelectionHTML += `
        </div>
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
            <button id="sandbox-back-button" style="
                padding: 15px 25px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                color: white;
                font-family: inherit;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">>
                Back
            </button>
        </div>
    `;

    sandboxContent.innerHTML = carSelectionHTML;
    sandboxOverlay.appendChild(sandboxContent);
    document.body.appendChild(sandboxOverlay);

    setTimeout(() => {
        sandboxContent.style.transform = 'scale(1)';
        sandboxContent.style.opacity = '1';
    }, 100);

    document.querySelectorAll('.sandbox-car-option').forEach(button => {
        button.addEventListener('click', (e) => {
            const selectedCar = e.target.getAttribute('data-car');
            document.body.removeChild(sandboxOverlay);
            startSandboxMode(selectedCar);
        });
    });

    document.getElementById('sandbox-back-button').addEventListener('click', () => {
        document.body.removeChild(sandboxOverlay);
        if (window.showSandboxConfigurationMenu) {
            window.showSandboxConfigurationMenu();
        } else {
            showGameCompletionScreen();
        }
    });
}

function startSandboxMode(selectedCarModel) {
    if (isLoading) return;

    isSandboxMode = true;
    window.isSandboxMode = true;
    isLoading = true;

    const gameCompletionDim = document.getElementById('game-completion-level-select-dim');
    if (gameCompletionDim && document.body.contains(gameCompletionDim)) {
        document.body.removeChild(gameCompletionDim);
    }

    delete window.sandboxAccessContext;

    showLoadingOverlay("Sandbox Mode", `Preparing ${selectedCarModel} and setting up environment...`);

    const wasAlreadyPaused = isPaused;
    if (!isPaused) {
        pauseGame(false);
    }

    const sandboxConfig = window.sandboxConfig || {
        timeOfDay: 0.25,
        timeSpeed: 0.002,
        carPhysics: {
            maxSpeed: 20,
            accelerationRate: 6,
            brakingRate: 8,
            steeringRate: 2.0,
            friction: 0.8,
            steeringFriction: 1.5
        }
    };

    const carPhysics = sandboxConfig.carPhysics || {
        maxSpeed: 20,
        accelerationRate: 6,
        brakingRate: 8,
        steeringRate: 2.0,
        friction: 0.8,
        steeringFriction: 1.5
    };

    const sandboxLevel = {
        name: "Sandbox Mode",
        missions: [
            [selectedCarModel, "Free Driver", "Explore the city at your own pace!", "start1", null, carPhysics]
        ],
        map: MapData,
        cameraStart: [0, 20, 30],
        initialTimeOfDay: sandboxConfig.timeOfDay,
        timeIncrementPerMission: 0,
        timeSpeed: sandboxConfig.timeSpeed,
        timer: null
    };

    currentLevelIndex = levels.length;
    levels.push(sandboxLevel);
    currentLevelData = processLevelMissions(sandboxLevel.missions, sandboxLevel.map);
    currentMapDefinition = sandboxLevel.map;

    currentTimeOfDay = sandboxLevel.initialTimeOfDay;
    updateDayNightCycle(scene, currentTimeOfDay);

    Achievements.initDayNightTracking(currentTimeOfDay);

    Achievements.onLevelReset();

    currentLevelTimer = 0;
    missionStartTimer = 0;
    cumulativeRewindPenalty = 0;
    nextHintTime = 0;
    currentHint = null;
    hintEndTime = 0;
    rewindGracePeriodEnd = 0;

    if (sandboxLevel.cameraStart) {
        camera.position.set(...sandboxLevel.cameraStart);
    } else if (sandboxLevel.map.startPoints && sandboxLevel.map.startPoints.playerSpawn) {
        const spawnWorldPos = getWorldCoordinates(sandboxLevel.map.startPoints.playerSpawn.x, sandboxLevel.map.startPoints.playerSpawn.z, sandboxLevel.map);
        camera.position.set(spawnWorldPos.x, 20, spawnWorldPos.z + 15);
        controls.target.set(spawnWorldPos.x, 0, spawnWorldPos.z);
    } else {
        camera.position.set(0, 20, 30);
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

                updateLevelIndicator("SANDBOX", {
                    missionIndex: 1,
                    totalMissions: 1,
                    modelName: selectedCarModel,
                    character: "Free Driver",
                    backstory: "Explore the city at your own pace!",
                    hasDestination: false
                }, "Sandbox Mode");

                const timerOverlay = document.getElementById('timer-overlay');
                const levelIndicator = document.getElementById('level-indicator');
                const healthBar = document.getElementById('health-bar');
                const combinedHUD = document.getElementById('combined-hud');

                if (timerOverlay) timerOverlay.style.display = 'none';
                if (levelIndicator) levelIndicator.style.display = 'none';
                if (healthBar) healthBar.style.display = 'flex';
                if (combinedHUD) combinedHUD.style.display = 'block';
                
                startMusic();
            }, 500);
        }, 800);
    }).catch(error => {
        console.error("Failed to load sandbox mode:", error);
        hideLoadingOverlay();
        isLoading = false;
    });
    unpauseGame();
}

function proceedToNextLevel() {
    currentLevelIndex++;
    resetMissionTimer();
    updateLevelIndicatorWithMission();
    loadCarModelsAndSetupLevel();
}