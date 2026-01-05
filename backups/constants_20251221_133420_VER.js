/**
 * @fileoverview ゲームバランス、GEM、敵ティア、装備、およびPERKの定義
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 */

/** ゲーム全体の基本設定 */
export const GAME_SETTINGS = {
    SCREEN_WIDTH: 600,
    SCREEN_HEIGHT: 900,
    BASE_MAX_HP: 1000,
    XP_PER_LEVEL_BASE: 100,
    XP_SCALING: 1.5,
    DROP_CHANCE: 0.3,       
    CASTLE_Y: 800,      
    CASTLE_DAMAGE: 15,
    INVENTORY_CAPACITY: 40,
    FUSION_COST: 3,
    SALVAGE_XP_BASE: 50,
    
    // スポーン制御
    SPAWN_RATE_BASE: 90, // フレーム数
    SPAWN_RATE_MIN: 20,
    FORMATION_CHANCE: 0.25 // 特殊フォーメーション発生率
};

/** GEMカテゴリ */
export const GEM_TYPES = {
    ACTIVE: 'ACTIVE',
    SUPPORT: 'SUPPORT'
};

/** アーティファクトカテゴリ */
export const ARTIFACT_TYPES = {
    RING: 'RING',
    AMULET: 'AMULET'
};

/** パッシブスキル（PERK）カテゴリ */
export const PERK_TYPES = {
    PASSIVE: 'PASSIVE'
};

/** 敵レアリティ定義 */
export const ENEMY_TIERS = {
    NORMAL: { 
        id: 'NORMAL', name: 'Normal', color: '#e74c3c', 
        scale: 1.0, hpMod: 1.0, xpMod: 1.0, speedMod: 1.0, chance: 0.70 
    },
    MAGIC: { 
        id: 'MAGIC', name: 'Magic', color: '#3498db', 
        scale: 1.25, hpMod: 2.5, xpMod: 3.0, speedMod: 1.1, chance: 0.20 
    },
    RARE: { 
        id: 'RARE', name: 'Rare', color: '#f1c40f', 
        scale: 1.5, hpMod: 6.0, xpMod: 10.0, speedMod: 1.3, chance: 0.08 
    },
    BOSS: { 
        id: 'BOSS', name: 'Boss', color: '#8e44ad', 
        scale: 2.2, hpMod: 25.0, xpMod: 50.0, speedMod: 0.6, chance: 0.02 
    }
};

/** GEMマスターデータ */
export const GEMS = {
    FIREBALL: { 
        id: 'fireball', name: '火球', type: GEM_TYPES.ACTIVE, 
        color: '#ff4d4d', damage: 60, speed: 7, rate: 45, level: 1 
    },
    ARROW: { 
        id: 'arrow', name: '連射矢', type: GEM_TYPES.ACTIVE, 
        color: '#f1c40f', damage: 25, speed: 14, rate: 15, level: 1 
    },
    NOVA: { 
        id: 'nova', name: '氷結ノヴァ', type: GEM_TYPES.ACTIVE, 
        color: '#3498db', damage: 40, speed: 4, rate: 90, level: 1 
    },
    MULTISHOT: { 
        id: 'multishot', name: '拡散', type: GEM_TYPES.SUPPORT, 
        color: '#2ecc71', projectiles: 2, damage_mod: 0.7 
    },
    POWER: { 
        id: 'power', name: '威力', type: GEM_TYPES.SUPPORT, 
        color: '#9b59b6', damage_mod: 1.6 
    },
    SPEED: { 
        id: 'speed', name: '高速', type: GEM_TYPES.SUPPORT, 
        color: '#1abc9c', speed_mod: 1.5, rate_mod: 0.7 
    },
    PIERCE: {
        id: 'pierce', name: '貫通', type: GEM_TYPES.SUPPORT,
        color: '#e056fd', pierce_count: 999 
    }
};

/** アーティファクトデータ */
export const ARTIFACTS = {
    RUBY_RING: { 
        id: 'ruby_ring', name: '赤の指輪', type: ARTIFACT_TYPES.RING, 
        color: '#c0392b', description: "ダメージ +20%",
        stats: { damage_pct: 0.2 } 
    },
    EMERALD_RING: { 
        id: 'emerald_ring', name: '緑の指輪', type: ARTIFACT_TYPES.RING, 
        color: '#27ae60', description: "発射速度 +15%",
        stats: { rate_pct: 0.15 } 
    },
    SAPPHIRE_AMULET: { 
        id: 'sapphire_amulet', name: '青のアミュレット', type: ARTIFACT_TYPES.AMULET, 
        color: '#2980b9', description: "クリティカル率 +10%",
        stats: { crit_chance: 0.1 } 
    },
    GOLD_AMULET: { 
        id: 'gold_amulet', name: '黄金の首飾り', type: ARTIFACT_TYPES.AMULET, 
        color: '#f39c12', description: "XP獲得量 +30%",
        stats: { xp_gain: 0.3 } 
    }
};

/** レベルアップ専用パーク（パッシブ強化） */
export const PERKS = {
    MIGHT: {
        id: 'perk_might', name: '剛力 (Might)', type: PERK_TYPES.PASSIVE,
        color: '#e74c3c', description: "全ダメージ +15%",
        stats: { damage_pct: 0.15 }
    },
    HASTE: {
        id: 'perk_haste', name: '神速 (Haste)', type: PERK_TYPES.PASSIVE,
        color: '#f1c40f', description: "発射レート +10%",
        stats: { rate_pct: 0.10 }
    },
    PRECISION: {
        id: 'perk_precision', name: '精密 (Precision)', type: PERK_TYPES.PASSIVE,
        color: '#3498db', description: "クリティカル率 +5%",
        stats: { crit_chance: 0.05 }
    },
    GREED: {
        id: 'perk_greed', name: '強欲 (Greed)', type: PERK_TYPES.PASSIVE,
        color: '#2ecc71', description: "XP獲得量 +20%",
        stats: { xp_gain: 0.20 }
    }
};

export const STAGE_CONFIG = [
    { level: 1, name: "平原の攻防", waveCount: 3, enemyScale: 1.0 },
    { level: 2, name: "暗き森の包囲", waveCount: 5, enemyScale: 1.5 },
    { level: 3, name: "極寒の要塞", waveCount: 8, enemyScale: 2.2 }
];

export const UI_STRINGS = {
    LEVEL_UP: "LEVEL UP: リンクを強化せよ",
    GAME_OVER: "要塞陥落... [R]キーで再起せよ",
    STAGE_CLEAR: "STAGE CLEAR! 次の戦地へ...",
    EMPTY_SLOT: "未装備"
};