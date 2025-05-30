import * as THREE from 'three';
import * as Achievements from './achievements.js';
import { getActiveCar, getCarSpeed, isRewinding } from './cars.js';
import { storeOriginalLightIntensities, setLightIntensities, restoreOriginalLightIntensities } from './lights.js';
import { setIdleMode as setMusicIdleMode } from './music.js';
import {
    IDLE_CAMERA_ENABLED,
    IDLE_CAMERA_TRIGGER_TIME,
    IDLE_CAMERA_FADE_DURATION,
    IDLE_CAMERA_BLACK_DURATION,
    IDLE_CAMERA_TIME_SCALE_MIN,
    IDLE_CAMERA_ANIMATIONS,
    IDLE_FIREFLY_ENABLED,
    IDLE_FIREFLY_HEIGHT,
    IDLE_FIREFLY_DISTANCE_FROM_CAR,
    IDLE_FIREFLY_ORBIT_DURATION,
    IDLE_FIREFLY_SIZE,
    IDLE_FIREFLY_INTENSITY,
    IDLE_FIREFLY_COLOR,
    IDLE_FIREFLY_GLOW_COLOR,
    IDLE_FIREFLY_FLICKER_SPEED,
    IDLE_FIREFLY_FLICKER_INTENSITY,
    IDLE_FIREFLY_VERTICAL_BOBBING,
    IDLE_FIREFLY_BOBBING_SPEED,
    IDLE_FIREFLY_LIGHT_DISTANCE,
    IDLE_FIREFLY_LIGHT_DECAY,
    IDLE_FIREFLY_CAST_SHADOWS,
    IDLE_LIGHT_DIM_SCALE
} from './config.js';

let camera = null;
let scene = null;
let controls = null;
let idleFadeOverlay = null;
let isPaused = false;

let isIdleCameraActive = false;
let idleCameraState = {
    phase: 'inactive', // 'inactive', 'active', 'returning'
    timer: 0,
    animationTimer: 0,
    currentAnimationIndex: 0,
    fadeOpacity: 0,
    originalControlsEnabled: true,
    originalCarVisibility: true,
    lightsAreDimmed: false
};

let idleFirefly = null;
let fireflyOrbitTime = 0;

export function initCamera(cameraRef, sceneRef, controlsRef, idleFadeOverlayRef) {
    camera = cameraRef;
    scene = sceneRef;
    controls = controlsRef;
    idleFadeOverlay = idleFadeOverlayRef;
}

export function setCameraPaused(pausedState) {
    isPaused = pausedState;
}

function createIdleFirefly() {
    if (idleFirefly) {
        scene.remove(idleFirefly.group);
    }

    if (!IDLE_FIREFLY_ENABLED) return null;

    const fireflyGroup = new THREE.Group();

    const fireflyLight = new THREE.PointLight(
        IDLE_FIREFLY_COLOR,
        IDLE_FIREFLY_INTENSITY,
        IDLE_FIREFLY_LIGHT_DISTANCE,
        IDLE_FIREFLY_LIGHT_DECAY
    );

    fireflyLight.castShadow = IDLE_FIREFLY_CAST_SHADOWS;
    if (IDLE_FIREFLY_CAST_SHADOWS) {
        fireflyLight.shadow.mapSize.width = 512;
        fireflyLight.shadow.mapSize.height = 512;
        fireflyLight.shadow.camera.near = 0.1;
        fireflyLight.shadow.camera.far = IDLE_FIREFLY_LIGHT_DISTANCE;
        fireflyLight.shadow.bias = -0.001;
        fireflyLight.shadow.normalBias = 0.1;
    }

    const fireflyGeometry = new THREE.SphereGeometry(IDLE_FIREFLY_SIZE, 8, 6);
    const fireflyMaterial = new THREE.MeshBasicMaterial({
        color: IDLE_FIREFLY_COLOR,
        transparent: true,
        opacity: 0.9
    });
    const fireflyMesh = new THREE.Mesh(fireflyGeometry, fireflyMaterial);

    const glowGeometry = new THREE.SphereGeometry(IDLE_FIREFLY_SIZE * 2, 8, 6);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: IDLE_FIREFLY_GLOW_COLOR,
        transparent: true,
        opacity: 0.3
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

    fireflyGroup.add(fireflyLight);
    fireflyGroup.add(fireflyMesh);
    fireflyGroup.add(glowMesh);

    fireflyGroup.visible = false;

    scene.add(fireflyGroup);

    idleFirefly = {
        group: fireflyGroup,
        light: fireflyLight,
        mesh: fireflyMesh,
        glow: glowMesh,
        baseIntensity: IDLE_FIREFLY_INTENSITY,
        originalOpacity: fireflyMaterial.opacity,
        originalGlowOpacity: glowMaterial.opacity,
        hasAppeared: false
    };

    return idleFirefly;
}

