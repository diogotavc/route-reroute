import * as THREE from 'three';

export function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    return {
        ambientLight,
        directionalLight
    };
}