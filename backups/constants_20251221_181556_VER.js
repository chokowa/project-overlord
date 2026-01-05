/**
 * @fileoverview ゲームバランス、GEM、スキルツリー、敵ティアの定義
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 */

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
    
    SPAWN_RATE_BASE: 90,
    SPAWN_RATE_MIN: 20,

    // Economy & Shop
    GOLD_DROP_CHANCE: 0.4,   // 40% chance to drop gold instead of item check
    GOLD_VALUE_BASE: 25,
    REPAIR_COST: 100,        // Cost to repair
    REPAIR_AMOUNT: 200,      // HP restored
    MYSTERY_BOX_COST: 500,   // Gacha cost

    FORMATION_CHANCE: 0.25,

    TREE_WIDTH: 2000, // スキルツリーキャンバスの仮想サイズ
    TREE_HEIGHT: 1500
};

// [Patch] Boss Wave Configuration (10 Waves = 1 Game)
export const BOSS_WAVES = {
    1: { name: "SLIME KING", color: "#2ecc71", scale: 2.0, hp: 15.0, speed: 0.5, count: 1 },
    2: { name: "SHADOW STALKER", color: "#34495e", scale: 1.5, hp: 12.0, speed: 1.5, count: 1 }, // Fast
    3: { name: "IRON GOLEM", color: "#95a5a6", scale: 2.5, hp: 30.0, speed: 0.4, count: 1 }, // Tank
    4: { name: "TWIN FANGS", color: "#e67e22", scale: 1.8, hp: 15.0, speed: 1.2, count: 2 }, // Duo
    5: { name: "HIVE MOTHER", color: "#9b59b6", scale: 3.0, hp: 40.0, speed: 0.3, count: 1 },
    6: { name: "CRIMSON & AZURE", color: "#e74c3c", scale: 2.0, hp: 25.0, speed: 0.8, count: 2 }, // Red/Blue
    7: { name: "CHAOS KNIGHT", color: "#f1c40f", scale: 2.2, hp: 50.0, speed: 1.0, count: 1 },
    8: { name: "THE TRIAD", color: "#bdc3c7", scale: 1.6, hp: 20.0, speed: 1.1, count: 3 }, // Trio
    9: { name: "VOID DRAGON", color: "#8e44ad", scale: 3.5, hp: 80.0, speed: 0.7, count: 1 }, // Sub-Boss
    10: { name: "OVERLORD", color: "#c0392b", scale: 4.0, hp: 200.0, speed: 0.6, count: 1 } // Final Boss
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
        color: '#8e44ad', description: "攻撃命中時 HP回復 +1",
        stats: { life_on_hit: 1 } 
    },
    MIDAS_RING: { 
        id: 'midas_ring', name: 'ミダスの指輪', type: ARTIFACT_TYPES.RING, 
        color: '#f1c40f', description: "Gold獲得量 +50%",
        stats: { gold_gain: 0.5 } 
    },
    OMEGA_PRISM: { 
        id: 'omega_prism', name: 'Ωプリズム', type: GEM_TYPES.SUPPORT, 
        color: '#ecf0f1', description: "全性能強化 (Dmg/Spd/Rate x1.2)",
        damage_mod: 1.2, speed_mod: 1.2, rate_mod: 1.2
    }
};

export const SHOP_ITEMS = {
    REPAIR: { id: 'repair', name: '緊急修理', cost: 100, type: 'INSTANT', icon: '🔧', desc: "HP 200回復" },
    MYSTERY: { id: 'mystery', name: '闇市ガチャ', cost: 500, type: 'INSTANT', icon: '🎲', desc: "ランダム装備" },
    DRONE_ATK: { id: 'drone_atk', name: '攻撃ドローン', cost: 300, type: 'UNIT', duration: 1800, icon: '🛸', desc: "30秒間 自動攻撃" },
    DRONE_COL: { id: 'drone_col', name: '回収ドローン', cost: 200, type: 'UNIT', duration: 3600, icon: '🧹', desc: "60秒間 アイテム回収" },
    CLONE: { id: 'clone', name: '影分身', cost: 600, type: 'UNIT', duration: 1200, icon: '👥', desc: "20秒間 火力倍増" }
};

export const ENEMY_TIERS = {
    NORMAL: { id: 'NORMAL', name: 'Normal', color: '#e74c3c', scale: 1.0, hpMod: 1.0, xpMod: 1.0, speedMod: 1.0, chance: 0.70 },
    MAGIC: { id: 'MAGIC', name: 'Magic', color: '#3498db', scale: 1.25, hpMod: 2.5, xpMod: 3.0, speedMod: 1.1, chance: 0.20 },
    RARE: { id: 'RARE', name: 'Rare', color: '#f1c40f', scale: 1.5, hpMod: 6.0, xpMod: 10.0, speedMod: 1.3, chance: 0.08 },
    BOSS: { id: 'BOSS', name: 'Boss', color: '#8e44ad', scale: 2.2, hpMod: 25.0, xpMod: 50.0, speedMod: 0.6, chance: 0.02 }
};

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
    // Supports
    MULTISHOT: { 
        id: 'multishot', name: '拡散', type: GEM_TYPES.SUPPORT, 
        color: '#2ecc71', projectiles: 2, damage_mod: 0.7 
    },
    POWER: { 
        id: 'power', name: '威力', type: GEM_TYPES.SUPPORT, 
        color: '#9b59b6', damage_mod: 1.5 
    },
    SPEED: { 
        id: 'speed', name: '高速', type: GEM_TYPES.SUPPORT, 
        color: '#1abc9c', speed_mod: 1.5, rate_mod: 0.7 
    },
    PIERCE: {
        id: 'pierce', name: '貫通', type: GEM_TYPES.SUPPORT,
        color: '#e056fd', pierce_count: 999, damage_mod: 0.8
    },
    CHAIN: {
        id: 'chain', name: '連鎖', type: GEM_TYPES.SUPPORT,
        color: '#f39c12', chain_count: 2, damage_mod: 0.8, range: 200
    }
};

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

