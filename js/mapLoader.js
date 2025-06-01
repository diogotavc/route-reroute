import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
    STREETLIGHT_INTENSITY, 
    GRASS_HEIGHT, 
    GRASS_COLOR,
    STREETLIGHT_SHADOW_MAP_SIZE,
    ENABLE_STREETLIGHT_SHADOWS,
    SHADOW_BIAS,
    SHADOW_NORMAL_BIAS,
    RANDOM_OBJECT_SCALE_DIVISOR
} from './config.js';
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
        console.error("A valid scene object must be provided to createMapLayout.");
        return null; 
    }

    const layout = mapDefinition.layout;
    const tileSize = mapDefinition.tileSize;
    const tileScaleVec = mapDefinition.tileScale ? 
        new THREE.Vector3(mapDefinition.tileScale.x, mapDefinition.tileScale.y, mapDefinition.tileScale.z) : 
        new THREE.Vector3(tileSize, tileSize, tileSize);
    const mapGroup = new THREE.Group();
    mapGroup.userData.collidableTiles = [];
    mapGroup.userData.streetLights = [];

    layout.forEach((row, z) => {
        row.forEach((tileInfo, x) => {
            const grass = createGrassPlane(x, z, tileSize);
            mapGroup.add(grass);
            
            if (tileInfo && tileInfo.length >= 2) {
                const tileAssetName = tileInfo[0];
                const rotationYDegrees = tileInfo[1];
                const modelPath = mapDefinition.tileAssets[tileAssetName];

                if (modelPath && loadedTileModels[modelPath]) {
                    const originalModel = loadedTileModels[modelPath];
                    const tileInstance = originalModel.clone();

                    let scaleVector = tileScaleVec.clone();
                    if (tileAssetName.startsWith('building_') && mapDefinition.buildingScale !== undefined) {
                        scaleVector.multiplyScalar(mapDefinition.buildingScale);
                    }

                    tileInstance.scale.copy(scaleVector);
                    tileInstance.position.set(x * tileSize, 0, z * tileSize);
                    tileInstance.rotation.y = THREE.MathUtils.degToRad(rotationYDegrees);
                    
                    tileInstance.traverse(node => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            if (node.material) {
                                if (Array.isArray(node.material)) {
                                    node.material.forEach(mat => {
                                        mat.shadowSide = THREE.DoubleSide;
                                    });
                                } else {
                                    node.material.shadowSide = THREE.DoubleSide;
                                }
                            }
                        }
                    });

                    if (originalModel.userData.originalHalfExtents) {
                        tileInstance.userData.halfExtents = originalModel.userData.originalHalfExtents.clone().multiply(scaleVector);
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
                    console.warn(`Model for tile '${tileAssetName}' at [${x},${z}] not found or not loaded.`);
                }
            }
        });
    });

    if (mapDefinition.streetLightLayout) {
        mapDefinition.streetLightLayout.forEach((row, z) => {
            row.forEach((lightInfo, x) => {
                if (lightInfo && lightInfo.length >= 2) {
                    const lightAssetName = lightInfo[0];
                    const rotationYDegrees = lightInfo[1];
                    const offsetX = lightInfo[2] || 0;
                    const offsetZ = lightInfo[3] || 0;
                    const modelPath = mapDefinition.tileAssets[lightAssetName];

                    if (modelPath && loadedTileModels[modelPath]) {
                        const originalModel = loadedTileModels[modelPath];
                        const lightInstance = originalModel.clone();

                        lightInstance.scale.copy(tileScaleVec);
                        lightInstance.position.set(
                            x * tileSize + offsetX * tileSize,
                            0, 
                            z * tileSize + offsetZ * tileSize
                        );
                        lightInstance.rotation.y = THREE.MathUtils.degToRad(rotationYDegrees);

                        lightInstance.traverse(node => {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;
                                if (node.material) {
                                    if (Array.isArray(node.material)) {
                                        node.material.forEach(mat => {
                                            mat.shadowSide = THREE.DoubleSide;
                                        });
                                    } else {
                                        node.material.shadowSide = THREE.DoubleSide;
                                    }
                                }
                            }
                        });

                        if (originalModel.userData.originalHalfExtents) {
                            lightInstance.userData.halfExtents = originalModel.userData.originalHalfExtents.clone().multiply(tileScaleVec);
                        } else {
                            const box = new THREE.Box3().setFromObject(lightInstance);
                            lightInstance.userData.halfExtents = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
                        }

                        lightInstance.userData.isCollidable = true;
                        mapGroup.userData.collidableTiles.push(lightInstance);

                        const baseBulbRadius = 0.02;
                        const bulbRadius = baseBulbRadius * tileSize;
                        const bulbGeometry = new THREE.SphereGeometry(bulbRadius, 8, 6);
                        const bulbMaterial = new THREE.MeshBasicMaterial({ 
                            color: 0xffaa55,
                            transparent: true,
                            opacity: 0.7
                        });
                        const lightBulb = new THREE.Mesh(bulbGeometry, bulbMaterial);

                        const rotationRad = THREE.MathUtils.degToRad(rotationYDegrees);
                        const baseFrontOffset = -0.167;
                        const frontOffset = baseFrontOffset * tileSize;
                        const frontOffsetX = Math.sin(rotationRad) * frontOffset;
                        const frontOffsetZ = Math.cos(rotationRad) * frontOffset;

                        const baseBulbHeight = lightAssetName.includes('curve') ? 0.655 : 0.58;
                        const bulbHeight = baseBulbHeight * tileSize;

                        lightBulb.position.set(
                            x * tileSize + offsetX * tileSize + frontOffsetX,
                            bulbHeight,
                            z * tileSize + offsetZ * tileSize + frontOffsetZ
                        );

                        const baseLightRange = 4.17;
                        const lightRange = baseLightRange * tileSize;
                        const spotlight = new THREE.SpotLight(0xffaa55, STREETLIGHT_INTENSITY, lightRange, Math.PI * 0.25, 0.3, 1.0);
                        spotlight.position.copy(lightBulb.position);

                        const baseBulbOffsetDistance = 0.167;
                        const bulbOffsetDistance = baseBulbOffsetDistance * tileSize;
                        const lightTargetDistance = bulbOffsetDistance * 2;
                        const targetPosition = new THREE.Vector3(
                            lightBulb.position.x + Math.sin(rotationRad) * (-lightTargetDistance),
                            0,
                            lightBulb.position.z + Math.cos(rotationRad) * (-lightTargetDistance)
                        );
                        spotlight.target.position.copy(targetPosition);

                        spotlight.castShadow = ENABLE_STREETLIGHT_SHADOWS;
                        if (ENABLE_STREETLIGHT_SHADOWS) {
                            spotlight.shadow.mapSize.width = STREETLIGHT_SHADOW_MAP_SIZE;
                            spotlight.shadow.mapSize.height = STREETLIGHT_SHADOW_MAP_SIZE;
                            spotlight.shadow.camera.near = 0.1;
                            spotlight.shadow.camera.far = lightRange;
                            spotlight.shadow.bias = SHADOW_BIAS;
                            spotlight.shadow.normalBias = SHADOW_NORMAL_BIAS;
                        }

                        scene.add(lightBulb);
                        scene.add(spotlight);
                        scene.add(spotlight.target);

                        mapGroup.add(lightInstance);
                        mapGroup.userData.streetLights.push(spotlight);
                    } else {
                        console.warn(`Model for streetlight '${lightAssetName}' at [${x},${z}] not found or not loaded.`);
                    }
                }
            });
        });
    }

    if (mapDefinition.randomObjectsLayout) {
        mapDefinition.randomObjectsLayout.forEach((objectInfo) => {
            if (objectInfo && objectInfo.length >= 7) {
                const objectAssetName = objectInfo[0];
                const rotationXDegrees = objectInfo[1];
                const rotationYDegrees = objectInfo[2];
                const rotationZDegrees = objectInfo[3];
                const positionX = objectInfo[4];
                const positionZ = objectInfo[5];
                const scale = objectInfo[6];
                const modelPath = mapDefinition.tileAssets[objectAssetName];

                if (modelPath && loadedTileModels[modelPath]) {
                    const originalModel = loadedTileModels[modelPath];
                    const objectInstance = originalModel.clone();

                    const scaledSize = scale * (tileSize / RANDOM_OBJECT_SCALE_DIVISOR);
                    const objectScale = new THREE.Vector3(scaledSize, scaledSize, scaledSize);
                    objectInstance.scale.copy(objectScale);

                    objectInstance.position.set(positionX * tileSize, 0, positionZ * tileSize);
                    objectInstance.rotation.x = THREE.MathUtils.degToRad(rotationXDegrees);
                    objectInstance.rotation.y = THREE.MathUtils.degToRad(rotationYDegrees);
                    objectInstance.rotation.z = THREE.MathUtils.degToRad(rotationZDegrees);

                    objectInstance.traverse(node => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            if (node.material) {
                                if (Array.isArray(node.material)) {
                                    node.material.forEach(mat => {
                                        mat.shadowSide = THREE.DoubleSide;
                                    });
                                } else {
                                    node.material.shadowSide = THREE.DoubleSide;
                                }
                            }
                        }
                    });

                    if (originalModel.userData.originalHalfExtents) {
                        objectInstance.userData.halfExtents = originalModel.userData.originalHalfExtents.clone().multiply(objectScale);
                    } else {
                        const box = new THREE.Box3().setFromObject(objectInstance);
                        objectInstance.userData.halfExtents = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
                    }

                    objectInstance.userData.isCollidable = true;
                    mapGroup.userData.collidableTiles.push(objectInstance);

                    mapGroup.add(objectInstance);
                } else {
                    console.warn(`Model for random object '${objectAssetName}' not found or not loaded.`);
                }
            }
        });
    }

    scene.add(mapGroup);

    if (mapGroup.userData.streetLights.length > 0) {
        registerStreetLights(mapGroup.userData.streetLights);
    }

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

