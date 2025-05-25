export const DEBUG_GENERAL = false;
export const DEBUG_CAR_COORDS = false;
export const DEBUG_COLLISIONS = false;
export const DEBUG_MODEL_LOADING = false;
export const DEBUG_MAP_LEVEL_LOGIC = false;
export const DEBUG_REWIND = false;

// Streetlight configuration
export const STREETLIGHT_INTENSITY = 10; // Single source of truth for streetlight intensity
export const STREETLIGHT_TURN_ON_TIME = 0.78;  // Turn on after 78% of day (evening)
export const STREETLIGHT_TURN_OFF_TIME = 0.22; // Turn off at 22% of day (dawn)

// Day/Night cycle configuration
export const DAY_CYCLE = {
    DAWN_START: 0.15,     // 15% - early dawn
    DAWN_END: 0.30,       // 30% - full daylight (longer dawn transition)
    DUSK_START: 0.70,     // 70% - evening begins (longer day)
    DUSK_END: 0.85,       // 85% - full night
    NOON: 0.5,            // 50% - peak sun
    SPEED: 0.05          // Slower, smoother day/night cycle
};
