/**
 * @fileoverview システム全体で使用する定数、設定値、およびメッセージ定義
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    TURRET_RANGE: 500,
    BASE_FIRE_RATE: 45,    // 初期発射間隔（フレーム数・値が小さいほど速い）
    BASE_BULLET_DAMAGE: 30,
    BASE_MAX_HP: 100,
    ENEMY_SPAWN_CHANCE: 0.015,
    DEFAULT_LOG_VISIBILITY: false,
};

export const UPGRADE_CONFIG = {
    COST_FIRE_RATE: 400,
    COST_RANGE: 300,
    COST_MULTI_SHOT: 1500,
    SCALE_FACTOR: 1.5,     // レベルアップごとの必要コスト上昇倍率
};

export const UI_STRINGS = {
    LABEL_DISTANCE: "推定距離: ",
    LABEL_RUN_BUTTON: "RUN (開始/適用)",
    LABEL_TOGGLE_BUTTON: "距離表示切替",
    LABEL_HP: "BASE HP: ",
    LABEL_SCORE: "SCORE: ",
    
    // アップグレード用ラベル
    LABEL_UP_FIRE_RATE: "攻撃速度 UP",
    LABEL_UP_RANGE: "射程距離 UP",
    LABEL_UP_MULTI: "マルチショット追加",

    // エラー・システムメッセージ
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
    BUTTON_ACTIVE: '#FFD700', // RUNボタンを押した時の強調色
};