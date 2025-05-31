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
        // Level 1 - Basic Tutorial (2 cars)
        'start1': { x: 7.16, z: 1.2, carRotationY: 0 },
        'finish1': { x: 7.16, z: 8, carRotationY: 90 },
        'start2': { x: 6.84, z: 8, carRotationY: 180 },
        'finish2': { x: 4.67, z: 3.5, carRotationY: 0 },
        
        // Level 2 - Rush Hour (4 cars)
        'start3': { x: 2.3, z: 1.5, carRotationY: 270 },
        'finish3': { x: 1.2, z: 7.8, carRotationY: 90 },
        'start4': { x: 4.8, z: 3.2, carRotationY: 90 },
        'finish4': { x: 7.3, z: 6.1, carRotationY: 270 },
        'start5': { x: 1.8, z: 5.3, carRotationY: 0 },
        'finish5': { x: 4.2, z: 6.7, carRotationY: 180 },
        'start6': { x: 6.1, z: 6.8, carRotationY: 180 },
        'finish6': { x: 2.4, z: 2.1, carRotationY: 0 },
        
        // Level 3 - Traffic Chaos (6 cars)
        'start7': { x: 2.4, z: 7.2, carRotationY: 0 },
        'finish7': { x: 7.1, z: 3.8, carRotationY: 270 },
        'start8': { x: 4.3, z: 8.2, carRotationY: 270 },
        'finish8': { x: 1.3, z: 6.1, carRotationY: 90 },
        'start9': { x: 7.2, z: 7.3, carRotationY: 180 },
        'finish9': { x: 2.1, z: 5.8, carRotationY: 0 },
        'start10': { x: 1.4, z: 7.8, carRotationY: 90 },
        'finish10': { x: 4.8, z: 4.2, carRotationY: 270 },
        'start11': { x: 4.1, z: 5.9, carRotationY: 0 },
        'finish11': { x: 7.4, z: 2.3, carRotationY: 180 },
        'start12': { x: 2.8, z: 3.1, carRotationY: 90 },
        'finish12': { x: 1.8, z: 8.1, carRotationY: 270 },
        
        // Level 4 - Night Shift (5 cars) - Night theme with more complex routes
        'start13': { x: 7.3, z: 4.1, carRotationY: 270 },
        'finish13': { x: 2.2, z: 7.9, carRotationY: 90 },
        'start14': { x: 1.2, z: 6.8, carRotationY: 0 },
        'finish14': { x: 4.9, z: 3.4, carRotationY: 180 },
        'start15': { x: 4.5, z: 7.1, carRotationY: 180 },
        'finish15': { x: 7.2, z: 1.8, carRotationY: 0 },
        'start16': { x: 2.1, z: 2.9, carRotationY: 90 },
        'finish16': { x: 6.8, z: 7.4, carRotationY: 270 },
        'start17': { x: 3.8, z: 6.2, carRotationY: 0 },
        'finish17': { x: 1.9, z: 4.7, carRotationY: 180 }
    }
};