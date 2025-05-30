import * as THREE from 'three';
import { STREETLIGHT_INTENSITY, STREETLIGHT_TURN_ON_TIME, STREETLIGHT_TURN_OFF_TIME, STREETLIGHT_SMOOTH_TRANSITIONS, DAY_CYCLE, HEADLIGHT_INTENSITY } from './config.js';
import { updateHeadlights, toggleHeadlights, setHeadlightsEnabled, getCarHeadlights, getLoadedCarModels, getCurrentTimeOfDay, getHeadlightsEnabled } from './cars.js';

let ambientLight, directionalLight;
let streetLights = [];
let streetLightsEnabled = true;
let currentScene = null;
let currentTimeOfDay = 0.5;

let originalLightIntensities = {
    ambient: null,
    directional: null,
    streetlights: null,
    headlights: null
};

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
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.05;
    
    directionalLight.shadow.camera.updateProjectionMatrix();
    scene.add(directionalLight);
    return {
        ambientLight,
        directionalLight,
    };
}

export function updateDayNightCycle(scene, timeOfDay) {
    if (!ambientLight || !directionalLight) return;

    currentTimeOfDay = timeOfDay;

    updateLighting(timeOfDay);

    updateEnvironment(scene, timeOfDay);

    if (STREETLIGHT_SMOOTH_TRANSITIONS) {
        updateStreetLightsSmooth(timeOfDay);
    } else {
        updateStreetLightsInstant(timeOfDay);
    }

    updateHeadlights(timeOfDay);
}

function updateSunPosition(timeOfDay) {
    let sunAngle;
    if (timeOfDay < 0.25) {
        sunAngle = -Math.PI/4 + (timeOfDay / 0.25) * (Math.PI/4);
    } else if (timeOfDay <= 0.75) {
        const dayProgress = (timeOfDay - 0.25) / 0.5;
        sunAngle = dayProgress * Math.PI;
    } else {
        sunAngle = Math.PI + ((timeOfDay - 0.75) / 0.25) * (Math.PI/4);
    }
    
    const distance = 120;
    const height = Math.sin(sunAngle) * 80 + 10;
    const x = Math.cos(sunAngle) * distance;
    const z = 0;
    
    directionalLight.position.set(x, height, z);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.target.updateMatrixWorld();
}

function updateLighting(timeOfDay) {
    updateSunPosition(timeOfDay);

    const sunAboveHorizon = directionalLight.position.y > 0;

    const phases = getDayPhase(timeOfDay);

    const lighting = getLightingForPhase(phases.phase, phases.factor);

    ambientLight.color.setHex(lighting.ambientColor);
    ambientLight.intensity = lighting.ambientIntensity;

    directionalLight.visible = lighting.sunVisible && sunAboveHorizon;
    directionalLight.intensity = lighting.sunIntensity;
    directionalLight.color.setHex(lighting.sunColor);
}

function getDayPhase(timeOfDay) {
    if (timeOfDay < DAY_CYCLE.DAWN_START || timeOfDay > DAY_CYCLE.DUSK_END) {
        if (timeOfDay > DAY_CYCLE.DUSK_END) {
            const factor = (timeOfDay - DAY_CYCLE.DUSK_END) / (1 - DAY_CYCLE.DUSK_END);
            return { phase: 'night', factor: Math.min(factor, 1) };
        } else {
            const factor = timeOfDay / DAY_CYCLE.DAWN_START;
            return { phase: 'night', factor: Math.min(factor, 1) };
        }
    } else if (timeOfDay < DAY_CYCLE.DAWN_END) {
        const factor = (timeOfDay - DAY_CYCLE.DAWN_START) / (DAY_CYCLE.DAWN_END - DAY_CYCLE.DAWN_START);
        return { phase: 'dawn', factor: Math.min(Math.max(factor, 0), 1) };
    } else if (timeOfDay < DAY_CYCLE.DUSK_START) {
        const factor = (timeOfDay - DAY_CYCLE.DAWN_END) / (DAY_CYCLE.DUSK_START - DAY_CYCLE.DAWN_END);
        return { phase: 'day', factor: Math.min(Math.max(factor, 0), 1) };
    } else {
        const factor = (timeOfDay - DAY_CYCLE.DUSK_START) / (DAY_CYCLE.DUSK_END - DAY_CYCLE.DUSK_START);
        return { phase: 'dusk', factor: Math.min(Math.max(factor, 0), 1) };
    }
}

