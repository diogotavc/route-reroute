import {
    MUSIC_ENABLED,
    MUSIC_FOLDER,
    MUSIC_SHUFFLE,
    MUSIC_AUTO_NEXT,
    MUSIC_UI_SHOW_DURATION,
    MUSIC_VOLUME_GAMEPLAY,
    MUSIC_VOLUME_IDLE,
    MUSIC_VOLUME_TRANSITION_ENTER_IDLE,
    MUSIC_VOLUME_TRANSITION_EXIT_IDLE
} from './config.js';

import { onManualTrackSkip } from './achievements.js';

let audioContext = null;
let gainNode = null;
let currentAudio = null;
let currentTrackIndex = 0;
let isPlaying = false;
let isIdleMode = false;
let musicUI = null;
let uiTimeout = null;

const PLAYLIST = [
    'An Old Bassman (Gran Turismo 4).mp3',
    'Light Velocity Ver. II (Gran Turismo 4).mp3',
    'Hypnosis (Gran Turismo 4).mp3',
    'The Motorious Zone (Gran Turismo 4).mp3',
    'Concentration (Gran Turismo 3 A-Spec).mp3',
    'Light Velocity (Gran Turismo 3 A-Spec).mp3'
];

export function initMusicSystem() {
    if (!MUSIC_ENABLED) return;

    // Don't create AudioContext immediately - wait for user interaction
    // This is required for Chromium-based browsers due to autoplay policies
    
    if (MUSIC_SHUFFLE) shuffleArray(PLAYLIST);
    
    musicUI = document.getElementById('music-ui');
    if (musicUI) {
        updateMusicUI();
    }
}

let progressInterval = null;

function startProgressUpdates() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(updateMusicUI, 1000);
}

