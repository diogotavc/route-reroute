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
let isMuted = false;
let isIdleMode = false;
let musicUI = null;
let uiTimeout = null;

const PLAYLIST = [
    'An Old Bassman.mp3',
    'Be At Home.mp3',
    'Hypnosis.mp3'
];

export function initMusicSystem() {
    if (!MUSIC_ENABLED) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.gain.value = MUSIC_VOLUME_GAMEPLAY;
    gainNode.connect(audioContext.destination);

    if (MUSIC_SHUFFLE) shuffleArray(PLAYLIST);
    
    musicUI = document.getElementById('music-ui');
    if (musicUI) {
        document.getElementById('music-prev').addEventListener('click', previousTrack);
        document.getElementById('music-play-pause').addEventListener('click', togglePlayPause);
        document.getElementById('music-next').addEventListener('click', nextTrack);
        document.getElementById('music-mute').addEventListener('click', toggleMute);

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

    const playPauseBtn = document.getElementById('music-play-pause');
    if (playPauseBtn) {
        playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    }

    const muteBtn = document.getElementById('music-mute');
    if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    }

    const progressFill = musicUI.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    const currentTimeEl = musicUI.querySelector('.current-time');
    const totalTimeEl = musicUI.querySelector('.total-time');
    if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
    if (totalTimeEl) totalTimeEl.textContent = formatTime(duration);

    if (isIdleMode) {
        musicUI.classList.add('idle-mode');
    } else {
        musicUI.classList.remove('idle-mode');
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
    
    currentAudio = new Audio(MUSIC_FOLDER + PLAYLIST[currentTrackIndex]);
    currentAudio.volume = 1.0;

    if (audioContext) {
        const source = audioContext.createMediaElementSource(currentAudio);
        source.connect(gainNode);
    }

    currentAudio.addEventListener('ended', () => {
        if (MUSIC_AUTO_NEXT) nextTrack();
    });

    currentAudio.addEventListener('error', () => {
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

    currentAudio.play().catch(() => {});
    updateMusicUI();
    showMusicUI();
}

export function startMusic() {
    if (!MUSIC_ENABLED || !PLAYLIST.length) return;
    playCurrentTrack();
}

export function nextTrack() {
    onManualTrackSkip();
    currentTrackIndex = (currentTrackIndex + 1) % PLAYLIST.length;

    if (currentTrackIndex === 0 && MUSIC_SHUFFLE) {
        shuffleArray(PLAYLIST);
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
    isIdleMode = enabled;

    if (!gainNode) return;

    const targetVolume = enabled ? MUSIC_VOLUME_IDLE : MUSIC_VOLUME_GAMEPLAY;

    const startVolume = gainNode.gain.value;
    const startTime = audioContext.currentTime;
    const duration = enabled ? MUSIC_VOLUME_TRANSITION_ENTER_IDLE : MUSIC_VOLUME_TRANSITION_EXIT_IDLE;

    gainNode.gain.setValueAtTime(startVolume, startTime);
    gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + duration);

    updateMusicUI();
    
    console.log('Music idle mode:', enabled ? 'enabled (louder)' : 'disabled (quieter)');
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
        isMuted,
        isIdleMode
    };
}

document.addEventListener('keydown', (event) => {
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
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
    }
}

document.addEventListener('click', handleFirstInteraction);
document.addEventListener('keydown', handleFirstInteraction);
