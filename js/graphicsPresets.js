import * as THREE from 'three';
import { 
    GRAPHICS_PRESETS, 
    CURRENT_GRAPHICS_PRESET, 
    setCurrentGraphicsPreset,
    getCurrentPresetValues,
    STREETLIGHT_INTENSITY,
    HEADLIGHT_INTENSITY
} from './config.js';
import { getStreetLights } from './lights.js';
import { getCarHeadlights } from './cars.js';

let currentRenderer = null;
let currentScene = null;
let directionalLight = null;
let streetLights = [];
let carHeadlights = {};

let originalStreetlightIntensity = STREETLIGHT_INTENSITY;
let originalHeadlightIntensity = HEADLIGHT_INTENSITY;

export function initGraphicsPresets(renderer, scene) {
    currentRenderer = renderer;
    currentScene = scene;

    applyGraphicsPreset(CURRENT_GRAPHICS_PRESET, false);
}

export function registerLights(dirLight) {
    directionalLight = dirLight;
    refreshLightReferences();
}

function refreshLightReferences() {
    streetLights = getStreetLights() || [];
    carHeadlights = getCarHeadlights() || {};
}

export function setGraphicsPreset(preset) {
    if (!GRAPHICS_PRESETS[preset]) {
        console.error(`Graphics preset "${preset}" not found`);
        return false;
    }

    console.log(`Switching to ${preset} graphics preset`);
    setCurrentGraphicsPreset(preset);
    applyGraphicsPreset(preset, true);
    return true;
}

function applyGraphicsPreset(preset, isRuntimeChange = false) {
    const presetValues = GRAPHICS_PRESETS[preset];
    
    if (!presetValues) {
        console.error(`Graphics preset values for "${preset}" not found`);
        return;
    }

    refreshLightReferences();

    if (currentRenderer) {
        updateRendererSettings(presetValues, isRuntimeChange);
    }

    updateShadowSettings(presetValues);

    updateLightingIntensities(presetValues);

    updateSceneSettings(presetValues);

    console.log(`Applied ${preset} graphics preset`);
}

function updateRendererSettings(presetValues, isRuntimeChange) {
    if (!currentRenderer) return;

    currentRenderer.setPixelRatio(presetValues.RENDERER_PIXEL_RATIO);

    const shadowMapTypes = {
        'BasicShadowMap': THREE.BasicShadowMap,
        'PCFShadowMap': THREE.PCFShadowMap,
        'PCFSoftShadowMap': THREE.PCFSoftShadowMap,
        'VSMShadowMap': THREE.VSMShadowMap
    };

    if (shadowMapTypes[presetValues.SHADOW_MAP_TYPE]) {
        currentRenderer.shadowMap.type = shadowMapTypes[presetValues.SHADOW_MAP_TYPE];
    }

    currentRenderer.toneMappingExposure = presetValues.TONE_MAPPING_EXPOSURE;

    if (isRuntimeChange) {
        console.warn('Note: Antialias changes require page reload to take full effect');
    }
}

function updateShadowSettings(presetValues) {
    if (directionalLight && directionalLight.shadow) {
        directionalLight.shadow.mapSize.width = presetValues.SHADOW_MAP_SIZE;
        directionalLight.shadow.mapSize.height = presetValues.SHADOW_MAP_SIZE;
        directionalLight.shadow.camera.near = presetValues.SHADOW_CAMERA_NEAR;
        directionalLight.shadow.camera.far = presetValues.SHADOW_CAMERA_FAR;
        directionalLight.shadow.bias = presetValues.SHADOW_BIAS;
        directionalLight.shadow.normalBias = presetValues.SHADOW_NORMAL_BIAS;
        directionalLight.shadow.camera.updateProjectionMatrix();

        if (directionalLight.shadow.map) {
            directionalLight.shadow.map.dispose();
            directionalLight.shadow.map = null;
        }
    }

    streetLights.forEach(light => {
        if (light && light.shadow) {
            light.castShadow = presetValues.ENABLE_STREETLIGHT_SHADOWS;
            if (presetValues.ENABLE_STREETLIGHT_SHADOWS) {
                light.shadow.mapSize.width = presetValues.STREETLIGHT_SHADOW_MAP_SIZE;
                light.shadow.mapSize.height = presetValues.STREETLIGHT_SHADOW_MAP_SIZE;
                light.shadow.bias = presetValues.SHADOW_BIAS;
                light.shadow.normalBias = presetValues.SHADOW_NORMAL_BIAS;

                if (light.shadow.map) {
                    light.shadow.map.dispose();
                    light.shadow.map = null;
                }
            }
        }
    });

    Object.values(carHeadlights).forEach(headlightSet => {
        if (headlightSet.left && headlightSet.left.shadow) {
            updateHeadlightShadow(headlightSet.left, presetValues);
        }
        if (headlightSet.right && headlightSet.right.shadow) {
            updateHeadlightShadow(headlightSet.right, presetValues);
        }
    });
}

