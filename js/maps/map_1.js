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
        'building_c': 'assets/kenney_city-kit-suburban/Models/building-type-c.glb',
        'building_d': 'assets/kenney_city-kit-suburban/Models/building-type-d.glb',
        'building_e': 'assets/kenney_city-kit-suburban/Models/building-type-e.glb',
        'building_f': 'assets/kenney_city-kit-suburban/Models/building-type-f.glb',
        'building_g': 'assets/kenney_city-kit-suburban/Models/building-type-g.glb',
        'building_h': 'assets/kenney_city-kit-suburban/Models/building-type-h.glb',
        'building_i': 'assets/kenney_city-kit-suburban/Models/building-type-i.glb',
        'building_j': 'assets/kenney_city-kit-suburban/Models/building-type-j.glb',
        'building_k': 'assets/kenney_city-kit-suburban/Models/building-type-k.glb',
        'building_l': 'assets/kenney_city-kit-suburban/Models/building-type-l.glb',
        'building_m': 'assets/kenney_city-kit-suburban/Models/building-type-m.glb',
        'building_n': 'assets/kenney_city-kit-suburban/Models/building-type-n.glb',
        'building_o': 'assets/kenney_city-kit-suburban/Models/building-type-o.glb',
        'building_p': 'assets/kenney_city-kit-suburban/Models/building-type-p.glb',
        'building_q': 'assets/kenney_city-kit-suburban/Models/building-type-q.glb',
        'building_r': 'assets/kenney_city-kit-suburban/Models/building-type-r.glb',
        'building_s': 'assets/kenney_city-kit-suburban/Models/building-type-s.glb',
        'building_t': 'assets/kenney_city-kit-suburban/Models/building-type-t.glb',
        'building_u': 'assets/kenney_city-kit-suburban/Models/building-type-u.glb',

        // Streetlights
        'streetlight_curved': 'assets/kenney_city-kit-roads/Models/light-curved.glb',
        'streetlight_square': 'assets/kenney_city-kit-roads/Models/light-square.glb',

        // Random Objects
        'cone': 'assets/kenney_car-kit/Models/cone.glb',
        'cone_flat': 'assets/kenney_car-kit/Models/cone-flat.glb',
        'box': 'assets/kenney_car-kit/Models/box.glb',
        'debris_tire': 'assets/kenney_car-kit/Models/debris-tire.glb',
        'debris_plate_a': 'assets/kenney_car-kit/Models/debris-plate-a.glb',
        'debris_plate_b': 'assets/kenney_car-kit/Models/debris-plate-b.glb',
        'planter': 'assets/kenney_city-kit-suburban/Models/planter.glb',
        'tree_large': 'assets/kenney_city-kit-suburban/Models/tree-large.glb',
        'tree_small': 'assets/kenney_city-kit-suburban/Models/tree-small.glb',
    },
    layout: [ // [ name, rotation]
        [null, null, null, null, null, null, null, null, null],
        [null, null, ['road_end_round', 270], null, ['building_h', 0], null, null, ['road_end_round', 270], null],
        [null, null, ['road_straight', 90], null, null, null, null, ['road_straight', 90], null],
        [null, null, ['road_straight', 90], null, ['road_bend', 90], ['road_straight', 0], ['road_straight', 0], ['road_intersection', 270], null],
        [null, null, ['road_straight', 90], null, ['road_straight', 90], ['building_c', 45], null, ['road_straight', 90], null],
        [null, ['road_bend', 90], ['road_bend', 270], null, ['road_straight', 90], null, ['building_a', 90], ['road_straight', 90], null],
        [null, ['road_straight', 90], null, ['road_bend', 90], ['road_crossroad', 0], ['road_straight', 0], ['road_straight', 0], ['road_intersection', 270], null],
        [null, ['road_intersection', 90], ['road_straight', 0], ['road_bend', 270], ['road_straight', 90], null, null, ['road_straight', 90], null],
        [null, ['road_straight', 90], null, null, ['road_end', 90], null, null, ['road_straight', 90], null],
        [null, ['building_t', 0], null, null, null, null, null, ['building_d', 0], null]
    ],
    streetLightLayout: [ // [ name, rotation, offsetX, offsetZ]
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, ['streetlight_square', 90, 0.45, 0], null, null, null, null, ['streetlight_square', 270, -0.45, 0], null],
        [null, null, null, null, null, null, ['streetlight_curved', 180, -0.45, -0.45], null, null],
        [null, null, ['streetlight_square', 270, -0.45, 0], null, ['streetlight_square', 270, -0.45, 0.45], null, null, ['streetlight_square', 90, 0.45, 0], null],
        [null, null, null, null, null, null, null, null, null],
        [null, ['streetlight_square', 90, 0.45, 0], null, null, null, null, ['streetlight_curved', 0, -0.45, 0.45], null, null],
        [null, null, ['streetlight_curved', 0, 0.45, 0.45], null, null, null, null, null, null],
        [null, ['streetlight_curved', 270, -0.45, -0.45], null, null, ['streetlight_curved', 0, 0, 0.45], null, null, ['streetlight_square', 270, -0.45, 0], null],
        [null, null, null, null, null, null, null, null, null]
    ],
    randomObjectsLayout: [ // [ name, rotationX, rotationY, rotationZ, x_position, y_position, z_position, scale]
        // cones near intersections
        ['cone', 0, 45, 0, 6.79, 0, 5.34, 1.0],
        ['cone', 180, 0, 75, 6.95, 0.05, 5.14, 1.0],
        // trees near house, in the grass
        ['tree_small', 0, 0, 0, 4.5, 0, 1.8, 5.0],
        ['tree_small', 0, 0, 0, 4.3, 0, 1.6, 5.0],
        ['tree_large', 0, 0, 0, 4.7, 0, 1.6, 5.0],
        // trees in the grass cutout with 2 houses
        ['tree_small', 0, 0, 0, 6.3, 0, 4, 5.0],
        ['tree_small', 0, 0, 0, 6.2, 0, 4.2, 4.3],
        ['tree_small', 0, 0, 0, 6.1, 0, 3.9, 5.3],
        ['tree_small', 0, 0, 0, 5.9, 0, 4.2, 6.3],
        //
        ['tree_small', 0, 0, 0, 5.4, 0, 4.7, 5.3],
        ['tree_small', 0, 0, 0, 5.1, 0, 5.0, 5.0],
        ['tree_small', 0, 0, 0, 4.9, 0, 5.3, 4.3],
        ['tree_small', 0, 0, 0, 5.3, 0, 5.1, 5.3],
        
        // ['box', 0, 0, 0, 8.2, 0.1, 1.5, 0.8],
        // ['cone_flat', 0, 90, 0, 3.1, 0.1, 0.4, 1.2],
        // ['debris_tire', 90, 180, 0, 7.8, 0.1, 5.2, 1.0],
        // ['cone', 0, 0, 0, 5.5, 0.1, 2.1, 1.1],
        // ['debris_plate_a', 15, 45, 0, 0.7, 0.1, 3.8, 0.9],
        // ['box', 0, 270, 20, 8.5, 0.1, 6.7, 0.7],
        // ['cone_flat', 0, 180, 0, 2.8, 0.1, 8.9, 1.0],
        // ['debris_plate_b', -10, 90, 0, 0.2, 0.1, 5.9, 1.3],
        // ['cone', 0, 315, 0, 6.9, 0.1, 0.3, 1.0],
        // ['debris_tire', 45, 0, 30, 4.7, 0.1, 9.1, 0.8],
        // ['box', 0, 135, -15, 8.7, 0.1, 3.4, 1.2],
        // ['cone_flat', 0, 270, 0, 1.1, 0.1, 7.6, 1.1],
        // ['debris_plate_a', 20, 180, 10, 5.3, 0.1, 8.5, 0.9],
        // ['cone', 0, 90, 0, 8.1, 0.1, 8.8, 1.0],
        // ['debris_tire', -30, 45, 0, 1.5, 0.1, 2.3, 0.9],
        // ['debris_tire', 60, 270, 45, 6.2, 0.1, 7.8, 1.1]
    ],
    tileSize: 6,
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