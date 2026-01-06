/**
 * @fileoverview 演出エフェクト定義 (FloatingText, ParticleEffect)
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 */

/** エフェクト用ローカル定数 */
const EFFECT_DEFAULTS = {
    TEXT_LIFE_DECAY: 0.02,
    PARTICLE_LIFE_DECAY: 0.05
};

/**
 * ダメージポップアップなどの浮遊テキスト (物理挙動版)
 */
export class FloatingText {
    /**
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {string} text - 表示テキスト
     * @param {string} color - 色コード
     * @param {number} fontSize - フォントサイズ
     */
    constructor(x, y, text, color, fontSize = 20) {
        this.positionX = x;
        this.positionY = y;
        this.text = text;
        this.color = color;
        this.fontSize = fontSize;
        this.life = 1.0;

        // 物理パラメータ: 左右にランダムに跳ね、上に飛び出す
        this.velocityX = (Math.random() - 0.5) * 6;
        this.velocityY = -Math.random() * 5 - 3;
        this.gravity = 0.25; // 下方向に引っ張る力
    }

    update() {
        this.positionX += this.velocityX;
        this.positionY += this.velocityY;
        this.velocityY += this.gravity; // 重力を加算

        this.life -= EFFECT_DEFAULTS.TEXT_LIFE_DECAY;
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        if (this.life <= 0) return;
        context.save();
        context.globalAlpha = Math.max(0, this.life);
        context.fillStyle = this.color;
        context.font = `bold ${this.fontSize}px 'Segoe UI', sans-serif`;

        // 文字の縁取り（読みやすさ向上）
        context.strokeStyle = "#000";
        context.lineWidth = 3;
        context.textAlign = "center";
        context.strokeText(this.text, this.positionX, this.positionY);
        context.fillText(this.text, this.positionX, this.positionY);
        context.restore();
    }
}

/**
 * 汎用パーティクルエフェクト
 */
export class ParticleEffect {
    /**
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {string} color - 色コード
     * @param {number} speed - 拡散速度
     */
    constructor(x, y, color, speed = 8) {
        this.positionX = x;
        this.positionY = y;
        this.color = color;
        this.size = Math.random() * 5 + 3;

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.velocityX = Math.cos(angle) * velocity;
        this.velocityY = Math.sin(angle) * velocity;
        this.life = 1.0;
    }

    update() {
        this.positionX += this.velocityX;
        this.positionY += this.velocityY;
        this.life -= EFFECT_DEFAULTS.PARTICLE_LIFE_DECAY;
        this.size *= 0.95;
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        context.save();
        context.globalAlpha = Math.max(0, this.life);
        context.fillStyle = this.color;
        context.beginPath();
        context.rect(this.positionX, this.positionY, this.size, this.size);
        context.fill();
        context.restore();
    }
}

/**
 * アーケード風の広がる衝撃波エフェクト
 */
export class ShockwaveEffect {
    /**
     * @param {number} positionX - X座標
     * @param {number} positionY - Y座標
     * @param {string} colorCode - 色コード
     * @param {number} limitRadius - 最大半径
     */
    constructor(positionX, positionY, colorCode, limitRadius) {
        this.positionX = positionX;
        this.positionY = positionY;
        this.colorCode = colorCode;
        this.currentRadius = 0;
        this.limitRadius = limitRadius;
        this.currentLife = 1.0;
        this.fadeSpeed = 0.04;
    }

    update() {
        this.currentLife -= this.fadeSpeed;
        // 最初は速く、徐々にゆっくり広がるイージング
        this.currentRadius += (this.limitRadius - this.currentRadius) * 0.25;
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        if (this.currentLife <= 0) return;
        context.save();
        context.beginPath();
        context.arc(this.positionX, this.positionY, this.currentRadius, 0, Math.PI * 2);
        context.strokeStyle = this.colorCode;
        // 半径が広がるにつれて線が細くなる
        context.lineWidth = 5 * this.currentLife;
        context.globalAlpha = this.currentLife;
        context.shadowBlur = 15;
        context.shadowColor = this.colorCode;
        context.stroke();
        context.restore();
    }
}

/**
 * 方向性ワイドビームエフェクト (メガ粒子砲スタイル)
 */
export class BeamEffect {
    /**
     * @param {number} x - 発射点X
     * @param {number} y - 発射点Y
     * @param {number} angle - ビーム角度(ラジアン)
     * @param {number} width - ビーム幅
     * @param {number} length - ビーム長さ
     * @param {string} color - ビーム色
     * @param {boolean} isCritical - クリティカル版かどうか
     */
    constructor(x, y, angle, width, length, color, isCritical) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.width = width;
        this.length = length;
        this.color = color;
        this.isCritical = isCritical;
        this.life = 1.0;
        this.fadeSpeed = 0.05;
        this.expandProgress = 1.0; // Start fully expanded for continuous beam

