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

/**
 * ゲームで使用する画像アセットの格納場所
 * @type {Object.<string, HTMLImageElement|null>}
 */
export const GAME_ASSETS = {};

/**
 * アセットのパス定義
 */
const ASSET_PATHS = {
    // Turret Parts
    BASE: 'assets/BASE.png',
    BARREL_FIREBALL: 'assets/FB.png',
    BARREL_NOVA: 'assets/NB.png',
    BARREL_ARROW: 'assets/AR.png',
    BARREL_POISON: 'assets/PO.png',
    BARREL_ROCK: 'assets/RC.png',
    BARREL_PSYCHIC: 'assets/PY.png',
    BARREL_WATER: 'assets/WA.png',
    BARREL_ELECTRIC: 'assets/EL.png',
    BARREL_PLANT: 'assets/PL.png'
};

/**
 * 定義された全画像を非同期で読み込む
 * @returns {Promise<void>}
 */
export async function loadGameAssets() {
    const promises = Object.entries(ASSET_PATHS).map(([key, path]) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                GAME_ASSETS[key] = img;
                resolve(true);
            };
            img.onerror = () => {
                console.warn(`[AssetLoader] Failed to load image: ${path}`);
                GAME_ASSETS[key] = null; // 読み込み失敗時はnull (フォールバック用)
                resolve(false);
            };
        });
    });

    await Promise.all(promises);
    console.log("[AssetLoader] All assets processing complete.");
}