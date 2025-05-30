const ACHIEVEMENT_DEFINITIONS = {
    FIRST_CRASH: {
        id: 'first_crash',
        name: 'Bumper Buddy',
        description: 'Crash into another car for the first time',
        type: 'milestone',
        icon: '💥'
    },
    HEALTH_DEPLETED: {
        id: 'health_depleted', 
        name: 'Wrecked and Ruined',
        description: 'Lose all health for the first time',
        type: 'milestone',
        icon: '💔'
    },
    T_BONED: {
        id: 't_boned',
        name: 'Side Hustle',
        description: 'Get hit from the side (perpendicular collision)',
        type: 'collision',
        icon: '⚡'
    },
    OUT_OF_BOUNDS: {
        id: 'out_of_bounds',
        name: 'Off the Grid',
        description: 'Go completely out of bounds',
        type: 'exploration',
        icon: '🗺️'
    },
    BUILDING_CRASH: {
        id: 'building_crash',
        name: 'Urban Assault',
        description: 'Crash into a building or static object',
        type: 'collision',
        icon: '🏢'
    },
    GRASS_DRIVER: {
        id: 'grass_driver',
        name: 'Lawn Enforcement',
        description: 'Drive on grass for the first time',
        type: 'exploration',
        icon: '🌱'
    },
    SPEED_DEMON: {
        id: 'speed_demon',
        name: 'Terminal Velocity',
        description: 'Reach maximum speed',
        type: 'performance',
        icon: '🚀'
    },
    REWIND_MASTER: {
        id: 'rewind_master',
        name: 'Déjà Vu',
        description: 'Use rewind 5 times in a single mission',
        type: 'gameplay',
        icon: '⏰',
        counter: true,
        target: 5
    },
    HONKED_AT: {
        id: 'honked_at',
        name: 'Road Rage Target',
        description: 'Get honked at by another car',
        type: 'social',
        icon: '📯'
    },
    FLASHED_AT: {
        id: 'flashed_at',
        name: 'Spotlight Stealer',
        description: 'Get flashed at by another car',
        type: 'social',
        icon: '💡'
    },
    NOT_A_SCRATCH: {
        id: 'not_a_scratch',
        name: 'Not a Scratch',
        description: 'Complete all missions in a level without crashing',
        type: 'perfectionist',
        icon: '✨'
    },
    PERFECT_RUN: {
        id: 'perfect_run',
        name: 'Flawless Victory',
        description: 'Complete all missions without crashing, going on grass, or out of bounds',
        type: 'perfectionist',
        icon: '🏆'
    },
    REVERSE_DRIVER: {
        id: 'reverse_driver',
        name: 'Moonwalker',
        description: 'Drive 250 meters in reverse',
        type: 'quirky',
        icon: '🔄',
        counter: true,
        target: 250
    },
    SHOWCASE_MODE: {
        id: 'showcase_mode',
        name: 'Director\'s Cut',
        description: 'Trigger idle camera showcase for the first time',
        type: 'camera',
        icon: '🎬'
    },
    SEVEN_DAYS_NIGHTS: {
        id: 'seven_days_nights',
        name: '8th World Wonder',
        description: 'Experience 7 Days and 7 Nights',
        type: 'endurance',
        icon: '🌅',
        counter: true,
        target: 7
    }
};

let achievementsState = {
    unlocked: new Set(),
    counters: {},
    session: {
        rewindCount: 0,
        currentMission: 0,
        levelProgress: {
            currentLevel: 0,
            hasCrashed: false,
            hasGoneOnGrass: false,
            hasGoneOutOfBounds: false,
            missionsCompleted: 0,
            totalMissions: 0
        },
        reverseDistance: 0,
        lastInputTime: 0,
        dayNightTracking: {
            lastTime: 0,
            initialTime: 0,
            cycles: 0,
            initialized: false
        }
    }
};

let notificationQueue = [];

export function initAchievements() {
    loadAchievementsFromStorage();

    Object.values(ACHIEVEMENT_DEFINITIONS).forEach(achievement => {
        if (achievement.counter && !(achievement.id in achievementsState.counters)) {
            achievementsState.counters[achievement.id] = 0;
        }
    });
}

function unlockAchievement(achievementId, context = {}) {
    if (achievementsState.unlocked.has(achievementId)) {
        return false;
    }

    const achievement = ACHIEVEMENT_DEFINITIONS[achievementId];
    if (!achievement) {
        console.warn(`Unknown achievement ID: ${achievementId}`);
        return false;
    }

    if (achievement.counter) {
        achievementsState.counters[achievementId] = (achievementsState.counters[achievementId] || 0) + 1;
        saveAchievementsToStorage();
        
        if (achievementsState.counters[achievementId] >= achievement.target) {
            achievementsState.unlocked.add(achievementId);
            queueNotification(achievement, context);
            saveAchievementsToStorage();
            return true;
        }
        return false;
    }

    achievementsState.unlocked.add(achievementId);
    queueNotification(achievement, context);
    saveAchievementsToStorage();

    return true;
}

function queueNotification(achievement, context) {
    const notification = {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        timestamp: Date.now(),
        context
    };
    
    notificationQueue.push(notification);
}

export function getNextNotification() {
    if (notificationQueue.length > 0) {
        return notificationQueue.shift();
    }
    return null;
}

export function onCarCollision(collisionData = {}) {
    achievementsState.session.levelProgress.hasCrashed = true;
    unlockAchievement('FIRST_CRASH', { type: 'car_collision', ...collisionData });

    if (collisionData.angle && Math.abs(collisionData.angle) > 60 && Math.abs(collisionData.angle) < 120) {
        unlockAchievement('T_BONED', { angle: collisionData.angle });
    }
}

