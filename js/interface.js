import { isIdleCameraSystemActive } from './camera.js';
import { TIMER_WARNING_THRESHOLD } from './config.js';

export function createOverlayElements() {
    const rewindOverlay = document.createElement('div');
    rewindOverlay.id = 'rewind-overlay';
    rewindOverlay.textContent = 'Rewinding...';

    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.innerHTML = `
        <div class="pause-menu-title">PAUSED</div>
        <ul class="pause-menu-list">
            <li class="pause-menu-item" data-action="continue">Continue Playing</li>
            <li class="pause-menu-item" data-action="achievements">Achievements</li>
            <li class="pause-menu-item" data-action="rewind-mission">Rewind Mission</li>
            <li class="pause-menu-item" data-action="restart-level">Restart Level</li>
            <li class="pause-menu-item danger" data-action="reset-achievements">Reset Achievements</li>
        </ul>
        <div class="confirmation-overlay" style="display: none;">
            <div class="confirmation-title">Reset All Achievements?</div>
            <div class="confirmation-message">This action cannot be undone.<br>All your achievement progress will be permanently lost.</div>
            <div class="confirmation-buttons">
                <button class="confirmation-button cancel">Cancel</button>
                <button class="confirmation-button confirm">Reset Everything</button>
            </div>
        </div>
    `;

    const pauseDimOverlay = document.createElement('div');
    pauseDimOverlay.id = 'pause-dim-overlay';

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
    document.body.appendChild(pauseDimOverlay);
    document.body.appendChild(loadingOverlay);
    document.body.appendChild(idleFadeOverlay);
    document.body.appendChild(rewindDimOverlay);
    document.body.appendChild(achievementNotificationContainer);
    document.body.appendChild(levelIndicator);
    document.body.appendChild(timerOverlay);
    
    return {
        rewindOverlay,
        pauseOverlay,
        pauseDimOverlay,
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

let pauseMenuState = {
    selectedIndex: 0,
    menuItems: [],
    isConfirmationVisible: false
};

export function initializePauseMenu() {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (!pauseOverlay) return;

    pauseMenuState.menuItems = Array.from(pauseOverlay.querySelectorAll('.pause-menu-item'));

    pauseMenuState.menuItems.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
            if (!pauseMenuState.isConfirmationVisible) {
                pauseMenuState.selectedIndex = index;
                updatePauseMenuSelection();
            }
        });

        item.addEventListener('click', (event) => {
            event.preventDefault();
            if (!pauseMenuState.isConfirmationVisible) {
                pauseMenuState.selectedIndex = index;
                updatePauseMenuSelection();
                activatePauseMenuItem();
            }
        });

        item.addEventListener('selectstart', (event) => {
            event.preventDefault();
        });
    });

    const confirmationOverlay = pauseOverlay.querySelector('.confirmation-overlay');
    const cancelButton = confirmationOverlay.querySelector('.confirmation-button.cancel');
    const confirmButton = confirmationOverlay.querySelector('.confirmation-button.confirm');
    
    cancelButton.addEventListener('click', hidePauseConfirmation);
    confirmButton.addEventListener('click', confirmResetAchievements);

    updatePauseMenuSelection();
}

export function updatePauseMenuSelection() {
    pauseMenuState.menuItems.forEach((item, index) => {
        item.classList.toggle('selected', index === pauseMenuState.selectedIndex);
    });
}

export function navigatePauseMenu(direction) {
    if (pauseMenuState.isConfirmationVisible) return;
    
    if (direction === 'up') {
        pauseMenuState.selectedIndex = (pauseMenuState.selectedIndex - 1 + pauseMenuState.menuItems.length) % pauseMenuState.menuItems.length;
    } else if (direction === 'down') {
        pauseMenuState.selectedIndex = (pauseMenuState.selectedIndex + 1) % pauseMenuState.menuItems.length;
    }
    
    updatePauseMenuSelection();
}

export function activatePauseMenuItem() {
    if (pauseMenuState.isConfirmationVisible) return;
    
    const selectedItem = pauseMenuState.menuItems[pauseMenuState.selectedIndex];
    const action = selectedItem.getAttribute('data-action');
    
    switch (action) {
        case 'continue':
            if (window.pauseMenuActions && window.pauseMenuActions.continueGame) {
                window.pauseMenuActions.continueGame();
            }
            break;
        case 'achievements':
            showAchievementsPlaceholder();
            break;
        case 'rewind-mission':
            if (window.pauseMenuActions && window.pauseMenuActions.rewindMission) {
                window.pauseMenuActions.rewindMission();
            }
            break;
        case 'restart-level':
            if (window.pauseMenuActions && window.pauseMenuActions.restartLevel) {
                window.pauseMenuActions.restartLevel();
            }
            break;
        case 'reset-achievements':
            showPauseConfirmation();
            break;
    }
}

export function showPauseConfirmation() {
    const pauseOverlay = document.getElementById('pause-overlay');
    const confirmationOverlay = pauseOverlay.querySelector('.confirmation-overlay');
    
    confirmationOverlay.style.display = 'flex';
    pauseMenuState.isConfirmationVisible = true;
}

export function hidePauseConfirmation() {
    const pauseOverlay = document.getElementById('pause-overlay');
    const confirmationOverlay = pauseOverlay.querySelector('.confirmation-overlay');
    
    confirmationOverlay.style.display = 'none';
    pauseMenuState.isConfirmationVisible = false;
}