function getLightingForPhase(phase, factor) {
    const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const smoothFactor = easeInOut(factor);
    
    switch (phase) {
        case 'night':
            return {
                ambientColor: 0x0a0f2e,
                ambientIntensity: 0.08,
                sunVisible: false,
                sunIntensity: 0,
                sunColor: 0x4169e1
            };
            
        case 'dawn':
            const dawnAmbientIntensity = 0.08 + smoothFactor * 0.22;
            const dawnSunIntensity = smoothFactor * 0.85;
            const dawnAmbientColor = interpolateColor(0x0a0f2e, 0xffd4a3, smoothFactor);
            const dawnSunColor = interpolateColor(0x4169e1, 0xff8c42, smoothFactor);
            
            return {
                ambientColor: dawnAmbientColor,
                ambientIntensity: dawnAmbientIntensity,
                sunVisible: smoothFactor > 0.1,
                sunIntensity: dawnSunIntensity,
                sunColor: dawnSunColor
            };
            
        case 'day':
            const dayAmbientIntensity = 0.3 + smoothFactor * 0.1;
            const dayAmbientColor = interpolateColor(0xffd4a3, 0xffffff, Math.min(smoothFactor * 2, 1));
            const daySunColor = interpolateColor(0xff8c42, 0xffffff, Math.min(smoothFactor * 2, 1));
            
            return {
                ambientColor: dayAmbientColor,
                ambientIntensity: dayAmbientIntensity,
                sunVisible: true,
                sunIntensity: 0.85 + smoothFactor * 0.15,
                sunColor: daySunColor
            };
            
        case 'dusk':
            const duskAmbientIntensity = 0.4 - smoothFactor * 0.32;
            const duskSunIntensity = (1 - smoothFactor) * 0.9;
            const duskAmbientColor = interpolateColor(0xffffff, 0xff8c42, smoothFactor);
            const duskSunColor = interpolateColor(0xffffff, 0xff6b35, smoothFactor);
            
            return {
                ambientColor: duskAmbientColor,
                ambientIntensity: duskAmbientIntensity,
                sunVisible: smoothFactor < 0.9,
                sunIntensity: duskSunIntensity,
                sunColor: duskSunColor
            };
            
        default:
            return {
                ambientColor: 0xffffff,
                ambientIntensity: 0.4,
                sunVisible: true,
                sunIntensity: 1.0,
                sunColor: 0xffffff
            };
    }
}

function interpolateColor(color1, color2, factor) {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;

    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return (r << 16) | (g << 8) | b;
}

function updateEnvironment(scene, timeOfDay) {
    if (!scene.background) {
        scene.background = new THREE.Color();
    }

    const phases = getDayPhase(timeOfDay);
    const skyColor = getSkyColorForPhase(phases.phase, phases.factor);
    scene.background.setHex(skyColor);

    if (!scene.fog) {
        scene.fog = new THREE.Fog(0x000000, 80, 250);
    }
    scene.fog.color.copy(scene.background);

    const baseFar = phases.phase === 'night' ? 200 : 250;
    const fogFar = baseFar + Math.sin(timeOfDay * Math.PI * 2) * 30;
    scene.fog.far = Math.max(150, fogFar);
}

function getSkyColorForPhase(phase, factor) {
    const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const smoothFactor = easeInOut(factor);
    
    switch (phase) {
        case 'night':
            return 0x050820;

        case 'dawn':
            return interpolateColor(0x050820, 0xff7f50, smoothFactor);
            
        case 'day':
            return interpolateColor(0xff7f50, 0x87ceeb, Math.min(smoothFactor * 1.5, 1));
            
        case 'dusk':
            const midDusk = interpolateColor(0x87ceeb, 0xff9966, Math.min(smoothFactor * 1.2, 1));
            if (smoothFactor > 0.7) {
                const latePhase = (smoothFactor - 0.7) / 0.3;
                return interpolateColor(midDusk, 0x1a0f2e, latePhase);
            }
            return midDusk;
            
        default:
            return 0x87ceeb;
    }
}

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

function updateStreetLightsSmooth(timeOfDay) {
    if (!streetLightsEnabled) {
        streetLights.forEach(light => { light.intensity = 0; });
        return;
    }

    const phases = getDayPhase(timeOfDay);
    let targetIntensity = 0;

    if (phases.phase === 'night') {
        targetIntensity = STREETLIGHT_INTENSITY;
    } else if (phases.phase === 'dawn') {
        targetIntensity = STREETLIGHT_INTENSITY * (1 - phases.factor * 1.2);
    } else if (phases.phase === 'dusk') {
        targetIntensity = STREETLIGHT_INTENSITY * Math.max(0, phases.factor - 0.3) / 0.7;
    }
    
    targetIntensity = Math.max(0, Math.min(targetIntensity, STREETLIGHT_INTENSITY));
    
    streetLights.forEach(light => {
        light.intensity = targetIntensity;
    });
}

