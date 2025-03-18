import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

let scene = null;
let camera = null;
let controls = null;

export function initCars(sceneObj, cameraObj, controlsObj) {
    scene = sceneObj;
    camera = cameraObj;
    controls = controlsObj;
}

const modelLoader = new GLTFLoader();

// CAR MODELS CONFIGURATION
const carModelPaths = [
    "../assets/kenney_car-kit/Models/GLB format/ambulance.glb",
    "../assets/kenney_car-kit/Models/GLB format/firetruck.glb",
    "../assets/kenney_car-kit/Models/GLB format/police.glb",
    "../assets/kenney_car-kit/Models/GLB format/sedan.glb",
    "../assets/kenney_car-kit/Models/GLB format/suv-luxury.glb",
    "../assets/kenney_car-kit/Models/GLB format/tractor-police.glb",
    "../assets/kenney_car-kit/Models/GLB format/truck-flat.glb",
    "../assets/kenney_car-kit/Models/GLB format/delivery.glb",
    "../assets/kenney_car-kit/Models/GLB format/garbage-truck.glb",
    "../assets/kenney_car-kit/Models/GLB format/race.glb",
    "../assets/kenney_car-kit/Models/GLB format/sedan-sports.glb",
    "../assets/kenney_car-kit/Models/GLB format/taxi.glb",
    "../assets/kenney_car-kit/Models/GLB format/tractor-shovel.glb",
    "../assets/kenney_car-kit/Models/GLB format/van.glb",
    "../assets/kenney_car-kit/Models/GLB format/delivery-flat.glb",
    "../assets/kenney_car-kit/Models/GLB format/hatchback-sports.glb",
    "../assets/kenney_car-kit/Models/GLB format/race-future.glb",
    "../assets/kenney_car-kit/Models/GLB format/suv.glb",
    "../assets/kenney_car-kit/Models/GLB format/tractor.glb",
    "../assets/kenney_car-kit/Models/GLB format/truck.glb"
];

const loadedCarModels = [];
let currentCarIndex = 0;

export function loadCarModels() {
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
                    // I have no clue if there's another way to round to 1 decimal place
                    const percent = Math.round((progress.loaded / progress.total) * 100 * 10)/10;
                    if (percent < 100) {
                        console.log(`Loading model ${index + 1}: ${percent}%`);
                    }
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

export function nextCar() {
    const nextIndex = (currentCarIndex + 1) % loadedCarModels.length;
    return setActiveCar(nextIndex);
}