import { DEBUG_GENERAL } from './config.js';

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
    }
};

let achievementsState = {
    unlocked: new Set(),
    counters: {},
    session: {
        rewindCount: 0,
        currentMission: 0
    }
};

let notificationQueue = [];
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 2000;

export function initAchievements() {
    loadAchievementsFromStorage();

    Object.values(ACHIEVEMENT_DEFINITIONS).forEach(achievement => {
        if (achievement.counter && !(achievement.id in achievementsState.counters)) {
            achievementsState.counters[achievement.id] = 0;
        }
    });

    if (DEBUG_GENERAL) console.log('Achievements system initialized');
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
    
    if (DEBUG_GENERAL) console.log(`🏆 Achievement unlocked: ${achievement.name}`);
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
    const now = Date.now();
    if (notificationQueue.length > 0 && (now - lastNotificationTime) >= NOTIFICATION_COOLDOWN) {
        lastNotificationTime = now;
        return notificationQueue.shift();
    }
    return null;
}

export function onCarCollision(collisionData = {}) {
    unlockAchievement('FIRST_CRASH', { type: 'car_collision', ...collisionData });

    if (collisionData.angle && Math.abs(collisionData.angle) > 60 && Math.abs(collisionData.angle) < 120) {
        unlockAchievement('T_BONED', { angle: collisionData.angle });
    }
}

export function onBuildingCollision(collisionData = {}) {
    unlockAchievement('BUILDING_CRASH', { type: 'building_collision', ...collisionData });
}

export function onHealthDepleted(healthData = {}) {
    unlockAchievement('HEALTH_DEPLETED', { health: healthData });
}

export function onOutOfBounds(positionData = {}) {
    unlockAchievement('OUT_OF_BOUNDS', { position: positionData });
}

export function onGrassDetected(positionData = {}) {
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

export function onMissionChanged(missionIndex) {
    achievementsState.session.currentMission = missionIndex;
    achievementsState.session.rewindCount = 0;
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
    if (DEBUG_GENERAL) console.log('Achievements reset');
}

export function unlockAllAchievements() {
    Object.keys(ACHIEVEMENT_DEFINITIONS).forEach(id => {
        achievementsState.unlocked.add(id);
    });
    saveAchievementsToStorage();
    if (DEBUG_GENERAL) console.log('All achievements unlocked');
}

export function debug_triggerFirstCrash() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering first crash achievement');
    onCarCollision({ angle: 0.5, speed: 10, otherCarSpeed: 8 });
}

export function debug_triggerHealthDepletion() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering health depletion achievement');
    onHealthDepleted({ 
        previousHealth: 50, 
        currentHealth: 0,
        position: { x: 0, y: 0, z: 0 }
    });
}

export function debug_triggerTBone() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering T-bone achievement');
    onCarCollision({ angle: Math.PI / 2, speed: 15, otherCarSpeed: 12 });
}

export function debug_triggerOutOfBounds() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering out of bounds achievement');
    onOutOfBounds({
        position: { x: -1000, y: 0, z: -1000 },
        gridCoords: { x: -10, z: -10 }
    });
}

export function debug_triggerBuildingCrash() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering building crash achievement');
    onBuildingCollision({
        position: { x: 10, y: 0, z: 10 },
        speed: 20,
        buildingType: 'test_building'
    });
}

export function debug_triggerGrassDetection() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering grass detection achievement');
    onGrassDetected({
        position: { x: 5, y: 0, z: 5 }
    });
}

export function debug_triggerSpeedDemon() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering speed demon achievement');
    onMaxSpeedReached({
        speed: 25,
        maxSpeed: 25,
        percentage: 100
    });
}

export function debug_triggerRewindMaster() {
    if (DEBUG_GENERAL) console.log('DEBUG: Triggering rewind master achievement');
    for (let i = 0; i < 10; i++) {
        onRewindUsed({ totalRecordedTime: 5.0 });
    }
}
