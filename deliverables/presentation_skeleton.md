# Route Reroute - 3D Driving Game
*A WebGL-based urban navigation game with time manipulation mechanics*

---

## Main Ideas

### Core Concept
- **3D driving simulation** where players complete sequential missions
- **Time rewind mechanics** - record and replay previous car movements
- **Progressive difficulty** across 4 levels with unique physics per vehicle
- **Achievement system** tracking player performance and exploration

### Key Features
- Real-time physics simulation with collision detection
- Dynamic day/night cycle affecting gameplay
- Sandbox mode for free exploration
- Comprehensive music system with playlist management

---

## Models and Scene Graph

### Asset Architecture
- **GLTF models** from Kenney asset packs (cars, buildings, roads)
- **Hierarchical scene graph**: Map Group → Tiles → Objects → Lights
- **Modular tile system** for declarative map construction

### Scene Organization
```
Scene
├── Map Group
│   ├── Road Tiles (straight, bend, intersection, crossroad)
│   ├── Buildings (residential, commercial)
│   ├── Random Objects (trees, barriers, cones)
│   └── Street Lights (curved, square)
├── Car Models (20 different vehicles)
├── Lighting System
└── UI Overlays
```

### Model Management
- **Instance cloning** for performance optimisation
- **Bounding box calculation** for collision detection
- **LOD system** based on graphics settings

---

## Animation

### Physics-Based Movement
- **Car dynamics**: acceleration, braking, steering with realistic friction
- **Collision response** using Separating Axis Theorem (SAT)
- **Terrain adaptation** (grass speed reduction, height adjustment)

### Time Manipulation
- **Movement recording** at 60fps with position/rotation/time data
- **Smooth interpolation** during rewind using configurable easing functions
- **Multi-car replay** system for complex traffic scenarios

### Camera System
- **Follow camera** with smooth movement transitions
- **Idle showcase mode** with cinematic orbital animations
- **Firefly companion** with physics-based movement during idle

### Visual Effects
- **Day/night transitions** with color interpolation
- **Achievement notifications** with slide animations
- **UI state transitions** with CSS transforms

---

## Illumination

### Dynamic Lighting System
- **Directional sun light** following realistic solar path
- **Ambient lighting** varying by time of day (dawn, day, dusk, night)
- **Color temperature shifts** from blue night to warm day

### Light Types Implementation
- **DirectionalLight**: Main sun/moon light source with dynamic positioning and shadow casting
- **AmbientLight**: Base ambient lighting to prevent complete darkness in scenes  
- **SpotLight**: Used for both car headlights (dynamic) and streetlights (static) with cone-shaped illumination
- **PointLight**: Firefly camera effects and small decorative lighting elements

### Artificial Lighting
- **Car headlights**: Dynamic SpotLights with automatic day/night activation
- **Street lights**: Grid-based SpotLight placement with time-controlled activation
- **Firefly effects**: PointLight companions during idle camera mode
- **Configurable intensities** and shadow map resolutions per graphics preset

### Advanced Features
- **Shadow mapping** with PCF filtering
- **Graphics quality presets** (Potato, Low, Medium, High)
- **Resolution scaling** for performance optimisation
- **Fog system** creating depth and atmosphere

---

## User Interaction

### Control Systems
- **WASD/Arrow keys** for vehicle movement
- **Camera switching** (first-person/third-person)
- **Time rewind** (R key) with visual feedback
- **Music controls** (M, [, ]) integrated with achievement system

### Interface Design
- **Pause menu** with keyboard/mouse navigation
- **Achievement notifications** with banner images
- **HUD elements**: speedometer, health bar, timer, level indicator
- **Progressive disclosure** hiding complexity until needed

### Accessibility
- **Keyboard-only navigation** throughout all menus
- **Visual feedback** for all interactions
- **Configurable graphics settings** for various hardware

---

## Development

