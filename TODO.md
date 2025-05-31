- [ ] HUD
    - [x] speed
        - [x] move it to the right side, match Music UI styling
    - [ ] time
    - [x] health
    - [x] move achievements to the left side
- [ ] Menus (keyboard driven, but supporting mice)
- [ ] parameterizable controls
    - [ ] gamepad support
        - [ ] add steering and pedal gauges specific to the gamepad (analog support)
- [ ] turn config.js constants into variables that can be changed through the UI
- [ ] fix camera fricking out sometimes when switching between the browser and the IDE
- [-] streetlight and road/building layout are literally not built the same (matrixes are interpreted backwards)
- [ ] idle time counts if the user is paused

- [ ] SFX (UI, crashes, car engines, other fx)
- [ ] Selectable OST (lists files in the designated folder, and let's you toggle it)
- [ ] add more music
- [ ] avoid playing the same song (if playlist > 1) next
- [ ] pause music in the pause menu
- [ ] if the user exits idle while the music is transitioning gain (entering idle), the gain at the end is wrong

- [ ] add vehicle specific lights and sounds (i.e. ambulance)
- [ ] add vehicle specific stats (acceleration, braking, lateral grip)
- [ ] balance out achievements (wrecked and ruined can be 10 crashes, instead of 1; lawn enforcement can be for a few meters; terminal velocity can be for enough time)
- [ ] reset certain achievements on level reset
- [ ] save system
- [ ] make sure rewind resets health

- [ ] add power-ups and special effects (same implementation, but one shows up at a certain mission index (place and index configurable), and can be picked up - and the other is applied instantly after the mission begins)
    - [ ] Sleepiness
    - [-] ~~DUI~~ (maybe we'll keep just sleepiness)
    - [ ] Turbo
    - [ ] Stuck Gas Pedal
    - [ ] Become a ghost (street lights and cars)
    - [ ] Grass doesn't cause slow downs
    - [ ] Very sharp steering
    - [ ] Slow down time for everyone else
    - [ ] No brake pedal
    - [ ] etc etc etc
- [ ] Add dialogs for each mission

- [ ] add support for physics based objects (construction barrier, cone and light)
- [ ] add support for non-physics based objects (trees and signs)

- [ ] check what getCarSpeed is doing there

- [?] Mouse interactions _(sort of quick time event, or steering control by clicking the map)_
- [?] fix t-bone achievement

- [-] ~~fix first person headlight issue~~
- [-] ~~firefly should flicker more often, not just at the beginning~~

- [x] Music
- [x] start counting idle time only when car is stationary
- [x] check if banner background image exists. if it exists, wait for it to load before showing banner
- [x] fix first person idle camera issue (hidden car model)