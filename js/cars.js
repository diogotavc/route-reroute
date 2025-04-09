import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
    ambulance: ["/route-reroute/assets/kenney_car-kit/Models/ambulance.glb"],
    firetruck: ["/route-reroute/assets/kenney_car-kit/Models/firetruck.glb"],
    police: ["/route-reroute/assets/kenney_car-kit/Models/police.glb"],
    sedan: ["/route-reroute/assets/kenney_car-kit/Models/sedan.glb"],
    "suv-luxury": ["/route-reroute/assets/kenney_car-kit/Models/suv-luxury.glb"],
    "tractor-police": [
        "/route-reroute/assets/kenney_car-kit/Models/tractor-police.glb",
    ],
    "truck-flat": ["/route-reroute/assets/kenney_car-kit/Models/truck-flat.glb"],
    delivery: ["/route-reroute/assets/kenney_car-kit/Models/delivery.glb"],
    "garbage-truck": [
        "/route-reroute/assets/kenney_car-kit/Models/garbage-truck.glb",
    ],
    race: ["/route-reroute/assets/kenney_car-kit/Models/race.glb"],
    "sedan-sports": [
        "/route-reroute/assets/kenney_car-kit/Models/sedan-sports.glb",
    ],
    taxi: ["/route-reroute/assets/kenney_car-kit/Models/taxi.glb"],
    "tractor-shovel": [
        "/route-reroute/assets/kenney_car-kit/Models/tractor-shovel.glb",
    ],
    van: ["/route-reroute/assets/kenney_car-kit/Models/van.glb"],
    "delivery-flat": [
        "/route-reroute/assets/kenney_car-kit/Models/delivery-flat.glb",
    ],
    "hatchback-sports": [
        "/route-reroute/assets/kenney_car-kit/Models/hatchback-sports.glb",
    ],
    "race-future": [
        "/route-reroute/assets/kenney_car-kit/Models/race-future.glb",
    ],
    suv: ["/route-reroute/assets/kenney_car-kit/Models/suv.glb"],
    tractor: ["/route-reroute/assets/kenney_car-kit/Models/tractor.glb"],
    truck: ["/route-reroute/assets/kenney_car-kit/Models/truck.glb"],
};

const loadedCarModels = {};
let missionIndex = 0;
let levels;

export function loadCarModels(level) {
    levels = level;
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
                    model.position.set(
                        startingPoint[0],
                        startingPoint[1],
                        startingPoint[2],
                    );

                    scene.add(model);
                    loadedCarModels[index] = model;

                    console.debug(
                        `Loaded car model ${index + 1}/${level.length} - ${name}`,
                    );
                    resolve();
                },
                (progress) => {},
                (error) => {
                    console.error(`Error loading car model ${index}:`, error);
                    reject(error);
                },
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

    var [modelName, character, backstory, startingPoint, finishingPoint] =
        levels[index];
    var characterName =
        String(character).charAt(0).toUpperCase() + String(character).slice(1);
    console.log(`${characterName}: ${backstory}`);
    console.log(
        `Drive ${modelName} from ${startingPoint} to ${finishingPoint}.`,
    );

    // REMOVE LATER
    // Object.values(loadedCarModels).forEach(car => car.visible = false);

    const activeCar = loadedCarModels[index];
    activeCar.visible = true;
    missionIndex = index;

    const boundingBox = new THREE.Box3().setFromObject(activeCar);
    const center = boundingBox.getCenter(new THREE.Vector3());

    // camera.position.set is now done outside of this function
    const startPosition = new THREE.Vector3(center.x, center.y - 5, center.z);
    camera.lookAt(center);
    controls.target.copy(startPosition);

    return activeCar;
}

export function nextCar() {
    var carCount = Object.keys(loadedCarModels).length;
    if (carCount == missionIndex + 1) {
        return -1;
    }
    const nextIndex = (missionIndex + 1) % carCount;
    return setActiveCar(nextIndex);
}

/**
 * Moves the current car to the destination with logarithmic speed
 * @param {THREE.Vector3 | [number, number, number]} destination - The target position 
 * @param {number} duration - Duration of the movement in milliseconds
 * @returns {Promise} - Resolves when the movement completes
 */
export function moveCurrentCar(destination, duration = 3000) {
    return new Promise((resolve) => {
        const car = loadedCarModels[missionIndex];
        
        if (!car) {
            console.error("No current car to move");
            resolve(false);
            return;
        }
        
        // Convert array to Vector3 if needed
        const targetPos = Array.isArray(destination) 
            ? new THREE.Vector3(destination[0], destination[1], destination[2])
            : destination;
        
        // Store starting position
        const startPos = car.position.clone();
        
        // Calculate distance to move
        const distance = startPos.distanceTo(targetPos);
        
        // Start the animation
        const startTime = performance.now();
        
        // Logarithmic animation function
        function animateMovement(currentTime) {
            // Calculate elapsed time
            const elapsedTime = currentTime - startTime;
            
            if (elapsedTime >= duration) {
                // Animation finished
                car.position.copy(targetPos);
                console.log("Car movement complete");
                resolve(true);
                return;
            }
            
            // Normalized time (0 to 1)
            const t = elapsedTime / duration;
            
            // Logarithmic easing: starts fast and slows down
            // 1 - Math.log(1 + 9 * t) / Math.log(10) approximates 1 - log10(1 + 9t)
            // This gives us a curve that starts at 1 and goes to 0 in logarithmic fashion
            const progress = 1 - (1 - t) * (1 - Math.log(1 + 9 * t) / Math.log(10));
            
            // Calculate new position
            const newPos = new THREE.Vector3(
                startPos.x + (targetPos.x - startPos.x) * progress,
                startPos.y + (targetPos.y - startPos.y) * progress,
                startPos.z + (targetPos.z - startPos.z) * progress
            );
            
            // Update car position
            car.position.copy(newPos);
            
            // Continue the animation
            requestAnimationFrame(animateMovement);
        }
        
        // Start the animation loop
        requestAnimationFrame(animateMovement);
        
        console.log(`Moving car from ${startPos.toArray().join(',')} to ${targetPos.toArray().join(',')} over ${duration}ms`);
    });
}
