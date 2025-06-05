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
- **Modular tile system** for procedural map generation

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
- **Instance cloning** for performance optimization
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
- **Follow camera** with smooth lerping
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

### Artificial Lighting
- **Car headlights**: Automatic spot lights with shadow casting
- **Street lights**: Grid-based placement with time-controlled activation
- **Configurable intensities** and shadow map resolutions

### Advanced Features
- **Shadow mapping** with PCF filtering
- **Graphics quality presets** (Potato, Low, Medium, High)
- **Resolution scaling** for performance optimization
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
- **Modular ES6 structure** with clear separation of concerns
- **Configuration-driven** gameplay parameters
- **Event-driven** achievement system
- **Local storage** for progress persistence

### Key Systems
```
├── Core (main.js) - Game loop and coordination
├── Cars (cars.js) - Vehicle management and physics
├── Physics (carPhysics.js) - Collision and movement
├── Graphics (graphics.js) - Quality settings and optimization
├── Audio (music.js) - Playlist and Web Audio API
├── Achievements (achievements.js) - Progress tracking
├── Interface (interface.js) - UI components and menus
└── Maps (mapLoader.js) - Scene generation and asset loading
```

### Performance Optimizations
- **Frustum culling** for off-screen objects
- **Instance management** reducing draw calls
- **Configurable quality settings** scaling with hardware
- **Efficient collision detection** using spatial optimization

---

## Conclusions

### Technical Achievements
- **Complete 3D game engine** built on Three.js foundation
- **Complex state management** with time manipulation
- **Scalable architecture** supporting multiple levels and modes
- **Cross-browser compatibility** with graceful degradation

### Learning Outcomes
- **WebGL pipeline** understanding through Three.js
- **Game physics** implementation and optimization
- **User experience design** for complex interactive systems
- **Performance optimization** techniques for web applications

### Future Enhancements
- **Multiplayer support** using WebRTC
- **Procedural level generation**
- **Advanced particle systems**
- **Mobile touch controls**

---

## References

- **Three.js Documentation** - 3D rendering engine
- **Kenney Asset Packs** - 3D models and textures
- **Web Audio API** - Music system implementation
- **CSS Animations** - UI transitions and effects
- **LocalStorage API** - Progress persistence
- **GLTF Format Specification** - 3D model loading