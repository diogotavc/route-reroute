# Music Folder

This folder should contain background music files for the game.

## Supported Formats
- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)

## Recommended Track Names
The music system will automatically format track names by:
- Removing file extensions
- Replacing underscores with spaces
- Capitalizing appropriately in the UI

## Example Files
Place your music files here with names like:
- ambient_city_1.mp3
- ambient_city_2.mp3
- chill_drive_1.mp3
- chill_drive_2.mp3
- night_cruise_1.mp3
- night_cruise_2.mp3
- urban_atmosphere_1.mp3
- urban_atmosphere_2.mp3

## Configuration
Music system settings can be found in `js/config.js`:
- MUSIC_ENABLED: Enable/disable the music system
- MUSIC_VOLUME: Default volume level (0.0 - 1.0)
- MUSIC_SHUFFLE: Enable playlist shuffling
- MUSIC_AUTO_NEXT: Automatically play next track

## Controls
- M: Toggle mute
- [: Previous track
- ]: Next track
- Click on music UI controls for play/pause, etc.
