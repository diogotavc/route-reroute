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
            <li class="pause-menu-item" data-action="level-select">Select Level</li>
            <li class="pause-menu-item" data-action="achievements">Achievements</li>
            <li class="pause-menu-item" data-action="manual">Manual & Controls</li>
            <li class="pause-menu-item" data-action="about">About & Credits</li>
            <li class="pause-menu-item danger" data-action="reset-achievements">Reset Achievements</li>
            <li class="pause-menu-item danger" data-action="reset-all-data">Reset All Data</li>
        </ul>
        <div class="confirmation-overlay" style="display: none;">
            <div class="confirmation-title">Reset All Achievements?</div>
            <div class="confirmation-message">This action cannot be undone.<br>All your achievement progress will be permanently lost.</div>
            <div class="confirmation-buttons">
                <button class="confirmation-button cancel">Cancel</button>
                <button class="confirmation-button confirm">Reset Everything</button>
            </div>
        </div>
        <div class="confirmation-overlay reset-all-confirmation" style="display: none;">
            <div class="confirmation-title">Reset All Data?</div>
            <div class="confirmation-message">This will reset ALL progress including:<br>• Level completion progress<br>• Achievement data<br>• All game settings<br><br>This action cannot be undone!</div>
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

    const isSandboxMode = window.isSandboxMode || false;

    if (healthBar) {
        healthBar.style.display = isSandboxMode ? 'none' : 'flex';
    }

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
        healthBar.style.display = isSandboxMode ? 'none' : 'flex';

        if (!isSandboxMode) {
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

    const resetAllConfirmationOverlay = pauseOverlay.querySelector('.confirmation-overlay.reset-all-confirmation');
    const resetAllCancelButton = resetAllConfirmationOverlay.querySelector('.confirmation-button.cancel');
    const resetAllConfirmButton = resetAllConfirmationOverlay.querySelector('.confirmation-button.confirm');

    resetAllCancelButton.addEventListener('click', hideResetAllDataConfirmation);
    resetAllConfirmButton.addEventListener('click', confirmResetAllData);

    updatePauseMenuSelection();
}

export function updatePauseMenuSelection() {
    pauseMenuState.menuItems.forEach((item, index) => {
        item.classList.toggle('selected', index === pauseMenuState.selectedIndex);
    });
}

