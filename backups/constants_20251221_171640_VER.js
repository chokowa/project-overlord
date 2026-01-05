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

    // OFFENSE PATH (Up)
    1: { id: 1, name: "Damage I", type: "SMALL", x: 1000, y: 650, maxRank: 5, stats: { damage_pct: 0.04 }, connections: [11] }, // Max 20%
    11: { id: 11, name: "Damage II", type: "SMALL", x: 1000, y: 550, maxRank: 5, stats: { damage_pct: 0.06 }, connections: [100, 12, 13] }, // Max 30%
    12: { id: 12, name: "Crit Rate I", type: "SMALL", x: 900, y: 500, maxRank: 3, stats: { crit_chance: 0.03 }, connections: [] }, // Max 9%
    13: { id: 13, name: "Blast Radius", type: "SMALL", x: 1100, y: 500, maxRank: 3, description: "AOE範囲 +10%/Lv", stats: { aoe_pct: 0.1 }, connections: [] }, // Max 30%

    // KEYSTONE: BLOOD MAGIC (High Dmg, Self Dmg)
    100: { id: 100, name: "Blood Rite", type: "KEYSTONE", x: 1000, y: 400, maxRank: 1,
           description: "ダメージ+50%だが、攻撃時に微量のHPを消費する",
           stats: { damage_pct: 0.5, self_damage: 1 }, connections: [] },

    // DEFENSE/UTILITY PATH (Left)
    2: { id: 2, name: "Health I", type: "SMALL", x: 900, y: 850, maxRank: 5, stats: { hp_max: 50 }, connections: [21] }, // Max 250
    21: { id: 21, name: "XP Gain I", type: "SMALL", x: 800, y: 950, maxRank: 5, stats: { xp_gain: 0.05 }, connections: [200] }, // Max 25%

    // KEYSTONE: IRON WILL (Tanky)
    200: { id: 200, name: "Iron Will", type: "KEYSTONE", x: 700, y: 1050, maxRank: 1,
           description: "最大HP +1000, しかし移動速度低下", 
           stats: { hp_max: 1000, speed_pct: -0.2 }, connections: [] },

    // SPEED PATH (Right)
    3: { id: 3, name: "Speed I", type: "SMALL", x: 1100, y: 850, maxRank: 5, stats: { rate_pct: 0.03 }, connections: [31] }, // Max 15%
    31: { id: 31, name: "Speed II", type: "SMALL", x: 1200, y: 950, maxRank: 5, stats: { rate_pct: 0.05 }, connections: [300, 32, 33] }, // Max 25%
    32: { id: 32, name: "Proj Speed", type: "SMALL", x: 1300, y: 950, maxRank: 3, stats: { proj_speed_pct: 0.1 }, connections: [] }, // Max 30%
    33: { id: 33, name: "Arcane Link", type: "SMALL", x: 1300, y: 850, maxRank: 3, description: "連鎖感知距離 +10%/Lv", stats: { chain_range_pct: 0.1 }, connections: [] }, // Max 30%

    // KEYSTONE: MULTITASKER (Support Buff)
    300: { id: 300, name: "Multitasker", type: "KEYSTONE", x: 1300, y: 1050, maxRank: 1,
           description: "サポートGEMの効果1.5倍、基本ダメージ-20%",
           stats: { support_effect: 0.5, damage_pct: -0.2 }, connections: [] }
};

export const STAGE_CONFIG = [
    { level: 1, name: "平原の攻防", waveCount: 3, enemyScale: 1.0 },
    { level: 2, name: "暗き森の包囲", waveCount: 5, enemyScale: 1.5 },
    { level: 3, name: "極寒の要塞", waveCount: 8, enemyScale: 2.2 }
];

export const UI_STRINGS = {
    LEVEL_UP: "LEVEL UP!",
    GAME_OVER: "MISSION FAILED",
    STAGE_CLEAR: "SECTOR CLEARED",
    EMPTY_SLOT: "EMPTY"
};