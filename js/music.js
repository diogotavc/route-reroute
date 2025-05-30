import {
    MUSIC_ENABLED,
    MUSIC_FOLDER,
    MUSIC_SHUFFLE,
    MUSIC_AUTO_NEXT,
    MUSIC_UI_SHOW_DURATION,
    MUSIC_VOLUME_GAMEPLAY,
    MUSIC_VOLUME_IDLE,
    MUSIC_VOLUME_TRANSITION_DURATION
} from './config.js';

let audioContext = null;
let gainNode = null;
let currentAudio = null;
let currentTrackIndex = 0;
let playlist = [];
let isPlaying = false;
let isInitialized = false;
let isMuted = false;
let isIdleMode = false;

let musicUI = null;
let uiTimeout = null;

const STATIC_PLAYLIST = [
    'An Old Bassman.mp3',
    'Be At Home.mp3',
    'Hypnosis.mp3'
];

export async function initMusicSystem() {
    if (!MUSIC_ENABLED || isInitialized) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.gain.value = MUSIC_VOLUME_GAMEPLAY; // Start with gameplay volume
        gainNode.connect(audioContext.destination);

        await initializePlaylist();

        if (playlist.length === 0) {
            console.log('No music files found - music system disabled');
            return;
        }

        createMusicUI();
        isInitialized = true;

        const enableAudio = () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            if (playlist.length > 0 && !isPlaying) {
                playCurrentTrack();
            }
        };
        
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        console.log('Music system initialized with', playlist.length, 'tracks');
        
    } catch (error) {
        console.warn('Failed to initialize music system:', error);
    }
}

async function initializePlaylist() {
    try {
        const availableFiles = [];

        for (const filename of STATIC_PLAYLIST) {
            try {
                const response = await fetch(MUSIC_FOLDER + filename, { method: 'HEAD' });
                if (response.ok) {
                    availableFiles.push(filename);
                    console.log(`Found music file: ${filename}`);
                }
            } catch (error) {
                // File doesn't exist, skip silently
            }
        }

        playlist = availableFiles;

        if (playlist.length === 0) {
            console.warn('No music files found in static playlist');
            return;
        }

        console.log(`Music system initialized with ${playlist.length} tracks`);

        if (MUSIC_SHUFFLE && playlist.length > 0) {
            shufflePlaylist();
        }
        
        currentTrackIndex = 0;
    } catch (error) {
        console.warn('Failed to initialize playlist:', error);
        playlist = [];
    }
}

function shufflePlaylist() {
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
}

function createMusicUI() {
    musicUI = document.getElementById('music-ui');
    if (!musicUI) {
        console.warn('Music UI element not found in HTML');
        return;
    }

    document.getElementById('music-prev').addEventListener('click', previousTrack);
    document.getElementById('music-play-pause').addEventListener('click', togglePlayPause);
    document.getElementById('music-next').addEventListener('click', nextTrack);
    document.getElementById('music-mute').addEventListener('click', toggleMute);

    hideMusicUI();
}

function showMusicUI() {
    if (!musicUI) return;

    musicUI.classList.add('visible');

    if (uiTimeout) {
        clearTimeout(uiTimeout);
    }

    uiTimeout = setTimeout(() => {
        hideMusicUI();
    }, MUSIC_UI_SHOW_DURATION * 1000);
}

function hideMusicUI() {
    if (!musicUI) return;
    musicUI.classList.remove('visible');
}