export function navigatePauseMenu(direction) {
    if (pauseMenuState.isConfirmationVisible) {
        clearActiveConfirmation();
        return;
    }
    
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
        case 'level-select':
            showLevelSelectMenu();
            break;
        case 'achievements':
            showAchievementsMenu();
            break;
        case 'manual':
            showManualMenu();
            break;
        case 'about':
            showAboutMenu();
            break;
        case 'reset-achievements':
            showPauseConfirmation();
            break;
        case 'reset-all-data':
            showResetAllDataConfirmation();
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
let isShowingManual = false;
let isShowingAbout = false;
let isShowingLevelSelect = false;

export function showAchievementsMenu() {
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
    `;

    let achievementContent = '<h2 style="margin-top: 0; color: #4A90E2; text-align: center;">Achievements</h2>';

    if (window.getAchievementStats) {
        const stats = window.getAchievementStats();
        achievementContent += `
            <div style="margin: 20px 0; font-size: 18px; text-align: center;">
                <div style="margin-bottom: 10px; font-weight: 600;">Progress: ${stats.unlocked}/${stats.total} (${stats.percentage}%)</div>
                <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden; margin: 15px auto; max-width: 400px;">
                    <div style="background: linear-gradient(90deg, #4A90E2, #5A9FE7); height: 100%; width: ${stats.percentage}%; transition: width 0.3s ease; border-radius: 4px;"></div>
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
            achievementContent += '<div style="font-size: 48px; margin-bottom: 10px;">NO ACHIEVEMENTS YET</div>';
            achievementContent += '<p>No achievements unlocked yet.<br>Start playing to earn your first achievement!</p>';
            achievementContent += '</div>';
        }
    } else {
        achievementContent += '<div style="margin: 20px 0; padding: 20px; background: rgba(255, 87, 34, 0.1); border-radius: 12px; border-left: 4px solid #ff5722; text-align: center;">';
        achievementContent += '<div style="font-size: 24px; margin-bottom: 10px; color: #ff5722; font-weight: bold;">WARNING</div>';
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

export function isInAnySubmenu() {
    return isShowingAchievements || isShowingManual || isShowingAbout || isShowingLevelSelect;
}

export function showLevelSelectMenu(isInitialSelection = false, fromTimeout = false) {
    isShowingLevelSelect = true;

    let timeoutDimOverlay = null;
    if (fromTimeout) {
        timeoutDimOverlay = document.createElement('div');
        timeoutDimOverlay.id = 'timeout-level-select-dim';
        timeoutDimOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 9999;
        `;
        document.body.appendChild(timeoutDimOverlay);
    }

    const levelSelectOverlay = document.createElement('div');
    levelSelectOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 40, 80, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 40px;
        color: white;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        max-width: ${isInitialSelection ? '500px' : '600px'};
        min-width: ${isInitialSelection ? '400px' : '400px'};
        z-index: ${isInitialSelection ? '10001' : '10000'};
    `;

    const totalLevels = window.getCurrentLevelIndex !== undefined ? 
        (typeof window.levels !== 'undefined' && window.getOriginalLevelsLength ? window.getOriginalLevelsLength() : window.levels.length) : 3;
    const currentLevel = window.getCurrentLevelIndex ? window.getCurrentLevelIndex() : 0;
    const highestCompleted = window.getHighestCompletedLevel ? window.getHighestCompletedLevel() : -1;

    const headerContent = isInitialSelection 
        ? `<h2 style="margin: 0 0 20px 0; font-size: 24px; background: linear-gradient(45deg, #4CAF50, #5CBF64); 
             -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
             Welcome Back!
           </h2>
           <p style="margin-bottom: 30px; color: #B0BEC5; line-height: 1.5;">
               You've completed level ${highestCompleted + 1}. Which level would you like to play?
           </p>`
        : `<h2 style="margin: 0 0 30px 0; font-size: 28px; background: linear-gradient(45deg, #4CAF50, #5CBF64); 
             -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
             Select Level
           </h2>`;

    const footerContent = isInitialSelection
        ? `<p style="color: #666; font-size: 14px; margin-top: 20px;">
               You can also change levels anytime from the pause menu
           </p>`
        : `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
               <em style="color: #888; font-size: 14px;">${fromTimeout ? 'Press ESC to restart level' : 'Press ESC to return to pause menu'}</em>
           </div>`;

    let levelSelectContent = headerContent + '<div style="margin-bottom: 30px;">';

    for (let i = 0; i < totalLevels; i++) {
        const isCompleted = window.isLevelCompleted ? window.isLevelCompleted(i) : false;
        const isUnlocked = i === 0 || isCompleted || i <= highestCompleted + 1;
        const isCurrent = i === currentLevel;

        const statusIcon = isInitialSelection ? 
            (isCompleted ? '✓' : (isUnlocked ? '○' : '')) :
            (isCompleted ? (isCurrent ? '▶' : '✓') : (isCurrent ? '▶' : (isUnlocked ? '○' : '')));
        
        const statusText = isCompleted ? 'Completed' : (isCurrent ? 'Current' : (isUnlocked ? 'Available' : 'Locked'));
        
        const levelName = (isUnlocked || isCompleted) && window.levels && window.levels[i] ? window.levels[i].name : null;
        const levelText = levelName ? `${levelName}` : `Level ${i + 1}`;
        
        const buttonStyle = `
            display: block;
            width: 100%;
            margin: 10px 0;
            padding: 15px;
            background: ${isUnlocked ? 'rgba(76, 175, 80, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
            border: 2px solid ${isUnlocked ? 'rgba(76, 175, 80, 0.5)' : 'rgba(100, 100, 100, 0.3)'};
            border-radius: 10px;
            color: ${isUnlocked ? 'white' : '#888'};
            cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
            font-size: 16px;
            transition: all 0.3s ease;
            ${isUnlocked && !isInitialSelection ? 'background: rgba(76, 175, 80, 0.3); border-color: rgba(76, 175, 80, 0.7);' : ''}
        `;

        levelSelectContent += `
            <button style="${buttonStyle}" 
                    ${isUnlocked ? `onclick="selectLevel(${i})"` : ''} 
                    ${isUnlocked ? 'onmouseover="this.style.background=\'rgba(76, 175, 80, 0.4)\'"' : ''}
                    ${isUnlocked ? 'onmouseout="this.style.background=\'rgba(76, 175, 80, 0.2)\'"' : ''}>
                ${statusIcon} ${levelText} - ${statusText}
            </button>
        `;
    }

    const allLevelsCompleted = window.levels && totalLevels > 0 && highestCompleted >= totalLevels - 1;
    if (allLevelsCompleted) {
        levelSelectContent += `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <button onclick="enterSandboxMode()" style="
                    display: block;
                    width: 100%;
                    margin: 15px 0;
                    padding: 15px;
                    background: linear-gradient(45deg, rgba(76, 175, 80, 0.3), rgba(86, 185, 90, 0.3));
                    border: 2px solid rgba(76, 175, 80, 0.6);
                    border-radius: 10px;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='linear-gradient(45deg, rgba(76, 175, 80, 0.4), rgba(86, 185, 90, 0.4))'"
                   onmouseout="this.style.background='linear-gradient(45deg, rgba(76, 175, 80, 0.3), rgba(86, 185, 90, 0.3))'">
                    Enter Sandbox Mode
                </button>
            </div>
        `;
    }

    levelSelectContent += '</div>' + footerContent;

    levelSelectOverlay.innerHTML = levelSelectContent;
    document.body.appendChild(levelSelectOverlay);

    window.selectLevel = (levelIndex) => {
        if (window.stopIdleCameraAnimation) {
            window.stopIdleCameraAnimation();
        }
        if (window.setCurrentLevel) {
            window.setCurrentLevel(levelIndex);
        }
        removeOverlay();
        
        if (isInitialSelection) {
            if (window.clearInitialLevelSelection) {
                window.clearInitialLevelSelection();
            }
            if (window.unpauseGame) {
                window.unpauseGame();
            }
        } else if (fromTimeout) {
            setTimeout(() => {
                if (window.pauseMenuActions && window.pauseMenuActions.restartLevel) {
                    window.pauseMenuActions.restartLevel();
                }
            }, 100);
        } else {
            const gameCompletionDim = document.getElementById('game-completion-level-select-dim');
            if (gameCompletionDim && document.body.contains(gameCompletionDim)) {
                if (window.unpauseGame) {
                    window.unpauseGame();
                }
            } else {
                if (window.pauseMenuActions && window.pauseMenuActions.continueGame) {
                    window.pauseMenuActions.continueGame();
                }
            }
        }
    };

    const removeOverlay = () => {
        if (document.body.contains(levelSelectOverlay)) {
            levelSelectOverlay.style.opacity = '0';
            levelSelectOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (document.body.contains(levelSelectOverlay)) {
                    document.body.removeChild(levelSelectOverlay);
                }
                
                if (isInitialSelection) {
                    const dimOverlay = document.getElementById('initial-level-selection-dim');
                    if (dimOverlay && document.body.contains(dimOverlay)) {
                        document.body.removeChild(dimOverlay);
                    }
                    delete window.selectLevel;
                } else if (fromTimeout) {
                    const timeoutDim = document.getElementById('timeout-level-select-dim');
                    if (timeoutDim && document.body.contains(timeoutDim)) {
                        document.body.removeChild(timeoutDim);
                    }
                    const timeoutOverlay = document.getElementById('timer-timeout-overlay');
                    if (timeoutOverlay && document.body.contains(timeoutOverlay)) {
                        document.body.removeChild(timeoutOverlay);
                    }
                    delete window.selectLevel;
                } else {
                    const gameCompletionDim = document.getElementById('game-completion-level-select-dim');
                    if (gameCompletionDim && document.body.contains(gameCompletionDim)) {
                        document.body.removeChild(gameCompletionDim);
                    }
                    delete window.selectLevel;
                }
                isShowingLevelSelect = false;
            }, 300);
            document.removeEventListener('keydown', keyHandler);
        }
    };

    const keyHandler = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (isInitialSelection) {
                return;
            } else if (fromTimeout) {
                removeOverlay();
                setTimeout(() => {
                    if (window.pauseMenuActions && window.pauseMenuActions.restartLevel) {
                        window.pauseMenuActions.restartLevel();
                    }
                }, 100);
            } else {
                const gameCompletionDim = document.getElementById('game-completion-level-select-dim');
                if (gameCompletionDim && document.body.contains(gameCompletionDim)) {
                    removeOverlay();
                    setTimeout(() => {
                        if (window.showGameCompletionScreen) {
                            window.showGameCompletionScreen();
                        }
                    }, 100);
                } else {
                    removeOverlay();
                }
            }
        }
    };

    levelSelectOverlay.style.opacity = '0';
    levelSelectOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
    levelSelectOverlay.style.transition = 'all 0.3s ease';

    setTimeout(() => {
        levelSelectOverlay.style.opacity = '1';
        levelSelectOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
    
    document.addEventListener('keydown', keyHandler);
}

export function showManualMenu() {
    isShowingManual = true;
    
    const manualOverlay = document.createElement('div');
    manualOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 40, 80, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 40px;
        color: white;
        text-align: left;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 10000;
    `;

    const manualContent = `
        <h2 style="margin: 0 0 30px 0; font-size: 28px; text-align: center; background: linear-gradient(45deg, #2196F3, #64B5F6); 
           -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
           Manual & Controls
        </h2>
        
        <div style="margin-bottom: 25px;">
            <h3 style="color: #4CAF50; margin-bottom: 10px; font-size: 20px;">Movement Controls</h3>
            <div style="margin-left: 20px; line-height: 1.6;">
                <p><strong>W / ↑</strong> - Accelerate forward</p>
                <p><strong>S / ↓</strong> - Brake / Reverse</p>
                <p><strong>A / ←</strong> - Turn left</p>
                <p><strong>D / →</strong> - Turn right</p>
            </div>
        </div>

        <div style="margin-bottom: 25px;">
            <h3 style="color: #FF9800; margin-bottom: 10px; font-size: 20px;">Game Controls</h3>
            <div style="margin-left: 20px; line-height: 1.6;">
                <p><strong>R</strong> - Rewind time</p>
                <p><strong>Shift + R</strong> - Restart current level</p>
                <p><strong>C</strong> - Switch camera view</p>
                <p><strong>ESC / P</strong> - Pause menu</p>
            </div>
        </div>

        <div style="margin-bottom: 25px;">
            <h3 style="color: #E91E63; margin-bottom: 10px; font-size: 20px;">Music Controls</h3>
            <div style="margin-left: 20px; line-height: 1.6;">
                <p><strong>M / Space</strong> - Play and Pause music</p>
                <p><strong>]</strong> - Previous track</p>
                <p><strong>[</strong> - Next track</p>
            </div>
        </div>

        <div style="margin-bottom: 25px;">
            <h3 style="color: #9C27B0; margin-bottom: 10px; font-size: 20px;">Game Objectives</h3>
            <div style="margin-left: 20px; line-height: 1.6;">
                <p>• Drive each character to their destination</p>
                <p>• Complete all missions to advance to the next level</p>
                <p>• Avoid crashes, grass, and going out of bounds for perfect runs</p>
                <p>• Use time rewind strategically - it comes with penalties</p>
                <p>• Watch the timer - complete missions before time runs out</p>
            </div>
        </div>

        <div style="margin-bottom: 25px;">
            <h3 style="color: #F44336; margin-bottom: 10px; font-size: 20px;">Tips & Strategies</h3>
            <div style="margin-left: 20px; line-height: 1.6;">
                <p>• Plan your route before starting each mission</p>
                <p>• Use different camera angles to better navigate</p>
                <p>• Stay on roads to avoid grass speed and time penalties</p>
                <p>• Some missions have time bonuses upon completion</p>
                <p>• Unlock achievements by trying different play styles</p>
            </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
            <em style="color: #888; font-size: 14px;">Press ESC to return to pause menu</em>
        </div>
    `;

    manualOverlay.innerHTML = manualContent;
    document.body.appendChild(manualOverlay);

    const removeOverlay = () => {
        if (document.body.contains(manualOverlay)) {
            manualOverlay.style.opacity = '0';
            manualOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (document.body.contains(manualOverlay)) {
                    document.body.removeChild(manualOverlay);
                }
                isShowingManual = false;
            }, 300);
            document.removeEventListener('keydown', keyHandler);
        }
    };

    const keyHandler = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            removeOverlay();
        }
    };

    manualOverlay.style.opacity = '0';
    manualOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
    manualOverlay.style.transition = 'all 0.3s ease';

    setTimeout(() => {
        manualOverlay.style.opacity = '1';
        manualOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
    
    document.addEventListener('keydown', keyHandler);
}

export function showAboutMenu() {
    isShowingAbout = true;
    
    const aboutOverlay = document.createElement('div');
    aboutOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 40, 80, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 40px;
        color: white;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 10000;
    `;

    const aboutContent = `
        <h2 style="margin: 0 0 30px 0; font-size: 28px; background: linear-gradient(45deg, #E91E63, #ED4A7B); 
           -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
           About Route Reroute
        </h2>
        
        <div style="margin-bottom: 30px; text-align: left;">
            <h3 style="color: #4CAF50; margin-bottom: 15px; font-size: 20px; text-align: center;">The Game</h3>
            <p style="line-height: 1.6; margin-bottom: 15px;">
                Route Reroute is a fun 3D driving game where you help different characters reach their
                destinations. Each mission presents unique challenges and time constraints, as your
                previous movements are replayed, testing your driving skills and strategic thinking.
            </p>
            <p style="line-height: 1.6; margin-bottom: 15px;">
                Master the art of time management, perfect your driving technique, and unlock 
                achievements as you progress through increasingly challenging levels.
            </p>
        </div>

        <div style="margin-bottom: 30px; text-align: left;">
            <h3 style="color: #2196F3; margin-bottom: 15px; font-size: 20px; text-align: center;">Technical Features</h3>
            <div style="margin-left: 20px; line-height: 1.6;">
                <p>• Built with Three.js for 3D graphics</p>
                <p>• Physics simulation for realistic driving</p>
                <p>• Dynamic day/night cycle system</p>
                <p>• Comprehensive achievement system</p>
                <p>• Time rewind mechanics</p>
                <p>• Movement replay mechanics</p>
                <p>• Multiple camera perspectives</p>
                <p>• Responsive UI design</p>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <h3 style="color: #9C27B0; margin-bottom: 15px; font-size: 20px;">Project Info</h3>
            <p style="color: #B39DDB; font-size: 16px;">Version 0.4-alpha</p>
            <p style="color: #888; font-size: 14px;">Built with a lot of love by Diogo Carvalho (113221)</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
            <em style="color: #888; font-size: 14px;">Press ESC to return to pause menu</em>
        </div>
    `;

    aboutOverlay.innerHTML = aboutContent;
    document.body.appendChild(aboutOverlay);

    const removeOverlay = () => {
        if (document.body.contains(aboutOverlay)) {
            aboutOverlay.style.opacity = '0';
            aboutOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (document.body.contains(aboutOverlay)) {
                    document.body.removeChild(aboutOverlay);
                }
                isShowingAbout = false;
            }, 300);
            document.removeEventListener('keydown', keyHandler);
        }
    };

    const keyHandler = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            removeOverlay();
        }
    };

    aboutOverlay.style.opacity = '0';
    aboutOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
    aboutOverlay.style.transition = 'all 0.3s ease';

    setTimeout(() => {
        aboutOverlay.style.opacity = '1';
        aboutOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
    
    document.addEventListener('keydown', keyHandler);
}

export function showResetAllDataConfirmation() {
    const pauseOverlay = document.getElementById('pause-overlay');
    const resetAllConfirmationOverlay = pauseOverlay.querySelector('.confirmation-overlay.reset-all-confirmation');
    
    resetAllConfirmationOverlay.style.display = 'flex';
    pauseMenuState.isConfirmationVisible = true;
}

export function hideResetAllDataConfirmation() {
    const pauseOverlay = document.getElementById('pause-overlay');
    const resetAllConfirmationOverlay = pauseOverlay.querySelector('.confirmation-overlay.reset-all-confirmation');
    
    resetAllConfirmationOverlay.style.display = 'none';
    pauseMenuState.isConfirmationVisible = false;
}

export function confirmResetAllData() {
    if (window.resetAllData) {
        window.resetAllData();
    }
    hideResetAllDataConfirmation();
    if (window.pauseMenuActions && window.pauseMenuActions.continueGame) {
        window.pauseMenuActions.continueGame();
    }
}

export function clearActiveConfirmation() {
    if (pauseMenuState.isConfirmationVisible) {
        hidePauseConfirmation();
        hideResetAllDataConfirmation();
    }
}

export function isConfirmationVisible() {
    return pauseMenuState.isConfirmationVisible;
}

window.enterSandboxMode = function() {
    isShowingLevelSelect = false;

    const levelSelectOverlay = document.querySelector('[style*="translate(-50%, -50%)"]');
    if (levelSelectOverlay && document.body.contains(levelSelectOverlay)) {
        document.body.removeChild(levelSelectOverlay);
    }
    
    const dimOverlay = document.getElementById('initial-level-selection-dim');
    if (dimOverlay && document.body.contains(dimOverlay)) {
        document.body.removeChild(dimOverlay);
    }
    
    const timeoutDim = document.getElementById('timeout-level-select-dim');
    if (timeoutDim && document.body.contains(timeoutDim)) {
        document.body.removeChild(timeoutDim);
    }

    const gameCompletionDim = document.getElementById('game-completion-level-select-dim');
    if (gameCompletionDim && document.body.contains(gameCompletionDim)) {
        window.sandboxAccessContext = 'game-completion-level-selection';
    } else if (window.isInInitialLevelSelection && window.isInInitialLevelSelection()) {
        window.sandboxAccessContext = 'initial-level-selection';
        if (window.clearInitialLevelSelection) {
            window.clearInitialLevelSelection();
        }
    } else {
        window.sandboxAccessContext = 'level-selection';
    }

    delete window.selectLevel;

    showSandboxConfigurationMenu();
};

function showSandboxConfigurationMenu() {
    const sandboxConfigOverlay = document.createElement('div');
    sandboxConfigOverlay.id = 'sandbox-config-overlay';
    sandboxConfigOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const sandboxConfigContent = document.createElement('div');
    sandboxConfigContent.style.cssText = `
        background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 40, 80, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 40px;
        color: white;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    0 0 30px rgba(76, 175, 80, 0.1);
        max-width: 600px;
        min-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        transform: scale(0.8);
        opacity: 0;
        transition: all 0.5s ease-out;
    `;

    sandboxConfigContent.innerHTML = `
        <h2 style="margin: 0 0 30px 0; font-size: 28px; background: linear-gradient(45deg, #4CAF50, #5CBF64); 
           -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
           Sandbox Configuration
        </h2>
        <p style="margin-bottom: 30px; color: #B0BEC5; line-height: 1.6; font-size: 16px;">
            Configure your sandbox environment and car physics
        </p>
        
        <div style="text-align: left; margin-bottom: 30px;">
            <h3 style="color: #81C784; margin-bottom: 15px; text-align: center; font-size: 18px; font-weight: bold;">Environment Settings</h3>
            
            <div style="margin-bottom: 25px;">
                <label style="display: block; color: #ffffff; font-size: 14px; margin-bottom: 10px; font-weight: bold;">
                    Time of Day:
                </label>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <input type="range" id="time-of-day-slider" min="0" max="100" value="25" 
                           style="flex: 1; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <span id="time-of-day-display" style="color: #ffffff; font-weight: bold; min-width: 80px; background: rgba(255, 255, 255, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2);">Dawn</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #B0BEC5; margin-top: 5px;">
                    <span>Midnight</span>
                    <span>Noon</span>
                    <span>Midnight</span>
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <label style="display: block; color: #ffffff; font-size: 14px; margin-bottom: 10px; font-weight: bold;">
                    Time Speed:
                </label>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <input type="range" id="time-speed-slider" min="0" max="100" value="20" 
                           style="flex: 1; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <span id="time-speed-display" style="color: #ffffff; font-weight: bold; min-width: 80px; background: rgba(255, 255, 255, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2);">Slow</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #B0BEC5; margin-top: 5px;">
                    <span>Frozen</span>
                    <span>Normal</span>
                    <span>Very Fast</span>
                </div>
            </div>

            <h3 style="color: #81C784; margin-bottom: 15px; text-align: center; font-size: 18px; font-weight: bold;">Car Physics Settings</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ffffff; font-size: 13px; margin-bottom: 8px; font-weight: bold;">
                        Max Speed:
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" id="max-speed-slider" min="10" max="50" value="20" 
                               style="flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <span id="max-speed-display" style="color: #ffffff; font-weight: bold; min-width: 60px; font-size: 12px; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.2);">70 km/h</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ffffff; font-size: 13px; margin-bottom: 8px; font-weight: bold;">
                        Acceleration:
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" id="acceleration-slider" min="2" max="15" value="6" 
                               style="flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <span id="acceleration-display" style="color: #ffffff; font-weight: bold; min-width: 35px; font-size: 12px; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.2);">6</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ffffff; font-size: 13px; margin-bottom: 8px; font-weight: bold;">
                        Braking:
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" id="braking-slider" min="4" max="20" value="8" 
                               style="flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <span id="braking-display" style="color: #ffffff; font-weight: bold; min-width: 35px; font-size: 12px; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.2);">8</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ffffff; font-size: 13px; margin-bottom: 8px; font-weight: bold;">
                        Steering Rate:
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" id="steering-rate-slider" min="0.5" max="4" step="0.1" value="2" 
                               style="flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <span id="steering-rate-display" style="color: #ffffff; font-weight: bold; min-width: 35px; font-size: 12px; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.2);">2.0</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ffffff; font-size: 13px; margin-bottom: 8px; font-weight: bold;">
                        Friction:
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" id="friction-slider" min="0.1" max="2" step="0.1" value="0.8" 
                               style="flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <span id="friction-display" style="color: #ffffff; font-weight: bold; min-width: 35px; font-size: 12px; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.2);">0.8</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ffffff; font-size: 13px; margin-bottom: 8px; font-weight: bold;">
                        Steering Friction:
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" id="steering-friction-slider" min="0.5" max="3" step="0.1" value="1.5" 
                               style="flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <span id="steering-friction-display" style="color: #ffffff; font-weight: bold; min-width: 35px; font-size: 12px; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.2);">1.5</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);">
                <button id="reset-physics-button" style="
                    padding: 10px 20px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                    Reset to Default
                </button>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
            <button id="sandbox-config-continue" style="
                padding: 15px 30px;
                background: rgba(76, 175, 80, 0.2);
                border: 2px solid rgba(76, 175, 80, 0.5);
                border-radius: 10px;
                color: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(76, 175, 80, 0.4)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(76, 175, 80, 0.2)'; this.style.transform='translateY(0)'">
                Continue to Car Selection
            </button>
            <button id="sandbox-config-back" style="
                padding: 15px 25px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                color: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                Back
            </button>
        </div>
    `;

    sandboxConfigOverlay.appendChild(sandboxConfigContent);
    document.body.appendChild(sandboxConfigOverlay);

    setTimeout(() => {
        sandboxConfigContent.style.transform = 'scale(1)';
        sandboxConfigContent.style.opacity = '1';
    }, 100);

    const timeOfDaySlider = document.getElementById('time-of-day-slider');
    const timeOfDayDisplay = document.getElementById('time-of-day-display');
    const timeSpeedSlider = document.getElementById('time-speed-slider');
    const timeSpeedDisplay = document.getElementById('time-speed-display');

    const maxSpeedSlider = document.getElementById('max-speed-slider');
    const maxSpeedDisplay = document.getElementById('max-speed-display');
    const accelerationSlider = document.getElementById('acceleration-slider');
    const accelerationDisplay = document.getElementById('acceleration-display');
    const brakingSlider = document.getElementById('braking-slider');
    const brakingDisplay = document.getElementById('braking-display');
    const steeringRateSlider = document.getElementById('steering-rate-slider');
    const steeringRateDisplay = document.getElementById('steering-rate-display');
    const frictionSlider = document.getElementById('friction-slider');
    const frictionDisplay = document.getElementById('friction-display');
    const steeringFrictionSlider = document.getElementById('steering-friction-slider');
    const steeringFrictionDisplay = document.getElementById('steering-friction-display');
    const resetPhysicsButton = document.getElementById('reset-physics-button');

    function updateTimeOfDayDisplay(value) {
        const timeValue = value / 100;
        let timeLabel;
        if (timeValue < 0.125) timeLabel = 'Late Night';
        else if (timeValue < 0.25) timeLabel = 'Dawn';
        else if (timeValue < 0.375) timeLabel = 'Morning';
        else if (timeValue < 0.625) timeLabel = 'Noon';
        else if (timeValue < 0.75) timeLabel = 'Afternoon';
        else if (timeValue < 0.875) timeLabel = 'Dusk';
        else timeLabel = 'Night';
        timeOfDayDisplay.textContent = timeLabel;
    }

    function updateTimeSpeedDisplay(value) {
        const speedValue = value / 100;
        let speedLabel;
        if (speedValue === 0) speedLabel = 'Frozen';
        else if (speedValue < 0.1) speedLabel = 'Very Slow';
        else if (speedValue < 0.25) speedLabel = 'Slow';
        else if (speedValue < 0.5) speedLabel = 'Normal';
        else if (speedValue < 0.75) speedLabel = 'Fast';
        else speedLabel = 'Very Fast';
        timeSpeedDisplay.textContent = speedLabel;
    }

    function updateMaxSpeedDisplay(value) {
        const kmh = Math.round(value * 3.5);
        maxSpeedDisplay.textContent = `${kmh} km/h`;
    }

    function updateAccelerationDisplay(value) {
        accelerationDisplay.textContent = value;
    }

    function updateBrakingDisplay(value) {
        brakingDisplay.textContent = value;
    }

    function updateSteeringRateDisplay(value) {
        steeringRateDisplay.textContent = parseFloat(value).toFixed(1);
    }

    function updateFrictionDisplay(value) {
        frictionDisplay.textContent = parseFloat(value).toFixed(1);
    }

    function updateSteeringFrictionDisplay(value) {
        steeringFrictionDisplay.textContent = parseFloat(value).toFixed(1);
    }

    function resetPhysicsToDefault() {
        maxSpeedSlider.value = '20';
        accelerationSlider.value = '6';
        brakingSlider.value = '8';
        steeringRateSlider.value = '2.0';
        frictionSlider.value = '0.8';
        steeringFrictionSlider.value = '1.5';
        
        updateMaxSpeedDisplay(maxSpeedSlider.value);
        updateAccelerationDisplay(accelerationSlider.value);
        updateBrakingDisplay(brakingSlider.value);
        updateSteeringRateDisplay(steeringRateSlider.value);
        updateFrictionDisplay(frictionSlider.value);
        updateSteeringFrictionDisplay(steeringFrictionSlider.value);
    }

    timeOfDaySlider.addEventListener('input', (e) => updateTimeOfDayDisplay(e.target.value));
    timeSpeedSlider.addEventListener('input', (e) => updateTimeSpeedDisplay(e.target.value));
    maxSpeedSlider.addEventListener('input', (e) => updateMaxSpeedDisplay(e.target.value));
    accelerationSlider.addEventListener('input', (e) => updateAccelerationDisplay(e.target.value));
    brakingSlider.addEventListener('input', (e) => updateBrakingDisplay(e.target.value));
    steeringRateSlider.addEventListener('input', (e) => updateSteeringRateDisplay(e.target.value));
    frictionSlider.addEventListener('input', (e) => updateFrictionDisplay(e.target.value));
    steeringFrictionSlider.addEventListener('input', (e) => updateSteeringFrictionDisplay(e.target.value));
    resetPhysicsButton.addEventListener('click', resetPhysicsToDefault);

    updateTimeOfDayDisplay(timeOfDaySlider.value);
    updateTimeSpeedDisplay(timeSpeedSlider.value);
    updateMaxSpeedDisplay(maxSpeedSlider.value);
    updateAccelerationDisplay(accelerationSlider.value);
    updateBrakingDisplay(brakingSlider.value);
    updateSteeringRateDisplay(steeringRateSlider.value);
    updateFrictionDisplay(frictionSlider.value);
    updateSteeringFrictionDisplay(steeringFrictionSlider.value);

    document.getElementById('sandbox-config-continue').addEventListener('click', () => {
        const timeOfDay = timeOfDaySlider.value / 100;
        const timeSpeed = (timeSpeedSlider.value / 100) * 0.2; // Scale to much higher time speed (10x faster)

        const carPhysics = {
            maxSpeed: parseInt(maxSpeedSlider.value),
            accelerationRate: parseInt(accelerationSlider.value),
            brakingRate: parseInt(brakingSlider.value),
            steeringRate: parseFloat(steeringRateSlider.value),
            friction: parseFloat(frictionSlider.value),
            steeringFriction: parseFloat(steeringFrictionSlider.value)
        };

        document.body.removeChild(sandboxConfigOverlay);

        window.sandboxConfig = {
            timeOfDay: timeOfDay,
            timeSpeed: timeSpeed,
            carPhysics: carPhysics
        };

        if (window.showSandboxCarSelection) {
            window.showSandboxCarSelection();
        }
    });

    document.getElementById('sandbox-config-back').addEventListener('click', () => {
        document.body.removeChild(sandboxConfigOverlay);

        if (window.sandboxAccessContext === 'level-selection') {
            delete window.sandboxAccessContext;
            showLevelSelectMenu(false, false);
        } else if (window.sandboxAccessContext === 'game-completion-level-selection') {
            delete window.sandboxAccessContext;
            const dimOverlay = document.createElement('div');
            dimOverlay.id = 'game-completion-level-select-dim';
            dimOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 9999;
            `;
            document.body.appendChild(dimOverlay);

            showLevelSelectMenu(false, false);
        } else if (window.sandboxAccessContext === 'initial-level-selection') {
            delete window.sandboxAccessContext;

            const dimOverlay = document.createElement('div');
            dimOverlay.id = 'initial-level-selection-dim';
            dimOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                z-index: 9999;
            `;
            document.body.appendChild(dimOverlay);

            showLevelSelectMenu(true, false);
        } else {
            delete window.sandboxAccessContext;
            if (window.showGameCompletionScreen) {
                window.showGameCompletionScreen();
            } else {
                showLevelSelectMenu(false, false);
            }
        }
    });
}

window.showSandboxConfigurationMenu = showSandboxConfigurationMenu;
