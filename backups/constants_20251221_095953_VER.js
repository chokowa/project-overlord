/**
 * @fileoverview システム全体で使用する定数、設定値、およびメッセージ定義
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    TURRET_RANGE: 500,
    FIRE_RATE: 30,         // 発射間隔（フレーム数）
    BULLET_SPEED: 7,       // 弾の速度
    BULLET_DAMAGE: 25,     // 1発あたりのダメージ
    BASE_MAX_HP: 100,      // 基地の最大体力
    ENEMY_SPAWN_CHANCE: 0.015, 
    DEFAULT_LOG_VISIBILITY: false,
};

export const UI_STRINGS = {
    LABEL_DISTANCE: "推定距離: ",
    LABEL_RUN_BUTTON: "RUN (適用)",
    LABEL_TOGGLE_BUTTON: "距離表示切替",
    LABEL_HP: "BASE HP: ",
    LABEL_SCORE: "SCORE: ",
    ERROR_BLOCKLY_LOAD_FAILED: "Blocklyの初期化に失敗しました。",
    ERROR_COMPILATION_FAILED: "ロジックのコンパイル中にエラーが発生しました。",
    SUCCESS_LOGIC_APPLIED: "ロジックを適用しました",
    WARN_EMPTY_CODE: "ブロックが正しく繋がっていない可能性があります",
    MSG_SCANNING: "索敵中...",
    MSG_ENEMIES_IN_RANGE: "射程内の敵数: ",
    MSG_GAME_OVER: "GAME OVER - ページをリロードして再挑戦",
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