function updateStreetLightsInstant(timeOfDay) {
    if (!streetLightsEnabled) {
        streetLights.forEach(light => { light.intensity = 0; });
        return;
    }

    const shouldBeOn = timeOfDay >= STREETLIGHT_TURN_ON_TIME || timeOfDay <= STREETLIGHT_TURN_OFF_TIME;
    
    streetLights.forEach(light => {
        light.intensity = shouldBeOn ? STREETLIGHT_INTENSITY : 0;
    });
}

window.toggleStreetLights = toggleStreetLights;
window.setStreetLightsEnabled = setStreetLightsEnabled;
window.forceStreetLightsOn = () => {
    streetLights.forEach((light, index) => {
        light.intensity = STREETLIGHT_INTENSITY;
        console.log(`Forced light ${index} to max intensity (${STREETLIGHT_INTENSITY})`);
    });
    console.log("All streetlights forced to maximum intensity");
};

window.toggleHeadlights = toggleHeadlights;
window.setHeadlightsEnabled = setHeadlightsEnabled;

window.debugHeadlights = () => {
    console.log("=== Headlight Debug Info ===");
    const carHeadlights = getCarHeadlights();
    const loadedCarModels = getLoadedCarModels();
    const currentTimeOfDay = getCurrentTimeOfDay();
    const headlightsEnabled = getHeadlightsEnabled();
    
    for (const carIndex in carHeadlights) {
        const headlightSet = carHeadlights[carIndex];
        const car = loadedCarModels[carIndex];
        console.log(`Car ${carIndex}:`, {
            carVisible: car?.visible,
            leftIntensity: headlightSet.left.intensity,
            rightIntensity: headlightSet.right.intensity,
            leftPosition: headlightSet.left.position,
            rightPosition: headlightSet.right.position,
            leftTargetPosition: headlightSet.leftTarget.position,
            rightTargetPosition: headlightSet.rightTarget.position
        });
    }
    console.log(`Current time: ${currentTimeOfDay}, Headlights enabled: ${headlightsEnabled}`);
};

window.forceHeadlightsOn = () => {
    const carHeadlights = getCarHeadlights();
    for (const carIndex in carHeadlights) {
        const headlightSet = carHeadlights[carIndex];
        headlightSet.left.intensity = HEADLIGHT_INTENSITY;
        headlightSet.right.intensity = HEADLIGHT_INTENSITY;
    }
    console.log("All headlights forced to maximum intensity");
};

window.debugSunShadows = () => {
    if (!directionalLight) {
        console.log("Directional light not available");
        return;
    }
    
    console.log("=== SUN SHADOW SETTINGS ===");
    console.log(`Shadow Map Size: ${directionalLight.shadow.mapSize.width}x${directionalLight.shadow.mapSize.height}`);
    console.log(`Shadow Camera Bounds: ${directionalLight.shadow.camera.left} to ${directionalLight.shadow.camera.right} (X), ${directionalLight.shadow.camera.bottom} to ${directionalLight.shadow.camera.top} (Y)`);
    console.log(`Shadow Camera Near/Far: ${directionalLight.shadow.camera.near} to ${directionalLight.shadow.camera.far}`);
    console.log(`Shadow Bias: ${directionalLight.shadow.bias}`);
    console.log(`Shadow Normal Bias: ${directionalLight.shadow.normalBias}`);
    console.log(`Shadow Radius: ${directionalLight.shadow.radius || 'N/A'}`);
    console.log(`Shadow Blur Samples: ${directionalLight.shadow.blurSamples || 'N/A'}`);
    console.log(`Sun Position: (${directionalLight.position.x.toFixed(1)}, ${directionalLight.position.y.toFixed(1)}, ${directionalLight.position.z.toFixed(1)})`);
    console.log(`Sun Intensity: ${directionalLight.intensity}`);
};

