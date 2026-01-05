/**
 * @fileoverview ゲーム全体で使用する定数および文字列定義
 */

export const GAME_SETTINGS = {
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    TURRET_RANGE: 300,
    ENEMY_SPAWN_INTERVAL: 2000,
    DEFAULT_LOG_VISIBILITY: false,
};

export const UI_STRINGS = {
    LOG_DISTANCE_PREFIX: "Distance to target: ",
    ERROR_BLOCKLY_NOT_LOADED: "Blocklyのロードに失敗しました。",
    ERROR_INVALID_TARGET: "無効なターゲットが選択されました。",
};

export const ENTITY_TYPES = {
    TURRET: "TURRET",
    ENEMY: "ENEMY",
};