        // Gradient caching for performance
        this._cachedGradient = null;
        this._lastLength = 0;
        this._lastColor = '';
    }

    /**
     * Update beam parameters for reuse (object pooling)
     * @param {number} angle - ビーム角度(ラジアン)
     * @param {number} width - ビーム幅
     * @param {number} length - ビーム長さ
     * @param {string} color - ビーム色
     * @param {boolean} isCritical - クリティカル版かどうか
     */
    updateBeam(angle, width, length, color, isCritical) {
        this.angle = angle;
        this.width = width;
        this.length = length;
        this.color = color;
        this.isCritical = isCritical;
        this.life = 1.0; // Reset life for continuous beam
        this.expandProgress = 1.0; // Keep fully expanded
    }

    update() {
        this.life -= this.fadeSpeed;
        this.expandProgress = Math.min(1, this.expandProgress + 0.15);
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        if (this.life <= 0) return;

        context.save();
        // Use integer coordinates to avoid sub-pixel rendering
        context.translate(Math.floor(this.x), Math.floor(this.y));
        context.rotate(this.angle);

        const currentLength = Math.floor(this.length * this.expandProgress);
        const currentWidth = Math.floor(this.width * this.expandProgress);

        // Gradient caching: only recreate if length or color changed
        if (currentLength !== this._lastLength || this.color !== this._lastColor) {
            this._cachedGradient = context.createLinearGradient(0, 0, currentLength, 0);
            this._cachedGradient.addColorStop(0, this.color);
            this._cachedGradient.addColorStop(0.5, this.color);
            this._cachedGradient.addColorStop(1, 'rgba(255,255,255,0)');
            this._lastLength = currentLength;
            this._lastColor = this.color;
        }

        // Beam core (bright gradient)
        context.globalAlpha = this.life * 0.8;
        context.fillStyle = this._cachedGradient;
        context.fillRect(0, -currentWidth / 2, currentLength, currentWidth);

        // Beam glow (outer) - reduced shadowBlur from 30 to 15 for performance
        context.globalAlpha = this.life * 0.3;
        context.shadowBlur = 15;
        context.shadowColor = this.color;
        context.fillRect(0, -currentWidth / 2, currentLength, currentWidth);

        // Critical: simplified to single additional layer (removed extra glow)
        if (this.isCritical) {
            context.globalAlpha = this.life * 0.2;
            context.shadowBlur = 20;
            context.fillRect(0, -currentWidth / 2 * 1.2, currentLength, currentWidth * 1.2);
        }

        context.restore();
    }
}

/**
 * 宇宙背景と星空の描画管理クラス
 */
export class StarField {
    /**
     * @param {number} width - 画面幅
     * @param {number} height - 画面高さ
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.stars = [];
        this.numStars = 100;
        this.nebulaOffset = 0;

        // 星の初期化
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push(this.createStar());
        }
    }

    createStar() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.8 + 0.2, // 個別の移動速度係数
            brightness: Math.random(),
            twinkleSpeed: Math.random() * 0.05 + 0.01
        };
    }

    /**
     * @param {number} waveNumber - 現在のWave数（速度調整用）
     */
    update(waveNumber) {
        // Waveが進むほど全体の流れる速度が上がる
        const baseSpeed = 0.5 + (waveNumber * 0.15);
        this.nebulaOffset += 0.2;

        this.stars.forEach(star => {
            star.y += star.speed * baseSpeed;
            // 瞬きアニメーション
            star.brightness += star.twinkleSpeed;
            if (star.brightness > 1 || star.brightness < 0.3) {
                star.twinkleSpeed *= -1;
            }

            // 画面外に出たら上に戻す
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        });
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {number} waveNumber - 現在のWave数（背景色変更用）
     */
    draw(context, waveNumber) {
        // 背景グラデーション (Waveごとのテーマカラー)
        let topColor = "#050608";
        let bottomColor = "#1f2833";

        if (waveNumber >= 4 && waveNumber <= 6) {
            // 中盤: 不穏な赤紫
            topColor = "#1a0b10";
            bottomColor = "#2c1e20";
        } else if (waveNumber >= 7 && waveNumber <= 9) {
            // 終盤: 神秘的な紫紺
            topColor = "#100b1a";
            bottomColor = "#201e2c";
        } else if (waveNumber >= 10) {
            // ラスト: 激しい赤黒
            topColor = "#2c0505";
            bottomColor = "#000000";
        }

        const grad = context.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, bottomColor);

        context.fillStyle = grad;
        context.fillRect(0, 0, this.width, this.height);

        // 星雲っぽい演出 (簡易的なノイズレイヤーの代わりに円形グラデーションを合成)
        context.save();
        context.globalCompositeOperation = "screen";
        context.globalAlpha = 0.1;

        // ゆっくり動く光のモヤ
        const nebulaX = (Math.sin(this.nebulaOffset * 0.01) * this.width * 0.5) + this.width / 2;
        const nebulaY = (this.nebulaOffset % this.height);
        const nebulaGrad = context.createRadialGradient(nebulaX, nebulaY, 50, nebulaX, nebulaY, 400);
        nebulaGrad.addColorStop(0, waveNumber >= 10 ? "#e74c3c" : "#3498db");
        nebulaGrad.addColorStop(1, "transparent");

        context.fillStyle = nebulaGrad;
        context.fillRect(0, 0, this.width, this.height);
        context.restore();

        // 星の描画
        context.fillStyle = "#ffffff";
        this.stars.forEach(star => {
            context.globalAlpha = Math.max(0, Math.min(1, star.brightness));
            context.beginPath();
            context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            context.fill();
        });
        context.globalAlpha = 1.0;
    }
}