function stopProgressUpdates() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.gain.value = MUSIC_VOLUME_GAMEPLAY;
            gainNode.connect(audioContext.destination);
        } catch (error) {
            console.warn('Failed to create AudioContext:', error);
            return false;
        }
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch((error) => {
            console.warn('Failed to resume AudioContext:', error);
        });
    }
    
    return true;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
    if (!musicUI) return;

    const title = currentAudio ? getCurrentTrackName() : 'No Track Loaded';
    const currentTime = currentAudio ? currentAudio.currentTime || 0 : 0;
    const duration = currentAudio ? currentAudio.duration || 0 : 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    musicUI.querySelector('.music-title').textContent = title;

    const progressFill = musicUI.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    const currentTimeEl = musicUI.querySelector('.current-time');
    const totalTimeEl = musicUI.querySelector('.total-time');
    if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
    if (totalTimeEl) totalTimeEl.textContent = formatTime(duration);

    musicUI.classList.remove('playing', 'paused');
    if (isPlaying) {
        musicUI.classList.add('playing');
    } else {
        musicUI.classList.add('paused');
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getCurrentTrackName() {
    const filename = PLAYLIST[currentTrackIndex] || 'No Track';
    return filename.replace(/\.(mp3|wav|ogg)$/i, '').replace(/_/g, ' ');
}

function playCurrentTrack() {
    if (currentAudio) {
        currentAudio.pause();
    }

    const audioContextReady = initAudioContext();
    
    currentAudio = new Audio(MUSIC_FOLDER + PLAYLIST[currentTrackIndex]);
    currentAudio.volume = 1.0;

    if (audioContextReady && audioContext && gainNode) {
        try {
            const source = audioContext.createMediaElementSource(currentAudio);
            source.connect(gainNode);
        } catch (error) {
            console.warn('Failed to connect audio to AudioContext:', error);
        }
    }

    currentAudio.addEventListener('ended', () => {
        if (MUSIC_AUTO_NEXT) nextTrack();
    });

    currentAudio.addEventListener('error', (error) => {
        console.warn('Audio error:', error);
        if (MUSIC_AUTO_NEXT) nextTrack();
    });

    currentAudio.addEventListener('play', () => {
        isPlaying = true;
        updateMusicUI();
        startProgressUpdates();
    });

    currentAudio.addEventListener('pause', () => {
        isPlaying = false;
        updateMusicUI();
        stopProgressUpdates();
    });

    currentAudio.play().catch((error) => {
        console.warn('Failed to play music:', error);
    });
    updateMusicUI();
    showMusicUI();
}

export function startMusic() {
    if (!MUSIC_ENABLED || !PLAYLIST.length) return;

    initAudioContext();

    if (!isPlaying || !currentAudio) {
        playCurrentTrack();
    }
}

export function ensureMusicReady() {
    if (!MUSIC_ENABLED) return;

    if (hasUserInteracted) {
        initAudioContext();
    }
}

export function nextTrack() {
    onManualTrackSkip();

    if (PLAYLIST.length > 1 && MUSIC_SHUFFLE) {
        const previousTrack = PLAYLIST[currentTrackIndex];
        currentTrackIndex = (currentTrackIndex + 1) % PLAYLIST.length;

        if (currentTrackIndex === 0) {
            shuffleArray(PLAYLIST);
            if (PLAYLIST[0] === previousTrack && PLAYLIST.length > 1) {
                const randomIndex = Math.floor(Math.random() * (PLAYLIST.length - 1)) + 1;
                [PLAYLIST[0], PLAYLIST[randomIndex]] = [PLAYLIST[randomIndex], PLAYLIST[0]];
            }
        }
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % PLAYLIST.length;
        if (currentTrackIndex === 0 && MUSIC_SHUFFLE) {
            shuffleArray(PLAYLIST);
        }
    }

    playCurrentTrack();
}

export function previousTrack() {
    onManualTrackSkip();
    currentTrackIndex = currentTrackIndex === 0 ? PLAYLIST.length - 1 : currentTrackIndex - 1;
    playCurrentTrack();
}

export function togglePlayPause() {
    if (!currentAudio) {
        playCurrentTrack();
        return;
    }

    initAudioContext();
    
    if (isPlaying) {
        currentAudio.pause();
        isPlaying = false;
    } else {
        currentAudio.play().catch((error) => {
            console.warn('Failed to play music:', error);
        });
        isPlaying = true;
    }

    updateMusicUI();
    showMusicUI();
}

export function setVolume(volume) {
    const targetVolume = isIdleMode ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY;
    if (gainNode) {
        gainNode.gain.value = targetVolume;
    }
}

export function setIdleMode(enabled) {
    isIdleMode = enabled;

    if (!gainNode) return;
    if (!musicUI) return;

    const targetVolume = enabled ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY;

    gainNode.gain.cancelScheduledValues(audioContext.currentTime);
    
    const startVolume = gainNode.gain.value;
    const startTime = audioContext.currentTime;
    const duration = enabled ? MUSIC_VOLUME_TRANSITION_ENTER_IDLE : MUSIC_VOLUME_TRANSITION_EXIT_IDLE;

    gainNode.gain.setValueAtTime(startVolume, startTime);
    gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + duration);

    if (enabled) {
        musicUI.classList.remove('exiting');
        musicUI.classList.add('idle-mode');

        setTimeout(() => {
            if (isIdleMode && musicUI.classList.contains('idle-mode')) {
                musicUI.classList.add('animated');
            }
        }, 3000);
    } else {
        musicUI.classList.remove('animated');
        musicUI.classList.add('exiting');

        setTimeout(() => {
            musicUI.classList.remove('idle-mode', 'exiting');
        }, 500);
    }

    updateMusicUI();
}

export function getMusicInfo() {
    return {
        isPlaying,
        currentTrack: getCurrentTrackName(),
        currentTime: currentAudio ? currentAudio.currentTime : 0,
        duration: currentAudio ? currentAudio.duration : 0,
        trackIndex: currentTrackIndex,
        playlistLength: PLAYLIST.length,
        volume: isIdleMode ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY,
        isIdleMode
    };
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.shiftKey) return;

    switch (event.key.toLowerCase()) {
        case 'm':
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                togglePlayPause();
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
        case ' ':
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                togglePlayPause();
            }
            break;
    }
});

document.addEventListener('keydown', (event) => {
    if (['m', '[', ']', ' '].includes(event.key.toLowerCase())) {
        showMusicUI();
    }
});

let hasUserInteracted = false;

function handleFirstInteraction() {
    if (!hasUserInteracted && MUSIC_ENABLED) {
        hasUserInteracted = true;

        const audioContextReady = initAudioContext();

        if (audioContextReady) {
            console.log('Music system ready - AudioContext initialized');
        }

        if (MUSIC_AUTO_NEXT && !currentAudio && !isPlaying) {
            setTimeout(() => {
                startMusic();
            }, 1000);
        }
        
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
    }
}

document.addEventListener('click', handleFirstInteraction);
document.addEventListener('keydown', handleFirstInteraction);
document.addEventListener('touchstart', handleFirstInteraction);
