import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEBUG_MODEL_LOADING, DEBUG_GENERAL } from './config.js';
import { registerStreetLights } from './lights.js';

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
                        const pointLight = new THREE.PointLight(0xffaa55, 2.0, 20 * tileScaleVec.x, 1.0);
                        pointLight.position.set(0, 2, 0);
                        pointLight.castShadow = true;
                        lightInstance.add(pointLight);
                        lightInstance.userData.pointLight = pointLight;

                        const markerGeometry = new THREE.SphereGeometry(0.12, 8, 6);
                        const markerMaterial = new THREE.MeshBasicMaterial({ 
                            color: 0xffffff,
                            transparent: true,
                            opacity: 0.7
                        });
                        const positionMarker = new THREE.Mesh(markerGeometry, markerMaterial);

                        const rotationRad = THREE.MathUtils.degToRad(rotationYDegrees);
                        const frontOffsetX = Math.sin(rotationRad) * (-1);
                        const frontOffsetZ = Math.cos(rotationRad) * (-1);
                        
                        // alguns modelos são diferentes a nível de altura
                        const markerHeight = lightAssetName.includes('curve') ? 3.93 : 3.48;

                        positionMarker.position.set(
                            x * tileSize + offsetX * tileSize + frontOffsetX,
                            markerHeight,
                            z * tileSize + offsetZ * tileSize + frontOffsetZ
                        );
                        scene.add(positionMarker);

                        mapGroup.add(lightInstance);
                        mapGroup.userData.streetLights.push(pointLight);
                    } else {
                        if (DEBUG_MODEL_LOADING) console.warn(`Model for streetlight '${lightAssetName}' at [${x},${z}] not found or not loaded.`);
                    }
                }
            });
        });
    }

    scene.add(mapGroup);
    
    // Register streetlights with the lighting system
    if (mapGroup.userData.streetLights.length > 0) {
        registerStreetLights(mapGroup.userData.streetLights);
        if (DEBUG_GENERAL) console.log(`Registered ${mapGroup.userData.streetLights.length} streetlights.`);
    }
    
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