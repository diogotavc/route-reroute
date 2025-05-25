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
    const tileScaleVec = mapDefinition.tileScale ? new THREE.Vector3(mapDefinition.tileScale.x, mapDefinition.tileScale.y, mapDefinition.tileScale.z) : new THREE.Vector3(1, 1, 1);
    const mapGroup = new THREE.Group();
    mapGroup.userData.collidableTiles = [];
    mapGroup.userData.streetLights = []; // Initialize array for streetlights

    layout.forEach((row, z) => {
        row.forEach((tileInfo, x) => {
            if (tileInfo && tileInfo.length >= 2) { // Ensure tileInfo is valid
                const tileAssetName = tileInfo[0];
                const rotationYDegrees = tileInfo[1];
                const modelPath = mapDefinition.tileAssets[tileAssetName];

                if (modelPath && loadedTileModels[modelPath]) {
                    const originalModel = loadedTileModels[modelPath];
                    const tileInstance = originalModel.clone();

                    tileInstance.scale.copy(tileScaleVec);
                    tileInstance.position.set(x * tileSize, 0, z * tileSize);
                    tileInstance.rotation.y = THREE.MathUtils.degToRad(rotationYDegrees);
                    
                    tileInstance.traverse(node => { // Ensure all children also cast/receive shadows
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });

                    if (originalModel.userData.originalHalfExtents) {
                        tileInstance.userData.halfExtents = originalModel.userData.originalHalfExtents.clone().multiply(tileScaleVec);
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
                    if (DEBUG_MODEL_LOADING) console.warn(`Model for tile '${tileAssetName}' at [${x},${z}] not found or not loaded.`);
                }
            }
        });
    });

    if (mapDefinition.streetLightLayout) {
        mapDefinition.streetLightLayout.forEach((row, z) => {
            row.forEach((lightInfo, x) => {
                if (lightInfo && lightInfo.length >= 2) { // [assetName, rotationY, offsetX, offsetZ]
                    const lightAssetName = lightInfo[0];
                    const rotationYDegrees = lightInfo[1];
                    const offsetX = lightInfo[2] || 0;
                    const offsetZ = lightInfo[3] || 0;
                    const modelPath = mapDefinition.tileAssets[lightAssetName];

                    if (modelPath && loadedTileModels[modelPath]) {
                        const originalModel = loadedTileModels[modelPath];
                        const lightInstance = originalModel.clone();

                        lightInstance.scale.copy(tileScaleVec);
                        // Apply offsets relative to tile center, scaled by tileSize
                        lightInstance.position.set(
                            x * tileSize + offsetX * tileSize,
                            0, 
                            z * tileSize + offsetZ * tileSize
                        );
                        lightInstance.rotation.y = THREE.MathUtils.degToRad(rotationYDegrees);

                        lightInstance.traverse(node => {
                            if (node.isMesh) {
                                node.castShadow = true; // Streetlights themselves can cast shadows
                                node.receiveShadow = true;
                            }
                        });

                        // Add a PointLight to the streetlight model
                        const pointLight = new THREE.PointLight(0xffaa55, 0, 15 * tileScaleVec.x, 1.5); // Color, Intensity (initially 0), Distance, Decay
                        pointLight.position.set(0, 2.5 * tileScaleVec.y, 0); // Adjust Y based on model height, relative to model origin
                        pointLight.castShadow = false; // Light from streetlight bulb usually doesn't cast sharp shadows
                        lightInstance.add(pointLight);
                        lightInstance.userData.pointLight = pointLight; // Store reference for easy access

                        mapGroup.add(lightInstance);
                        mapGroup.userData.streetLights.push(pointLight); // Add the light itself to the list for toggling
                    } else {
                        if (DEBUG_MODEL_LOADING) console.warn(`Model for streetlight '${lightAssetName}' at [${x},${z}] not found or not loaded.`);
                    }
                }
            });
        });
    }

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