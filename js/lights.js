import * as THREE from 'three';

export function setupLights(scene) {
    // Reduce ambient light for more contrast
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    
    // Make directional light more dramatic with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 15, 8);
    directionalLight.castShadow = true;
    
    // Configure shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048; // Consider reducing (e.g., 1024) for performance
    directionalLight.shadow.mapSize.height = 2048; // Consider reducing (e.g., 1024) for performance
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    scene.add(directionalLight);
    
    // Add a subtle blue fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    fillLight.position.set(-10, 5, -8);
    scene.add(fillLight);
    
    // Add a warm accent light for drama
    const accentLight = new THREE.SpotLight(0xff7700, 0.8);
    accentLight.position.set(-5, 8, 2);
    accentLight.angle = Math.PI / 6;
    accentLight.penumbra = 0.2;
    accentLight.castShadow = true;
    scene.add(accentLight);

    // Higher resolution shadows for the main directional light (can be demanding)
    directionalLight.shadow.mapSize.width = 4096;  // High resolution - potentially expensive
    directionalLight.shadow.mapSize.height = 4096; // High resolution - potentially expensive
    directionalLight.shadow.bias = -0.0005;        // Reduce shadow acne
    directionalLight.shadow.normalBias = 0.02;     // Helps with thin objects
    directionalLight.shadow.radius = 2;            // Blur shadow edges
    
    // Same for your accent light (consider lower resolution if performance is an issue)
    accentLight.shadow.mapSize.width = 2048; // Consider reducing (e.g., 1024) for performance
    accentLight.shadow.mapSize.height = 2048; // Consider reducing (e.g., 1024) for performance
    accentLight.shadow.bias = -0.0005;
    accentLight.shadow.normalBias = 0.02;

    return {
        ambientLight,
        directionalLight,
        fillLight,
        accentLight
    };
}