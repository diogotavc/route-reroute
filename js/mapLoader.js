import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const modelLoader = new GLTFLoader();
const loadedTileModels = {}; // Cache for loaded models

/**
 * Loads all unique tile models defined in the mapData.
 * @param {object} mapDefinition - The map data object.
 * @returns {Promise} - Resolves when all models are loaded.
 */
function loadTileModels(mapDefinition) {
    const tilePromises = [];
    const uniqueModelsToLoad = new Set();

    // Collect all unique model paths from tileAssets
    for (const key in mapDefinition.tileAssets) {
        uniqueModelsToLoad.add(mapDefinition.tileAssets[key]);
    }

    uniqueModelsToLoad.forEach(modelPath => {
        if (!loadedTileModels[modelPath]) { // Only load if not already cached
            const promise = new Promise((resolve, reject) => {
                modelLoader.load(
                    modelPath,
                    (gltf) => {
                        const model = gltf.scene;
                        model.traverse((node) => {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;
                            }
                        });
                        // It's good practice to calculate and store halfExtents if these tiles
                        // need to be involved in physics later (e.g., collision with environment)
                        // const box = new THREE.Box3().setFromObject(model);
                        // model.userData.halfExtents = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
                        loadedTileModels[modelPath] = model;
                        console.debug(`Loaded map tile model: ${modelPath}`);
                        resolve();
                    },
                    undefined, // onProgress callback (optional)
                    (error) => {
                        console.error(`Error loading map tile model ${modelPath}:`, error);
                        reject(error);
                    }
                );
            });
            tilePromises.push(promise);
        }
    });
    return Promise.all(tilePromises);
}

/**
 * Creates and positions map tiles in the scene based on the layout.
 * @param {THREE.Scene} scene - The Three.js scene object.
 * @param {object} mapDefinition - The map data object.
 * @returns {THREE.Group} - The group containing all map tiles.
 */
function createMapLayout(scene, mapDefinition) { // Added scene parameter
    if (!scene) { // Check if scene is valid
        console.error("A valid scene object must be provided to createMapLayout.");
        return null; // Return null or throw error
    }

    const layout = mapDefinition.layout;
    const tileSize = mapDefinition.tileSize;
    const mapGroup = new THREE.Group(); // Group all map tiles for organization

    layout.forEach((row, z) => {
        row.forEach((tileInfo, x) => {
            if (tileInfo && tileInfo.length === 2) {
                const tileAssetName = tileInfo[0];
                const rotationYDegrees = tileInfo[1];
                const modelPath = mapDefinition.tileAssets[tileAssetName];

                if (modelPath && loadedTileModels[modelPath]) {
                    const originalModel = loadedTileModels[modelPath];
                    const tileInstance = originalModel.clone();
                    tileInstance.position.set(x * tileSize, 0, z * tileSize);
                    tileInstance.rotation.y = THREE.MathUtils.degToRad(rotationYDegrees);
                    mapGroup.add(tileInstance);
                } else {
                    console.warn(`Model for tile '${tileAssetName}' not found or not loaded.`);
                }
            }
        });
    });
    scene.add(mapGroup); // Add the entire map to the provided scene
    console.log("Map layout created and added to scene.");
    return mapGroup;
}

/**
 * Loads and builds the map defined by mapDefinition.
 * @param {THREE.Scene} scene - The Three.js scene object.
 * @param {object} mapDefinition - The map data object.
 * @returns {Promise<THREE.Group>} - Resolves with the map group when done.
 */
export async function loadMap(scene, mapDefinition) { // Added scene parameter
    try {
        await loadTileModels(mapDefinition);
        const mapGroup = createMapLayout(scene, mapDefinition); // Pass scene here
        if (!mapGroup) {
            throw new Error("Map layout creation failed.");
        }
        return mapGroup;
    } catch (error) {
        console.error("Failed to load map:", error);
        throw error;
    }
}

/**
 * Converts grid coordinates from mapDefinition to world coordinates.
 * @param {number} gridX - The X coordinate in the map layout grid.
 * @param {number} gridZ - The Z coordinate in the map layout grid.
 * @param {object} mapDefinition - The map data object.
 * @returns {THREE.Vector3} - The world coordinates.
 */
export function getWorldCoordinates(gridX, gridZ, mapDefinition) {
    const tileSize = mapDefinition.tileSize;
    return new THREE.Vector3(
        gridX * tileSize,
        0,
        gridZ * tileSize
    );
}