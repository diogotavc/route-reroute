import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { setupLights } from './lights.js';
import { setupEnvironment } from './environment.js';
import { initCars, loadCarModels, nextCar } from './cars.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0x87CEEB);
document.body.appendChild(renderer.domElement);

// ORBITCONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// INIT CARS, LIGHTS AND ENVIRONMENT
initCars(scene, camera, controls);
const lights = setupLights(scene);
const environment = setupEnvironment(scene);

// LEVELS
// to be migrated to another file
// Level[i] = [modelName, character, backstory, startingPoint, finishingPoint]
const exampleLevel1 = [
    ["ambulance", "Dr. Healmore", "Rushing to save a critical patient.", [7.51, 0, -4.29], [-9.89, 0, -6.90]],
    ["firetruck", "Chief Blaze", "A fire broke out in an apartment complex.", [0.45, 0, 6.71], [6.73, 0, -7.69]],
    ["police", "Officer Speed", "Chasing a getaway car!", [2.24, 0, -1.22], [1.51, 0, -6.12]],
    ["sedan", "Bob Commuter", "Late for an important meeting.", [-3.24, 0, -6.97], [-9.57, 0, -5.66]],
    ["suv-luxury", "Mr. Richman", "Heading to a gala event.", [9.23, 0, 5.55], [4.36, 0, 9.85]],
    ["tractor-police", "Deputy Plow", "Rural patrol duty.", [-4.51, 0, -7.11], [5.03, 0, 3.42]],
    ["truck-flat", "Big Joe", "Delivering construction materials.", [9.61, 0, 1.07], [9.26, 0, -5.64]],
    ["delivery", "Timmy Express", "Rush delivery of a fragile package.", [-5.25, 0, -5.19], [-5.43, 0, -5.26]],
    ["garbage-truck", "Oscar Binman", "Trash pickup for the whole neighborhood.", [2.10, 0, -6.66], [-8.58, 0, 1.56]],
    ["race", "Lightning Fast", "Competing in the Grand Prix!", [-2.02, 0, -2.96], [-6.18, 0, -4.78]],
    ["sedan-sports", "Speedy Greg", "Testing out his new turbo engine.", [-3.16, 0, 6.23], [3.39, 0, -9.49]],
    ["taxi", "Manny Cab", "Picking up an important passenger.", [-5.62, 0, -2.39], [-6.04, 0, -1.70]],
    ["tractor-shovel", "Farmer Buck", "Clearing the field for planting.", [-9.88, 0, 8.27], [0.24, 0, -2.03]],
    ["van", "Sam Courier", "Delivering a mysterious package.", [-0.21, 0, -7.70], [-3.69, 0, -9.92]],
    ["delivery-flat", "Flat Fred", "Transporting large furniture.", [3.37, 0, 8.68], [1.09, 0, 0.82]],
    ["hatchback-sports", "Drift Queen", "Street racing at midnight.", [7.32, 0, -3.12], [5.28, 0, -3.85]],
    ["race-future", "Neo Racer", "High-speed hover race through the city.", [-0.34, 0, -8.09], [-5.82, 0, -5.23]],
    ["suv", "Emma Explorer", "Going on an off-road adventure.", [-8.68, 0, 5.27], [-5.53, 0, -0.62]],
    ["tractor", "Old Mac", "Plowing the fields.", [2.71, 0, 3.17], [-2.02, 0, 5.24]],
    ["truck", "Road King", "Long-haul delivery across the state.", [3.51, 0, -2.79], [3.49, 0, 7.33]]
];
const exampleLevel2 = [
    ["suv", "john doe", "he's a dumb ass", [10, 0, 3], "whatever1"],
    ["tractor", "quem", "te perguntou", [0, 0, 0], "whatever2"]
];
const levels = [
    [exampleLevel1,"map1"],
    [exampleLevel2, "map2"]
];

// CAR MODEL CONFIGURATION
loadCarModels(levels[0][0]).then(() => {
    console.log("All car models loaded successfully.");
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