import { TILE_SIZE } from "../config.js";

export const mapData = {
    tileAssets: {
        // Roads

        'road_straight': 'assets/kenney_city-kit-roads/Models/road-straight.glb',
        'road_bend': 'assets/kenney_city-kit-roads/Models/road-bend.glb',
        'road_crossroad': 'assets/kenney_city-kit-roads/Models/road-crossroad.glb',
        'road_intersection': 'assets/kenney_city-kit-roads/Models/road-intersection.glb',
        'road_end': 'assets/kenney_city-kit-roads/Models/road-end.glb',
        'road_end_round': 'assets/kenney_city-kit-roads/Models/road-end-round.glb',

        // Buildings

        'building_a': 'assets/kenney_city-kit-suburban/Models/building-type-a.glb',
        'building_b': 'assets/kenney_city-kit-suburban/Models/building-type-b.glb',

        // Streetlights
        'streetlight_curved': 'assets/kenney_city-kit-roads/Models/light-curved.glb',
        'streetlight_square': 'assets/kenney_city-kit-roads/Models/light-square.glb',
    },
    layout: [
        [null, null, null, null, null, null, null, null, null],
        [null, null, ['road_end_round', 270], null, null, null, null, ['road_end_round', 270], null],
        [null, null, ['road_straight', 90], null, null, null, null, ['road_straight', 90], null],
        [null, null, ['road_straight', 90], null, ['road_bend', 90], ['road_straight', 0], ['road_straight', 0], ['road_intersection', 270], null],
        [null, null, ['road_straight', 90], null, ['road_straight', 90], ['building_a', 45], null, ['road_straight', 90], null],
        [null, ['road_bend', 90], ['road_bend', 270], null, ['road_straight', 90], null, ['building_a', 90], ['road_straight', 90], null],
        [null, ['road_straight', 90], null, ['road_bend', 90], ['road_crossroad', 0], ['road_straight', 0], ['road_straight', 0], ['road_intersection', 270], null],
        [null, ['road_intersection', 90], ['road_straight', 0], ['road_bend', 270], ['road_straight', 90], null, null, ['road_straight', 90], null],
        [null, ['road_straight', 90], null, null, ['road_end', 90], null, null, ['road_straight', 90], null],
        [null, ['building_a', 0], null, null, null, null, null, ['building_a', 0], null]
    ],
    streetLightLayout: [
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null]
    ],
    tileSize: TILE_SIZE,
    buildingScale: 0.7,
    startPoints: {
        'start1': { x: 7.16, z: 1.2, carRotationY: 0 },
        'finish1': { x: 7.16, z: 8, carRotationY: 90 },
        'start_fireStation': { x: 6.64, z: 8, carRotationY: 180 },
        'finish_apartment': { x: 2, z: 0, carRotationY: 0 }
    }
};