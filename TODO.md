### Fixes

- [x] initial level selection screen doesn't pause or dim/blur
- [x] level selection doesn't quit idle camera
- [ ] initial level selection doesn't hide UI elements

### Features still yet to be added

- [ ] add resolution scaler to config (performance is ass)
- [ ] SFX (UI, crashes, car engines, other fx)
- [ ] add vehicle specific lights and sounds (i.e. ambulance)
- [x] play a different level (track which levels the user has completed and let him play those on demand), add a credits option, as well as manual (and/or only controls)
- [x] if the user has played more than a level, ask before first loading, if they want to play level 1, or whatever level they're on

### Right before delivery

- [ ] check for unused variables and bad imports
- [ ] look over the configs before prod
- [ ] remove debug / check for console.*
- [ ] add more music

### maybe?

- [?] add look back camera
- [?] separate achievements by type
- [?] fix t-bone achievement
- [?] balance out achievements (wrecked and ruined can be 10 crashes, instead of 1; lawn enforcement can be for a few meters; terminal velocity can be for enough time)

---

### not planned anymore

- [-] ~~save system~~ (in favour of the "play a different level" system)
- [-] ~~Add dialogs for each mission~~ (too late)
- [-] ~~Selectable OST (lists files in the designated folder, and let's you toggle it)~~ (no time)
- [-] ~~add support for physics based objects (construction barrier, cone and light)~~ (too complex, too late)
- [-] ~~fix first person headlight issue~~
- [-] ~~firefly should flicker more often, not just at the beginning~~
- [-] ~~streetlight and road/building layout are literally not built the same (matrixes are interpreted backwards)~~
- [-] ~~idle time counts if the user is paused~~
- [-] ~~pause music in the pause menu~~
- [-] ~~Menus (keyboard driven, but supporting mice)~~
- [-] ~~parameterizable controls~~
    - [-] ~~gamepad support~~
        - [-] ~~add steering and pedal gauges specific to the gamepad (analog support)~~
- [-] ~~turn config.js constants into variables that can be changed through the UI~~
- [-] ~~add power-ups and special effects (same implementation, but one shows up at a certain mission index (place and index configurable), and can be picked up - and the other is applied instantly after the mission begins)~~
    - [ ] ~~Sleepiness~~
    - [-] ~~DUI~~
    - [ ] ~~Turbo~~
    - [ ] ~~Stuck Gas Pedal~~
    - [ ] ~~Become a ghost (street lights and cars)~~
    - [ ] ~~Grass doesn't cause slow downs~~
    - [ ] ~~Very sharp steering~~
    - [ ] ~~Slow down time for everyone else~~
    - [ ] ~~No brake pedal~~
    - [ ] ~~etc etc etc~~
- [-] ~~Mouse interactions~~ (there's mouse interaction in the pause menu idc)