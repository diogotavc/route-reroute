export const mapData = {
    tileAssets: {
        // Roads from 'kenney_city-kit-roads'
        'road_straight': 'assets/kenney_city-kit-roads/Models/road-straight.glb',
        'road_bend': 'assets/kenney_city-kit-roads/Models/road-bend.glb',
        'road_crossroad': 'assets/kenney_city-kit-roads/Models/road-crossroad.glb',
        'road_intersection': 'assets/kenney_city-kit-roads/Models/road-intersection.glb',
        // Buildings from 'kenney_city-kit-suburban'
        'building_a': 'assets/kenney_city-kit-suburban/Models/building-type-a.glb',
        'building_b': 'assets/kenney_city-kit-suburban/Models/building-type-b.glb',
        // Add more assets as needed based on the Overview.html files
    },
    layout: [ // Grid representing the map
        // Each element: [tileAssetName, rotationY_degrees] or null for empty
        [null, ['road_straight', 0], ['building_a', 90]],
        [['road_bend', 90], ['road_crossroad', 0], ['road_straight', 90]],
        [['building_b', 0], ['road_straight', 0], null],
    ],
    tileSize: 4, // Assuming Kenney assets are roughly 4x4 units, adjust as needed
    startPoints: { // Define named start/finish points
        'start1': { x: 1, z: 0, carRotationY: 0 }, // Grid coordinates
        'finish1': { x: 1, z: 2, carRotationY: 90 },
        'start_fireStation': { x: 0, z: 2, carRotationY: 180, yOffset: 0 }, // Example coordinates
        'finish_apartment': { x: 2, z: 0, carRotationY: 0, yOffset: 0 }
    }
};