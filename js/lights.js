import * as THREE from 'three';
import { STREETLIGHT_INTENSITY, STREETLIGHT_TURN_ON_TIME, STREETLIGHT_TURN_OFF_TIME, DAY_CYCLE } from './config.js';
let ambientLight, directionalLight;
let streetLights = [];
let streetLightsEnabled = true;
let currentScene = null;
export function setupLights(scene) {
    currentScene = scene;
    ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 250;
    directionalLight.shadow.camera.left = -70;
    directionalLight.shadow.camera.right = 70;
    directionalLight.shadow.camera.top = 70;
    directionalLight.shadow.camera.bottom = -70;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.01;
    directionalLight.shadow.camera.updateProjectionMatrix();
    scene.add(directionalLight);
    return {
        ambientLight,
        directionalLight,
    };
}
// Helper function for smooth interpolation
function smoothStep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// Get the current phase of the day and transition factors
function getDayPhase(timeOfDay) {
    if (timeOfDay < DAY_CYCLE.DAWN_START || timeOfDay > DAY_CYCLE.DUSK_END) {
        return { phase: 'night', factor: 1.0 };
    } else if (timeOfDay < DAY_CYCLE.DAWN_END) {
        // Dawn transition
        const factor = smoothStep(DAY_CYCLE.DAWN_START, DAY_CYCLE.DAWN_END, timeOfDay);
        return { phase: 'dawn', factor };
    } else if (timeOfDay < DAY_CYCLE.DUSK_START) {
        // Day time
        const noonDistance = Math.abs(timeOfDay - DAY_CYCLE.NOON);
        const maxDistance = DAY_CYCLE.DUSK_START - DAY_CYCLE.NOON;
        const factor = 1 - (noonDistance / maxDistance);
        return { phase: 'day', factor };
    } else {
        // Dusk transition
        const factor = 1 - smoothStep(DAY_CYCLE.DUSK_START, DAY_CYCLE.DUSK_END, timeOfDay);
        return { phase: 'dusk', factor };
    }
}

export function updateDayNightCycle(scene, timeOfDay) {
    if (!ambientLight || !directionalLight) return;
    
    const dayPhase = getDayPhase(timeOfDay);
    
    // Update sun position with smooth arc
    updateSunPosition(timeOfDay);
    
    // Update lighting based on phase
    updateLighting(dayPhase);
    
    // Update environment (sky, fog)
    updateEnvironment(scene, dayPhase, timeOfDay);
    
    // Update streetlights
    const shouldBeOn = timeOfDay >= STREETLIGHT_TURN_ON_TIME || timeOfDay <= STREETLIGHT_TURN_OFF_TIME;
    updateStreetLightsSimple(shouldBeOn);
}

function updateSunPosition(timeOfDay) {
    // Create a smooth sun arc from east to west
    const sunProgress = (timeOfDay - DAY_CYCLE.DAWN_START + 1) % 1;
    const sunAngle = sunProgress * Math.PI; // Half circle from dawn to dusk
    
    const distance = 100;
    const height = Math.sin(sunAngle) * 60; // Peak at noon
    const x = Math.cos(sunAngle) * distance;
    const z = 0;
    
    directionalLight.position.set(x, Math.max(5, height), z);
    directionalLight.lookAt(0, 0, 0);
}

function updateLighting(dayPhase) {
    switch (dayPhase.phase) {
        case 'night':
            // Deep night
            ambientLight.color.setHSL(0.6, 0.6, 0.02);
            ambientLight.intensity = 0.1;
            directionalLight.visible = false;
            break;
            
        case 'dawn':
            // Dawn transition
            const dawnAmbientHue = 0.6 + dayPhase.factor * -0.05; // Slight blue to neutral
            const dawnAmbientSat = 0.6 - dayPhase.factor * 0.2;
            const dawnAmbientLight = 0.02 + dayPhase.factor * 0.3;
            
            ambientLight.color.setHSL(dawnAmbientHue, dawnAmbientSat, dawnAmbientLight);
            ambientLight.intensity = 0.1 + dayPhase.factor * 0.5;
            
            // Sun starts appearing
            directionalLight.visible = dayPhase.factor > 0.3;
            if (directionalLight.visible) {
                directionalLight.intensity = (dayPhase.factor - 0.3) * 0.8;
                directionalLight.color.setHSL(0.08, 0.8, 0.6); // Warm dawn light
            }
            break;
            
        case 'day':
            // Full daylight with intensity based on noon proximity
            ambientLight.color.setHSL(0.55, 0.3, 0.4 + dayPhase.factor * 0.2);
            ambientLight.intensity = 0.6 + dayPhase.factor * 0.4;
            
            directionalLight.visible = true;
            directionalLight.intensity = 0.8 + dayPhase.factor * 0.7;
            directionalLight.color.setHSL(0.12, 0.2, 0.9); // Bright white daylight
            break;
            
        case 'dusk':
            // Dusk transition
            const duskAmbientHue = 0.55 + (1 - dayPhase.factor) * 0.05;
            const duskAmbientSat = 0.3 + (1 - dayPhase.factor) * 0.3;
            const duskAmbientLight = 0.6 - (1 - dayPhase.factor) * 0.58;
            
            ambientLight.color.setHSL(duskAmbientHue, duskAmbientSat, duskAmbientLight);
            ambientLight.intensity = 0.6 - (1 - dayPhase.factor) * 0.5;
            
            // Sun fading
            directionalLight.visible = dayPhase.factor > 0.2;
            if (directionalLight.visible) {
                directionalLight.intensity = dayPhase.factor * 1.2;
                directionalLight.color.setHSL(0.05, 0.9, 0.7); // Warm sunset light
            }
            break;
    }
}

