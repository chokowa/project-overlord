/**
 * @fileoverview システム全体で使用する定数、設定値、およびメッセージ定義
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    TURRET_RANGE: 500,
    
    // --- バランス調整項目 ---
    BASE_FIRE_RATE: 20,    // 0.33秒に1発 (大幅強化: 以前は45)
    BASE_BULLET_DAMAGE: 40,// 威力アップ (以前は30)
    BASE_MAX_HP: 500,      // 基地耐久力5倍 (以前は100)
    
    ENEMY_SPAWN_CHANCE: 0.012, // 出現頻度を少しマイルドに
    ENEMY_MIN_HP: 30,      // 雑魚敵の下限HP
    ENEMY_MAX_HP: 80,      // 敵の上限HP (以前は180)
    
    DEFAULT_LOG_VISIBILITY: false,
};

export const UPGRADE_CONFIG = {
    COST_FIRE_RATE: 200,   // 購入しやすく緩和 (以前は400)
    COST_RANGE: 150,       // (以前は300)
    COST_MULTI_SHOT: 800,  // (以前は1500)
    SCALE_FACTOR: 1.3,     // コスト上昇を緩やかに (以前は1.5)
};

export const UI_STRINGS = {
    LABEL_DISTANCE: "推定距離: ",
    LABEL_RUN_BUTTON: "RUN (開始/適用)",
    LABEL_TOGGLE_BUTTON: "距離表示切替",
    LABEL_HP: "BASE HP: ",
    LABEL_SCORE: "SCORE: ",
    
    LABEL_UP_FIRE_RATE: "攻撃速度 UP",
    LABEL_UP_RANGE: "射程距離 UP",
    LABEL_UP_MULTI: "マルチショット追加",

    ERROR_BLOCKLY_LOAD_FAILED: "Blocklyの初期化に失敗しました。",
    ERROR_COMPILATION_FAILED: "ロジックのコンパイル中にエラーが発生しました。",
    SUCCESS_LOGIC_APPLIED: "ロジック適用完了！戦闘開始",
    WARN_EMPTY_CODE: "ブロックが正しく繋がっていない可能性があります",
    MSG_SCANNING: "索敵中...",
    MSG_ENEMIES_IN_RANGE: "射程内の敵数: ",
    MSG_WAITING: "プログラムを入力して RUN を押してください",
    MSG_GAME_OVER: "基地が破壊されました。リロードして再挑戦してください。",
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