/**
 * スキルツリー定義
 * 座標(x,y)はキャンバス中心(1000, 750)からの相対位置ではなく絶対位置
 */
export const SKILL_TREE_NODES = {
    // START
    0: { id: 0, name: "Origin", type: "START", x: 1000, y: 750, maxRank: 1, stats: {}, connections: [1, 2, 3] },

    // --- OFFENSE PATH (Top - Glass Cannon) ---
    // Early: Significant damage boost needed to clear Wave 1-3
    1: { id: 1, name: "Brute Force", type: "SMALL", x: 1000, y: 650, maxRank: 10, description: "Dmg +10%/Lv", stats: { damage_pct: 0.10 }, connections: [11] }, 

    // Mid: Crit focus
    11: { id: 11, name: "Lethality", type: "SMALL", x: 1000, y: 550, maxRank: 5, description: "Crit Dmg +20%/Lv", stats: { crit_damage: 0.2 }, connections: [100, 12, 13] },
    12: { id: 12, name: "Precision", type: "SMALL", x: 900, y: 500, maxRank: 5, description: "Crit Rate +5%/Lv", stats: { crit_chance: 0.05 }, connections: [] },
    13: { id: 13, name: "Devastation", type: "SMALL", x: 1100, y: 500, maxRank: 5, description: "AOE Size +15%/Lv", stats: { aoe_pct: 0.15 }, connections: [] },

    // KEYSTONE: BLOOD RITE (High Risk / High Reward)
    100: { id: 100, name: "Blood Rite", type: "KEYSTONE", x: 1000, y: 400, maxRank: 1,
           description: "最終ダメージ2倍, しかし攻撃ごとに現在HPの2%を消費",
           stats: { final_damage_mul: 2.0, self_damage_pct: 0.02 }, connections: [] },

    // --- DEFENSE/UTILITY PATH (Left - Tank & Sustain) ---
    // Early: HP pool to survive Wave 1-3 swarms
    2: { id: 2, name: "Vitality", type: "SMALL", x: 900, y: 850, maxRank: 10, description: "MaxHP +200/Lv", stats: { hp_max: 200 }, connections: [21] },

    // Mid: Economy & Sustain
    21: { id: 21, name: "Greed", type: "SMALL", x: 800, y: 950, maxRank: 5, description: "Gold/XP +10%/Lv", stats: { xp_gain: 0.10, gold_gain: 0.10 }, connections: [200, 22] },
    22: { id: 22, name: "Vampirism", type: "SMALL", x: 700, y: 900, maxRank: 3, description: "Hit時HP回復 +2/Lv", stats: { life_on_hit: 2 }, connections: [] },

    // KEYSTONE: IRON FORTRESS (Unstoppable)
    200: { id: 200, name: "Iron Fortress", type: "KEYSTONE", x: 700, y: 1050, maxRank: 1,
           description: "最大HP +5000, 被ダメージ-20%, しかし移動速度-50%", 
           stats: { hp_max: 5000, damage_reduction: 0.2, speed_pct: -0.5 }, connections: [] },

    // --- SPEED/CONTROL PATH (Right - Machine Gun) ---
    // Early: Fire rate is king
    3: { id: 3, name: "Rapid Fire", type: "SMALL", x: 1100, y: 850, maxRank: 10, description: "Rate +8%/Lv", stats: { rate_pct: 0.08 }, connections: [31] },

    // Mid: Tech upgrades
    31: { id: 31, name: "Overclock", type: "SMALL", x: 1200, y: 950, maxRank: 5, description: "Proj Speed +20%/Lv", stats: { proj_speed_pct: 0.20 }, connections: [300, 33] },
    33: { id: 33, name: "Neural Network", type: "SMALL", x: 1300, y: 850, maxRank: 3, description: "Chain Range +30%/Lv", stats: { chain_range_pct: 0.3 }, connections: [] },

    // KEYSTONE: NANOTECH (Support Master)
    300: { id: 300, name: "Nanotech Swarm", type: "KEYSTONE", x: 1300, y: 1050, maxRank: 1,
           description: "サポートGEMレベル+3相当, しかし本体火力半減",
           stats: { support_level_bonus: 3, damage_pct: -0.5 }, connections: [] }
};

export const STAGE_CONFIG = [
    { level: 1, name: "SURVIVAL OPS", waveCount: 10, enemyScale: 1.0 }
];

export const UI_STRINGS = {
    LEVEL_UP: "LEVEL UP!",
    GAME_OVER: "MISSION FAILED",
    STAGE_CLEAR: "SECTOR CLEARED",
    EMPTY_SLOT: "EMPTY"
};