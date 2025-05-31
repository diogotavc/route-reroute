export function createOverlayElements() {
    const rewindOverlay = document.createElement('div');
    rewindOverlay.id = 'rewind-overlay';
    rewindOverlay.textContent = 'Rewinding...';

    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.textContent = 'PAUSED';

    const idleFadeOverlay = document.createElement('div');
    idleFadeOverlay.id = 'idle-fade-overlay';

    const achievementNotificationContainer = document.createElement('div');
    achievementNotificationContainer.id = 'achievement-notification-container';

    const levelIndicator = document.createElement('div');
    levelIndicator.id = 'level-indicator';
    levelIndicator.textContent = 'Level 1';

    document.body.appendChild(rewindOverlay);
    document.body.appendChild(pauseOverlay);
    document.body.appendChild(idleFadeOverlay);
    document.body.appendChild(achievementNotificationContainer);
    document.body.appendChild(levelIndicator);
    
    return {
        rewindOverlay,
        pauseOverlay,
        idleFadeOverlay,
        achievementNotificationContainer,
        levelIndicator
    };
}

export function updateLevelIndicator(levelNumber, missionInfo = null) {
    const levelIndicator = document.getElementById('level-indicator');
    if (levelIndicator) {
        const wasHiddenDuringIdle = levelIndicator.classList.contains('hidden-during-idle');

        let content = `Level ${levelNumber}`;
        
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
                notificationElement.style.transform = 'translateX(0)';
                notificationElement.style.opacity = '1';
            }, 10);
        });
    } else {
        setTimeout(() => {
            notificationElement.style.transform = 'translateX(0)';
            notificationElement.style.opacity = '1';
        }, 10);
    }

    // Slide out animation after 5 seconds
    setTimeout(() => {
        if (notificationElement.parentNode) {
            notificationElement.style.transform = 'translateX(100%)';
            notificationElement.style.opacity = '0';

            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.remove();
                }
            }, 300);
        }
    }, 5000);
}
