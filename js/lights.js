import * as THREE from 'three';
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
export function updateDayNightCycle(scene, timeOfDay) {
    if (!ambientLight || !directionalLight) return;
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
    const normalizedProgress = Math.max(0, Math.min(1, (timeOfDay - 0.25) / 0.5));
    const sunXAmplitude = 70;
    const sunYAmplitude = 50;
    const sunZStart = -40;
    const sunZEnd = 40;
    directionalLight.position.set(
        Math.cos(sunAngle) * sunXAmplitude,
        Math.sin(sunAngle) * sunYAmplitude,
        sunZStart + normalizedProgress * (sunZEnd - sunZStart)
    );
    directionalLight.lookAt(scene.position);
    const noonFactor = Math.max(0, 1 - (Math.abs(timeOfDay - 0.5) / 0.28));
    const dayFactor = Math.max(0, 1 - (Math.abs(timeOfDay - 0.5) / 0.3));
    const nightFactor = Math.max(0, (0.25 - Math.min(Math.abs(timeOfDay - 1), timeOfDay, Math.abs(timeOfDay))) / 0.25);
    
    // Update streetlight intensity based on time of day
    const isNightTime = timeOfDay < 0.22 || timeOfDay > 0.78;
    updateStreetLightsDynamic(isNightTime ? 1.2 : 0.2);
    
    if (timeOfDay > 0.2 && timeOfDay < 0.8) {
        const ambientDayLightness = 0.25 + dayFactor * 0.35;
        ambientLight.color.setHSL(0.58, 0.4, ambientDayLightness);
        ambientLight.intensity = 0.8 + dayFactor * 0.4;
    } else {
        const ambientNightLightness = 0.03 + nightFactor * 0.05;
        ambientLight.color.setHSL(0.6, 0.5, ambientNightLightness);
        ambientLight.intensity = 0.3 + nightFactor * 0.3;
    }
    if (timeOfDay > 0.22 && timeOfDay < 0.78) {
        directionalLight.visible = true;
        directionalLight.intensity = noonFactor * 1.7 + 0.1;
        if (timeOfDay < 0.3 || timeOfDay > 0.7) {
            const transitionFactor = (timeOfDay < 0.3) ? (timeOfDay - 0.22) / 0.08 : (0.78 - timeOfDay) / 0.08;
            directionalLight.color.setHSL(0.07, 0.85, 0.35 * noonFactor + 0.15);
        } else {
            directionalLight.color.setHSL(0.1, 0.35, 0.75 * noonFactor + 0.2);
        }
    } else {
        directionalLight.visible = false;
        directionalLight.intensity = 0;
    }
    if (!scene.background || !(scene.background instanceof THREE.Color)) {
        scene.background = new THREE.Color();
    }
    if (timeOfDay > 0.18 && timeOfDay < 0.82) {
        const skyHue = 0.58;
        const skySaturation = 0.4 + dayFactor * 0.3;
        const skyLightness = 0.25 + dayFactor * 0.45;
        scene.background.setHSL(skyHue, skySaturation, skyLightness);
    } else {
        const nightSkyHue = 0.62;
        const nightSkySaturation = 0.35 + nightFactor * 0.15;
        const nightSkyLightness = 0.01 + nightFactor * 0.04;
        scene.background.setHSL(nightSkyHue, nightSkySaturation, nightSkyLightness);
    }
    if (scene.fog) {
        if (timeOfDay > 0.18 && timeOfDay < 0.82) {
            const fogDayLightness = 0.3 + dayFactor * 0.4;
            scene.fog.color.setHSL(0.58, 0.45 + dayFactor * 0.2, fogDayLightness);
            scene.fog.near = 60 + (1-dayFactor) * 40;
            scene.fog.far = 200 + dayFactor * 150;
        } else {
            const fogNightLightness = 0.02 + nightFactor * 0.03;
            scene.fog.color.setHSL(0.62, 0.4, fogNightLightness);
            scene.fog.near = 20 + (1-nightFactor) * 30;
            scene.fog.far = 70 + nightFactor * 50;
        }
    } else {
        scene.fog = new THREE.Fog(0x000000, 50, 150);
        updateDayNightCycle(scene, timeOfDay);
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
        const newIntensity = streetLightsEnabled ? 2.0 : 0;
        light.intensity = newIntensity;
        console.log(`Light ${index} intensity set to ${newIntensity}`);
    });
}

function updateStreetLightsDynamic(intensity) {
    if (streetLightsEnabled) {
        streetLights.forEach(light => {
            light.intensity = Math.max(intensity, 0.5); // Minimum intensity of 0.5 to always be visible
        });
    }
}

// Make functions available globally for console access
window.toggleStreetLights = toggleStreetLights;
window.setStreetLightsEnabled = setStreetLightsEnabled;
window.forceStreetLightsOn = () => {
    streetLights.forEach((light, index) => {
        light.intensity = 3.0;
        console.log(`Forced light ${index} to max intensity`);
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