function updateEnvironment(scene, dayPhase, timeOfDay) {
    // Ensure background exists
    if (!scene.background || !(scene.background instanceof THREE.Color)) {
        scene.background = new THREE.Color();
    }
    
    // Update sky color based on phase
    switch (dayPhase.phase) {
        case 'night':
            scene.background.setHSL(0.65, 0.4, 0.03);
            break;
            
        case 'dawn':
            const dawnSkyHue = 0.65 - dayPhase.factor * 0.1;
            const dawnSkySat = 0.4 + dayPhase.factor * 0.2;
            const dawnSkyLight = 0.03 + dayPhase.factor * 0.35;
            scene.background.setHSL(dawnSkyHue, dawnSkySat, dawnSkyLight);
            break;
            
        case 'day':
            scene.background.setHSL(0.55, 0.6, 0.4 + dayPhase.factor * 0.3);
            break;
            
        case 'dusk':
            const duskSkyHue = 0.05 + dayPhase.factor * 0.5;
            const duskSkySat = 0.8 - dayPhase.factor * 0.2;
            const duskSkyLight = 0.2 + dayPhase.factor * 0.5;
            scene.background.setHSL(duskSkyHue, duskSkySat, duskSkyLight);
            break;
    }
    
    // Update fog
    if (!scene.fog) {
        scene.fog = new THREE.Fog(0x000000, 30, 200);
    }
    
    scene.fog.color.copy(scene.background);
    
    // Adjust fog density based on time
    switch (dayPhase.phase) {
        case 'night':
            scene.fog.near = 20;
            scene.fog.far = 80;
            break;
        case 'dawn':
        case 'dusk':
            scene.fog.near = 30 + dayPhase.factor * 30;
            scene.fog.far = 100 + dayPhase.factor * 150;
            break;
        case 'day':
            scene.fog.near = 60;
            scene.fog.far = 250;
            break;
    }
}

// Streetlight management functions
export function registerStreetLights(lights) {
    streetLights = lights;
    console.log(`Registering ${lights.length} streetlights:`, lights);
    lights.forEach((light, index) => {
        console.log(`Streetlight ${index}: Position (${light.position.x}, ${light.position.y}, ${light.position.z}), Intensity: ${light.intensity}`);
    });
    updateStreetLights();
}

export function toggleStreetLights() {
    streetLightsEnabled = !streetLightsEnabled;
    updateStreetLights();
    console.log(`Streetlights ${streetLightsEnabled ? 'enabled' : 'disabled'}`);
}

export function setStreetLightsEnabled(enabled) {
    streetLightsEnabled = enabled;
    updateStreetLights();
}

function updateStreetLights() {
    console.log(`Updating streetlights: enabled=${streetLightsEnabled}, count=${streetLights.length}`);
    streetLights.forEach((light, index) => {
        const newIntensity = streetLightsEnabled ? STREETLIGHT_INTENSITY : 0;
        light.intensity = newIntensity;
        console.log(`Light ${index} intensity set to ${newIntensity}`);
    });
}

function updateStreetLightsSimple(shouldBeOn) {
    streetLights.forEach(light => {
        // Simple on/off behavior - full intensity when on, 0 when off
        light.intensity = (streetLightsEnabled && shouldBeOn) ? STREETLIGHT_INTENSITY : 0;
    });
}

