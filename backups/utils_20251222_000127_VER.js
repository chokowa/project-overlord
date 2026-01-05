/**
 * @fileoverview 汎用ユーティリティ関数
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 */

/**
 * ユニークIDを生成する
 * @returns {string} UUID文字列
 */
export function generateUuid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * アイテムテンプレートからインスタンスを作成する
 * @param {Object} template - アイテムの定義オブジェクト
 * @param {number} level - アイテムレベル
 * @returns {Object} インスタンス化されたアイテムオブジェクト
 */
export function createItemInstance(template, level = 1) {
    return {
        ...template,
        uuid: generateUuid(),
        level: level,
    };
}