export function onBuildingCollision(collisionData = {}) {
    achievementsState.session.levelProgress.hasCrashed = true;
    unlockAchievement('BUILDING_CRASH', { type: 'building_collision', ...collisionData });
}

export function onHealthDepleted(healthData = {}) {
    unlockAchievement('HEALTH_DEPLETED', { health: healthData });
}

export function onOutOfBounds(positionData = {}) {
    achievementsState.session.levelProgress.hasGoneOutOfBounds = true;
    unlockAchievement('OUT_OF_BOUNDS', { position: positionData });
}

export function onGrassDetected(positionData = {}) {
    achievementsState.session.levelProgress.hasGoneOnGrass = true;
    unlockAchievement('GRASS_DRIVER', { position: positionData });
}

export function onMaxSpeedReached(speedData = {}) {
    unlockAchievement('SPEED_DEMON', { speed: speedData });
}

export function onRewindUsed(rewindData = {}) {
    achievementsState.session.rewindCount++;
    unlockAchievement('REWIND_MASTER', { 
        count: achievementsState.session.rewindCount,
        mission: achievementsState.session.currentMission 
    });
}

export function onHonkedAt(honkData = {}) {
    unlockAchievement('HONKED_AT', { type: 'honked', ...honkData });
}

export function onFlashedAt(flashData = {}) {
    unlockAchievement('FLASHED_AT', { type: 'flashed', ...flashData });
}

export function onLevelCompleted(levelData = {}) {
    if (!achievementsState.session.levelProgress.hasCrashed) {
        unlockAchievement('NOT_A_SCRATCH', { level: levelData.level });
    }

    if (!achievementsState.session.levelProgress.hasCrashed && 
        !achievementsState.session.levelProgress.hasGoneOnGrass && 
        !achievementsState.session.levelProgress.hasGoneOutOfBounds) {
        unlockAchievement('PERFECT_RUN', { level: levelData.level });
    }

    achievementsState.session.levelProgress = {
        currentLevel: levelData.level + 1,
        hasCrashed: false,
        hasGoneOnGrass: false,
        hasGoneOutOfBounds: false,
        missionsCompleted: 0,
        totalMissions: 0
    };
}

export function trackReverseDistance(distance) {
    achievementsState.session.reverseDistance += distance;
    unlockAchievement('REVERSE_DRIVER', { 
        totalDistance: achievementsState.session.reverseDistance 
    });
}

export function onInputDetected() {
    achievementsState.session.lastInputTime = Date.now();
}

export function onIdleCameraTriggered() {
    unlockAchievement('SHOWCASE_MODE', { 
        timestamp: Date.now(),
        firstTime: !achievementsState.unlocked.has('SHOWCASE_MODE')
    });
}

export function getLastInputTime() {
    return achievementsState.session.lastInputTime;
}

export function initDayNightTracking(initialTimeOfDay) {
    const tracking = achievementsState.session.dayNightTracking;
    tracking.lastTime = initialTimeOfDay;
    tracking.initialTime = initialTimeOfDay;
    tracking.cycles = 0;
    tracking.initialized = true;
}

export function updateDayNightCycleTracking(currentTime, isRewinding = false) {
    const tracking = achievementsState.session.dayNightTracking;
    
    if (!tracking.initialized || isRewinding) return;

    const tolerance = 0.02;
    const nearInitial = Math.abs(currentTime - tracking.initialTime) <= tolerance;
    const wasAwayFromInitial = Math.abs(tracking.lastTime - tracking.initialTime) > tolerance;

    if (nearInitial && wasAwayFromInitial) {
        tracking.cycles++;

        unlockAchievement('SEVEN_DAYS_NIGHTS', {
            cycleCount: tracking.cycles,
            currentTime: currentTime
        });
    }
    
    tracking.lastTime = currentTime;
}

// UTILITIES

export function getAchievementStats() {
    const total = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
    const unlocked = achievementsState.unlocked.size;

    return {
        total,
        unlocked,
        percentage: Math.round((unlocked / total) * 100),
        unlockedList: Array.from(achievementsState.unlocked),
        counters: { ...achievementsState.counters }
    };
}

export function isAchievementUnlocked(achievementId) {
    return achievementsState.unlocked.has(achievementId);
}

export function getAchievementDefinition(achievementId) {
    return ACHIEVEMENT_DEFINITIONS[achievementId];
}

export function getAllAchievements() {
    return Object.values(ACHIEVEMENT_DEFINITIONS);
}

function saveAchievementsToStorage() {
    try {
        const dataToSave = {
            unlocked: Array.from(achievementsState.unlocked),
            counters: achievementsState.counters,
            version: 1
        };
        localStorage.setItem('route_reroute_achievements', JSON.stringify(dataToSave));
    } catch (error) {
        console.warn('Failed to save achievements to localStorage:', error);
    }
}

function loadAchievementsFromStorage() {
    try {
        const saved = localStorage.getItem('route_reroute_achievements');
        if (saved) {
            const data = JSON.parse(saved);
            achievementsState.unlocked = new Set(data.unlocked || []);
            achievementsState.counters = data.counters || {};
        }
    } catch (error) {
        console.warn('Failed to load achievements from localStorage:', error);
        achievementsState.unlocked = new Set();
        achievementsState.counters = {};
    }
}

export function resetAchievements() {
    achievementsState.unlocked.clear();
    achievementsState.counters = {};
    achievementsState.session.rewindCount = 0;
    notificationQueue = [];
    saveAchievementsToStorage();
}

export function unlockAllAchievements() {
    Object.keys(ACHIEVEMENT_DEFINITIONS).forEach(id => {
        achievementsState.unlocked.add(id);
    });
    saveAchievementsToStorage();
}