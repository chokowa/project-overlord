/**
 * @fileoverview ゲームバランス、GEM、およびステージデータの定義
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 */

/** * ゲーム全体の基本設定
 * @type {Object}
 */
export const GAME_SETTINGS = {
    SCREEN_WIDTH: 1200,
    SCREEN_HEIGHT: 600,
    BASE_MAX_HP: 1000,
    XP_PER_LEVEL_BASE: 100,
    XP_SCALING: 1.5,
    DROP_CHANCE: 0.2,   
    CASTLE_X: 120,      
    CASTLE_DAMAGE: 15   
};

/** * GEMのカテゴリ定義
 * @enum {string} 
 */
export const GEM_TYPES = {
    ACTIVE: 'ACTIVE',
    SUPPORT: 'SUPPORT'
};

/** * 全GEMのマスターデータ
 * @type {Object<string, Object>}
 */
export const GEMS = {
    FIREBALL: { 
        id: 'fireball', name: '火球', type: GEM_TYPES.ACTIVE, 
        color: '#ff4d4d', damage: 60, speed: 7, rate: 45 
    },
    ARROW: { 
        id: 'arrow', name: '連射矢', type: GEM_TYPES.ACTIVE, 
        color: '#f1c40f', damage: 25, speed: 14, rate: 15 
    },
    NOVA: { 
        id: 'nova', name: '氷結ノヴァ', type: GEM_TYPES.ACTIVE, 
        color: '#3498db', damage: 40, speed: 4, rate: 90 
    },
    
    // サポートGEMに固有色を設定 (Patch-11)
    MULTISHOT: { 
        id: 'multishot', name: '多弾', type: GEM_TYPES.SUPPORT, 
        color: '#2ecc71', projectiles: 2, damage_mod: 0.85 
    },
    POWER: { 
        id: 'power', name: '威力', type: GEM_TYPES.SUPPORT, 
        color: '#9b59b6', damage_mod: 1.6 
    },
    SPEED: { 
        id: 'speed', name: '高速', type: GEM_TYPES.SUPPORT, 
        color: '#1abc9c', speed_mod: 1.5, rate_mod: 0.7 
    }
};

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