export function startIdleCameraAnimation() {
    if (!IDLE_CAMERA_ENABLED || isIdleCameraActive) return;

    const activeCar = getActiveCar();
    if (activeCar) {
        idleCameraState.originalCarVisibility = activeCar.visible;
    }

    isIdleCameraActive = true;
    idleCameraState.phase = 'active';
    idleCameraState.timer = 0;
    idleCameraState.animationTimer = 0;
    idleCameraState.currentAnimationIndex = 0;
    idleCameraState.fadeOpacity = 0;
    idleCameraState.lightsAreDimmed = false;
    idleCameraState.originalControlsEnabled = controls.enabled;

    controls.enabled = false;
    Achievements.onIdleCameraTriggered();

    storeOriginalLightIntensities();
    setMusicIdleMode(true);

    createIdleFirefly();
    fireflyOrbitTime = 0;
}

export function stopIdleCameraAnimation() {
    if (!isIdleCameraActive) return;

    const activeCar = getActiveCar();
    if (activeCar) {
        activeCar.visible = idleCameraState.originalCarVisibility;
    }

    isIdleCameraActive = false;
    idleCameraState.phase = 'inactive';
    idleCameraState.fadeOpacity = 0;

    camera.fov = 30;
    camera.updateProjectionMatrix();
    controls.enabled = idleCameraState.originalControlsEnabled;

    idleFadeOverlay.style.opacity = '0';

    restoreOriginalLightIntensities();
    setMusicIdleMode(false);

    if (idleFirefly) {
        scene.remove(idleFirefly.group);
        idleFirefly = null;
    }
}

export function updateIdleCameraAnimation(deltaTime) {
    if (!isIdleCameraActive || !IDLE_CAMERA_ENABLED) return;

    if (idleCameraState.phase === 'active') {
        updateActiveIdleCamera(deltaTime);
    }

    updateFadeOverlay();
}