function updateMusicUI() {
    if (!musicUI || !currentAudio) return;

    const title = getCurrentTrackName();
    const currentTime = currentAudio.currentTime || 0;
    const duration = currentAudio.duration || 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    musicUI.querySelector('.music-title').textContent = title;

    const playPauseBtn = document.getElementById('music-play-pause');
    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';

    const muteBtn = document.getElementById('music-mute');
    muteBtn.textContent = isMuted ? '🔇' : '🔊';

    const progressFill = musicUI.querySelector('.progress-fill');
    progressFill.style.width = `${progress}%`;

    musicUI.querySelector('.current-time').textContent = formatTime(currentTime);
    musicUI.querySelector('.total-time').textContent = formatTime(duration);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getCurrentTrackName() {
    if (playlist.length === 0) return 'No Track';
    const filename = playlist[currentTrackIndex];
    return filename.replace(/\.(mp3|wav|ogg)$/i, '').replace(/_/g, ' ');
}

async function playCurrentTrack() {
    if (!isInitialized || playlist.length === 0) return;
    
    try {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        
        const trackPath = MUSIC_FOLDER + playlist[currentTrackIndex];
        console.log('Loading track:', trackPath);
        
        currentAudio = new Audio(trackPath);
        currentAudio.volume = 1.0;
        currentAudio.crossOrigin = 'anonymous';

        const source = audioContext.createMediaElementSource(currentAudio);
        source.connect(gainNode);

        currentAudio.addEventListener('loadedmetadata', () => {
            updateMusicUI();
            showMusicUI();
        });

        currentAudio.addEventListener('timeupdate', updateMusicUI);
        
        currentAudio.addEventListener('ended', () => {
            if (MUSIC_AUTO_NEXT) {
                nextTrack();
            } else {
                isPlaying = false;
                updateMusicUI();
            }
        });

        currentAudio.addEventListener('error', (e) => {
            console.warn('Failed to load track:', trackPath, e);
            if (MUSIC_AUTO_NEXT && playlist.length > 1) {
                nextTrack();
            } else {
                isPlaying = false;
                updateMusicUI();
            }
        });

        await currentAudio.play();
        isPlaying = true;
        updateMusicUI();
        showMusicUI();
        
    } catch (error) {
        console.warn('Failed to play track:', error);
        if (MUSIC_AUTO_NEXT && playlist.length > 1) {
            nextTrack();
        } else {
            isPlaying = false;
            updateMusicUI();
        }
    }
}

export function nextTrack() {
    if (playlist.length === 0) return;

    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;

    if (currentTrackIndex === 0 && MUSIC_SHUFFLE) {
        shufflePlaylist();
    }

    playCurrentTrack();
}

export function previousTrack() {
    if (playlist.length === 0) return;

    currentTrackIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    playCurrentTrack();
}

export function togglePlayPause() {
    if (!currentAudio) {
        playCurrentTrack();
        return;
    }
    
    if (isPlaying) {
        currentAudio.pause();
        isPlaying = false;
    } else {
        currentAudio.play();
        isPlaying = true;
    }

    updateMusicUI();
    showMusicUI();
}

export function toggleMute() {
    isMuted = !isMuted;
    if (gainNode) {
        const targetVolume = isIdleMode ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY;
        gainNode.gain.value = isMuted ? 0 : targetVolume;
    }
    updateMusicUI();
    showMusicUI();
}

export function setVolume(volume) {
    const targetVolume = isIdleMode ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY;
    if (gainNode && !isMuted) {
        gainNode.gain.value = targetVolume;
    }
}

export function setIdleMode(enabled) {
    if (!isInitialized || isIdleMode === enabled) return;

    isIdleMode = enabled;

    if (!gainNode) return;

    const targetVolume = enabled ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY;

    const startVolume = gainNode.gain.value;
    const startTime = audioContext.currentTime;
    const duration = MUSIC_VOLUME_TRANSITION_DURATION;

    gainNode.gain.setValueAtTime(startVolume, startTime);
    gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + duration);
    
    console.log('Music idle mode:', enabled ? 'enabled (louder)' : 'disabled (quieter)');
}

export function getMusicInfo() {
    return {
        isPlaying,
        currentTrack: getCurrentTrackName(),
        currentTime: currentAudio ? currentAudio.currentTime : 0,
        duration: currentAudio ? currentAudio.duration : 0,
        trackIndex: currentTrackIndex,
        playlistLength: playlist.length,
        volume: isIdleMode ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY,
        isMuted,
        isIdleMode
    };
}

document.addEventListener('keydown', (event) => {
    if (!isInitialized) return;

    if (event.ctrlKey || event.altKey || event.shiftKey) return;

    switch (event.key.toLowerCase()) {
        case 'm':
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                toggleMute();
            }
            break;
        case '[':
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                previousTrack();
            }
            break;
        case ']':
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                nextTrack();
            }
            break;
    }
});

document.addEventListener('keydown', (event) => {
    if (['m', ',', '.'].includes(event.key.toLowerCase())) {
        showMusicUI();
    }
});
