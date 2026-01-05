/**
 * @fileoverview システム全体で使用する定数、設定値、ステージデータ
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    TURRET_RANGE: 500,
    
    // 基本パラメータ
    BASE_FIRE_RATE: 20,    
    BASE_BULLET_DAMAGE: 40,
    BASE_MAX_HP: 500,     
    
    DEFAULT_LOG_VISIBILITY: false,
};

// 敵の種類ごとのステータス
export const ENEMY_TYPES = {
    NORMAL: { hp: 40, speed: 1.0, color: '#e74c3c', radius: 12, score: 10 },
    SPEEDY: { hp: 20, speed: 2.5, color: '#9b59b6', radius: 10, score: 20 }, // 紫：速いが脆い
    TANK:   { hp: 150, speed: 0.5, color: '#27ae60', radius: 16, score: 30 } // 緑：遅いが硬い
};

// ステージ構成
export const STAGE_CONFIG = [
    {
        level: 1,
        title: "Stage 1: 初陣",
        description: "基本ブロックを使って迫りくる敵を撃退せよ。",
        unlocks: ['TARGET'], // ターゲットカテゴリのみ
        waves: [
            { count: 5, interval: 120, types: ['NORMAL'] },
            { count: 10, interval: 100, types: ['NORMAL'] }
        ]
    },
    {
        level: 2,
        title: "Stage 2: 速さと重さ",
        description: "高速敵(紫)と重装甲(緑)が出現。「ロジック」ブロックで賢く狙い撃て。",
        unlocks: ['TARGET', 'LOGIC'], // ロジック解禁
        waves: [
            { count: 5, interval: 60, types: ['SPEEDY'] },
            { count: 3, interval: 150, types: ['TANK'] },
            { count: 15, interval: 80, types: ['SPEEDY', 'NORMAL', 'TANK'] }
        ]
    },
    {
        level: 3,
        title: "Stage 3: 総力戦",
        description: "敵の数と質が向上。アップグレードと効率的なロジックで対抗せよ。",
        unlocks: ['TARGET', 'LOGIC'],
        waves: [
            { count: 20, interval: 50, types: ['NORMAL', 'SPEEDY'] },
            { count: 5, interval: 100, types: ['TANK', 'TANK', 'SPEEDY'] },
            { count: 30, interval: 40, types: ['NORMAL', 'SPEEDY', 'TANK'] }
        ]
    }
];

// ツールボックス定義（XML文字列）
export const TOOLBOX_CATEGORIES = {
    TARGET: `
        <category name="ターゲット" colour="#a55b5b">
            <block type="get_enemies"></block>
            <block type="select_enemy"></block>
            <block type="set_target"></block>
        </category>`,
    LOGIC: `
        <category name="ロジック" colour="#5b67a5">
            <block type="controls_if"></block>
            <block type="logic_compare"></block>
            <block type="logic_operation"></block>
            <block type="logic_boolean"></block>
        </category>`
};

export const UPGRADE_CONFIG = {
    COST_FIRE_RATE: 200,
    COST_RANGE: 150,
    COST_MULTI_SHOT: 800,
    SCALE_FACTOR: 1.3,
};

export const UI_STRINGS = {
    LABEL_DISTANCE: "推定距離: ",
    LABEL_RUN_BUTTON: "RUN (作戦開始)",
    LABEL_TOGGLE_BUTTON: "距離表示切替",
    LABEL_HP: "BASE HP: ",
    LABEL_SCORE: "SCORE: ",
    LABEL_STAGE: "STAGE: ",
    LABEL_WAVE: "WAVE: ",
    
    LABEL_UP_FIRE_RATE: "攻撃速度 UP",
    LABEL_UP_RANGE: "射程距離 UP",
    LABEL_UP_MULTI: "マルチショット追加",

    ERROR_BLOCKLY_LOAD_FAILED: "Blocklyの初期化に失敗しました。",
    ERROR_COMPILATION_FAILED: "ロジックエラー",
    SUCCESS_LOGIC_APPLIED: "システムオールグリーン。作戦開始。",
    WARN_EMPTY_CODE: "ブロックが配置されていません",
    
    MSG_SCANNING: "索敵中...",
    MSG_ENEMIES_IN_RANGE: "射程内: ",
    MSG_WAITING: "作戦を立案(プログラム)して RUN を押してください",
    MSG_GAME_OVER: "作戦失敗... リロードして再挑戦",
    MSG_STAGE_CLEAR: "ステージクリア！次のブロックが解放されました。",
    MSG_ALL_CLEAR: "全ステージクリア！おめでとうございます！",
};

export const COLOR_THEME = {
    CANVAS_BACKGROUND: '#1a1a1a',
    TURRET_BODY: '#3498db',
    ENEMY_NORMAL: '#e74c3c',
    ENEMY_TARGETED: '#f1c40f',
    TARGET_LINE: 'rgba(241, 196, 15, 0.2)',
    BULLET: '#f39c12',
    PARTICLE: '#e67e22',
    BUTTON_ACTIVE: '#FFD700', 
};