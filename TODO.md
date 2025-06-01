- [ ] SFX (UI, crashes, car engines, other fx)
- [ ] Selectable OST (lists files in the designated folder, and let's you toggle it)
- [ ] add more music
- [ ] add vehicle specific lights and sounds (i.e. ambulance)
- [ ] Add dialogs for each mission
- [ ] check for unused variables and bad imports
- [ ] make sure reset level exits idle camera first things first (else some things might look weird)
- [ ] hide UI during pause menu as well
- [ ] play a different level (track which levels the user has completed and let him play those on demand), add a credits option, as well as manual (and/or only controls)
- [ ] if the user has played more than a level, ask before first loading, if they want to play level 1, or whatever level they're on
- [ ] separate achievements by type
- [ ] add look back camera
- [ ] look over the configs before prod
- [ ] remove debug / check for console.*

### maybe?

- [?] Mouse interactions _(sort of quick time event, or steering control by clicking the map)_
- [?] fix t-bone achievement
- [?] add support for physics based objects (construction barrier, cone and light)
- [?] add support for non-physics based objects (trees and signs)
- [?] balance out achievements (wrecked and ruined can be 10 crashes, instead of 1; lawn enforcement can be for a few meters; terminal velocity can be for enough time)

### not planned anymore

- [-] ~~save system~~ (in favour of the "play a different level" system)
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