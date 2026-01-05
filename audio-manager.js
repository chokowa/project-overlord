/**
 * Audio Manager Module
 * Handles SE and BGM playback using Web Audio API.
 */

export class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        this.buffers = {};
        this.sources = {}; 
        
        this.isMuted = false;
        this.isBgmMuted = false;
        
        this.masterVolume = 0.5;
        this.seVolume = 0.8;
        this.bgmVolume = 0.03;

        this.currentBgmKey = null;

        this.assetPaths = {
            'SHOOT': 'assets/sounds/SHOOT.wav',
            'CLICK': 'assets/sounds/CLICK.wav',
            'BGM_EARLY': 'assets/sounds/Dance_With_Powder.mp3',
            'BGM_LATE': 'assets/sounds/THUNDER_STORM.mp3',
            'HIT': '', 
            'EXPLOSION': '',
            'SHIELD': '',
            'LEVELUP': '',
            'WARNING': ''
        };
    }

    async load() {
        const promises = Object.entries(this.assetPaths).map(async ([key, path]) => {
            if (!path) return;
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    console.warn(`[AudioManager] Sound not found: ${path}`);
                    return;
                }
                const arrayBuffer = await response.arrayBuffer();
                // 成功時のみバッファを格納
                const decodedData = await this.ctx.decodeAudioData(arrayBuffer).catch(err => {
                    console.warn(`[AudioManager] Decode error: ${key}`, err);
                    return null;
                });
                if (decodedData) this.buffers[key] = decodedData;
            } catch (e) {
                console.warn(`[AudioManager] Fetch error: ${key}`, e);
            }
        });
        await Promise.all(promises);
        console.log("[AudioManager] Loaded.");
    }

    play(key) {
        if (this.isMuted) return;
        this._playSound(key, false);
    }

    playBgm(key) {
        if (this.isBgmMuted) {
            this.currentBgmKey = key;
            return;
        }
        if (this.currentBgmKey === key && this.sources[key]) return;
        this.stopBgm();
        this.currentBgmKey = key;
        this._playSound(key, true);
    }

    stopBgm() {
        if (this.currentBgmKey && this.sources[this.currentBgmKey]) {
            try {
                this.sources[this.currentBgmKey].stop();
            } catch(e) {}
            delete this.sources[this.currentBgmKey];
        }
    }

    toggleBgm() {
        this.isBgmMuted = !this.isBgmMuted;
        if (this.isBgmMuted) {
            this.stopBgm();
        } else {
            if (this.currentBgmKey) {
                const resumeKey = this.currentBgmKey;
                this.currentBgmKey = null;
                this.playBgm(resumeKey);
            }
        }
        return this.isBgmMuted;
    }

    _playSound(key, isLoop) {
        if (!this.buffers[key]) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.warn(e));
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[key];
        source.loop = isLoop;

        const gainNode = this.ctx.createGain();
        const vol = isLoop ? this.bgmVolume : this.seVolume;
        gainNode.gain.value = vol * this.masterVolume;

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        if (!isLoop) {
             source.playbackRate.value = 0.98 + Math.random() * 0.04;
        }

        source.start(0);

        if (isLoop) {
            this.sources[key] = source;
        }
    }
}

export const audioManager = new AudioManager();