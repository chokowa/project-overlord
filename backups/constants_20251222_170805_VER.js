/**
 * @fileoverview ゲームバランス、GEM、スキルツリー、敵ティアの定義
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 * [Patch] Re-Balance: Casual Early Game & Power Fantasy Restoration
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 600,
    SCREEN_HEIGHT: 900,
    BASE_MAX_HP: 800,       // 500 -> 800: 耐久力緩和
    XP_PER_LEVEL_BASE: 120, // 150 -> 120: 序盤のレベルアップを快適に
    XP_SCALING: 1.8,        // 2.1 -> 1.8: 中盤以降の成長停滞を緩和
    DROP_CHANCE: 0.3,       // 0.25 -> 0.3: ドロップ率微増
    CASTLE_Y: 800,
    CASTLE_DAMAGE: 30,      // 50 -> 30: ペナルティ緩和
    INVENTORY_CAPACITY: 40,
    FUSION_COST: 3,
    SALVAGE_XP_BASE: 35,    // 25 -> 35: 売却XP微増

    SPAWN_RATE_BASE: 70,    // 60 -> 70: 敵の湧きを少しマイルドに
    SPAWN_RATE_MIN: 15,

    // Economy & Shop
    GOLD_DROP_CHANCE: 0.35,
    GOLD_VALUE_BASE: 20,    // 15 -> 20: 金策緩和
    REPAIR_COST: 150,
    REPAIR_AMOUNT: 150,     // 修理効率改善
    MYSTERY_BOX_COST: 500,  // 600 -> 500: ガチャ価格を戻す

    FORMATION_CHANCE: 0.30, // 0.40 -> 0.30: 序盤の理不尽な連携を減らす

    TREE_WIDTH: 2000,
    TREE_HEIGHT: 1500
};

export const BOSS_WAVES = {
    // Wave 1-3: Casual (HP Nerf)
    1: { name: "SLIME KING", color: "#2ecc71", scale: 2.5, hp: 15.0, speed: 0.4, count: 1 }, // HP 20->15
    2: { name: "SHADOW STALKER", color: "#34495e", scale: 1.5, hp: 12.0, speed: 1.5, count: 1 }, // HP 15->12, Spd 1.8->1.5
    3: { name: "IRON GOLEM", color: "#95a5a6", scale: 3.0, hp: 30.0, speed: 0.3, count: 1 }, // HP 40->30
    
    // Wave 4+: Challenge begins
    4: { name: "TWIN FANGS", color: "#e67e22", scale: 1.8, hp: 20.0, speed: 1.3, count: 2 },
    5: { name: "HIVE MOTHER", color: "#9b59b6", scale: 3.5, hp: 60.0, speed: 0.2, count: 1 },
    6: { name: "CRIMSON & AZURE", color: "#e74c3c", scale: 2.0, hp: 35.0, speed: 0.9, count: 2 },
    7: { name: "CHAOS KNIGHT", color: "#f1c40f", scale: 2.2, hp: 80.0, speed: 1.0, count: 1 },
    8: { name: "THE TRIAD", color: "#bdc3c7", scale: 1.6, hp: 30.0, speed: 1.2, count: 3 },
    9: { name: "VOID DRAGON", color: "#8e44ad", scale: 4.0, hp: 200.0, speed: 0.7, count: 1 },
    10: { name: "OVERLORD", color: "#c0392b", scale: 5.0, hp: 10000.0, speed: 0.5, count: 1 }
};

export const GEM_TYPES = {
    ACTIVE: 'ACTIVE',
    SUPPORT: 'SUPPORT'
};

export const ARTIFACT_TYPES = {
    RING: 'RING',
    AMULET: 'AMULET'
};

export const MISC_ITEMS = {
    GOLD: { id: 'gold', name: 'Gold', type: 'GOLD', color: '#f1c40f' }
};

export const UNIQUES = {
    VAMPIRE_FANG: {
        id: 'vampire_fang', name: '吸血の牙', type: ARTIFACT_TYPES.AMULET,
        color: '#8e44ad', description: "攻撃命中時 HP回復 +1 (確率)",
        stats: { life_on_hit: 0.8 } // 0.5 -> 0.8
    },
    MIDAS_RING: {
        id: 'midas_ring', name: 'ミダスの指輪', type: ARTIFACT_TYPES.RING,
        color: '#f1c40f', description: "Gold獲得量 +40%",
        stats: { gold_gain: 0.4 } // 0.3 -> 0.4
    },
    OMEGA_PRISM: {
        id: 'omega_prism', name: 'Ωプリズム', type: GEM_TYPES.SUPPORT,
        color: '#ecf0f1', description: "全性能強化 (x1.15)",
        damage_mod: 1.15, speed_mod: 1.15, rate_mod: 1.15 // 1.1 -> 1.15
    }
};

export const SHOP_ITEMS = {
    REPAIR: { id: 'repair', name: '緊急修理', cost: 150, type: 'INSTANT', icon: '🔧', desc: "HP 150回復" },
    MYSTERY: { id: 'mystery', name: '闇市ガチャ', cost: 500, type: 'INSTANT', icon: '🎲', desc: "ランダム装備" },
    DRONE_ATK: { id: 'drone_atk', name: '攻撃ドローン', cost: 400, type: 'UNIT', duration: 1800, icon: '🛸', desc: "30秒間 自動攻撃" },
    DRONE_COL: { id: 'drone_col', name: '回収ドローン', cost: 300, type: 'UNIT', duration: 3600, icon: '🧹', desc: "60秒間 アイテム回収" },
    CLONE: { id: 'clone', name: '影分身', cost: 800, type: 'UNIT', duration: 900, icon: '👥', desc: "15秒間 火力倍増" }
};

export const ENEMY_TIERS = {
    NORMAL: { id: 'NORMAL', name: 'Normal', color: '#e74c3c', scale: 1.0, hpMod: 1.0, xpMod: 1.0, speedMod: 1.0, chance: 0.0 },
    TANK:   { id: 'TANK',   name: 'Tank',   color: '#95a5a6', scale: 1.4, hpMod: 3.0, xpMod: 2.5, speedMod: 0.5, chance: 0.15 }, // HP 3.5->3.0
    ROGUE:  { id: 'ROGUE',  name: 'Rogue',  color: '#34495e', scale: 0.8, hpMod: 0.6, xpMod: 1.5, speedMod: 1.4, chance: 0.30 }, // Speed 1.6->1.4
    SWARM:  { id: 'SWARM',  name: 'Swarm',  color: '#d35400', scale: 0.6, hpMod: 0.3, xpMod: 0.5, speedMod: 1.1, chance: 0.45 },
    MAGIC:  { id: 'MAGIC',  name: 'Magic',  color: '#3498db', scale: 1.2, hpMod: 2.0, xpMod: 3.0, speedMod: 0.9, chance: 0.60 },
    RARE:   { id: 'RARE',   name: 'Rare',   color: '#f1c40f', scale: 1.5, hpMod: 5.0, xpMod: 8.0, speedMod: 1.1, chance: 0.70 },
    BOSS:   { id: 'BOSS',   name: 'Boss',   color: '#8e44ad', scale: 2.5, hpMod: 50.0,xpMod: 50.0,speedMod: 0.6, chance: 0.98 }
};

export const GEMS = {
    FIREBALL: {
        id: 'fireball', name: '火球', type: GEM_TYPES.ACTIVE,
        color: '#ff4d4d', damage: 50, speed: 7, rate: 45, level: 1 // Dmg 40->50, Rate 50->45(Faster)
    },
    ARROW: {
        id: 'arrow', name: '連射矢', type: GEM_TYPES.ACTIVE,
        color: '#f1c40f', damage: 20, speed: 14, rate: 12, level: 1 // Dmg 15->20
    },
    NOVA: {
        id: 'nova', name: '氷結ノヴァ', type: GEM_TYPES.ACTIVE,
        color: '#3498db', damage: 30, speed: 4, rate: 90, level: 1 // Dmg 25->30, Rate 100->90
    },
    // Supports (Buffed slightly from previous nerf)
    MULTISHOT: {
        id: 'multishot', name: '拡散', type: GEM_TYPES.SUPPORT,
        color: '#2ecc71', projectiles: 2, damage_mod: 0.7 // 0.6 -> 0.7
    },
    POWER: {
        id: 'power', name: '威力', type: GEM_TYPES.SUPPORT,
        color: '#9b59b6', damage_mod: 1.4 // 1.3 -> 1.4
    },
    SPEED: {
        id: 'speed', name: '高速', type: GEM_TYPES.SUPPORT,
        color: '#1abc9c', speed_mod: 1.4, rate_mod: 0.75 // 1.3 -> 1.4
    },
    PIERCE: {
        id: 'pierce', name: '貫通', type: GEM_TYPES.SUPPORT,
        color: '#e056fd', pierce_count: 99, damage_mod: 0.75
    },
    CHAIN: {
        id: 'chain', name: '連鎖', type: GEM_TYPES.SUPPORT,
        color: '#f39c12', chain_count: 2, damage_mod: 0.75, range: 200
    }
};

export const ARTIFACTS = {
    RUBY_RING: {
        id: 'ruby_ring', name: '赤の指輪', type: ARTIFACT_TYPES.RING,
        color: '#c0392b', description: "ダメージ +15%",
        stats: { damage_pct: 0.15 } // 0.1 -> 0.15
    },
    EMERALD_RING: {
        id: 'emerald_ring', name: '緑の指輪', type: ARTIFACT_TYPES.RING,
        color: '#27ae60', description: "発射速度 +15%",
        stats: { rate_pct: 0.15 } // 0.1 -> 0.15
    },
    SAPPHIRE_AMULET: {
        id: 'sapphire_amulet', name: '青のアミュレット', type: ARTIFACT_TYPES.AMULET,
        color: '#2980b9', description: "クリティカル率 +8%",
        stats: { crit_chance: 0.08 } // 0.05 -> 0.08
    },
    GOLD_AMULET: {
        id: 'gold_amulet', name: '黄金の首飾り', type: ARTIFACT_TYPES.AMULET,
        color: '#f39c12', description: "XP獲得量 +20%",
        stats: { xp_gain: 0.20 } // 0.15 -> 0.20
    }
};

export const SKILL_TREE_NODES = {
    0: { id: 0, name: "Origin", type: "START", x: 1000, y: 750, maxRank: 1, stats: {}, connections: [1, 2, 3] },

    // OFFENSE: Dmg 3% -> 6% (Feel good buff)
    1: { id: 1, name: "Brute Force", type: "SMALL", x: 1000, y: 650, maxRank: 10, description: "Dmg +6%/Lv", stats: { damage_pct: 0.06 }, connections: [11] },

    11: { id: 11, name: "Lethality", type: "SMALL", x: 1000, y: 550, maxRank: 5, description: "Crit Dmg +15%/Lv", stats: { crit_damage: 0.15 }, connections: [100, 12, 13] },
    12: { id: 12, name: "Precision", type: "SMALL", x: 900, y: 500, maxRank: 5, description: "Crit Rate +3%/Lv", stats: { crit_chance: 0.03 }, connections: [] },
    13: { id: 13, name: "Devastation", type: "SMALL", x: 1100, y: 500, maxRank: 5, description: "AOE Size +12%/Lv", stats: { aoe_pct: 0.12 }, connections: [] },

    // KEYSTONE: BLOOD RITE (Buffed)
    100: { id: 100, name: "Blood Rite", type: "KEYSTONE", x: 1000, y: 400, maxRank: 1,
           description: "最終ダメージ1.8倍, 攻撃毎に現在HPの3%消費",
           stats: { final_damage_mul: 1.8, self_damage_pct: 0.03 }, connections: [] },

    // DEFENSE
    2: { id: 2, name: "Vitality", type: "SMALL", x: 900, y: 850, maxRank: 10, description: "MaxHP +150/Lv",
         stats: { hp_max: 150 }, connections: [21] },

    21: { id: 21, name: "Greed", type: "SMALL", x: 800, y: 950, maxRank: 5, description: "Gold/XP +8%/Lv", stats: { xp_gain: 0.08, gold_gain: 0.08 }, connections: [200, 22] },
    22: { id: 22, name: "Vampirism", type: "SMALL", x: 700, y: 900, maxRank: 3, description: "Hit時HP回復 +2/Lv", stats: { life_on_hit: 2 }, connections: [] },

    // KEYSTONE: IRON FORTRESS
    200: { id: 200, name: "Iron Fortress", type: "KEYSTONE", x: 700, y: 1050, maxRank: 1,
           description: "最大HP +3000, 被ダメージ-20%, 移動速度-50%",
           stats: { hp_max: 3000, damage_reduction: 0.2, speed_pct: -0.5 }, connections: [] },

    // SPEED
    3: { id: 3, name: "Rapid Fire", type: "SMALL", x: 1100, y: 850, maxRank: 10, description: "Rate +6%/Lv", stats: { rate_pct: 0.06 }, connections: [31] },

    31: { id: 31, name: "Overclock", type: "SMALL", x: 1200, y: 950, maxRank: 5, description: "Proj Speed +15%/Lv", stats: { proj_speed_pct: 0.15 }, connections: [300, 33] },
    33: { id: 33, name: "Neural Network", type: "SMALL", x: 1300, y: 850, maxRank: 3, description: "Chain Range +25%/Lv", stats: { chain_range_pct: 0.25 }, connections: [] },

    // KEYSTONE: NANOTECH
    300: { id: 300, name: "Nanotech Swarm", type: "KEYSTONE", x: 1300, y: 1050, maxRank: 1,
           description: "サポートGEMレベル+3相当, 本体火力-50%",
           stats: { support_level_bonus: 3, damage_pct: -0.5 }, connections: [] }
};

export const STAGE_CONFIG = [
    { level: 1, name: "SURVIVAL OPS", waveCount: 10, enemyScale: 1.0 }
];

export const UI_STRINGS = {
    LEVEL_UP: "SYSTEM UPGRADE",
    GAME_OVER: "SIGNAL LOST",
    STAGE_CLEAR: "SECTOR SECURED",
    EMPTY_SLOT: "EMPTY"
};