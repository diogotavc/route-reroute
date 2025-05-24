import * as THREE from 'three';
let ambientLight, directionalLight;
export function setupLights(scene) {
    ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.02;
    scene.add(directionalLight);
    return {
        ambientLight,
        directionalLight,
    };
}
export function updateDayNightCycle(scene, timeOfDay) {
    if (!ambientLight || !directionalLight) return;
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
    directionalLight.position.set(
        Math.cos(sunAngle) * 70,
        Math.sin(sunAngle) * 60,
        40
    );
    directionalLight.lookAt(scene.position);
    const noonFactor = Math.max(0, 1 - (Math.abs(timeOfDay - 0.5) / 0.28));
    const dayFactor = Math.max(0, 1 - (Math.abs(timeOfDay - 0.5) / 0.3));
    const nightFactor = Math.max(0, (0.25 - Math.min(Math.abs(timeOfDay - 1), timeOfDay, Math.abs(timeOfDay))) / 0.25);
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