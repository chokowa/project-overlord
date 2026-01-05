/**
 * @fileoverview オーディオ管理マネージャー
 * Web Audio APIを使用してSE/BGMを再生する。
 * ファイルが存在しないキーはエラーを出さずに無視する安全設計。
 */

export class AudioManager {
    /**
     * @fileoverview オーディオ管理マネージャー
     * Web Audio APIを使用してSE/BGMを再生する。
     * ファイルが存在しないキーはエラーを出さずに無視する安全設計。
     */

    export class AudioManager {
        constructor() {
            // クロスブラウザ対応
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.buffers = {};
            this.sources = {}; // 再生中のSourceNode管理

            this.isMuted = false;    // 全体ミュート（今回は主にSE用として使用）
            this.isBgmMuted = false; // BGM専用ミュートフラグ

            // 音量設定 (0.0 ~ 1.0)
            this.masterVolume = 0.5;
            this.seVolume = 0.8;
            this.bgmVolume = 0.15; // 指定により15%

            this.currentBgmKey = null; // 現在再生中のBGMキー

            // アセット定義
            this.assetPaths = {
                'SHOOT': 'assets/sounds/SHOOT.wav',
                'CLICK': 'assets/sounds/CLICK.wav',

                // BGM
                'BGM_EARLY': 'assets/sounds/Dance_With_Powder.mp3', // Wave 1-7
                'BGM_LATE': 'assets/sounds/THUNDER_STORM.mp3',     // Wave 8+

                // Placeholder for future sounds
                'HIT': '', 
                'EXPLOSION': '',
                'SHIELD': '',
                'LEVELUP': '',
                'WARNING': ''
            };
        }

        /**
         * 定義された音声をプリロードする
         */
        async load() {
            const promises = Object.entries(this.assetPaths).map(async ([key, path]) => {
                if (!path) return;

                try {
                    const response = await fetch(path);
                    if (!response.ok) {
                        console.warn(`[AudioManager] Sound file not found: ${path}`);
                        return;
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                    this.buffers[key] = audioBuffer;
                } catch (e) {
                    console.warn(`[AudioManager] Failed to load sound: ${key}`, e);
                }
            });

            await Promise.all(promises);
            console.log("[AudioManager] Sounds loaded.");
        }

        /**
         * SE（効果音）を再生する
         * @param {string} key 
         */
        play(key) {
            if (this.isMuted) return;
            this._playSound(key, false);
        }

        /**
         * BGMを再生する（排他制御付き：前のBGMは止まる）
         * @param {string} key 
         */
        playBgm(key) {
            if (this.isBgmMuted) {
                this.currentBgmKey = key; // ミュート解除時に再生するため記憶しておく
                return;
            }

            // 既に同じ曲が流れているなら何もしない
            if (this.currentBgmKey === key && this.sources[key]) return;

            // 前の曲を止める
            this.stopBgm();

            this.currentBgmKey = key;
            this._playSound(key, true);
        }

        /**
         * 現在のBGMを停止する
         */
        stopBgm() {
            if (this.currentBgmKey && this.sources[this.currentBgmKey]) {
                try {
                    this.sources[this.currentBgmKey].stop();
                } catch(e) { /* ignore if already stopped */ }
                delete this.sources[this.currentBgmKey];
            }
        }

        /**
         * BGMのON/OFFを切り替える
         * @returns {boolean} 現在のミュート状態 (true=Muted)
         */
        toggleBgm() {
            this.isBgmMuted = !this.isBgmMuted;

            if (this.isBgmMuted) {
                this.stopBgm();
            } else {
                // ミュート解除時、記憶していた曲があれば再生再開
                if (this.currentBgmKey) {
                    const resumeKey = this.currentBgmKey;
                    this.currentBgmKey = null; // Reset for playBgm check
                    this.playBgm(resumeKey);
                }
            }
            return this.isBgmMuted;
        }

        /**
         * 内部再生ロジック
         */
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
                 // SEのピッチランダム化（微小なバリエーション）
                 source.playbackRate.value = 0.98 + Math.random() * 0.04;
            }

            source.start(0);

            // 管理用リストに保存
            if (isLoop) {
                this.sources[key] = source;
            }
        }
    }

    export const audioManager = new AudioManager();

    /**
     * 定義された音声をプリロードする
     */
    async load() {
        const promises = Object.entries(this.assetPaths).map(async ([key, path]) => {
            if (!path) return; // パスがない場合はスキップ（無音）

            try {
                const response = await fetch(path);
                if (!response.ok) {
                    // 404などの場合もwarnだけで止まらないようにする
                    console.warn(`[AudioManager] Sound file not found: ${path}`);
                    return;
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers[key] = audioBuffer;
            } catch (e) {
                console.warn(`[AudioManager] Failed to load sound: ${key}`, e);
            }
        });

        await Promise.all(promises);
        console.log("[AudioManager] Sounds loaded.");
    }

    /**
     * 音声を再生する
     * @param {string} key - assetPathsで定義したキー
     * @param {boolean} isLoop - ループ再生するか (BGM用)
     */
    play(key, isLoop = false) {
        if (this.isMuted) return;
        if (!this.buffers[key]) return; // データがない場合は何もしない（無音）

        // ブラウザの自動再生ポリシー対策: ユーザー操作後に再開が必要
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.warn(e));
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[key];
        source.loop = isLoop;

        // GainNode (音量調整)
        const gainNode = this.ctx.createGain();
        const vol = isLoop ? this.bgmVolume : this.seVolume;
        gainNode.gain.value = vol * this.masterVolume;

        // 接続: Source -> Gain -> Destination
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // 再生位置のランダム化（SEの場合、マシンガン効果のために極わずかにピッチを変えるテクニックもあるが、今回はシンプルに）
        if (!isLoop) {
             // 少しピッチを揺らすと連射時の機械っぽさが出る（お好みで有効化）
             // source.playbackRate.value = 0.95 + Math.random() * 0.1;
        }

        source.start(0);

        if (isLoop) {
            // 既存のBGMがあれば止める
            if (this.sources[key]) this.sources[key].stop();
            this.sources[key] = source;
        }
    }

    stop(key) {
        if (this.sources[key]) {
            this.sources[key].stop();
            delete this.sources[key];
        }
    }
}

// シングルトンとしてエクスポート
export const audioManager = new AudioManager();