function updateActiveIdleCamera(deltaTime) {
    const fadeInDuration = IDLE_CAMERA_FADE_DURATION;
    const blackDuration = IDLE_CAMERA_BLACK_DURATION;
    const fadeOutDuration = IDLE_CAMERA_FADE_DURATION;
    const totalPhaseTime = fadeInDuration + blackDuration + fadeOutDuration;
    
    idleCameraState.timer += deltaTime;
    
    if (idleCameraState.timer < fadeInDuration) {
        idleCameraState.fadeOpacity = idleCameraState.timer / fadeInDuration;

    } else if (idleCameraState.timer < fadeInDuration + blackDuration) {
        idleCameraState.fadeOpacity = 1;

        if (!idleCameraState.lightsAreDimmed) {
            setLightIntensities(IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE);
            idleCameraState.lightsAreDimmed = true;
        }

        const currentAnim = IDLE_CAMERA_ANIMATIONS[idleCameraState.currentAnimationIndex];
        const activeCar = getActiveCar();

        if (activeCar) {
            activeCar.visible = true;
        }
        
        let centerPoint = new THREE.Vector3(0, 0, 0);
        let carRotationY = 0;
        
        if (activeCar) {
            centerPoint.copy(activeCar.position);
            const euler = new THREE.Euler().setFromQuaternion(activeCar.quaternion, 'YXZ');
            carRotationY = euler.y;
        }
        
        const distance = currentAnim.initialDistance || 20;
        const orbitAngle = currentAnim.initialOrbitAngle || 0;
        const elevationAngle = currentAnim.initialElevationAngle || 0;

        const orbitRad = (orbitAngle * Math.PI / 180) + carRotationY;
        const elevationRad = elevationAngle * Math.PI / 180;

        const horizontalDistance = distance * Math.cos(elevationRad);
        const height = distance * Math.sin(elevationRad);
        
        const startPos = new THREE.Vector3(
            centerPoint.x + Math.sin(orbitRad) * horizontalDistance,
            centerPoint.y + height,
            centerPoint.z + Math.cos(orbitRad) * horizontalDistance
        );

        camera.position.copy(startPos);
        controls.target.copy(centerPoint);

        const forwardOffset = 2;
        const forwardLookVector = new THREE.Vector3(
            Math.sin(carRotationY) * forwardOffset,
            0,
            Math.cos(carRotationY) * forwardOffset
        );
        controls.target.add(forwardLookVector);

        if (currentAnim.initialPitch !== undefined && currentAnim.initialPitch !== 0) {
            const pitchOffset = Math.sin(currentAnim.initialPitch * Math.PI / 180) * 3;
            controls.target.y += pitchOffset;
        }

        if (currentAnim.initialFOV !== undefined) {
            camera.fov = currentAnim.initialFOV;
            camera.updateProjectionMatrix();
        }

        camera.lookAt(controls.target);

    } else if (idleCameraState.timer < totalPhaseTime) {
        const fadeOutProgress = (idleCameraState.timer - fadeInDuration - blackDuration) / fadeOutDuration;
        idleCameraState.fadeOpacity = 1 - fadeOutProgress;

        if (idleFirefly && !idleFirefly.hasAppeared) {
            idleFirefly.group.visible = true;
            idleFirefly.hasAppeared = true;
        }

        if (idleCameraState.lightsAreDimmed) {
            setLightIntensities(IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE);
        }
        
        if (idleFirefly && idleFirefly.hasAppeared) {
            const flickerIntensity = idleFirefly.baseIntensity * (1 + Math.sin(Date.now() * 0.01 * IDLE_FIREFLY_FLICKER_SPEED) * IDLE_FIREFLY_FLICKER_INTENSITY);
            idleFirefly.light.intensity = flickerIntensity;
        }
    } else {
        idleCameraState.fadeOpacity = 0;

        if (idleFirefly && !idleFirefly.hasAppeared) {
            idleFirefly.group.visible = true;
            idleFirefly.hasAppeared = true;
        }

        if (idleCameraState.lightsAreDimmed) {
            setLightIntensities(IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE, IDLE_LIGHT_DIM_SCALE);
        }

        if (idleFirefly && idleFirefly.hasAppeared) {
            const flickerIntensity = idleFirefly.baseIntensity * (1 + Math.sin(Date.now() * 0.01 * IDLE_FIREFLY_FLICKER_SPEED) * IDLE_FIREFLY_FLICKER_INTENSITY);
            idleFirefly.light.intensity = flickerIntensity;

            const activeCar = getActiveCar();
            if (activeCar) {
                updateFireflyPosition(activeCar.position, deltaTime);
            }
        }

        updateCameraAnimation(deltaTime);
    }
}

function updateCameraAnimation(deltaTime) {
    const currentAnim = IDLE_CAMERA_ANIMATIONS[idleCameraState.currentAnimationIndex];
    idleCameraState.animationTimer += deltaTime;

    const progress = Math.min(idleCameraState.animationTimer / currentAnim.duration, 1);
    const easedProgress = easeInOut(progress);

    const activeCar = getActiveCar();
    let centerPoint = new THREE.Vector3(0, 0, 0);
    let carRotationY = 0;
    
    if (activeCar) {
        centerPoint.copy(activeCar.position);
        const euler = new THREE.Euler().setFromQuaternion(activeCar.quaternion, 'YXZ');
        carRotationY = euler.y;
    }

    const currentDistance = currentAnim.initialDistance + (currentAnim.finalDistance - currentAnim.initialDistance) * easedProgress;
    const currentOrbitAngle = currentAnim.initialOrbitAngle + (currentAnim.finalOrbitAngle - currentAnim.initialOrbitAngle) * easedProgress;
    const currentElevationAngle = currentAnim.initialElevationAngle + (currentAnim.finalElevationAngle - currentAnim.initialElevationAngle) * easedProgress;

    const orbitRad = (currentOrbitAngle * Math.PI / 180) + carRotationY;
    const elevationRad = currentElevationAngle * Math.PI / 180;

    // Spherical to cartesian conversion (proper orbital mechanics)
    const horizontalDistance = currentDistance * Math.cos(elevationRad);
    const height = currentDistance * Math.sin(elevationRad);
    
    const currentPos = new THREE.Vector3(
        centerPoint.x + Math.sin(orbitRad) * horizontalDistance,
        centerPoint.y + height,
        centerPoint.z + Math.cos(orbitRad) * horizontalDistance
    );

    camera.position.copy(currentPos);

    controls.target.copy(centerPoint);

    const forwardOffset = 2;
    const forwardLookVector = new THREE.Vector3(
        Math.sin(carRotationY) * forwardOffset,
        0,
        Math.cos(carRotationY) * forwardOffset
    );
    controls.target.add(forwardLookVector);

    if (currentAnim.initialPitch !== undefined && currentAnim.finalPitch !== undefined) {
        const currentPitch = currentAnim.initialPitch + (currentAnim.finalPitch - currentAnim.initialPitch) * easedProgress;
        const pitchOffset = Math.sin(currentPitch * Math.PI / 180) * 3;
        controls.target.y += pitchOffset;
    }

    if (currentAnim.initialFOV !== undefined && currentAnim.finalFOV !== undefined) {
        const currentFOV = currentAnim.initialFOV + (currentAnim.finalFOV - currentAnim.initialFOV) * easedProgress;
        camera.fov = currentFOV;
        camera.updateProjectionMatrix();
    }
    
    camera.lookAt(controls.target);

    if (idleFirefly && idleFirefly.hasAppeared && activeCar) {
        updateFireflyPosition(centerPoint, deltaTime);
    }

    if (progress >= 1) {
        idleCameraState.currentAnimationIndex = (idleCameraState.currentAnimationIndex + 1) % IDLE_CAMERA_ANIMATIONS.length;
        idleCameraState.animationTimer = 0;
    }
}

