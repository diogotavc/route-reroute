import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { setupLights } from './lights.js';
import { setupEnvironment } from './environment.js';
import { initCars, loadCarModels, nextCar } from './cars.js';

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
const lights = setupLights(scene);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const environment = setupEnvironment(scene);

// LEVELS
// to be migrated to another file
// Level[i] = [modelName, character, backstory, startingPoint, finishingPoint]
const exampleLevel1 = [
    ["ambulance", "Dr. Healmore", "Rushing to save a critical patient.", [-11.61, 0, -3.20], [-1.60, 0, 2.61]],
    ["firetruck", "Chief Blaze", "A fire broke out in an apartment complex.", [-3.12, 0, -10.79], [4.17, 0, -8.25]],
    ["police", "Officer Speed", "Chasing a getaway car!", [-3.20, 0, 4.26], [5.20, 0, -9.09]],
    ["sedan", "Bob Commuter", "Late for an important meeting.", [12.94, 0, -8.84], [7.48, 0, 0.61]],
    ["suv-luxury", "Mr. Richman", "Heading to a gala event.", [6.98, 0, 14.43], [0.04, 0, 6.21]],
    ["tractor-police", "Deputy Plow", "Rural patrol duty.", [-4.22, 0, -3.11], [6.95, 0, 3.56]],
    ["truck-flat", "Big Joe", "Delivering construction materials.", [3.25, 0, 8.53], [4.15, 0, -0.51]],
    ["delivery", "Timmy Express", "Rush delivery of a fragile package.", [8.83, 0, -6.00], [-6.35, 0, 5.44]],
    ["garbage-truck", "Oscar Binman", "Trash pickup for the whole neighborhood.", [11.33, 0, 2.85], [-6.23, 0, 1.08]],
    ["race", "Lightning Fast", "Competing in the Grand Prix!", [-15.41, 0, -4.76], [-1.42, 0, -1.00]],
    ["sedan-sports", "Speedy Greg", "Testing out his new turbo engine.", [15.33, 0, -8.44], [-4.08, 0, -9.03]],
    ["taxi", "Manny Cab", "Picking up an important passenger.", [4.85, 0, -6.99], [-4.80, 0, 0.23]],
    ["tractor-shovel", "Farmer Buck", "Clearing the field for planting.", [5.85, 0, -2.22], [8.89, 0, -6.32]],
    ["van", "Sam Courier", "Delivering a mysterious package.", [-0.91, 0, -4.44], [-6.83, 0, 3.51]],
    ["delivery-flat", "Flat Fred", "Transporting large furniture.", [11.14, 0, 6.77], [9.00, 0, -9.26]],
    ["hatchback-sports", "Drift Queen", "Street racing at midnight.", [5.08, 0, 8.81], [3.20, 0, 7.23]],
    ["race-future", "Neo Racer", "High-speed hover race through the city.", [-9.10, 0, 2.47], [6.33, 0, -6.56]],
    ["suv", "Emma Explorer", "Going on an off-road adventure.", [-7.62, 0, 16.17], [2.83, 0, -5.07]],
    ["tractor", "Old Mac", "Plowing the fields.", [10.13, 0, -7.10], [-2.44, 0, -6.36]],
    ["truck", "Road King", "Long-haul delivery across the state.", [-8.34, 0, -8.72], [8.14, 0, 2.40]]
];
const exampleLevel2 = [
    ["suv", "john doe", "he's a dumb ass", [10, 0, 3], "whatever1"],
    ["tractor", "quem", "te perguntou", [0, 0, 0], "whatever2"]
];
const levels = [
    [exampleLevel1, "map1", [0, 20, 30]],
    [exampleLevel2, "map2", [0, 20, 30]]
];

const testLevel = levels[0];
// this is so janky lmao
camera.position.set(testLevel[2][0], testLevel[2][1], testLevel[2][2]);
// CAR MODEL CONFIGURATION
loadCarModels(testLevel[0]).then(() => {
    console.debug("All car models loaded successfully.");
}).catch(error => {
    console.error("Failed to load all car models:", error);
});

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

// LISTENERS
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
    if (event.key === "n") {
        // if (nextCar() == -1) { end of the level }
        nextCar();
    }
});
