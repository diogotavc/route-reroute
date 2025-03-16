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

// CAR MODEL CONFIGURATION
loadCarModels().then(() => {
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