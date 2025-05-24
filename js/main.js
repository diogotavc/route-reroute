import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { setupLights } from './lights.js';
import {
    initCars,
    loadCarModels,
    nextCar,
    setAccelerating,
    setBraking,
    setTurningLeft,
    setTurningRight,
    setRewinding,
    updateCarPhysics
} from './cars.js';
import { loadMap, getWorldCoordinates } from './mapLoader.js'; // Import map loader
import { mapData as level1MapData } from './maps/level1_map.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0x212121);
document.body.appendChild(renderer.domElement);

// ORBITCONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = false;
controls.enableRotate = false;

// INIT CARS, LIGHTS AND ENVIRONMENT
initCars(scene, camera, controls);

let collidableMapElements = []; // Store collidable map elements here

loadMap(scene, level1MapData).then((mapGroup) => { // mapGroup is returned
    console.log("Map loaded successfully!");
    if (mapGroup && mapGroup.userData && mapGroup.userData.collidableTiles) {
        collidableMapElements = mapGroup.userData.collidableTiles;
        console.log(`Found ${collidableMapElements.length} collidable map elements.`);
    }
    // You can store mapGroup if you need to reference the map tiles later

    // Initialize cars and lights *after* the map is loaded
    // This ensures the scene is fully set up.
    initCars(scene, camera, controls);
    setupLights(scene); // Call setupLights after map might be added to scene

    loadCarModelsAndSetupLevel();
}).catch(error => {
    console.error("Failed to load map in main.js:", error);
});

const exampleLevel1_Missions = [
    // [modelName, character, backstory, startPointName, finishPointName]
    ["ambulance", "Dr. Healmore", "Rushing to save a critical patient.", "start1", "finish1"],
    ["firetruck", "Chief Blaze", "A fire broke out.", "start_fireStation", "finish_apartment"],
];

let currentLevelData;

function processLevelMissions(missions, mapDefinition) {
    return missions.map(mission => {
        const [modelName, character, backstory, startPointName, finishPointName] = mission;
        const startPointInfo = mapDefinition.startPoints[startPointName];
        let finishPointInfo = null;

        if (finishPointName) { // Check if finishPointName is provided and valid
            finishPointInfo = mapDefinition.startPoints[finishPointName];
        }

        if (!startPointInfo) {
            console.error(`Start point "${startPointName}" not found in map data for mission "${modelName}"! This mission will be skipped.`);
            return null; // Critical error, skip this mission
        }

        if (finishPointName && !finishPointInfo) {
             console.warn(`Finish point "${finishPointName}" for mission "${modelName}" not found in map data. Car will not have a specific destination.`);
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
    }).filter(mission => mission !== null); // Filter out missions that returned null
}

const levels = [
    { missions: exampleLevel1_Missions, map: level1MapData, cameraStart: [0, 20, 30] },
    // { missions: exampleLevel2_Missions, map: level2MapData, cameraStart: [0, 20, 30] }
];

let currentLevelIndex = 0;

function loadCarModelsAndSetupLevel() {
    const levelConfig = levels[currentLevelIndex];
    currentLevelData = processLevelMissions(levelConfig.missions, levelConfig.map);

    // Adjust camera position based on level's cameraStart or map features
    if (levelConfig.cameraStart) {
        camera.position.set(...levelConfig.cameraStart);
    } else if (levelConfig.map.startPoints && levelConfig.map.startPoints.playerSpawn) {
        // Example: position camera overlooking a specific spawn point
        const spawnWorldPos = getWorldCoordinates(levelConfig.map.startPoints.playerSpawn.x, levelConfig.map.startPoints.playerSpawn.z, levelConfig.map);
        camera.position.set(spawnWorldPos.x, 20, spawnWorldPos.z + 15);
        controls.target.set(spawnWorldPos.x, 0, spawnWorldPos.z);
    } else {
        camera.position.set(0,20,30); // Default if no specific camera instruction
    }
    controls.update();


    loadCarModels(currentLevelData).then(() => { // Pass the processed data to car loader
        console.debug("All car models loaded successfully for the current level.");
    }).catch(error => {
        console.error("Failed to load all car models for the current level:", error);
    });
}

// Clock for Delta Time
const clock = new THREE.Clock();

function animate() {
    const deltaTime = clock.getDelta();

    if (currentLevelData) { // Only update physics if level and cars are ready
        updateCarPhysics(deltaTime, collidableMapElements); // Pass collidable elements
    }

    renderer.render(scene, camera);
}

// LISTENERS
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "n":
            const nextCarResult = nextCar();
            if (nextCarResult === -1) {
                console.log("End of missions for this level!");
            }
            break;
        case "ArrowUp": case "w": setAccelerating(true); break;
        case "ArrowDown": case "s": setBraking(true); break;
        case "ArrowLeft": case "a": setTurningLeft(true); break;
        case "ArrowRight": case "d": setTurningRight(true); break;
        case "r": setRewinding(); break;
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