import { isIdleCameraSystemActive } from './camera.js';
import { TIMER_WARNING_THRESHOLD } from './config.js';

export function createOverlayElements() {
    const rewindOverlay = document.createElement('div');
    rewindOverlay.id = 'rewind-overlay';
    rewindOverlay.textContent = 'Rewinding...';

    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.textContent = 'PAUSED';

    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading Level...</div>
            <div class="loading-subtitle"></div>
        </div>
    `;

    const idleFadeOverlay = document.createElement('div');
    idleFadeOverlay.id = 'idle-fade-overlay';

    const rewindDimOverlay = document.createElement('div');
    rewindDimOverlay.id = 'rewind-dim-overlay';

    const achievementNotificationContainer = document.createElement('div');
    achievementNotificationContainer.id = 'achievement-notification-container';

    const levelIndicator = document.createElement('div');
    levelIndicator.id = 'level-indicator';
    levelIndicator.textContent = 'Level 1';

    const timerOverlay = document.createElement('div');
    timerOverlay.id = 'timer-overlay';
    timerOverlay.innerHTML = `
        <div class="timer-content">
            <div class="timer-display">2:00</div>
            <div class="timer-hint" style="display: none;"></div>
        </div>
    `;

    document.body.appendChild(rewindOverlay);
    document.body.appendChild(pauseOverlay);
    document.body.appendChild(loadingOverlay);
    document.body.appendChild(idleFadeOverlay);
    document.body.appendChild(rewindDimOverlay);
    document.body.appendChild(achievementNotificationContainer);
    document.body.appendChild(levelIndicator);
    document.body.appendChild(timerOverlay);
    
    return {
        rewindOverlay,
        pauseOverlay,
        loadingOverlay,
        idleFadeOverlay,
        rewindDimOverlay,
        achievementNotificationContainer,
        levelIndicator,
        timerOverlay
    };
}

export function updateLevelIndicator(levelNumber, missionInfo = null, levelName = null) {
    const levelIndicator = document.getElementById('level-indicator');
    if (levelIndicator) {
        const wasHiddenDuringIdle = levelIndicator.classList.contains('hidden-during-idle');

        let content = `Level ${levelNumber}`;
        
        if (levelName) {
            content += ` - ${levelName}`;
        }
        
        if (missionInfo) {
            content += `<div class="mission-info">
                <div class="mission-progress">Mission ${missionInfo.missionIndex}/${missionInfo.totalMissions}</div>
                <div class="mission-character">${missionInfo.character}</div>
                <div class="mission-backstory">${missionInfo.backstory}</div>
            </div>`;
        }
        
        levelIndicator.innerHTML = content;

        if (wasHiddenDuringIdle) {
            levelIndicator.classList.add('hidden-during-idle');
        }
    }
}

export function createAchievementNotification(notification, notificationId) {
    const notificationElement = document.createElement('div');
    notificationElement.id = `achievement-notification-${notificationId}`;
    notificationElement.className = 'achievement-notification';

    const imagePromise = new Promise((resolve) => {
        const testImage = new Image();
        
        testImage.onload = function() {
            notificationElement.style.background = `linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url('${notification.backgroundImage}')`;
            notificationElement.style.backgroundSize = 'cover';
            notificationElement.style.backgroundPosition = 'center';
            resolve(true);
        };
        
        testImage.onerror = function() {
            console.log(`Banner image not found for achievement: ${notification.id}, using fallback styling`);
            resolve(false);
        };
        
        testImage.src = notification.backgroundImage;
    });

    notificationElement.innerHTML = `
        <div>
            <div class="achievement-title">${notification.name}</div>
            <div class="achievement-description">${notification.description}</div>
        </div>
    `;

    notificationElement._imagePromise = imagePromise;
    
    return notificationElement;
}

export function animateAchievementNotification(notificationElement, container) {
    container.insertBefore(notificationElement, container.firstChild);

    if (notificationElement._imagePromise) {
        notificationElement._imagePromise.then(() => {
            setTimeout(() => {
                notificationElement.style.transform = 'translateY(0)';
                notificationElement.style.opacity = '1';
            }, 10);
        });
    } else {
        setTimeout(() => {
            notificationElement.style.transform = 'translateY(0)';
            notificationElement.style.opacity = '1';
        }, 10);
    }

    setTimeout(() => {
        if (notificationElement.parentNode) {
            notificationElement.style.opacity = '0';

            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.remove();
                }
            }, 300);
        }
    }, 5000);
}

export function showLoadingOverlay(levelName = "", subtitle = "") {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingSubtitle = loadingOverlay.querySelector('.loading-subtitle');
    
    if (levelName) {
        loadingOverlay.querySelector('.loading-text').textContent = `Loading ${levelName}...`;
    }
    
    if (subtitle) {
        loadingSubtitle.textContent = subtitle;
        loadingSubtitle.style.display = 'block';
    } else {
        loadingSubtitle.style.display = 'none';
    }
    
    loadingOverlay.style.display = 'flex';

    hideAllOverlaysDuringLoading();
}

export function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'none';

    showAllOverlaysAfterLoading();
}

export function hideAllOverlaysDuringLoading() {
    const elementsToHide = [
        'combined-hud',
        'level-indicator', 
        'achievement-notification-container',
        'music-ui',
        'timer-overlay'
    ];
    
    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden-during-loading');
        }
    });
}

export function showAllOverlaysAfterLoading() {
    const elementsToShow = [
        'combined-hud',
        'level-indicator',
        'achievement-notification-container', 
        'music-ui',
        'timer-overlay'
    ];
    
    elementsToShow.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden-during-loading');
        }
    });
}

export function createHUDElements() {
    const combinedHUD = document.createElement('div');
    combinedHUD.id = 'combined-hud';
    
    const speedometer = document.createElement('div');
    speedometer.id = 'speedometer';
    speedometer.innerHTML = `
        <div class="hud-label">SPEED</div>
        <div class="speed-value">0</div>
        <div class="speed-unit">KM/H</div>
    `;

    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.innerHTML = `
        <div class="hud-label">HEALTH</div>
        <div class="health-bar-container">
            <div class="health-bar-fill"></div>
            <div class="health-bar-text">100%</div>
        </div>
    `;

    combinedHUD.appendChild(speedometer);
    combinedHUD.appendChild(healthBar);
    document.body.appendChild(combinedHUD);

    return {
        combinedHUD,
        speedometer,
        healthBar
    };
}

export function updateHUD(speed, health) {
    const speedometer = document.getElementById('speedometer');
    const healthBar = document.getElementById('health-bar');
    const combinedHUD = document.getElementById('combined-hud');
    
    if (speedometer) {
        const speedValue = speedometer.querySelector('.speed-value');
        if (speedValue) {
            const kmh = Math.abs(speed * 3.5).toFixed(0);
            speedValue.textContent = kmh;
        }
    }

    if (combinedHUD) {
        const kmh = Math.abs(speed * 3.5);

        combinedHUD.classList.remove('speed-glow-low', 'speed-glow-medium', 'speed-glow-high');

        if (kmh > 40) {
            combinedHUD.classList.add('speed-glow-high');
        } else if (kmh > 20) {
            combinedHUD.classList.add('speed-glow-medium');
        } else if (kmh > 5) {
            combinedHUD.classList.add('speed-glow-low');
        }
    }

    if (healthBar) {
        const healthFill = healthBar.querySelector('.health-bar-fill');
        const healthText = healthBar.querySelector('.health-bar-text');

        if (healthFill && healthText) {
            const healthPercentage = Math.max(0, Math.min(100, health));
            healthFill.style.width = `${healthPercentage}%`;
            healthText.textContent = `${Math.round(healthPercentage)}%`;

            if (healthPercentage > 60) {
                healthFill.style.background = 'linear-gradient(90deg, #66bb6a, #4caf50, #43a047)';
            } else if (healthPercentage > 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ffb74d, #ff9800, #f57c00)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #ef5350, #f44336, #d32f2f)';

                if (healthPercentage < 20) {
                    if (combinedHUD) {
                        combinedHUD.style.animation = 'pulse 1.5s infinite alternate';
                    }
                }
            }

            if (healthPercentage >= 20) {
                if (combinedHUD) {
                    combinedHUD.style.animation = 'none';
                }
            }
        }
    }
}

export function updateTimerDisplay(timeRemaining, hint = null) {
    const timerOverlay = document.getElementById('timer-overlay');
    const timerDisplay = timerOverlay?.querySelector('.timer-display');
    const timerHint = timerOverlay?.querySelector('.timer-hint');

    if (timerDisplay) {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = Math.floor(timeRemaining % 60);
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const hasActiveAnimation = timerDisplay.classList.contains('timer-bonus') || 
                                    timerDisplay.classList.contains('timer-penalty') || 
                                    timerDisplay.classList.contains('timer-grass');

        if (!hasActiveAnimation) {
            if (timeRemaining <= TIMER_WARNING_THRESHOLD) {
                timerDisplay.classList.add('timer-warning');
                timerDisplay.classList.remove('timer-normal');
            } else {
                timerDisplay.classList.add('timer-normal');
                timerDisplay.classList.remove('timer-warning');
            }
        }
    }

    if (timerHint) {
        if (hint) {
            timerHint.textContent = hint;
            timerHint.style.display = 'block';
        } else {
            timerHint.style.display = 'none';
        }
    }
}

export function animateTimerBonus() {
    const timerDisplay = document.querySelector('#timer-overlay .timer-display');
    if (timerDisplay) {
        timerDisplay.classList.remove('timer-bonus', 'timer-penalty', 'timer-grass');

        timerDisplay.offsetHeight;

        timerDisplay.classList.add('timer-bonus');

        setTimeout(() => {
            timerDisplay.classList.remove('timer-bonus');
        }, 800);
    }
}

export function animateTimerPenalty() {
    const timerDisplay = document.querySelector('#timer-overlay .timer-display');
    if (timerDisplay) {
        timerDisplay.classList.remove('timer-bonus', 'timer-penalty', 'timer-grass');

        timerDisplay.offsetHeight;

        timerDisplay.classList.add('timer-penalty');

        setTimeout(() => {
            timerDisplay.classList.remove('timer-penalty');
        }, 600);
    }
}

export function animateTimerGrass() {
    const timerDisplay = document.querySelector('#timer-overlay .timer-display');
    if (timerDisplay) {
        timerDisplay.classList.remove('timer-bonus', 'timer-penalty', 'timer-grass');

        timerDisplay.offsetHeight;

        timerDisplay.classList.add('timer-grass');

        setTimeout(() => {
            timerDisplay.classList.remove('timer-grass');
        }, 500);
    }
}
