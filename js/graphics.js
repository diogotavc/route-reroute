export const GRAPHICS_PRESETS = {
    POTATO: {
        ANTIALIAS: false,
        ENABLE_SHADOWS: false,
        SHADOW_MAP_SIZE: 512,
        HEADLIGHT_SHADOW_MAP_SIZE: 256,
        STREETLIGHT_SHADOW_MAP_SIZE: 128,
        ENABLE_STREETLIGHT_SHADOWS: false,
        SHADOW_CAMERA_NEAR: 15,
        SHADOW_CAMERA_FAR: 200,
        SHADOW_BIAS: -0.001,
        SHADOW_NORMAL_BIAS: 0.2,
        MAX_LIGHTS_PER_SCENE: 4,
        RENDERER_PIXEL_RATIO: Math.min(window.devicePixelRatio, 1),
        ENABLE_FRUSTUM_CULLING: true,
        LOD_DISTANCE_THRESHOLD: 30,
        RESOLUTION_SCALE: 0.5
    },
    LOW: {
        ANTIALIAS: false,
        ENABLE_SHADOWS: true,
        SHADOW_MAP_SIZE: 1024,
        HEADLIGHT_SHADOW_MAP_SIZE: 512,
        STREETLIGHT_SHADOW_MAP_SIZE: 256,
        ENABLE_STREETLIGHT_SHADOWS: false,
        SHADOW_CAMERA_NEAR: 10,
        SHADOW_CAMERA_FAR: 250,
        SHADOW_BIAS: -0.0005,
        SHADOW_NORMAL_BIAS: 0.15,
        MAX_LIGHTS_PER_SCENE: 6,
        RENDERER_PIXEL_RATIO: Math.min(window.devicePixelRatio, 1.5),
        ENABLE_FRUSTUM_CULLING: true,
        LOD_DISTANCE_THRESHOLD: 40,
        RESOLUTION_SCALE: 0.65
    },
    MEDIUM: {
        ANTIALIAS: true,
        ENABLE_SHADOWS: true,
        SHADOW_MAP_SIZE: 2048,
        HEADLIGHT_SHADOW_MAP_SIZE: 1024,
        STREETLIGHT_SHADOW_MAP_SIZE: 512,
        ENABLE_STREETLIGHT_SHADOWS: true,
        SHADOW_CAMERA_NEAR: 10,
        SHADOW_CAMERA_FAR: 300,
        SHADOW_BIAS: -0.0005,
        SHADOW_NORMAL_BIAS: 0.1,
        MAX_LIGHTS_PER_SCENE: 12,
        RENDERER_PIXEL_RATIO: Math.min(window.devicePixelRatio, 2),
        ENABLE_FRUSTUM_CULLING: true,
        LOD_DISTANCE_THRESHOLD: 50,
        RESOLUTION_SCALE: 0.75
    },
    HIGH: {
        ANTIALIAS: true,
        ENABLE_SHADOWS: true,
        SHADOW_MAP_SIZE: 4096,
        HEADLIGHT_SHADOW_MAP_SIZE: 2048,
        STREETLIGHT_SHADOW_MAP_SIZE: 1024,
        ENABLE_STREETLIGHT_SHADOWS: true,
        SHADOW_CAMERA_NEAR: 5,
        SHADOW_CAMERA_FAR: 400,
        SHADOW_BIAS: -0.0003,
        SHADOW_NORMAL_BIAS: 0.05,
        MAX_LIGHTS_PER_SCENE: 16,
        RENDERER_PIXEL_RATIO: Math.min(window.devicePixelRatio, 2),
        ENABLE_FRUSTUM_CULLING: false,
        LOD_DISTANCE_THRESHOLD: 75,
        RESOLUTION_SCALE: 1.0
    }
};

const DEFAULT_GRAPHICS_PRESET = 'MEDIUM';

function loadGraphicsPreset() {
    try {
        const saved = localStorage.getItem('route_reroute_graphics_preset');
        if (saved && GRAPHICS_PRESETS[saved.toUpperCase()]) {
            return saved.toUpperCase();
        }
    } catch (error) {
        console.warn('Failed to load graphics preset from localStorage:', error);
    }
    return DEFAULT_GRAPHICS_PRESET;
}

function loadCustomResolutionScale() {
    try {
        const saved = localStorage.getItem('route_reroute_custom_resolution_scale');
        if (saved) {
            const scale = parseFloat(saved);
            if (scale > 0 && scale <= 2) {
                return scale;
            }
        }
    } catch (error) {
        console.warn('Failed to load custom resolution scale from localStorage:', error);
    }
    return null;
}

