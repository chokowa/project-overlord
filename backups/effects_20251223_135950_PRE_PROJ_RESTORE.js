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
 * ダメージポップアップなどの浮遊テキスト
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
        this.velocityY = -1;
    }

    update() {
        this.positionY += this.velocityY;
        this.life -= EFFECT_DEFAULTS.TEXT_LIFE_DECAY;
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        context.save();
        context.globalAlpha = Math.max(0, this.life);
        context.fillStyle = this.color;
        context.font = `bold ${this.fontSize}px 'Segoe UI', sans-serif`;
        context.shadowColor = "#000";
        context.shadowBlur = 4;
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