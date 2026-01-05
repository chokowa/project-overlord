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
        this.sources = {}; // BGMなどのループ再生管理用
        this.isMuted = false;
        
        // 音量設定 (0.0 ~ 1.0)
        this.masterVolume = 0.5;
        this.seVolume = 0.8;
        this.bgmVolume = 0.6;

        // アセット定義: SHOOT以外は空文字にして読み込みをスキップさせる
        this.assetPaths = {
            'SHOOT': 'assets/sounds/SHOOT.wav',
            // 以下、素材ができたらパスを記入する
            'HIT': '', 
            'EXPLOSION': '',
            'SHIELD': '',
            'LEVELUP': '',
            'WARNING': '',
            'CLICK': 'assets/sounds/CLICK.wav',
            'BGM_BATTLE': ''
        };
    }

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