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
        [null, null, ['road_straight', 90], ['building_a', 90]],
        [null, null, ['road_straight', 90], null],
        [['road_bend', 90], ['road_straight', 0], ['road_crossroad', 0], ['road_straight', 0]],
        [['road_straight', 90], null, ['road_straight', 90], null],
        [['road_straight', 90], null, ['road_straight', 90], null],
        [['road_straight', 90], null, ['road_straight', 90], null],
        [['building_b', 0], null, ['road_straight', 90], null],
        [null, null, ['road_straight', 90], null],
    ],
    tileSize: 6, // Assuming Kenney assets are roughly 4x4 units, adjust as needed
    tileScale: { x: 6, y: 6, z: 6 }, // Added for scaling map assets
    startPoints: { // Define named start/finish points
        //=11.05, Y=0.00, Z=-3.25
        'start1': { x: 1.84, z: 0, carRotationY: 0 }, // Grid coordinates
        'finish1': { x: 2.15, z: 7, carRotationY: 90 },
        'start_fireStation': { x: 0, z: 2, carRotationY: 180, yOffset: 0 }, // Example coordinates
        'finish_apartment': { x: 2, z: 0, carRotationY: 0, yOffset: 0 }
    }
};