export const mapData = {
    tileAssets: {
        // Roads

        'road_straight': 'assets/kenney_city-kit-roads/Models/road-straight.glb',
        'road_bend': 'assets/kenney_city-kit-roads/Models/road-bend.glb',
        'road_crossroad': 'assets/kenney_city-kit-roads/Models/road-crossroad.glb',
        'road_intersection': 'assets/kenney_city-kit-roads/Models/road-intersection.glb',

        // Buildings

        'building_a': 'assets/kenney_city-kit-suburban/Models/building-type-a.glb',
        'building_b': 'assets/kenney_city-kit-suburban/Models/building-type-b.glb',

        // Streetlights
        'streetlight_curved': 'assets/kenney_city-kit-roads/Models/light-curved.glb',
        'streetlight_square': 'assets/kenney_city-kit-roads/Models/light-square.glb',
    },
    layout: [
        [null, null, ['road_straight', 90], ['building_a', 90]],
        [null, null, ['road_straight', 90], null],
        [['road_bend', 90], ['road_straight', 0], ['road_crossroad', 0], ['road_straight', 0]],
        [['road_straight', 90], null, ['road_straight', 90], null],
        [['road_straight', 90], null, ['road_straight', 90], null],
        [['road_straight', 90], null, ['road_straight', 90], null],
        [['building_b', 0], null, ['road_straight', 90], null],
        [null, null, ['road_straight', 90], null],
    ],
    streetLightLayout: [
        [null, null, ['streetlight_curved', 270, -0.45, 0.4], null],
        [null, null, null, null],
        [['streetlight_square', 270, -0.4, 0.4], null, ['streetlight_curved', 180, 0.4, -0.4], null],
        [null, null, null, null],
        [null, null, ['streetlight_curved', 0, 0.4, 0.4], null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, ['streetlight_square', 270, -0.4, -0.4], null],
    ],
    tileSize: 10,
    roadScale: 10,
    streetlightScale: 6,
    buildingScale: 6,
    startPoints: {
        'start1': { x: 1.84, z: 0, carRotationY: 0 },
        'finish1': { x: 2.15, z: 7, carRotationY: 90 },
        'start_fireStation': { x: 0, z: 2, carRotationY: 180, yOffset: 0 },
        'finish_apartment': { x: 2, z: 0, carRotationY: 0, yOffset: 0 }
    }
};