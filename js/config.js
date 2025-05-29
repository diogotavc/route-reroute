export const HEADLIGHT_INTENSITY = 12;
export const HEADLIGHT_DISTANCE = 30;
export const HEADLIGHT_ANGLE = Math.PI / 5;
export const HEADLIGHT_PENUMBRA = 0.4;
export const HEADLIGHT_COLOR = 0xfff8dc;
export const HEADLIGHT_AUTO_MODE = true;
export const HEADLIGHT_TURN_ON_TIME = 0.82;
export const HEADLIGHT_TURN_OFF_TIME = 0.35;

export const STREETLIGHT_INTENSITY = 10;
export const STREETLIGHT_TURN_ON_TIME = 0.78;
export const STREETLIGHT_TURN_OFF_TIME = 0.27;
export const STREETLIGHT_SMOOTH_TRANSITIONS = false;

export const DAY_CYCLE = {
    DAWN_START: 0.15,
    DAWN_END: 0.30,
    DUSK_START: 0.70,
    DUSK_END: 0.85,
    NOON: 0.5,
    SPEED: 0.05
};

export const TILE_SIZE = 6;

export const GRASS_HEIGHT = -0.1;
export const GRASS_COLOR = 0x4a7c59;
export const GRASS_SPEED_SCALE = 0.5;

export const TARGET_REWIND_DURATION = 2.0;
export const REWIND_INTERPOLATION = 'ease-in-out';     // 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'

export const CAR_REACTION_DISTANCE = 8.0;
export const CAR_REACTION_ANGLE_THRESHOLD = Math.PI / 2;
export const CAR_HONK_TIMES = 2;
export const CAR_FLASH_DURATION = 1.0;
export const CAR_FLASH_INTERVALS = 2;
export const CAR_REACTION_COOLDOWN = 3.0;

export const CAR_MAX_HEALTH = 100;
export const CAR_COLLISION_DAMAGE = 50;

export const MAX_SPEED = 15;
export const ACCELERATION_RATE = 5;
export const BRAKING_RATE = 10;
export const STEERING_RATE = 1.5;
export const FRICTION = 1;
export const STEERING_FRICTION = 2;
export const COLLISION_RESTITUTION = 0.4;
export const COLLISION_SEPARATION_FACTOR = 1.1;
export const EPSILON = 0.0001;
export const HITBOX_SCALE_FACTOR = 0.8;

export const CAMERA_FOLLOW_SPEED = 2.0;
export const CAMERA_DISTANCE = 18;
export const CAMERA_HEIGHT = 10;
export const LOOK_AT_Y_OFFSET = 3.5;
export const FIRST_PERSON_HEIGHT_OFFSET = 1.2;
export const FIRST_PERSON_FORWARD_OFFSET = 0.3;

export const DEBUG_GENERAL = false;
export const DEBUG_CAR_COORDS = false;
export const DEBUG_COLLISIONS = false;
export const DEBUG_MODEL_LOADING = false;
export const DEBUG_MAP_LEVEL_LOGIC = false;
export const DEBUG_REWIND = false;
export const DEBUG_CAR_REACTIONS = false;
export const DEBUG_CAR_HEALTH = false;