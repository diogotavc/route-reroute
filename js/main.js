import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0x87CEEB);
document.body.appendChild(renderer.domElement);

// LIGHTS
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// GROUND
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// GRID & AXIS HELPER (DEBUG)
const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// ORBITCONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const modelLoader = new GLTFLoader();

// CAR MODELS CONFIGURATION
const carModelPaths = [
    "../assets/kenney_car-kit/Models/GLB format/hatchback-sports.glb",
    "../assets/kenney_car-kit/Models/GLB format/sedan.glb",
    "../assets/kenney_car-kit/Models/GLB format/suv.glb",
    "../assets/kenney_car-kit/Models/GLB format/police.glb",
    "../assets/kenney_car-kit/Models/GLB format/delivery.glb",
    "../assets/kenney_car-kit/Models/GLB format/truck-flat.glb",
    "../assets/kenney_car-kit/Models/GLB format/taxi.glb",
    "../assets/kenney_car-kit/Models/GLB format/ambulance.glb",
    "../assets/kenney_car-kit/Models/GLB format/delivery-flat.glb",
    "../assets/kenney_car-kit/Models/GLB format/suv-luxury.glb",
    "../assets/kenney_car-kit/Models/GLB format/tractor.glb",
    "../assets/kenney_car-kit/Models/GLB format/van.glb",
    "../assets/kenney_car-kit/Models/GLB format/truck.glb",
    "../assets/kenney_car-kit/Models/GLB format/firetruck.glb"
    // missing some models, dunno if I'll use them
];

const loadedCarModels = [];
let currentCarIndex = 0;

function loadCarModels() {
    const loadModelPromises = carModelPaths.map((path, index) => {
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

                    model.visible = false;
                    model.scale.set(1, 1, 1);
                    model.position.set(0, 0, 0);

                    scene.add(model);
                    loadedCarModels.push(model);
                    
                    console.log(`Loaded car model ${index + 1}/${carModelPaths.length}`);
                    resolve();
                },
                (progress) => {
                    console.log(`Loading model ${index + 1}: ${(progress.loaded / progress.total) * 100}%`);
                },
                (error) => {
                    console.error(`Error loading car model ${index}:`, error);
                    reject(error);
                }
            );
        });
    });

    return Promise.all(loadModelPromises).then(() => {
        if (loadedCarModels.length > 0) {
            setActiveCar(0);
        }
    });
}

function setActiveCar(index) {
    if (index < 0 || index >= loadedCarModels.length) {
        console.error("Invalid car index:", index);
        return;
    }
    
    // REMOVE LATER
    loadedCarModels.forEach(car => car.visible = false);

    const activeCar = loadedCarModels[index];
    activeCar.visible = true;
    currentCarIndex = index;

    const boundingBox = new THREE.Box3().setFromObject(activeCar);
    const center = boundingBox.getCenter(new THREE.Vector3());

    camera.position.set(center.x + 4, center.y + 3, center.z + 5);
    camera.lookAt(center);
    controls.target.copy(center);

    return activeCar;
}

function nextCar() {
    const nextIndex = (currentCarIndex + 1) % loadedCarModels.length;
    return setActiveCar(nextIndex);
}

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