export function confirmResetAchievements() {
    if (window.pauseMenuActions && window.pauseMenuActions.resetAchievements) {
        window.pauseMenuActions.resetAchievements();
    }
    hidePauseConfirmation();
}

let isShowingAchievements = false;

export function showAchievementsPlaceholder() {
    isShowingAchievements = true;

    const achievementOverlay = document.createElement('div');
    achievementOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 20, 0.95));
        color: white;
        padding: 40px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(15px);
        z-index: 3500;
        min-width: 650px;
        max-height: 80vh;
        overflow-y: auto;
        text-align: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    let achievementContent = '<h2 style="margin-top: 0; color: #4A90E2; text-align: center;">🏆 Achievements</h2>';

    if (window.getAchievementStats) {
        const stats = window.getAchievementStats();
        achievementContent += `
            <div style="margin: 20px 0; font-size: 18px; text-align: center;">
                <div style="margin-bottom: 10px; font-weight: 600;">Progress: ${stats.unlocked}/${stats.total} (${stats.percentage}%)</div>
                <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden; margin: 15px auto; max-width: 400px;">
                    <div style="background: linear-gradient(90deg, #4A90E2, #50C878); height: 100%; width: ${stats.percentage}%; transition: width 0.3s ease; border-radius: 4px;"></div>
                </div>
            </div>
        `;

        const allAchievements = [];
        
        if (stats.unlockedList.length > 0) {
            stats.unlockedList.forEach(id => {
                if (window.getAchievementDefinition) {
                    const def = window.getAchievementDefinition(id);
                    if (def) {
                        allAchievements.push({ ...def, id, unlocked: true });
                    }
                }
            });
        }

        if (allAchievements.length > 0) {
            achievementContent += '<div style="text-align: left; margin-top: 25px; display: grid; grid-template-columns: 1fr; gap: 15px; max-height: 400px; overflow-y: auto; padding-right: 10px;">';
            
            allAchievements.forEach(achievement => {
                const bannerPath = `assets/achievement-banners/${achievement.id.toLowerCase()}.jpg`;
                achievementContent += `
                    <div class="achievement-item-detailed" data-banner="${bannerPath}" style="
                        position: relative;
                        height: 120px;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                        transition: all 0.3s ease;
                        cursor: default;
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                    ">
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
                            z-index: 1;
                        "></div>
                        <div style="
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            padding: 20px;
                            z-index: 2;
                            color: white;
                        ">
                            <div style="
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 8px;
                                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                                line-height: 1.2;
                            ">${achievement.name}</div>
                            <div style="
                                font-size: 14px;
                                opacity: 0.9;
                                line-height: 1.3;
                                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                            ">${achievement.description}</div>
                        </div>
                    </div>
                `;
            });
            achievementContent += '</div>';
        } else {
            achievementContent += '<div style="margin: 20px 0; padding: 20px; background: rgba(255, 255, 255, 0.1); border-radius: 12px; color: #ccc; text-align: center;">';
            achievementContent += '<div style="font-size: 48px; margin-bottom: 10px;">🎯</div>';
            achievementContent += '<p>No achievements unlocked yet.<br>Start playing to earn your first achievement!</p>';
            achievementContent += '</div>';
        }
    } else {
        achievementContent += '<div style="margin: 20px 0; padding: 20px; background: rgba(255, 87, 34, 0.1); border-radius: 12px; border-left: 4px solid #ff5722; text-align: center;">';
        achievementContent += '<div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>';
        achievementContent += '<p style="color: #ffab91; margin: 0;">Achievement system not available.</p>';
        achievementContent += '</div>';
    }

    achievementContent += '<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;"><em style="color: #888; font-size: 14px;">Press ESC or ENTER to return to pause menu</em></div>';

    achievementOverlay.innerHTML = achievementContent;
    document.body.appendChild(achievementOverlay);

    const achievementItems = achievementOverlay.querySelectorAll('.achievement-item-detailed');
    achievementItems.forEach(item => {
        const bannerPath = item.getAttribute('data-banner');
        if (bannerPath) {
            const testImage = new Image();
            testImage.onload = function() {
                item.style.background = `linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url('${bannerPath}')`;
                item.style.backgroundSize = 'cover';
                item.style.backgroundPosition = 'center';
            };
            testImage.onerror = function() {
                // Keep the default gradient background if image fails to load
            };
            testImage.src = bannerPath;
        }
    });

    const removeOverlay = () => {
        if (document.body.contains(achievementOverlay)) {
            achievementOverlay.style.opacity = '0';
            achievementOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (document.body.contains(achievementOverlay)) {
                    document.body.removeChild(achievementOverlay);
                }
                isShowingAchievements = false;
            }, 300);
            document.removeEventListener('keydown', keyHandler);
        }
    };

    const keyHandler = (event) => {
        if (event.key === 'Escape' || event.key === 'Enter') {
            event.preventDefault();
            removeOverlay();
        }
    };

    achievementOverlay.style.opacity = '0';
    achievementOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
    achievementOverlay.style.transition = 'all 0.3s ease';

    setTimeout(() => {
        achievementOverlay.style.opacity = '1';
        achievementOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
    
    document.addEventListener('keydown', keyHandler);
}

export function resetPauseMenuSelection() {
    pauseMenuState.selectedIndex = 0;
    pauseMenuState.isConfirmationVisible = false;
    updatePauseMenuSelection();
}

export function isInAchievementsSubmenu() {
    return isShowingAchievements;
}