window.debugDayPhase = (timeOfDay) => {
    if (timeOfDay === undefined) {
        console.log("Usage: debugDayPhase(timeOfDay) where timeOfDay is between 0 and 1");
        return;
    }

    const dayPhase = getDayPhase(timeOfDay);
    console.log(`Time of Day: ${timeOfDay.toFixed(3)}`);
    console.log(`Phase: ${dayPhase.phase}`);
    console.log(`Factor: ${dayPhase.factor.toFixed(3)}`);

    console.log("\nDay cycle ranges:");
    console.log(`Night: 0.00 - ${DAY_CYCLE.DAWN_START.toFixed(2)} & ${DAY_CYCLE.DUSK_END.toFixed(2)} - 1.00`);
    console.log(`Dawn: ${DAY_CYCLE.DAWN_START.toFixed(2)} - ${DAY_CYCLE.DAWN_END.toFixed(2)}`);
    console.log(`Day: ${DAY_CYCLE.DAWN_END.toFixed(2)} - ${DAY_CYCLE.DUSK_START.toFixed(2)}`);
    console.log(`Dusk: ${DAY_CYCLE.DUSK_START.toFixed(2)} - ${DAY_CYCLE.DUSK_END.toFixed(2)}`);
    console.log(`Streetlights: ON from ${STREETLIGHT_TURN_ON_TIME.toFixed(2)} to ${STREETLIGHT_TURN_OFF_TIME.toFixed(2)}`);
};

window.debugSunPosition = (timeOfDay) => {
    if (timeOfDay === undefined) {
        console.log("Usage: debugSunPosition(timeOfDay) where timeOfDay is between 0 and 1");
        return;
    }

    let sunAngle;
    if (timeOfDay < 0.25) {
        sunAngle = -Math.PI/4 + (timeOfDay / 0.25) * (Math.PI/4);
    } else if (timeOfDay <= 0.75) {
        const dayProgress = (timeOfDay - 0.25) / 0.5;
        sunAngle = dayProgress * Math.PI;
    } else {
        sunAngle = Math.PI + ((timeOfDay - 0.75) / 0.25) * (Math.PI/4);
    }

    const distance = 120;
    const height = Math.sin(sunAngle) * 80 + 10;
    const x = Math.cos(sunAngle) * distance;
    
    console.log(`Time: ${timeOfDay.toFixed(3)} | Angle: ${(sunAngle * 180 / Math.PI).toFixed(1)}° | Pos: (${x.toFixed(1)}, ${height.toFixed(1)}, 0)`);
    
    if (timeOfDay < 0.25) console.log("Phase: Before dawn (sun below eastern horizon)");
    else if (timeOfDay <= 0.75) console.log("Phase: Dawn to dusk (sun visible)");
    else console.log("Phase: After dusk (sun below western horizon)");
};

window.trackSunMovement = () => {
    console.log("=== SUN MOVEMENT THROUGHOUT DAY ===");
    for (let t = 0; t <= 1; t += 0.1) {
        debugSunPosition(t);
    }
};

console.log("Sun debug controls available:");
console.log("- debugSunPosition(timeOfDay) - Show sun position for specific time");
console.log("- trackSunMovement() - Show sun positions throughout full day");

export function storeOriginalLightIntensities() {
    if (ambientLight) {
        originalLightIntensities.ambient = ambientLight.intensity;
    }
    if (directionalLight) {
        originalLightIntensities.directional = directionalLight.intensity;
    }

    if (streetLights.length > 0) {
        originalLightIntensities.streetlights = streetLights[0].intensity;
    }

    const carHeadlights = getCarHeadlights();
    if (Object.keys(carHeadlights).length > 0) {
        const firstCarHeadlights = Object.values(carHeadlights)[0];
        originalLightIntensities.headlights = firstCarHeadlights.left.intensity;
    }
}

export function setLightIntensities(ambientScale = 1, directionalScale = 1, streetlightScale = 1, headlightScale = 1) {
    if (ambientLight && originalLightIntensities.ambient !== null) {
        ambientLight.intensity = originalLightIntensities.ambient * ambientScale;
    }

    if (directionalLight && originalLightIntensities.directional !== null) {
        directionalLight.intensity = originalLightIntensities.directional * directionalScale;
    }

    if (streetLights.length > 0 && originalLightIntensities.streetlights !== null) {
        const targetIntensity = originalLightIntensities.streetlights * streetlightScale;
        streetLights.forEach(light => {
            light.intensity = targetIntensity;
        });
    }

    if (originalLightIntensities.headlights !== null) {
        const carHeadlights = getCarHeadlights();
        const targetIntensity = originalLightIntensities.headlights * headlightScale;
        for (const carIndex in carHeadlights) {
            const headlightSet = carHeadlights[carIndex];
            headlightSet.left.intensity = targetIntensity;
            headlightSet.right.intensity = targetIntensity;
        }
    }
}

export function restoreOriginalLightIntensities() {
    setLightIntensities(1, 1, 1, 1);
}