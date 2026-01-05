/**
 * @fileoverview システム定数およびGEM定義
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    BASE_MAX_HP: 1000,
    XP_PER_LEVEL_BASE: 100,
    XP_SCALING: 1.5,
    DROP_CHANCE: 0.15
};

/** @enum {string} */
export const GEM_TYPES = {
    ACTIVE: 'ACTIVE',
    SUPPORT: 'SUPPORT'
};

export const GEMS = {
    FIREBALL: { id: 'fireball', name: '火球', type: GEM_TYPES.ACTIVE, color: '#ff4d4d', damage: 50, speed: 5, rate: 60 },
    ARROW: { id: 'arrow', name: '連射矢', type: GEM_TYPES.ACTIVE, color: '#f1c40f', damage: 20, speed: 12, rate: 20 },
    NOVA: { id: 'nova', name: '氷結ノヴァ', type: GEM_TYPES.ACTIVE, color: '#3498db', damage: 30, speed: 3, rate: 100 },
    
    MULTISHOT: { id: 'multishot', name: '多弾化', type: GEM_TYPES.SUPPORT, projectiles: 2, damage_mod: 0.8 },
    FREEZE: { id: 'freeze', name: '冷却', type: GEM_TYPES.SUPPORT, slow: 0.5 },
    POWER: { id: 'power', name: '威力増加', type: GEM_TYPES.SUPPORT, damage_mod: 1.5 }
};

export const UI_STRINGS = {
    LEVEL_UP: "LEVEL UP! 強化を選べ",
    EMPTY_SLOT: "空きスロット",
    EQUIP: "装備",
    DROP_ITEM: "アイテム獲得！",
    GAME_OVER: "お城が陥落しました..."
};