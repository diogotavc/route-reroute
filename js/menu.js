// Menu System for Route Reroute
class MenuSystem {
    constructor() {
        this.isMenuActive = true;
        this.selectedIndex = 0;
        this.menuItems = [
            { id: 'start', text: 'START GAME', action: 'startGame' },
            { id: 'instructions', text: 'INSTRUCTIONS', action: 'showInstructions' },
            { id: 'settings', text: 'SETTINGS', action: 'showSettings' },
            { id: 'credits', text: 'CREDITS', action: 'showCredits' }
        ];
        
        this.currentScreen = 'main';
        this.onGameStart = null;
        
        this.createMenuHTML();
        this.bindEvents();
        this.updateSelection();
    }
    
    createMenuHTML() {
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuOverlay.id = 'menu-overlay';
        
        menuOverlay.innerHTML = `
            <div class="menu-background"></div>
            <div class="menu-container">
                <h1 class="menu-title">ROUTE REROUTE</h1>
                <p class="menu-subtitle">Navigate the chaos, master the streets</p>
                
                <div class="menu-items" id="menu-items">
                    ${this.menuItems.map((item, index) => 
                        `<div class="menu-item" data-index="${index}" data-action="${item.action}">${item.text}</div>`
                    ).join('')}
                </div>
                
                <div class="menu-controls">
                    <div>Use <span class="key">↑</span> <span class="key">↓</span> or <span class="key">W</span> <span class="key">S</span> to navigate</div>
                    <div>Press <span class="key">ENTER</span> or <span class="key">SPACE</span> to select</div>
                    <div>Press <span class="key">ESC</span> to go back</div>
                </div>
            </div>
        `;

        document.body.appendChild(menuOverlay);
        this.menuOverlay = menuOverlay;

        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.id = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-title">LOADING GAME</div>
                <div class="loading-spinner"></div>
                <div class="loading-text">Preparing your urban adventure...</div>
            </div>
        `;
        document.body.appendChild(loadingScreen);
        this.loadingScreen = loadingScreen;
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (!this.isMenuActive) return;
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.navigateUp();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.navigateDown();
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.selectCurrentItem();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.goBack();
                    break;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isMenuActive) return;

            const menuItem = e.target.closest('.menu-item');
            if (menuItem) {
                const index = parseInt(menuItem.dataset.index);
                if (!isNaN(index) && index !== this.selectedIndex) {
                    this.selectedIndex = index;
                    this.updateSelection();
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.isMenuActive) return;
            
            const menuItem = e.target.closest('.menu-item');
            if (menuItem) {
                const index = parseInt(menuItem.dataset.index);
                if (!isNaN(index)) {
                    this.selectedIndex = index;
                    this.updateSelection();
                    setTimeout(() => this.selectCurrentItem(), 100);
                }
            }
        });
    }

    navigateUp() {
        this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        this.updateSelection();
        this.playMenuSound();
    }

    navigateDown() {
        this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        this.updateSelection();
        this.playMenuSound();
    }

    updateSelection() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    selectCurrentItem() {
        const currentItem = this.menuItems[this.selectedIndex];
        if (currentItem) {
            this.playSelectSound();
            this.executeAction(currentItem.action);
        }
    }

    executeAction(action) {
        switch(action) {
            case 'startGame':
                this.startGame();
                break;
            case 'showInstructions':
                this.showInstructions();
                break;
            case 'showSettings':
                this.showSettings();
                break;
            case 'showCredits':
                this.showCredits();
                break;
        }
    }

    startGame() {
        this.showLoadingScreen();

        setTimeout(() => {
            this.hideMenu();
            if (this.onGameStart) {
                this.onGameStart();
            }
        }, 1500);
    }

    showInstructions() {
        this.showSubScreen('instructions', 'INSTRUCTIONS', `
            <div style="text-align: left; line-height: 1.8; max-width: 500px;">
                <h3 style="color: #00ff88; margin-bottom: 15px;">VEHICLE CONTROLS</h3>
                <div><span class="key">W</span> or <span class="key">↑</span> - Accelerate</div>
                <div><span class="key">S</span> or <span class="key">↓</span> - Brake/Reverse</div>
                <div><span class="key">A</span> or <span class="key">←</span> - Turn Left</div>
                <div><span class="key">D</span> or <span class="key">→</span> - Turn Right</div>
                <div><span class="key">R</span> - Rewind Time</div>

                <h3 style="color: #00ff88; margin: 20px 0 15px 0;">CAMERA CONTROLS</h3>
                <div><span class="key">C</span> - Toggle Camera Mode</div>

                <h3 style="color: #00ff88; margin: 20px 0 15px 0;">GAME CONTROLS</h3>
                <div><span class="key">P</span> - Pause Game</div>
                <div><span class="key">ESC</span> - Return to Menu</div>

                <h3 style="color: #00ff88; margin: 20px 0 15px 0;">OBJECTIVE</h3>
                <div>Navigate through the city completing missions for different characters. Each level gets progressively more challenging with changing time of day and weather conditions.</div>
            </div>
        `);
    }
    
    showSettings() {
        const audioSettings = this.getAudioSettings();
        const gameSettings = this.getGameSettings();
        this.showSubScreen('settings', 'SETTINGS', `
            <div style="text-align: center;">
                <div style="margin: 20px 0;">
                    <h3 style="color: #00ff88; margin-bottom: 25px;">AUDIO SETTINGS</h3>
                    
                    <div style="margin: 20px 0; text-align: left; max-width: 400px; margin-left: auto; margin-right: auto;">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #aaa; margin-bottom: 8px; font-size: 1rem;">
                                Master Volume: <span id="master-volume-value">${Math.round(audioSettings.master * 100)}%</span>
                            </label>
                            <input type="range" id="master-volume" class="audio-slider" 
                                   min="0" max="100" value="${Math.round(audioSettings.master * 100)}"
                                   style="width: 100%;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #aaa; margin-bottom: 8px; font-size: 1rem;">
                                Music Volume: <span id="music-volume-value">${Math.round(audioSettings.music * 100)}%</span>
                            </label>
                            <input type="range" id="music-volume" class="audio-slider" 
                                   min="0" max="100" value="${Math.round(audioSettings.music * 100)}"
                                   style="width: 100%;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #aaa; margin-bottom: 8px; font-size: 1rem;">
                                SFX Volume: <span id="sfx-volume-value">${Math.round(audioSettings.sfx * 100)}%</span>
                            </label>
                            <input type="range" id="sfx-volume" class="audio-slider" 
                                   min="0" max="100" value="${Math.round(audioSettings.sfx * 100)}"
                                   style="width: 100%;">
                        </div>
                    </div>
                </div>

                <div style="margin: 30px 0;">
                    <h3 style="color: #00ff88; margin-bottom: 25px;">GAME SETTINGS</h3>
                    
                    <div style="margin: 20px 0; text-align: left; max-width: 400px; margin-left: auto; margin-right: auto;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; color: #aaa; cursor: pointer;">
                                <input type="checkbox" id="auto-pause" ${gameSettings.autoPauseOnFocusLost ? 'checked' : ''} 
                                       style="margin-right: 10px; transform: scale(1.2);">
                                Auto Pause on Focus Lost
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; color: #aaa; cursor: pointer;">
                                <input type="checkbox" id="music-enabled" ${gameSettings.musicEnabled ? 'checked' : ''} 
                                       style="margin-right: 10px; transform: scale(1.2);">
                                Enable Music
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; color: #aaa; cursor: pointer;">
                                <input type="checkbox" id="music-shuffle" ${gameSettings.musicShuffle ? 'checked' : ''} 
                                       style="margin-right: 10px; transform: scale(1.2);">
                                Shuffle Music Playlist
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; color: #aaa; cursor: pointer;">
                                <input type="checkbox" id="music-auto-next" ${gameSettings.musicAutoNext ? 'checked' : ''} 
                                       style="margin-right: 10px; transform: scale(1.2);">
                                Auto Play Next Track
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; color: #aaa; cursor: pointer;">
                                <input type="checkbox" id="idle-camera" ${gameSettings.idleCameraEnabled ? 'checked' : ''} 
                                       style="margin-right: 10px; transform: scale(1.2);">
                                Enable Idle Camera
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; color: #aaa; cursor: pointer;">
                                <input type="checkbox" id="idle-firefly" ${gameSettings.idleFireflyEnabled ? 'checked' : ''} 
                                       style="margin-right: 10px; transform: scale(1.2);">
                                Enable Idle Firefly
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #aaa; margin-bottom: 8px; font-size: 1rem;">
                                Gameplay Music Volume: <span id="gameplay-music-value">${Math.round(gameSettings.musicVolumeGameplay * 100)}%</span>
                            </label>
                            <input type="range" id="gameplay-music-volume" class="audio-slider" 
                                   min="0" max="100" value="${Math.round(gameSettings.musicVolumeGameplay * 100)}"
                                   style="width: 100%;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #aaa; margin-bottom: 8px; font-size: 1rem;">
                                Idle Music Volume: <span id="idle-music-value">${Math.round(gameSettings.musicVolumeIdle * 100)}%</span>
                            </label>
                            <input type="range" id="idle-music-volume" class="audio-slider" 
                                   min="0" max="100" value="${Math.round(gameSettings.musicVolumeIdle * 100)}"
                                   style="width: 100%;">
                        </div>
                    </div>
                </div>

                <p style="color: #888; margin-top: 30px;">Settings are automatically saved</p>
            </div>
        `);
        
        // Bind events after creating the HTML
        setTimeout(() => {
            this.bindAudioSliders();
            this.bindGameSettings();
        }, 100);
    }

    showCredits() {
        this.showSubScreen('credits', 'CREDITS', `
            <div style="text-align: center; line-height: 2;">
                <h3 style="color: #00ff88; margin-bottom: 20px;">ROUTE REROUTE</h3>

                <div style="margin: 15px 0;">
                    <strong>Game Development</strong><br>
                    Created with Three.js and WebGL
                </div>

                <div style="margin: 15px 0;">
                    <strong>3D Models</strong><br>
                    Kenney Car Kit<br>
                    Kenney City Kit Roads<br>
                    Kenney City Kit Suburban
                </div>

                <div style="margin: 15px 0;">
                    <strong>Audio</strong><br>
                    Background Music<br>
                    Sound Effects
                </div>

                <div style="margin: 15px 0;">
                    <strong>UI Design</strong><br>
                    Orbitron Font by Google Fonts<br>
                    Custom CSS Animations
                </div>

                <div style="margin: 30px 0; color: #888;">
                    Thank you for playing!
                </div>
            </div>
        `);
    }

    showSubScreen(screenId, title, content) {
        this.currentScreen = screenId;
        const container = document.querySelector('.menu-container');
        container.innerHTML = `
            <h1 class="menu-title">${title}</h1>
            <div style="margin: 20px 0;">
                ${content}
            </div>
            <div class="menu-controls" style="margin-top: 30px;">
                <div>Press <span class="key">ESC</span> to go back</div>
            </div>
        `;
    }

    goBack() {
        if (this.currentScreen !== 'main') {
            this.currentScreen = 'main';
            this.showMainMenu();
            this.playMenuSound();
        }
    }

    showMainMenu() {
        const container = document.querySelector('.menu-container');
        container.innerHTML = `
            <h1 class="menu-title">ROUTE REROUTE</h1>
            <p class="menu-subtitle">Navigate the chaos, master the streets</p>

            <div class="menu-items" id="menu-items">
                ${this.menuItems.map((item, index) => 
                    `<div class="menu-item" data-index="${index}" data-action="${item.action}">${item.text}</div>`
                ).join('')}
            </div>

            <div class="menu-controls">
                <div>Use <span class="key">↑</span> <span class="key">↓</span> or <span class="key">W</span> <span class="key">S</span> to navigate</div>
                <div>Press <span class="key">ENTER</span> or <span class="key">SPACE</span> to select</div>
                <div>Press <span class="key">ESC</span> to go back</div>
            </div>
        `;
        this.selectedIndex = 0;
        this.updateSelection();
    }

    showLoadingScreen() {
        this.loadingScreen.style.display = 'flex';
    }

    hideLoadingScreen() {
        this.loadingScreen.style.display = 'none';
    }

    showMenu() {
        this.isMenuActive = true;
        this.menuOverlay.classList.remove('hidden');
        this.hideLoadingScreen();

        this.currentScreen = 'main';
        this.showMainMenu();
    }
    
    hideMenu() {
        this.isMenuActive = false;
        this.menuOverlay.classList.add('hidden');
        this.hideLoadingScreen();
    }
    
    playMenuSound() {
        // Placeholder
    }
    
    playSelectSound() {
        // Placeholder
    }

    setGameStartCallback(callback) {
        this.onGameStart = callback;
    }

    getAudioSettings() {
        const defaultSettings = { master: 1.0, music: 0.8, sfx: 0.9 };
        try {
            const saved = localStorage.getItem('gameAudioSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (e) {
            return defaultSettings;
        }
    }
    
    saveAudioSettings(settings) {
        try {
            localStorage.setItem('gameAudioSettings', JSON.stringify(settings));
            this.applyAudioSettings(settings);
        } catch (e) {
            console.warn('Could not save audio settings:', e);
        }
    }
    
    applyAudioSettings(settings) {
        if (window.setMusicVolume) {
            window.setMusicVolume(settings.music * settings.master);
        }

        if (window.setSFXVolume) {
            window.setSFXVolume(settings.sfx * settings.master);
        }

        window.dispatchEvent(new CustomEvent('audioSettingsChanged', { 
            detail: settings 
        }));
    }

    getGameSettings() {
        const defaultSettings = {
            autoPauseOnFocusLost: false,
            idleCameraEnabled: true,
            idleFireflyEnabled: true,
            musicEnabled: true,
            musicShuffle: true,
            musicAutoNext: true,
            musicVolumeGameplay: 0.2,
            musicVolumeIdle: 1.0
        };
        try {
            const saved = localStorage.getItem('gameSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (e) {
            return defaultSettings;
        }
    }
    
    saveGameSettings(settings) {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(settings));
            this.applyGameSettings(settings);
        } catch (e) {
            console.warn('Could not save game settings:', e);
        }
    }
    
    applyGameSettings(settings) {
        window.dispatchEvent(new CustomEvent('gameSettingsChanged', { 
            detail: settings 
        }));

        if (window.updateGameSettings) {
            window.updateGameSettings(settings);
        }
    }
    
    bindGameSettings() {
        const autoPauseCheckbox = document.getElementById('auto-pause');
        const musicEnabledCheckbox = document.getElementById('music-enabled');
        const musicShuffleCheckbox = document.getElementById('music-shuffle');
        const musicAutoNextCheckbox = document.getElementById('music-auto-next');
        const idleCameraCheckbox = document.getElementById('idle-camera');
        const idleFireflyCheckbox = document.getElementById('idle-firefly');
        const gameplayMusicSlider = document.getElementById('gameplay-music-volume');
        const idleMusicSlider = document.getElementById('idle-music-volume');
        
        const gameplayMusicValue = document.getElementById('gameplay-music-value');
        const idleMusicValue = document.getElementById('idle-music-value');
        
        if (!autoPauseCheckbox || !musicEnabledCheckbox || !gameplayMusicSlider) return;
        
        const updateSettings = () => {
            const newSettings = {
                autoPauseOnFocusLost: autoPauseCheckbox.checked,
                idleCameraEnabled: idleCameraCheckbox.checked,
                idleFireflyEnabled: idleFireflyCheckbox.checked,
                musicEnabled: musicEnabledCheckbox.checked,
                musicShuffle: musicShuffleCheckbox.checked,
                musicAutoNext: musicAutoNextCheckbox.checked,
                musicVolumeGameplay: gameplayMusicSlider.value / 100,
                musicVolumeIdle: idleMusicSlider.value / 100
            };
            
            gameplayMusicValue.textContent = `${gameplayMusicSlider.value}%`;
            idleMusicValue.textContent = `${idleMusicSlider.value}%`;
            
            this.saveGameSettings(newSettings);
        };

        autoPauseCheckbox.addEventListener('change', updateSettings);
        musicEnabledCheckbox.addEventListener('change', updateSettings);
        musicShuffleCheckbox.addEventListener('change', updateSettings);
        musicAutoNextCheckbox.addEventListener('change', updateSettings);
        idleCameraCheckbox.addEventListener('change', updateSettings);
        idleFireflyCheckbox.addEventListener('change', updateSettings);

        gameplayMusicSlider.addEventListener('input', updateSettings);
        idleMusicSlider.addEventListener('input', updateSettings);

        const currentSettings = this.getGameSettings();
        this.applyGameSettings(currentSettings);
    }
    
    bindAudioSliders() {
        const settings = this.getAudioSettings();
        
        const masterSlider = document.getElementById('master-volume');
        const musicSlider = document.getElementById('music-volume');
        const sfxSlider = document.getElementById('sfx-volume');
        
        const masterValue = document.getElementById('master-volume-value');
        const musicValue = document.getElementById('music-volume-value');
        const sfxValue = document.getElementById('sfx-volume-value');
        
        if (!masterSlider || !musicSlider || !sfxSlider) return;
        
        const updateSettings = () => {
            const newSettings = {
                master: masterSlider.value / 100,
                music: musicSlider.value / 100,
                sfx: sfxSlider.value / 100
            };
            
            masterValue.textContent = `${masterSlider.value}%`;
            musicValue.textContent = `${musicSlider.value}%`;
            sfxValue.textContent = `${sfxSlider.value}%`;
            
            this.saveAudioSettings(newSettings);
        };
        
        masterSlider.addEventListener('input', updateSettings);
        musicSlider.addEventListener('input', updateSettings);
        sfxSlider.addEventListener('input', updateSettings);

        this.applyAudioSettings(settings);
    }
}

window.MenuSystem = MenuSystem;