function updateFadeOverlay() {
    const targetOpacity = idleCameraState.fadeOpacity || 0;
    idleFadeOverlay.style.opacity = Math.max(0, Math.min(1, targetOpacity)).toString();
}

function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function checkIdleTimeout() {
    if (!IDLE_CAMERA_ENABLED || isPaused || isRewinding || isIdleCameraActive) return;
    
    const now = Date.now();
    const lastInputTime = Achievements.getLastInputTime();
    const currentSpeed = Math.abs(getCarSpeed());

    if (currentSpeed > 0) {
        Achievements.onInputDetected();
        return;
    }

    if (lastInputTime > 0) {
        const timeSinceInput = (now - lastInputTime) / 1000;
        if (timeSinceInput >= IDLE_CAMERA_TRIGGER_TIME) {
            startIdleCameraAnimation();
        }
    }
}

export function updateFireflyPosition(carPosition, deltaTime) {
    if (!idleFirefly || !IDLE_FIREFLY_ENABLED) return;

    fireflyOrbitTime += deltaTime;

    const orbitProgress = (fireflyOrbitTime / IDLE_FIREFLY_ORBIT_DURATION) % 1;
    const orbitAngle = orbitProgress * Math.PI * 2;

    const orbitX = Math.cos(orbitAngle) * IDLE_FIREFLY_DISTANCE_FROM_CAR;
    const orbitZ = Math.sin(orbitAngle) * IDLE_FIREFLY_DISTANCE_FROM_CAR;

    const bobbingTime = fireflyOrbitTime * IDLE_FIREFLY_BOBBING_SPEED;
    const verticalOffset = Math.sin(bobbingTime) * IDLE_FIREFLY_VERTICAL_BOBBING;

    const fireflyPosition = new THREE.Vector3(
        carPosition.x + orbitX,
        carPosition.y + IDLE_FIREFLY_HEIGHT + verticalOffset,
        carPosition.z + orbitZ
    );

    idleFirefly.group.position.copy(fireflyPosition);

    const flickerTime = Date.now() * 0.001 * IDLE_FIREFLY_FLICKER_SPEED;
    const flickerFactor = 1 + Math.sin(flickerTime) * IDLE_FIREFLY_FLICKER_INTENSITY;
    const flickerFactor2 = 1 + Math.sin(flickerTime * 1.7 + 1.2) * IDLE_FIREFLY_FLICKER_INTENSITY * 0.5;
    const combinedFlicker = flickerFactor * flickerFactor2;

    idleFirefly.light.intensity = idleFirefly.baseIntensity * combinedFlicker;

    const opacityFlicker = 1 + Math.sin(flickerTime * 2.3) * 0.1;
    idleFirefly.mesh.material.opacity = idleFirefly.originalOpacity * opacityFlicker;
    idleFirefly.glow.material.opacity = idleFirefly.originalGlowOpacity * opacityFlicker;
}

export function isIdleCameraSystemActive() {
    return isIdleCameraActive;
}

export function isIdleCameraReturning() {
    return isIdleCameraActive && idleCameraState.phase === 'returning';
}

export function getIdleCameraTimeScale() {
    if (isIdleCameraActive && idleCameraState.phase === 'active') {
        return IDLE_CAMERA_TIME_SCALE_MIN;
    }
    return 1.0;
}
