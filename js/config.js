export const DEBUG_GENERAL = false;
export const DEBUG_CAR_COORDS = false;
export const DEBUG_COLLISIONS = false;
export const DEBUG_MODEL_LOADING = false;
export const DEBUG_MAP_LEVEL_LOGIC = false;
export const DEBUG_REWIND = false;

// Streetlight configuration
export const STREETLIGHT_INTENSITY = 10; // Single source of truth for streetlight intensity
export const STREETLIGHT_TURN_ON_TIME = 0.78;  // Turn on after 78% of day (evening)
export const STREETLIGHT_TURN_OFF_TIME = 0.27; // Turn off at 22% of day (dawn)
export const STREETLIGHT_SMOOTH_TRANSITIONS = false; // Set to true for smooth fade in/out, false for instant on/off

// Day/Night cycle configuration
export const DAY_CYCLE = {
    DAWN_START: 0.15,     // 15% - early dawn
    DAWN_END: 0.30,       // 30% - full daylight (longer dawn transition)
    DUSK_START: 0.70,     // 70% - evening begins (longer day)
    DUSK_END: 0.85,       // 85% - full night
    NOON: 0.5,            // 50% - peak sun
    SPEED: 0.05          // Even slower, smoother day/night cycle
};

// Headlight configuration
export const HEADLIGHT_INTENSITY = 12;       // Increased intensity for better visibility
export const HEADLIGHT_DISTANCE = 30;        // Slightly longer range
export const HEADLIGHT_ANGLE = Math.PI / 5;  // 36 degrees - wider cone for better triangular effect
export const HEADLIGHT_PENUMBRA = 0.4;       // More gradual edge falloff for smoother triangles
export const HEADLIGHT_COLOR = 0xfff8dc;     // Warm white (cream color) for more realistic car lights
export const HEADLIGHT_AUTO_MODE = true;     // Automatically turn on/off based on time of day
export const HEADLIGHT_TURN_ON_TIME = 0.75;  // Turn on at dusk (75% of day)
export const HEADLIGHT_TURN_OFF_TIME = 0.25; // Turn off at dawn (25% of day)