function saveGraphicsPreset(preset) {
    try {
        localStorage.setItem('route_reroute_graphics_preset', preset.toUpperCase());
        console.log(`Graphics preset saved: ${preset.toUpperCase()}`);
    } catch (error) {
        console.warn('Failed to save graphics preset to localStorage:', error);
    }
}

function saveCustomResolutionScale(scale) {
    try {
        if (scale === null || scale === undefined) {
            localStorage.removeItem('route_reroute_custom_resolution_scale');
            console.log('Custom resolution scale removed, using preset default');
        } else {
            localStorage.setItem('route_reroute_custom_resolution_scale', scale.toString());
            console.log(`Custom resolution scale saved: ${scale}`);
        }
    } catch (error) {
        console.warn('Failed to save custom resolution scale to localStorage:', error);
    }
}

function getCurrentGraphicsSettings() {
    const preset = loadGraphicsPreset();
    const settings = { ...GRAPHICS_PRESETS[preset] };

    const customResolutionScale = loadCustomResolutionScale();
    if (customResolutionScale !== null) {
        settings.RESOLUTION_SCALE = customResolutionScale;
    }
    
    return settings;
}

function setGraphicsPreset(preset, resolutionScale = null) {
    const presetName = preset.toUpperCase();
    if (!GRAPHICS_PRESETS[presetName]) {
        console.error(`Invalid graphics preset: ${preset}. Available presets: ${Object.keys(GRAPHICS_PRESETS).join(', ')}`);
        return false;
    }

    if (resolutionScale !== null && resolutionScale !== undefined) {
        if (typeof resolutionScale !== 'number' || resolutionScale <= 0 || resolutionScale > 2) {
            console.error('Invalid resolution scale. Must be a number between 0 and 2');
            return false;
        }
    }

    saveGraphicsPreset(presetName);
    saveCustomResolutionScale(resolutionScale);

    console.log(`Graphics preset set to: ${presetName}`);
    if (resolutionScale !== null && resolutionScale !== undefined) {
        console.log(`Custom resolution scale set to: ${resolutionScale}`);
    } else {
        console.log(`Using preset default resolution scale: ${GRAPHICS_PRESETS[presetName].RESOLUTION_SCALE}`);
    }
    console.log('Please refresh the page to apply the new graphics settings.');
    return true;
}

function setResolutionScale(scale) {
    if (typeof scale !== 'number' || scale <= 0 || scale > 2) {
        console.error('Invalid resolution scale. Must be a number between 0 and 2');
        return false;
    }

    saveCustomResolutionScale(scale);
    console.log(`Custom resolution scale set to: ${scale}`);
    console.log('Please refresh the page to apply the new resolution scale.');
    return true;
}

function resetResolutionScale() {
    saveCustomResolutionScale(null);
    const preset = loadGraphicsPreset();
    const defaultScale = GRAPHICS_PRESETS[preset].RESOLUTION_SCALE;
    console.log(`Resolution scale reset to preset default: ${defaultScale}`);
    console.log('Please refresh the page to apply the change.');
    return true;
}

function listGraphicsPresets() {
    const current = loadGraphicsPreset();
    const customScale = loadCustomResolutionScale();

    console.log('Available graphics presets:');
    Object.keys(GRAPHICS_PRESETS).forEach(preset => {
        const marker = preset === current ? ' (CURRENT)' : '';
        const scale = GRAPHICS_PRESETS[preset].RESOLUTION_SCALE;
        console.log(`- ${preset}${marker} (default resolution: ${scale})`);
    });

    if (customScale !== null) {
        console.log(`\nCustom resolution scale: ${customScale} (overriding preset default)`);
    }

    console.log(`\nTo change preset: setGraphicsPreset('PRESET_NAME')`);
    console.log(`To change preset with custom resolution: setGraphicsPreset('PRESET_NAME', 0.75)`);
    console.log(`To change only resolution scale: setResolutionScale(0.75)`);
    console.log(`To reset resolution to preset default: resetResolutionScale()`);
    console.log('Available presets: POTATO, LOW, MEDIUM, HIGH');
}

function getCurrentGraphicsPreset() {
    return loadGraphicsPreset();
}

function getCurrentResolutionScale() {
    return getCurrentGraphicsSettings().RESOLUTION_SCALE;
}

if (typeof window !== 'undefined') {
    window.setGraphicsPreset = setGraphicsPreset;
    window.setResolutionScale = setResolutionScale;
    window.resetResolutionScale = resetResolutionScale;
    window.listGraphicsPresets = listGraphicsPresets;
    window.getCurrentGraphicsPreset = getCurrentGraphicsPreset;
    window.getCurrentResolutionScale = getCurrentResolutionScale;
}

export { getCurrentGraphicsSettings };
