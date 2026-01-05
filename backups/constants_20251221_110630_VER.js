/**
 * @fileoverview ゲームバランス、GEM、およびステージデータの定義
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 1200,
    SCREEN_HEIGHT: 600,
    BASE_MAX_HP: 1000,
    XP_PER_LEVEL_BASE: 100,
    XP_SCALING: 1.5,
    DROP_CHANCE: 0.2, // 20%でGEMがドロップ
    CASTLE_X: 120    // 城壁の終端位置
};

/** @enum {string} */
export const GEM_TYPES = {
    ACTIVE: 'ACTIVE',
    SUPPORT: 'SUPPORT'
};

/** 全GEMのマスターデータ */
export const GEMS = {
    FIREBALL: { id: 'fireball', name: '火球', type: GEM_TYPES.ACTIVE, color: '#ff4d4d', damage: 60, speed: 7, rate: 45 },
    ARROW: { id: 'arrow', name: '連射矢', type: GEM_TYPES.ACTIVE, color: '#f1c40f', damage: 25, speed: 14, rate: 15 },
    NOVA: { id: 'nova', name: '氷結ノヴァ', type: GEM_TYPES.ACTIVE, color: '#3498db', damage: 40, speed: 4, rate: 90 },
    
    MULTISHOT: { id: 'multishot', name: '多弾化', type: GEM_TYPES.SUPPORT, projectiles: 2, damage_mod: 0.85 },
    POWER: { id: 'power', name: '威力増加', type: GEM_TYPES.SUPPORT, damage_mod: 1.6 },
    SPEED: { id: 'speed', name: '高速化', type: GEM_TYPES.SUPPORT, speed_mod: 1.5, rate_mod: 0.7 }
};

/** ステージ構成（ハクスラ進行用） */
export const STAGE_CONFIG = [
    { level: 1, name: "平原の攻防", waveCount: 3, enemyScale: 1.0 },
    { level: 2, name: "暗き森の包囲", waveCount: 5, enemyScale: 1.5 },
    { level: 3, name: "極寒の要塞", waveCount: 8, enemyScale: 2.2 }
];

export const UI_STRINGS = {
    LEVEL_UP: "LEVEL UP: リンクを強化せよ",
    GAME_OVER: "要塞陥落... リロードして再起せよ",
    STAGE_CLEAR: "STAGE CLEAR! 次の戦地へ...",
    EMPTY_SLOT: "未装備"
};