### Architecture
- **Highly modular JavaScript structure** with dedicated files for distinct responsibilities
  - **Physics simulation** (`carPhysics.js`) - collision detection, movement calculations
  - **Vehicle management** (`cars.js`) - car loading, headlights, health, reactions
  - **3D rendering** (`graphics.js`) - quality presets, shadow settings, optimisation
  - **Audio system** (`music.js`) - playlist management, Web Audio API integration  
  - **User interface** (`interface.js`) - menus, HUD, notifications, overlays
  - **Achievement tracking** (`achievements.js`) - progress monitoring, unlock logic
  - **Lighting system** (`lights.js`) - day/night cycle, street lights, headlight control
  - **Map generation** (`mapLoader.js`) - map layout creation, tile placement, scene construction
  - **Camera control** (`camera.js`) - follow modes, idle animations, firefly effects
  - **Game configuration** (`config.js`) - centralized parameter management
- **Configuration-driven** gameplay with all parameters externalised
- **Event-driven** achievement system with decoupled communication
- **Local storage** persistence for progress and settings

### Detailed System Architecture
- **Separation of Concerns**: Physics, rendering, and game logic organized into distinct modules
- **Observer Pattern**: Achievement system listens to game events without tight coupling
- **State Management**: Centralized game state with controlled mutations
- **Asset Pipeline**: Lazy loading and caching for optimal performance

### Key Systems
```
├── Core (main.js) - Game loop and coordination
├── Cars (cars.js) - Vehicle management and state tracking  
├── Physics (carPhysics.js) - Collision detection and movement
├── Graphics (graphics.js) - Quality settings and rendering optimisation
├── Audio (music.js) - Playlist management and Web Audio API
├── Achievements (achievements.js) - Progress tracking and notifications
├── Interface (interface.js) - UI components, menus, and overlays
├── Lights (lights.js) - Day/night cycle and lighting control
├── Camera (camera.js) - Follow modes and cinematic effects
├── Maps (mapLoader.js) - Map layout creation and tile placement
└── Config (config.js) - Centralized parameter management
```

### Dedicated File Organization Benefits
- **Clear responsibility boundaries** - each file handles a specific domain
- **Independent development** - team members can work on different systems
- **Easier debugging** - issues can be isolated to specific modules
- **Reusable components** - systems can be extracted for other projects
- **Maintainable codebase** - changes are localized and predictable

### Module Interactions
- **main.js**: Central game loop orchestrating all subsystems
- **Event Bus**: Decoupled communication between modules
- **Shared State**: Global configuration accessible across systems
- **Error Handling**: Graceful degradation when modules fail
- **Hot Swapping**: Dynamic loading of maps and assets

### Performance Optimisations
- **Frustum culling** for off-screen objects
- **Instance management** reducing draw calls
- **Configurable quality settings** scaling with hardware
- **Efficient collision detection** using spatial optimisation

---

## Conclusions

### Technical Achievements
- **Complete 3D game engine** built on Three.js foundation
- **Complex state management** with time manipulation
- **Scalable architecture** supporting multiple levels and modes
- **Cross-browser compatibility** with graceful degradation

### Learning Outcomes
- **WebGL pipeline** understanding through Three.js
- **Game physics** implementation and optimisation
- **User experience design** for complex interactive systems
- **Performance optimisation** techniques for web applications

### Future Enhancements
- **Multiplayer support** using WebRTC
- **Procedural level generation**
- **Advanced particle systems**
- **Mobile touch controls**
- **Godot Engine port** - Complete reimplementation in Godot for enhanced performance and native compilation

---

## References

- **Three.js Documentation** - 3D rendering engine
- **Kenney Asset Packs** - 3D models and textures
- **Web Audio API** - Music system implementation
- **CSS Animations** - UI transitions and effects
- **LocalStorage API** - Progress persistence
- **GLTF Format Specification** - 3D model loading
- **Stack Overflow** - Community solutions for specific implementation challenges