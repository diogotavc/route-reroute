export const HEADLIGHT_INTENSITY = 20;
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
    NOON: 0.5
};

export const TILE_SIZE = 6;

export const GRASS_HEIGHT = -0.1;
export const GRASS_COLOR = 0x4a7c59;
export const GRASS_SPEED_SCALE = 0.5;

export const TARGET_REWIND_DURATION = 2.0;
export const REWIND_INTERPOLATION = 'ease-in-out';     // 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'

export const CAR_REACTION_DISTANCE = 8.0;
export const CAR_REACTION_ANGLE_THRESHOLD = Math.PI / 6;
export const CAR_HONK_TIMES = 2;
export const CAR_FLASH_DURATION = 1.0;
export const CAR_FLASH_INTERVALS = 2;
export const CAR_REACTION_COOLDOWN = 3.0;


// Formula: damage = CAR_DAMAGE_BASE + (collisionSpeed * CAR_DAMAGE_SPEED_MULTIPLIER)
// Building collisions get 1.5x multiplier, then clamped to CAR_DAMAGE_MAX
export const CAR_MAX_HEALTH = 100;
export const CAR_DAMAGE_BASE = 20;
export const CAR_DAMAGE_SPEED_MULTIPLIER = 3; // How much extra damage per unit of speed
export const CAR_DAMAGE_MAX = 80;
export const CAR_DAMAGE_COOLDOWN = 0.2;
export const CAR_DAMAGE_DEBUG_LOGGING = true;

export const VEHICLE_COORDINATE_DEBUG_LOGGING = true;
export const VEHICLE_COORDINATE_LOG_INTERVAL = 1.0;

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

export const AUTO_PAUSE_ON_FOCUS_LOST = false;

export const IDLE_CAMERA_ENABLED = true;
export const IDLE_CAMERA_TRIGGER_TIME = 5;
export const IDLE_CAMERA_FADE_DURATION = 1.0;
export const IDLE_CAMERA_BLACK_DURATION = 1.0;
export const IDLE_CAMERA_TIME_SCALE_MIN = 0.0;

export const IDLE_FIREFLY_ENABLED = true;
export const IDLE_FIREFLY_HEIGHT = 1.5;
export const IDLE_FIREFLY_DISTANCE_FROM_CAR = 2.5;
export const IDLE_FIREFLY_ORBIT_DURATION = 25.0;
export const IDLE_FIREFLY_SIZE = 0.1;
export const IDLE_FIREFLY_INTENSITY = 8;
export const IDLE_FIREFLY_COLOR = 0xffff88;
export const IDLE_FIREFLY_GLOW_COLOR = 0xffdd44;
export const IDLE_FIREFLY_FLICKER_SPEED = 2.0;
export const IDLE_FIREFLY_FLICKER_INTENSITY = 0.3;
export const IDLE_FIREFLY_VERTICAL_BOBBING = 0.3;
export const IDLE_FIREFLY_BOBBING_SPEED = 2.0;
export const IDLE_FIREFLY_LIGHT_DISTANCE = 15;
export const IDLE_FIREFLY_LIGHT_DECAY = 1.5;
export const IDLE_FIREFLY_CAST_SHADOWS = false;

export const IDLE_LIGHT_DIM_SCALE = 0.15;

export const MUSIC_ENABLED = true;
export const MUSIC_FOLDER = 'assets/audio/music/';
export const MUSIC_SHUFFLE = true;
export const MUSIC_AUTO_NEXT = true;
export const MUSIC_UI_SHOW_DURATION = 4.0;

export const MUSIC_VOLUME_GAMEPLAY = 0.2;
export const MUSIC_VOLUME_IDLE = 1.0;
export const MUSIC_VOLUME_TRANSITION_ENTER_IDLE = 3;
export const MUSIC_VOLUME_TRANSITION_EXIT_IDLE = 0.25;

export const IDLE_CAMERA_ANIMATIONS = [
    {
        initialOrbitAngle: 0,
        initialElevationAngle: 15,
        initialDistance: 8,
        initialFOV: 60,
        initialPitch: 0,

        finalOrbitAngle: 0,
        finalElevationAngle: 5,
        finalDistance: 10,
        finalFOV: 35,
        finalPitch: 20,
        duration: 6.0
    },
    {
        initialOrbitAngle: 0,
        initialElevationAngle: 5,
        initialDistance: 10,
        initialFOV: 35,
        initialPitch: 20,

        finalOrbitAngle: 90,
        finalElevationAngle: 25,
        finalDistance: 20,
        finalFOV: 35,
        finalPitch: -5,
        duration: 6.0
    },
    {
        initialOrbitAngle: 90,
        initialElevationAngle: 25,
        initialDistance: 20,
        initialFOV: 35,
        initialPitch: -5,

        finalOrbitAngle: 270,
        finalElevationAngle: 15,
        finalDistance: 12,
        finalFOV: 60,
        finalPitch: 15,
        duration: 8.0
    },
    {
        initialOrbitAngle: 270,
        initialElevationAngle: 15,
        initialDistance: 12,
        initialFOV: 60,
        initialPitch: 15,

        finalOrbitAngle: 360,
        finalElevationAngle: 15,
        finalDistance: 8,
        finalFOV: 60,
        finalPitch: 0,
        duration: 6.0
    }
];

export const CAMERA_FOLLOW_SPEED = 2.0;
export const CAMERA_DISTANCE = 18;
export const CAMERA_HEIGHT = 10;
export const LOOK_AT_Y_OFFSET = 3.5;
export const FIRST_PERSON_HEIGHT_OFFSET = 1.2;
export const FIRST_PERSON_FORWARD_OFFSET = 0.3;

export const SHADOW_MAP_SIZE = 2048;
export const HEADLIGHT_SHADOW_MAP_SIZE = 1024;
export const STREETLIGHT_SHADOW_MAP_SIZE = 512;
export const ENABLE_STREETLIGHT_SHADOWS = true;
export const SHADOW_CAMERA_NEAR = 10;
export const SHADOW_CAMERA_FAR = 300;
export const SHADOW_BIAS = -0.0005;
export const SHADOW_NORMAL_BIAS = 0.1;
export const MAX_LIGHTS_PER_SCENE = 20;
export const RENDERER_PIXEL_RATIO = Math.min(window.devicePixelRatio, 2);
export const ENABLE_FRUSTUM_CULLING = true;
export const LOD_DISTANCE_THRESHOLD = 50;