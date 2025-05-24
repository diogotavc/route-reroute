import * as THREE from 'three';

export function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 15, 8);
    directionalLight.castShadow = true;
    
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    fillLight.position.set(-10, 5, -8);
    scene.add(fillLight);
    
    const accentLight = new THREE.SpotLight(0xff7700, 0.8);
    accentLight.position.set(-5, 8, 2);
    accentLight.angle = Math.PI / 6;
    accentLight.penumbra = 0.2;
    accentLight.castShadow = true;
    scene.add(accentLight);

    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.02;
    directionalLight.shadow.radius = 2;
    
    accentLight.shadow.mapSize.width = 2048;
    accentLight.shadow.mapSize.height = 2048;
    accentLight.shadow.bias = -0.0005;
    accentLight.shadow.normalBias = 0.02;

    return {
        ambientLight,
        directionalLight,
        fillLight,
        accentLight
    };
}