// Make functions available globally for console access
window.toggleStreetLights = toggleStreetLights;
window.setStreetLightsEnabled = setStreetLightsEnabled;
window.forceStreetLightsOn = () => {
    streetLights.forEach((light, index) => {
        light.intensity = STREETLIGHT_INTENSITY;
        console.log(`Forced light ${index} to max intensity (${STREETLIGHT_INTENSITY})`);
    });
    console.log("All streetlights forced to maximum intensity");
};
window.debugAllLights = () => {
    if (!currentScene) {
        console.log("Scene not available");
        return;
    }
    const allLights = [];
    currentScene.traverse((object) => {
        if (object.isLight) {
            allLights.push(object);
        }
    });
    console.log(`Found ${allLights.length} lights in scene:`);
    allLights.forEach((light, index) => {
        console.log(`Light ${index}: Type ${light.type}, Intensity ${light.intensity}, Position (${light.position.x}, ${light.position.y}, ${light.position.z})`);
    });
    return allLights;
};
window.debugStreetLights = () => {
    console.log(`Streetlights enabled: ${streetLightsEnabled}`);
    console.log(`Number of streetlights: ${streetLights.length}`);
    streetLights.forEach((light, index) => {
        console.log(`Light ${index}: Intensity ${light.intensity}, Position (${light.position.x}, ${light.position.y}, ${light.position.z})`);
    });
};

// Clean up debug objects and make position markers permanent
window.cleanupDebugObjects = () => {
    if (!currentScene) {
        console.log("Scene not available");
        return;
    }
    
    let removedCount = 0;
    const objectsToRemove = [];
    
    currentScene.traverse((object) => {
        // Remove large red debug spheres (attached to streetlights)
        if (object.isMesh && object.geometry instanceof THREE.SphereGeometry) {
            const radius = object.geometry.parameters.radius;
            const material = object.material;
            
            // Remove large red spheres (radius 3.0, red color)
            if (radius === 3.0 && material.color && material.color.getHex() === 0xff0000) {
                objectsToRemove.push(object);
                removedCount++;
            }
            // Remove white test spheres (radius 5.0, white color)
            else if (radius === 5.0 && material.color && material.color.getHex() === 0xffffff) {
                objectsToRemove.push(object);
                removedCount++;
            }
        }
        
        // Remove test point lights (red ones at position 0,10,0)
        if (object.isLight && object.type === 'PointLight') {
            if (object.color.getHex() === 0xff0000 && 
                object.position.x === 0 && object.position.y === 10 && object.position.z === 0) {
                objectsToRemove.push(object);
                removedCount++;
            }
        }
    });
    
    // Remove the objects
    objectsToRemove.forEach(object => {
        if (object.parent) {
            object.parent.remove(object);
        } else {
            currentScene.remove(object);
        }
        
        // Clean up geometry and material
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
            } else {
                object.material.dispose();
            }
        }
    });
    
    console.log(`Cleaned up ${removedCount} debug objects from the scene`);
    console.log("Cyan position markers are now permanent features");
    return removedCount;
};

// Add helpful console info
console.log("Streetlight controls available:");
console.log("- toggleStreetLights() - Toggle streetlights on/off");
console.log("- setStreetLightsEnabled(true/false) - Set streetlight state");
console.log("- forceStreetLightsOn() - Force all lights to maximum intensity");
console.log("- debugStreetLights() - Show streetlight debug info");
console.log("- debugAllLights() - Show all lights in the scene");
console.log("- debugDayPhase() - Show current day phase and lighting info");

// Debug day phase
window.debugDayPhase = (timeOfDay) => {
    if (timeOfDay === undefined) {
        console.log("Usage: debugDayPhase(timeOfDay) where timeOfDay is between 0 and 1");
        return;
    }
    
    const dayPhase = getDayPhase(timeOfDay);
    console.log(`Time of Day: ${timeOfDay.toFixed(3)}`);
    console.log(`Phase: ${dayPhase.phase}`);
    console.log(`Factor: ${dayPhase.factor.toFixed(3)}`);
    
    // Show time ranges
    console.log("\nDay cycle ranges:");
    console.log(`Night: 0.00 - ${DAY_CYCLE.DAWN_START.toFixed(2)} & ${DAY_CYCLE.DUSK_END.toFixed(2)} - 1.00`);
    console.log(`Dawn: ${DAY_CYCLE.DAWN_START.toFixed(2)} - ${DAY_CYCLE.DAWN_END.toFixed(2)}`);
    console.log(`Day: ${DAY_CYCLE.DAWN_END.toFixed(2)} - ${DAY_CYCLE.DUSK_START.toFixed(2)}`);
    console.log(`Dusk: ${DAY_CYCLE.DUSK_START.toFixed(2)} - ${DAY_CYCLE.DUSK_END.toFixed(2)}`);
    console.log(`Streetlights: ON from ${STREETLIGHT_TURN_ON_TIME.toFixed(2)} to ${STREETLIGHT_TURN_OFF_TIME.toFixed(2)}`);
};