export function getGridCoordinates(worldX, worldZ, mapDefinition) {
    const tileSize = mapDefinition.tileSize;
    return {
        x: Math.floor((worldX + tileSize / 2) / tileSize),
        z: Math.floor((worldZ + tileSize / 2) / tileSize)
    };
}

export function isOnGrass(worldX, worldZ, mapDefinition) {
    const gridCoords = getGridCoordinates(worldX, worldZ, mapDefinition);
    const layout = mapDefinition.layout;

    // THIS IS FOR OUT OF BOUNDS. NEEDS CHECKING LATER
    if (gridCoords.z < 0 || gridCoords.z >= layout.length || 
        gridCoords.x < 0 || gridCoords.x >= layout[0].length) {
        return true;
    }

    const tileInfo = layout[gridCoords.z][gridCoords.x];
    const onGrass = tileInfo === null;

    return onGrass;
}

function createGrassPlane(x, z, tileSize) {
    const grassGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
    const grassMaterial = new THREE.MeshLambertMaterial({ 
        color: GRASS_COLOR,
        side: THREE.DoubleSide
    });
    const grassPlane = new THREE.Mesh(grassGeometry, grassMaterial);
    
    grassPlane.position.set(x * tileSize, GRASS_HEIGHT, z * tileSize);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.receiveShadow = true;
    
    return grassPlane;
}