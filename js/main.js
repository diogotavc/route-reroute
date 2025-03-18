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
    ["ambulance", "Dr. Healmore", "Rushing to save a critical patient.", "hospital", "downtown"],
    ["firetruck", "Chief Blaze", "A fire broke out in an apartment complex.", "firestation", "apartment-block"],
    ["police", "Officer Speed", "Chasing a getaway car!", "police-station", "highway"],
    ["sedan", "Bob Commuter", "Late for an important meeting.", "suburbs", "office"],
    ["suv-luxury", "Mr. Richman", "Heading to a gala event.", "mansion", "city-center"],
    ["tractor-police", "Deputy Plow", "Rural patrol duty.", "farm", "county-jail"],
    ["truck-flat", "Big Joe", "Delivering construction materials.", "warehouse", "construction-site"],
    ["delivery", "Timmy Express", "Rush delivery of a fragile package.", "post-office", "residential-area"],
    ["garbage-truck", "Oscar Binman", "Trash pickup for the whole neighborhood.", "garbage-depot", "landfill"],
    ["race", "Lightning Fast", "Competing in the Grand Prix!", "race-track", "finish-line"],
    ["sedan-sports", "Speedy Greg", "Testing out his new turbo engine.", "garage", "coastal-road"],
    ["taxi", "Manny Cab", "Picking up an important passenger.", "airport", "hotel"],
    ["tractor-shovel", "Farmer Buck", "Clearing the field for planting.", "barn", "north-field"],
    ["van", "Sam Courier", "Delivering a mysterious package.", "warehouse", "docks"],
    ["delivery-flat", "Flat Fred", "Transporting large furniture.", "ikea-store", "suburbs"],
    ["hatchback-sports", "Drift Queen", "Street racing at midnight.", "parking-lot", "bridge"],
    ["race-future", "Neo Racer", "High-speed hover race through the city.", "neo-district", "spaceport"],
    ["suv", "Emma Explorer", "Going on an off-road adventure.", "camp-site", "mountain-peak"],
    ["tractor", "Old Mac", "Plowing the fields.", "farmhouse", "cornfield"],
    ["truck", "Road King", "Long-haul delivery across the state.", "depot", "border-crossing"]
];
const exampleLevel2 = [
    ["suv", "john doe", "he's a dumb ass", "whatever1", "whatever1"],
    ["tractor", "quem", "te perguntou", "whatever2", "whatever2"]
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
        nextCar();
    }
});