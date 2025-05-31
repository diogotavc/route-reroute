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
        this.showSubScreen('settings', 'SETTINGS', `
            <div style="text-align: center;">
                <div style="margin: 20px 0;">
                    <h3 style="color: #00ff88;">GRAPHICS QUALITY</h3>
                    <div class="menu-item" style="margin: 10px 0;">High Quality</div>
                    <div class="menu-item" style="margin: 10px 0;">Medium Quality</div>
                    <div class="menu-item" style="margin: 10px 0;">Low Quality</div>
                </div>

                <div style="margin: 20px 0;">
                    <h3 style="color: #00ff88;">AUDIO</h3>
                    <div class="menu-item" style="margin: 10px 0;">Master Volume: 100%</div>
                    <div class="menu-item" style="margin: 10px 0;">Music Volume: 80%</div>
                    <div class="menu-item" style="margin: 10px 0;">SFX Volume: 90%</div>
                </div>

                <p style="color: #888; margin-top: 30px;">Settings are automatically saved</p>
            </div>
        `);
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
}

window.MenuSystem = MenuSystem;