function updateHeadlightShadow(headlight, presetValues) {
    headlight.shadow.mapSize.width = presetValues.HEADLIGHT_SHADOW_MAP_SIZE;
    headlight.shadow.mapSize.height = presetValues.HEADLIGHT_SHADOW_MAP_SIZE;
    headlight.shadow.bias = presetValues.SHADOW_BIAS;
    headlight.shadow.normalBias = presetValues.SHADOW_NORMAL_BIAS;

    if (headlight.shadow.map) {
        headlight.shadow.map.dispose();
        headlight.shadow.map = null;
    }
}

function updateLightingIntensities(presetValues) {
    const streetlightIntensity = originalStreetlightIntensity * presetValues.STREETLIGHT_INTENSITY_MULTIPLIER;
    streetLights.forEach(light => {
        if (light.intensity > 0) {
            light.intensity = streetlightIntensity;
        }
    });

    const headlightIntensity = originalHeadlightIntensity * presetValues.HEADLIGHT_INTENSITY_MULTIPLIER;
    Object.values(carHeadlights).forEach(headlightSet => {
        if (headlightSet.left && headlightSet.left.intensity > 0) {
            headlightSet.left.intensity = headlightIntensity;
        }
        if (headlightSet.right && headlightSet.right.intensity > 0) {
            headlightSet.right.intensity = headlightIntensity;
        }
    });
}

function updateSceneSettings(presetValues) {
    if (!currentScene) return;

    if (presetValues.ENABLE_FOG) {
        if (!currentScene.fog) {
            currentScene.fog = new THREE.Fog(0x000000, 80, 250);
        }
    } else {
        if (currentScene.fog) {
            currentScene.fog = null;
        }
    }
}

export function updateLightReferences(dirLight, streetLightArray, headlightObjects) {
    if (dirLight) directionalLight = dirLight;
    if (streetLightArray) streetLights = streetLightArray;
    if (headlightObjects) carHeadlights = headlightObjects;

    applyGraphicsPreset(CURRENT_GRAPHICS_PRESET, true);
}

export function getCurrentGraphicsPreset() {
    return CURRENT_GRAPHICS_PRESET;
}

export function getAvailablePresets() {
    return Object.keys(GRAPHICS_PRESETS);
}

export function setGraphicsPresetConsole(preset) {
    if (typeof preset !== 'string') {
        console.log('Available graphics presets: ' + getAvailablePresets().join(', '));
        console.log('Current preset: ' + getCurrentGraphicsPreset());
        console.log('Usage: setGraphicsPreset("LOW"), setGraphicsPreset("MEDIUM"), or setGraphicsPreset("HIGH")');
        return;
    }

    const upperPreset = preset.toUpperCase();
    if (setGraphicsPreset(upperPreset)) {
        console.log(`Graphics preset changed to ${upperPreset}`);

        const currentValues = getCurrentPresetValues();
        console.log('Current graphics settings:', {
            shadowMapSize: currentValues.SHADOW_MAP_SIZE,
            pixelRatio: currentValues.RENDERER_PIXEL_RATIO,
            streetlightShadows: currentValues.ENABLE_STREETLIGHT_SHADOWS,
            antialiasing: currentValues.ENABLE_ANTIALIAS
        });
    } else {
        console.error(`Invalid graphics preset: ${preset}`);
        console.log('Available presets: ' + getAvailablePresets().join(', '));
    }
}

if (typeof window !== 'undefined') {
    window.setGraphicsPreset = setGraphicsPresetConsole;
}
