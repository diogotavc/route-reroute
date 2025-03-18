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
const carModels = {
    "ambulance":["../assets/kenney_car-kit/Models/GLB format/ambulance.glb"],
    "firetruck":["../assets/kenney_car-kit/Models/GLB format/firetruck.glb"],
    "police":["../assets/kenney_car-kit/Models/GLB format/police.glb"],
    "sedan":["../assets/kenney_car-kit/Models/GLB format/sedan.glb"],
    "suv-luxury":["../assets/kenney_car-kit/Models/GLB format/suv-luxury.glb"],
    "tractor-police":["../assets/kenney_car-kit/Models/GLB format/tractor-police.glb"],
    "truck-flat":["../assets/kenney_car-kit/Models/GLB format/truck-flat.glb"],
    "delivery":["../assets/kenney_car-kit/Models/GLB format/delivery.glb"],
    "garbage-truck":["../assets/kenney_car-kit/Models/GLB format/garbage-truck.glb"],
    "race":["../assets/kenney_car-kit/Models/GLB format/race.glb"],
    "sedan-sports":["../assets/kenney_car-kit/Models/GLB format/sedan-sports.glb"],
    "taxi":["../assets/kenney_car-kit/Models/GLB format/taxi.glb"],
    "tractor-shovel":["../assets/kenney_car-kit/Models/GLB format/tractor-shovel.glb"],
    "van":["../assets/kenney_car-kit/Models/GLB format/van.glb"],
    "delivery-flat":["../assets/kenney_car-kit/Models/GLB format/delivery-flat.glb"],
    "hatchback-sports":["../assets/kenney_car-kit/Models/GLB format/hatchback-sports.glb"],
    "race-future":["../assets/kenney_car-kit/Models/GLB format/race-future.glb"],
    "suv":["../assets/kenney_car-kit/Models/GLB format/suv.glb"],
    "tractor":["../assets/kenney_car-kit/Models/GLB format/tractor.glb"],
    "truck":["../assets/kenney_car-kit/Models/GLB format/truck.glb"]
};

const loadedCarModels = {};
let missionIndex = 0;

export function loadCarModels(level) {
    const loadModelPromises = level.map((mission, index) => {
        const name = mission[0];
        const path = carModels[name][0];
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
                    const startingPoint = mission[3];
                    model.position.set(startingPoint[0], startingPoint[1], startingPoint[2]);

                    scene.add(model);
                    loadedCarModels[index] = model;

                    console.debug(`Loaded car model ${index + 1}/${level.length} - ${name}`);
                    resolve();
                },
                (progress) => {
                    // I have no clue if there's another way to round to 1 decimal place
                    const percent = Math.round((progress.loaded / progress.total) * 100 * 10)/10;
                    if (percent < 100) {
                        console.debug(`Loading model ${index + 1}: ${percent}%`);
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
        if (Object.keys(loadedCarModels).length > 0) {
            setActiveCar(0);
        }
    });
}

function setActiveCar(index) {
    var carCount = Object.keys(loadedCarModels).length;
    if (index < 0 || index >= carCount) {
        console.error("Invalid car index:", index);
        return;
    }

    // REMOVE LATER
    // Object.values(loadedCarModels).forEach(car => car.visible = false);

    const activeCar = loadedCarModels[index];
    activeCar.visible = true;
    missionIndex = index;

    const boundingBox = new THREE.Box3().setFromObject(activeCar);
    const center = boundingBox.getCenter(new THREE.Vector3());

    camera.position.set(center.x + 4, center.y + 3, center.z + 5);
    camera.lookAt(center);
    controls.target.copy(center);

    return activeCar;
}

export function nextCar() {
    var carCount = Object.keys(loadedCarModels).length;
    if ( carCount == missionIndex + 1 ) { return -1 };
    const nextIndex = (missionIndex + 1) % carCount;
    return setActiveCar(nextIndex);
}