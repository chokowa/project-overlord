/**
 * @fileoverview ゲームバランス、GEM、スキルツリー、敵ティアの定義
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 * [Patch] Re-Balance: Casual Early Game & Power Fantasy Restoration + Ultimate Fixes
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 600,
    SCREEN_HEIGHT: 900,
    BASE_MAX_HP: 800,       // 500 -> 800
    XP_PER_LEVEL_BASE: 1200, // 300 -> 1200: 初期レベルアップを約45-60秒に調整
    XP_SCALING: 1.25,        // 1.5 -> 1.25: 後半の極端な失速を防ぐ
    DROP_CHANCE: 0.15,      // 0.3 -> 0.15: 全体のドロップ頻度を抑制

    CASTLE_Y: 720,          // 800 -> 720: UI被り防止のため砲台位置を上げる
    CASTLE_DAMAGE: 30,      // 50 -> 30
    INVENTORY_CAPACITY: 40,
    FUSION_COST: 3,
    SALVAGE_XP_BASE: 35,    // 25 -> 35: 売却XP微増
    SELL_PRICE_BASE: 50,    // アイテム売却価格の基準

    SPAWN_RATE_BASE: 70,    // 60 -> 70: 敵の湧きを少しマイルドに
    SPAWN_RATE_MIN: 15,

    // Economy & Shop
    GOLD_DROP_CHANCE: 0.35,
    GOLD_VALUE_BASE: 20,    // 15 -> 20
    REPAIR_COST: 150,
    REPAIR_AMOUNT: 150,
    MYSTERY_BOX_COST: 500,  // 600 -> 500

    FORMATION_CHANCE: 0.30, // 0.40 -> 0.30

    TREE_WIDTH: 2000,
    TREE_HEIGHT: 1500,

    // [Patch] Additional Settings
    ROCK_SPIKES_BASE: 3,
    ROCK_SPIKES_VAR: 3,
    LEECH_RATIO: 0.02,
    ENEMY_BASE_HP: 60,
    ENEMY_PROJECTILE_DAMAGE: 15
};

export const BOSS_WAVES = {
    // Wave 1-3: Casual (HP Nerf)
    1: { name: "SLIME KING", color: "#2ecc71", scale: 2.5, hp: 15.0, speed: 0.4, count: 1 }, 
    2: { name: "SHADOW STALKER", color: "#34495e", scale: 1.5, hp: 12.0, speed: 1.5, count: 1 }, 
    3: { name: "IRON GOLEM", color: "#95a5a6", scale: 3.0, hp: 30.0, speed: 0.3, count: 1 }, 
    
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
    AMULET: 'AMULET',
    BOSS: 'BOSS_ARTIFACT' // New type
};

export const BOSS_ARTIFACTS = {
    // A. Standard Stats
    BERSERKER_HELM: { id: 'berserker_helm', name: '狂戦士の兜', icon: '⛑️', desc: 'HP減少率に応じて攻撃力UP (最大+50%)', type: 'BOSS_ARTIFACT', color: '#c0392b' },
    ANCIENT_COIN:   { id: 'ancient_coin',   name: '古代のコイン', icon: '🪙', desc: '敵撃破時 5%でGold獲得', type: 'BOSS_ARTIFACT', color: '#f1c40f' },
    VAMPIRE_CUP:    { id: 'vampire_cup',    name: '吸血鬼の杯', icon: '🍷', desc: '撃破時HP1%回復', type: 'BOSS_ARTIFACT', color: '#8e44ad' },
    SNIPER_SCOPE:   { id: 'sniper_scope',   name: 'スナイパースコープ', icon: '🔭', desc: '遠距離(Y<400)の敵へダメ+30%', type: 'BOSS_ARTIFACT', color: '#2ecc71' },
    INF_BATTERY:    { id: 'inf_battery',    name: '無限電池', icon: '🔋', desc: 'MP回復速度 +50%', type: 'BOSS_ARTIFACT', color: '#66fcf1', stats: { mp_regen_pct: 0.5 } },

    // B. Defense / Shield
    SPIKE_SHIELD:   { id: 'spike_shield',   name: 'スパイクシールド', icon: '🛡️', desc: 'シールドバッシュ威力+100%', type: 'BOSS_ARTIFACT', color: '#95a5a6', stats: { shield_bash_mul: 1.0 } },
    MANA_CONV:      { id: 'mana_conv',      name: 'マナ変換器', icon: '♻️', desc: 'ジャストガード時 HP20回復', type: 'BOSS_ARTIFACT', color: '#3498db' },
    EMERGENCY_CORE: { id: 'emergency_core', name: '緊急コア', icon: '🚨', desc: 'HP30%以下で自動シールド(60秒CT)', type: 'BOSS_ARTIFACT', color: '#e74c3c' },
    REFLECT_PRISM:  { id: 'reflect_prism',  name: '反射プリズム', icon: '💎', desc: 'ジャストガード時 爆発発生', type: 'BOSS_ARTIFACT', color: '#a29bfe' },
    GRAVITY_ANCHOR: { id: 'gravity_anchor', name: '重力アンカー', icon: '⚓', desc: 'シールド中、敵速度激減', type: 'BOSS_ARTIFACT', color: '#2c3e50' },

    // C. Offense Modifier
    PHANTOM_BARREL: { id: 'phantom_barrel', name: '幻影バレル', icon: '👻', desc: '20%で弾丸追加発射', type: 'BOSS_ARTIFACT', color: '#bdc3c7' },
    BOUND_ORB:      { id: 'bound_orb',      name: 'バウンドオーブ', icon: '🥎', desc: '画面端で1回跳ね返る', type: 'BOSS_ARTIFACT', color: '#e67e22' },
    HOMING_BEACON:  { id: 'homing_beacon',  name: '誘導ビーコン', icon: '📡', desc: '弾に弱い追尾性能付与', type: 'BOSS_ARTIFACT', color: '#1abc9c' },
    GIANT_KILLER:   { id: 'giant_killer',   name: 'ジャイアントキラー', icon: '🗡️', desc: 'Boss/Tankへダメ+40%', type: 'BOSS_ARTIFACT', color: '#d35400' },
    CHAOS_DICE:     { id: 'chaos_dice',     name: 'カオスダイス', icon: '🎲', desc: 'ダメージが50%~200%で変動', type: 'BOSS_ARTIFACT', color: '#9b59b6' },

    // D. Elemental
    OIL_FLASK:      { id: 'oil_flask',      name: 'オイル瓶', icon: '🛢️', desc: '火属性Hitで炎上ダメージ倍増', type: 'BOSS_ARTIFACT', color: '#e67e22' },
    TESLA_COIL:     { id: 'tesla_coil',     name: 'テスラコイル', icon: '⚡', desc: '連鎖数 +2', type: 'BOSS_ARTIFACT', color: '#f1c40f', stats: { chain_count: 2 } },
    ZERO_CRYSTAL:   { id: 'zero_crystal',   name: '絶対零度', icon: '❄️', desc: '氷結敵への攻撃時 10%で即死', type: 'BOSS_ARTIFACT', color: '#74b9ff' },
    CORROSIVE_CROWN:{ id: 'corrosive_crown',name: '腐食の王冠', icon: '👑', desc: '毒敵死亡時 毒拡散', type: 'BOSS_ARTIFACT', color: '#2ecc71' },
    ELEM_MIXER:     { id: 'elem_mixer',     name: '属性ミキサー', icon: '⚗️', desc: '状態異常2種以上でダメ+50%', type: 'BOSS_ARTIFACT', color: '#ff7675' },

    // E. Unique
    GLASS_CANNON:   { id: 'glass_cannon',   name: 'ガラスのキャノン', icon: '💣', desc: 'ダメ+100% / 被ダメ+100%', type: 'BOSS_ARTIFACT', color: '#fff', stats: { final_damage_mul: 1.0, damage_taken_mul: 1.0 } },
    MERCHANT_SOUL:  { id: 'merchant_soul',  name: '商人の魂', icon: '⚖️', desc: '所持金100G毎にダメ+1%', type: 'BOSS_ARTIFACT', color: '#f39c12' },
    TIME_STOPPER:   { id: 'time_stopper',   name: '懐中時計', icon: '⏱️', desc: 'ボス出現時 5秒時間停止', type: 'BOSS_ARTIFACT', color: '#34495e' }
};

export const MISC_ITEMS = {
    GOLD: { id: 'gold', name: 'Gold', type: 'GOLD', color: '#f1c40f' }
};

export const UNIQUES = {
    VAMPIRE_FANG: {
        id: 'vampire_fang', name: '吸血の牙', type: ARTIFACT_TYPES.AMULET,
        color: '#8e44ad', description: "攻撃命中時 HP回復 +1 (確率)",
        stats: { life_on_hit: 0.8 } 
    },
    MIDAS_RING: {
        id: 'midas_ring', name: 'ミダスの指輪', type: ARTIFACT_TYPES.RING,
        color: '#f1c40f', description: "Gold獲得量 +40%",
        stats: { gold_gain: 0.4 } 
    },
    OMEGA_PRISM: {
        id: 'omega_prism', name: 'Ωプリズム', type: GEM_TYPES.SUPPORT,
        color: '#ecf0f1', description: "全性能強化 (x1.15)",
        damage_mod: 1.15, speed_mod: 1.15, rate_mod: 1.15 
    }
};

export const SHOP_ITEMS = {
    REPAIR: { id: 'repair', name: '緊急修理', cost: 150, type: 'INSTANT', icon: '🔧', desc: "HP 150回復" },
    // MYSTERY: { id: 'mystery', name: '闇市ガチャ', cost: 500, type: 'INSTANT', icon: '🎲', desc: "ランダム装備" }, // Temporarily removed
    DRONE_ATK: { id: 'drone_atk', name: '攻撃ドローン', cost: 400, type: 'UNIT', duration: 1800, icon: '🛸', desc: "30秒間 自動攻撃" },
    DRONE_COL: { id: 'drone_col', name: '回収ドローン', cost: 300, type: 'UNIT', duration: 3600, icon: '🧹', desc: "60秒間 アイテム回収" },
    CLONE: { id: 'clone', name: '影分身', cost: 800, type: 'UNIT', duration: 900, icon: '👥', desc: "15秒間 火力倍増" }
};

export const ENEMY_TIERS = {
    NORMAL: { id: 'NORMAL', name: 'Normal', color: '#e74c3c', scale: 1.0, hpMod: 1.0, xpMod: 1.0, speedMod: 1.0, chance: 0.0 },
    TANK:   { id: 'TANK',   name: 'Tank',   color: '#95a5a6', scale: 1.4, hpMod: 3.0, xpMod: 2.5, speedMod: 0.5, chance: 0.15 }, 
    ROGUE:  { id: 'ROGUE',  name: 'Rogue',  color: '#34495e', scale: 0.8, hpMod: 0.6, xpMod: 1.5, speedMod: 1.4, chance: 0.30 }, 
    SWARM:  { id: 'SWARM',  name: 'Swarm',  color: '#d35400', scale: 0.6, hpMod: 0.3, xpMod: 0.5, speedMod: 1.1, chance: 0.45 },
    MAGIC:  { id: 'MAGIC',  name: 'Magic',  color: '#3498db', scale: 1.2, hpMod: 2.0, xpMod: 3.0, speedMod: 0.9, chance: 0.60 },
    RARE:   { id: 'RARE',   name: 'Rare',   color: '#f1c40f', scale: 1.5, hpMod: 5.0, xpMod: 8.0, speedMod: 1.1, chance: 0.70 },
    BOSS:   { id: 'BOSS',   name: 'Boss',   color: '#8e44ad', scale: 2.5, hpMod: 50.0,xpMod: 50.0,speedMod: 0.6, chance: 0.98 }
};

export const GEMS = {
    FIREBALL: {
        id: 'fireball', name: '火球', type: GEM_TYPES.ACTIVE,
        color: '#ff4d4d', damage: 50, speed: 7, rate: 45, level: 1 
    },
    ARROW: {
        id: 'arrow', name: '連射矢', type: GEM_TYPES.ACTIVE,
        color: '#f1c40f', damage: 20, speed: 14, rate: 12, level: 1 
    },
    NOVA: {
        id: 'nova', name: '氷結ノヴァ', type: GEM_TYPES.ACTIVE,
        color: '#3498db', damage: 30, speed: 4, rate: 90, level: 1 
    },
    // [Updated] Additional Elements (Integrated from game.js injection)
    POISON: {
        id: 'poison', name: 'Venom', type: GEM_TYPES.ACTIVE,
        color: '#8e44ad', damage: 15, rate: 100, speed: 3.5, level: 1 
    },
    PSYCHIC: {
        id: 'psychic', name: 'Mindbend', type: GEM_TYPES.ACTIVE,
        color: '#e056fd', damage: 10, rate: 45, speed: 7, level: 1 
    },
    WATER: {
        id: 'water', name: 'Tidal', type: GEM_TYPES.ACTIVE,
        color: '#3498db', damage: 20, rate: 30, speed: 9, level: 1 
    },
    ELECTRIC: {
        id: 'electric', name: 'Volt', type: GEM_TYPES.ACTIVE,
        color: '#f1c40f', damage: 12, rate: 29, speed: 20, level: 1, chain_count: 3, chain_range: 250 
    },
    ROCK: {
        id: 'rock', name: 'Meteor', type: GEM_TYPES.ACTIVE,
        color: '#7f8c8d', damage: 90, rate: 70, speed: 8, level: 1 // Buffed: Dmg 60->90, Rate 120->70
    },
    PLANT: {
        id: 'plant', name: 'Thorn', type: GEM_TYPES.ACTIVE,
        color: '#2ecc71', damage: 18, rate: 40, speed: 8, level: 1, pierce_count: 2 
    },

    // Supports
    MULTISHOT: {
        id: 'multishot', name: '拡散', type: GEM_TYPES.SUPPORT,
        color: '#2ecc71', projectiles: 1, damage_mod: 0.7 
    },
    POWER: {
        id: 'power', name: '威力', type: GEM_TYPES.SUPPORT,
        color: '#9b59b6', damage_mod: 1.4 
    },
    SPEED: {
        id: 'speed', name: '高速', type: GEM_TYPES.SUPPORT,
        color: '#1abc9c', speed_mod: 1.4, rate_mod: 0.75 
    },
    PIERCE: {
        id: 'pierce', name: '貫通', type: GEM_TYPES.SUPPORT,
        color: '#e056fd', pierce_count: 1, damage_mod: 0.75
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
        stats: { damage_pct: 0.15 } 
    },
    EMERALD_RING: {
        id: 'emerald_ring', name: '緑の指輪', type: ARTIFACT_TYPES.RING,
        color: '#27ae60', description: "発射速度 +15%",
        stats: { rate_pct: 0.15 } 
    },
    SAPPHIRE_AMULET: {
        id: 'sapphire_amulet', name: '青のアミュレット', type: ARTIFACT_TYPES.AMULET,
        color: '#2980b9', description: "クリティカル率 +8%",
        stats: { crit_chance: 0.08 } 
    },
    GOLD_AMULET: {
        id: 'gold_amulet', name: '黄金の首飾り', type: ARTIFACT_TYPES.AMULET,
        color: '#f39c12', description: "XP獲得量 +20%",
        stats: { xp_gain: 0.20 } 
    }
};

export const SKILL_TREE_NODES = {
    // --- CENTER: ORIGIN ---
    0: { id: 0, name: "Core System", label: "コア", type: "START", x: 1000, y: 750, maxRank: 1, stats: {}, connections: [1, 2, 3, 4] },

    // --- NORTH: POWER (Red) ---
    1: { id: 1, name: "Brute Force", label: "威力UP", type: "SMALL", x: 1000, y: 650, maxRank: 5, description: "ダメージ +5%/Lv", stats: { damage_pct: 0.05 }, connections: [11, 12] },
    11: { id: 11, name: "Deadly Aim", label: "会心率", type: "SMALL", x: 920, y: 550, maxRank: 5, description: "クリティカル率 +3%/Lv", stats: { crit_chance: 0.03 }, connections: [13] },
    12: { id: 12, name: "Heavy Impact", label: "会心ダメ", type: "SMALL", x: 1080, y: 550, maxRank: 5, description: "クリティカル倍率 +15%/Lv", stats: { crit_damage: 0.15 }, connections: [13] },
    13: { id: 13, name: "Executioner", label: "処刑人", type: "MEDIUM", x: 1000, y: 450, maxRank: 3, description: "ダメージ +8%, クリティカル率 +2%", stats: { damage_pct: 0.08, crit_chance: 0.02 }, connections: [100] },
    
    // KEYSTONE: SYSTEM HACKER
    100: { id: 100, name: "System Hacker", label: "システムハッカー", type: "KEYSTONE", x: 1000, y: 350, maxRank: 1,
           description: "HITダメージ -30% / 状態異常(DoT)威力 +80%（合計DPS目安 +50%）",
           stats: { hit_damage_mul_pct: -0.30, dot_power_pct: 0.80 }, connections: [] },

    // --- SOUTH: SURVIVAL & ECONOMY (Yellow) ---
    2: { id: 2, name: "Reinforced Hull", label: "HP強化", type: "SMALL", x: 1000, y: 850, maxRank: 5, description: "最大HP +150/Lv", stats: { hp_max: 150 }, connections: [21, 22] },
    21: { id: 21, name: "Scavenger", label: "金策", type: "SMALL", x: 920, y: 950, maxRank: 5, description: "Gold/XP獲得 +6%/Lv", stats: { xp_gain: 0.06, gold_gain: 0.06 }, connections: [23] },
    22: { id: 22, name: "Nano Repair", label: "自己修復", type: "SMALL", x: 1080, y: 950, maxRank: 3, description: "Hit時HP回復 +2/Lv", stats: { life_on_hit: 2 }, connections: [23] },
    23: { id: 23, name: "Fortify", label: "装甲化", type: "MEDIUM", x: 1000, y: 1050, maxRank: 3, description: "被ダメージ -4%/Lv", stats: { damage_reduction: 0.04 }, connections: [200] },

    // KEYSTONE: FORTRESS PROTOCOL
    200: { id: 200, name: "Fortress Protocol", label: "フォートレス・プロトコル", type: "KEYSTONE", x: 1000, y: 1150, maxRank: 1,
           description: "最大HP +2200 / 被ダメージ -25% / Hit時HP回復 +3",
           stats: { hp_max: 2200, damage_reduction: 0.25, life_on_hit: 3 }, connections: [] },

    // --- EAST: TECH & SPEED (Green) ---
    3: { id: 3, name: "Rapid Fire", label: "連射", type: "SMALL", x: 1100, y: 750, maxRank: 5, description: "攻撃速度 +5%/Lv", stats: { rate_pct: 0.05 }, connections: [31, 32] },
    31: { id: 31, name: "Ballistics", label: "弾速", type: "SMALL", x: 1200, y: 680, maxRank: 5, description: "弾速 +10%/Lv", stats: { proj_speed_pct: 0.10 }, connections: [33] },
    32: { id: 32, name: "Multitask", label: "並列処理", type: "SMALL", x: 1200, y: 820, maxRank: 3, description: "サポート効果 +5%/Lv", stats: { support_effect: 0.05 }, connections: [33] },
    33: { id: 33, name: "Network", label: "ネットワーク", type: "MEDIUM", x: 1300, y: 750, maxRank: 3, description: "連鎖範囲 +20%, 攻撃速度 +3%", stats: { chain_range_pct: 0.2, rate_pct: 0.03 }, connections: [300] },

    // KEYSTONE: DRONE ORCHESTRATOR
    300: { id: 300, name: "Drone Orchestrator", label: "ドローン統制", type: "KEYSTONE", x: 1400, y: 750, maxRank: 1,
           description: "サポート効果 +25% / サポートGEMレベル +2 / 攻撃速度 +10%",
           stats: { support_effect: 0.25, support_level_bonus: 2, rate_pct: 0.10 }, connections: [] },

    // --- WEST: MAGIC & AOE (Blue) ---
    4: { id: 4, name: "Expansion", label: "範囲拡大", type: "SMALL", x: 900, y: 750, maxRank: 5, description: "範囲サイズ +8%/Lv", stats: { aoe_pct: 0.08 }, connections: [41, 42] },
    41: { id: 41, name: "Elemental Focus", label: "属性強化", type: "SMALL", x: 800, y: 680, maxRank: 5, description: "ダメージ +6%, 範囲 +2%", stats: { damage_pct: 0.06, aoe_pct: 0.02 }, connections: [43] },
    42: { id: 42, name: "Overclock", label: "OC", type: "SMALL", x: 800, y: 820, maxRank: 3, description: "攻撃速度 +4%, 弾速 +5%", stats: { rate_pct: 0.04, proj_speed_pct: 0.05 }, connections: [43] },
    43: { id: 43, name: "Cataclysm", label: "カタクリズム", type: "MEDIUM", x: 700, y: 750, maxRank: 3, description: "範囲サイズ +15%, ダメージ +5%", stats: { aoe_pct: 0.15, damage_pct: 0.05 }, connections: [400] },

    // KEYSTONE: ARC REACTOR (Buffed: x1.2 -> x1.5)
    400: { id: 400, name: "Arc Reactor", label: "アーク炉心", type: "KEYSTONE", x: 600, y: 750, maxRank: 1,
           description: "クリティカル率が0になる代わりに、範囲 +30% / 連鎖範囲 +30% / 最終ダメージ x1.5",
           stats: { crit_chance: -10.0, aoe_pct: 0.30, chain_range_pct: 0.30, final_damage_mul: 1.5 }, connections: [] }
};

export const STAGE_CONFIG = [
    { level: 1, name: "SURVIVAL OPS", waveCount: 10, enemyScale: 1.0 }
];

export const CREW_DATA = {
    1: { 
        id: 1, name: "Cmdr. Wolf", job: "司令官", imgBase: "Character/1",
        desc: "全ダメージ +20%", stats: { damage_pct: 0.20 },
        ability: { id: 'alpha_command', name: 'Alpha Command', desc: '12秒間 ダメージ+50% / 会心+20%', duration: 720, cd: 3600 }
    },
    2: { 
        id: 2, name: "Pilot Luna", job: "操縦士", imgBase: "Character/2",
        desc: "攻撃速度 +20%", stats: { rate_pct: 0.20 },
        ability: { id: 'hyper_thruster', name: 'Hyper Thruster', desc: '8秒間 攻撃速度+100%', duration: 480, cd: 2700 }
    },
    3: { 
        id: 3, name: "Eng. R-22", job: "技師ロボ", imgBase: "Character/3",
        desc: "クリティカル率 +10% / 範囲 +15%", stats: { crit_chance: 0.10, aoe_pct: 0.15 },
        ability: { id: 'emp_blast', name: 'EMP Blast', desc: '全画面攻撃 + スタン付与', duration: 0, cd: 2400 }
    },
    4: { 
        id: 4, name: "Dr. Xeno", job: "科学者", imgBase: "Character/4",
        desc: "被ダメージ -15% / HP自然回復", stats: { damage_reduction: 0.15, hp_regen: 2 },
        ability: { id: 'meltdown_rain', name: 'Meltdown Rain', desc: '全敵を溶解(被ダメ2倍) + 猛毒', duration: 600, cd: 3600 }
    },
    5: { 
        id: 5, name: "Trader Mida", job: "闇商人", imgBase: "Character/5",
        desc: "Gold/XP獲得 +30%", stats: { gold_gain: 0.30, xp_gain: 0.30 },
        ability: { id: 'bribe', name: 'Bribe (賄賂)', desc: '敵を消滅させGoldに変換', duration: 0, cd: 3000 }
    }
};

export const UI_STRINGS = {
    LEVEL_UP: "SYSTEM UPGRADE",
    GAME_OVER: "SIGNAL LOST",
    STAGE_CLEAR: "SECTOR SECURED",
    EMPTY_SLOT: "EMPTY"
};