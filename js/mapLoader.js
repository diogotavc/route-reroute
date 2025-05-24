import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEBUG_MODEL_LOADING, DEBUG_GENERAL } from './config.js';

const modelLoader = new GLTFLoader();
const loadedTileModels = {};

function loadTileModels(mapDefinition) {
    const tilePromises = [];
    const uniqueModelsToLoad = new Set();

    for (const key in mapDefinition.tileAssets) {
        uniqueModelsToLoad.add(mapDefinition.tileAssets[key]);
    }

    uniqueModelsToLoad.forEach(modelPath => {
        if (!loadedTileModels[modelPath]) {
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
                        const box = new THREE.Box3().setFromObject(model);
                        model.userData.originalHalfExtents = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
                        loadedTileModels[modelPath] = model;
                        if (DEBUG_MODEL_LOADING) console.log(`Loaded map tile model: ${modelPath}`);
                        resolve();
                    },
                    undefined, 
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

function createMapLayout(scene, mapDefinition) {
    if (!scene) {
        if (DEBUG_GENERAL) console.error("A valid scene object must be provided to createMapLayout.");
        return null; 
    }

    const layout = mapDefinition.layout;
    const tileSize = mapDefinition.tileSize;
    const tileScale = mapDefinition.tileScale ? new THREE.Vector3(mapDefinition.tileScale.x, mapDefinition.tileScale.y, mapDefinition.tileScale.z) : new THREE.Vector3(1, 1, 1);
    const mapGroup = new THREE.Group();
    mapGroup.userData.collidableTiles = [];

    layout.forEach((row, z) => {
        row.forEach((tileInfo, x) => {
            if (tileInfo && tileInfo.length === 2) {
                const tileAssetName = tileInfo[0];
                const rotationYDegrees = tileInfo[1];
                const modelPath = mapDefinition.tileAssets[tileAssetName];

                if (modelPath && loadedTileModels[modelPath]) {
                    const originalModel = loadedTileModels[modelPath];
                    const tileInstance = originalModel.clone();

                    tileInstance.scale.copy(tileScale);
                    tileInstance.position.set(x * tileSize, 0, z * tileSize);
                    tileInstance.rotation.y = THREE.MathUtils.degToRad(rotationYDegrees);
                    
                    if (originalModel.userData.originalHalfExtents) {
                        tileInstance.userData.halfExtents = originalModel.userData.originalHalfExtents.clone().multiply(tileScale);
                    } else {
                        const box = new THREE.Box3().setFromObject(tileInstance);
                        tileInstance.userData.halfExtents = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
                    }
                    
                    if (tileAssetName.startsWith('building_')) {
                        tileInstance.userData.isCollidable = true;
                        mapGroup.userData.collidableTiles.push(tileInstance);
                    }

                    mapGroup.add(tileInstance);
                } else {
                    if (DEBUG_MODEL_LOADING) console.warn(`Model for tile '${tileAssetName}' not found or not loaded.`);
                }
            }
        });
    });
    scene.add(mapGroup);
    if (DEBUG_GENERAL) console.log("Map layout created and added to scene.");
    return mapGroup;
}

export async function loadMap(scene, mapDefinition) {
    try {
        await loadTileModels(mapDefinition);
        const mapGroup = createMapLayout(scene, mapDefinition);
        if (!mapGroup) {
            throw new Error("Map layout creation failed.");
        }
        return mapGroup;
    } catch (error) {
        console.error("Failed to load map:", error);
        throw error;
    }
}

export function getWorldCoordinates(gridX, gridZ, mapDefinition) {
    const tileSize = mapDefinition.tileSize;
    return new THREE.Vector3(
        gridX * tileSize,
        0,
        gridZ * tileSize
    );
}