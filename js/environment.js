import * as THREE from 'three';

export function setupEnvironment(scene) {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,  // Make it less shiny
        metalness: 0.2   // Slightly metallic for asphalt look
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    return { ground };
}
