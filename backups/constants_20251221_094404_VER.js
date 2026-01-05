/**
 * @fileoverview システム全体で使用する定数、設定値、およびメッセージ定義
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    TURRET_RANGE: 500,
    ENEMY_SPAWN_CHANCE: 0.01,
    DEFAULT_LOG_VISIBILITY: false,
};

export const UI_STRINGS = {
    LABEL_DISTANCE: "推定距離: ",
    LABEL_RUN_BUTTON: "RUN (適用)",
    LABEL_TOGGLE_BUTTON: "距離表示切替",
    ERROR_BLOCKLY_LOAD_FAILED: "Blocklyの初期化に失敗しました。",
    ERROR_COMPILATION_FAILED: "ロジックのコンパイル中にエラーが発生しました。",
    SUCCESS_LOGIC_APPLIED: "ロジックを適用しました",
    WARN_EMPTY_CODE: "ブロックが正しく繋がっていない可能性があります",
};

export const COLOR_THEME = {
    CANVAS_BACKGROUND: '#222',
    TURRET_BODY: 'blue',
    ENEMY_NORMAL: 'red',
    ENEMY_TARGETED: 'yellow',
    TARGET_LINE: 'rgba(255, 255, 0, 0.5)',
};