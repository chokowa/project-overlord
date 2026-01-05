/**
 * @fileoverview 設定管理マネージャー (ConfigManager)
 * game.js と ui.js で重複していた定義を統合。
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 */
import { GAME_SETTINGS, GEMS, EFFECT_CONSTANTS, ENEMY_TIERS } from './constants.js';

export class ConfigManager {
    constructor() {
        this.storageKey = 'PROJECT_OVERLORD_CONFIG_ULTIMATE';
        this.isVisible = false;
        // パネル要素の参照保持用
        this.panel = null;
        this.isPausedCache = false;
        
        this.init();
    }

    init() {
        // 1. Inject Default Settings if missing (安全策)
        if (GAME_SETTINGS.ROCK_SPIKES_BASE === undefined) GAME_SETTINGS.ROCK_SPIKES_BASE = 3;
        if (GAME_SETTINGS.ROCK_SPIKES_VAR === undefined) GAME_SETTINGS.ROCK_SPIKES_VAR = 3;
        if (GAME_SETTINGS.LEECH_RATIO === undefined) GAME_SETTINGS.LEECH_RATIO = 0.02;
        if (GAME_SETTINGS.ENEMY_BASE_HP === undefined) GAME_SETTINGS.ENEMY_BASE_HP = 60;
        if (GAME_SETTINGS.ENEMY_PROJECTILE_DAMAGE === undefined) GAME_SETTINGS.ENEMY_PROJECTILE_DAMAGE = 15;

        // 2. Load Saved Data
        this.load();

        // 3. Create UI
        // DOMContentLoadedを待つ必要が場合によってはあるが、モジュール読み込み時点ならbodyはある程度安全と仮定
        // 安全のため、document.bodyが存在するかチェックしてから実行
        if (document.body) {
            this.createUI();
        } else {
            window.addEventListener('DOMContentLoaded', () => this.createUI());
        }
        
        console.log("Ultimate ConfigManager V3 Initialized (Module)");
    }

    load() {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.gems) {
                    Object.keys(parsedData.gems).forEach(key => {
                        if (GEMS[key]) Object.assign(GEMS[key], parsedData.gems[key]);
                    });
                }
                if (parsedData.settings) Object.assign(GAME_SETTINGS, parsedData.settings);
                if (parsedData.effects) Object.assign(EFFECT_CONSTANTS, parsedData.effects);
                if (parsedData.enemies) {
                    Object.keys(parsedData.enemies).forEach(key => {
                        if (ENEMY_TIERS[key]) Object.assign(ENEMY_TIERS[key], parsedData.enemies[key]);
                    });
                }
                console.log("Config loaded from LocalStorage.");
            } catch (errorInstance) {
                console.error("Failed to load config:", errorInstance);
            }
        }
    }

    save() {
        const dataToSave = {
            gems: GEMS,
            settings: GAME_SETTINGS,
            effects: EFFECT_CONSTANTS,
            enemies: ENEMY_TIERS
        };
        localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        
        if (window.showToast) {
            window.showToast("CONFIG SAVED!", "#2ecc71");
        } else {
            console.log("CONFIG SAVED!");
        }
    }

    reset() {
        if (confirm("Reset ALL settings to defaults? This will reload the page.")) {
            localStorage.removeItem(this.storageKey);
            location.reload();
        }
    }

    createUI() {
        // 既存のボタンやパネルがあれば削除（再生成時用）
        const oldButton = document.getElementById('config-btn');
        if (oldButton) oldButton.remove();
        const oldPanel = document.getElementById('config-panel');
        if (oldPanel) oldPanel.remove();

        // スタイルの注入
        if (!document.getElementById('config-manager-style')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'config-manager-style';
            styleElement.textContent = `
                #config-panel { display: none; position: absolute; top: 50px; right: 10px; width: 420px; max-height: 85vh; overflow-y: auto; background: rgba(10, 10, 15, 0.95); border: 2px solid #00d2d3; z-index: 2000; padding: 15px; color: #fff; font-family: monospace; box-shadow: 0 0 20px rgba(0,0,0,0.8); }
                .cfg-section { margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 10px; }
                .cfg-header { font-size: 16px; font-weight: bold; color: #00d2d3; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
                .cfg-sub-header { font-size: 14px; font-weight: bold; color: #f1c40f; margin-top: 10px; margin-bottom: 5px; border-left: 3px solid #f1c40f; padding-left: 5px; }
                .cfg-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding: 2px 0; }
                .cfg-row:hover { background: rgba(255,255,255,0.05); }
                .cfg-row label { font-size: 12px; color: #bdc3c7; flex: 1; }
                .cfg-row input { width: 80px; background: #222; border: 1px solid #555; color: #fff; padding: 2px 5px; text-align: right; font-family: monospace; }
                .cfg-actions { display: flex; gap: 10px; margin-top: 20px; position: sticky; bottom: 0; background: rgba(10,10,15,0.9); padding: 10px 0; border-top: 1px solid #444; }
                .cfg-btn { flex: 1; padding: 8px; cursor: pointer; border: none; color: #fff; font-weight: bold; transition: 0.2s; }
                .cfg-btn.save { background: #27ae60; } .cfg-btn.save:hover { background: #2ecc71; }
                .cfg-btn.reset { background: #c0392b; } .cfg-btn.reset:hover { background: #e74c3c; }
                .cfg-btn.close { background: #7f8c8d; } .cfg-btn.close:hover { background: #95a5a6; }
            `;
            document.head.appendChild(styleElement);
        }

        this.panel = document.createElement('div');
        this.panel.id = 'config-panel';
        document.body.appendChild(this.panel);

        this.renderContent();
    }

    renderContent() {
        let htmlContent = '';

        // 1. GAME SETTINGS
        htmlContent += `<div class="cfg-section"><div class="cfg-header">Game Settings</div>`;
        Object.keys(GAME_SETTINGS).forEach(key => {
            if (typeof GAME_SETTINGS[key] === 'number') {
                htmlContent += this.createInputRow('GAME_SETTINGS', key, GAME_SETTINGS[key]);
            }
        });
        htmlContent += `</div>`;

        // 2. ENEMY TIERS
        htmlContent += `<div class="cfg-section"><div class="cfg-header">Enemy Tiers</div>`;
        Object.keys(ENEMY_TIERS).forEach(tierKey => {
            const tierData = ENEMY_TIERS[tierKey];
            htmlContent += `<div class="cfg-sub-header">${tierKey} (${tierData.id})</div>`;
            Object.keys(tierData).forEach(prop => {
                if (typeof tierData[prop] === 'number') {
                    htmlContent += this.createInputRow(`ENEMY_TIERS.${tierKey}`, prop, tierData[prop]);
                }
            });
        });
        htmlContent += `</div>`;

        // 3. EFFECT CONSTANTS
        htmlContent += `<div class="cfg-section"><div class="cfg-header">Effect Constants</div>`;
        Object.keys(EFFECT_CONSTANTS).forEach(key => {
             if (typeof EFFECT_CONSTANTS[key] === 'number') {
                htmlContent += this.createInputRow('EFFECT_CONSTANTS', key, EFFECT_CONSTANTS[key]);
            }
        });
        htmlContent += `</div>`;

        // 4. GEMS
        htmlContent += `<div class="cfg-section"><div class="cfg-header">Skill Parameters</div>`;
        Object.values(GEMS).forEach(gem => {
            htmlContent += `<div class="cfg-sub-header">${gem.name} (${gem.id})</div>`;
            Object.keys(gem).forEach(prop => {
                if (typeof gem[prop] === 'number') {
                    htmlContent += this.createInputRow(`GEMS.${gem.id}`, prop, gem[prop]);
                }
            });
        });
        htmlContent += `</div>`;

        // Actions
        htmlContent += `
            <div class="cfg-actions">
                <button class="cfg-btn save" onclick="window.configManager.save()">SAVE CONFIG</button>
                <button class="cfg-btn reset" onclick="window.configManager.reset()">RESET DEFAULTS</button>
                <button class="cfg-btn close" onclick="window.configManager.togglePanel()">CLOSE</button>
            </div>
        `;

        this.panel.innerHTML = htmlContent;
    }

    createInputRow(context, key, val) {
        return `
            <div class="cfg-row">
                <label>${key}</label>
                <input type="number" step="any" value="${val}" 
                    onchange="window.configManager.updateValue('${context}', '${key}', this.value)">
            </div>
        `;
    }

    updateValue(context, key, val) {
        const numericValue = parseFloat(val);
        if (isNaN(numericValue)) return;

        if (context === 'GAME_SETTINGS') {
            GAME_SETTINGS[key] = numericValue;
        } else if (context === 'EFFECT_CONSTANTS') {
            EFFECT_CONSTANTS[key] = numericValue;
        } else if (context.startsWith('GEMS.')) {
            const gemId = context.split('.')[1];
            const gemKey = Object.keys(GEMS).find(k => GEMS[k].id === gemId);
            if (gemKey && GEMS[gemKey]) GEMS[gemKey][key] = numericValue;
        } else if (context.startsWith('ENEMY_TIERS.')) {
            const tierKey = context.split('.')[1];
            if (ENEMY_TIERS[tierKey]) ENEMY_TIERS[tierKey][key] = numericValue;
        }
    }

    togglePanel() {
        this.isVisible = !this.isVisible;
        this.panel.style.display = this.isVisible ? 'block' : 'none';
        const engineState = window.engineState;

        if (this.isVisible) {
            this.renderContent(); 
            if (engineState) {
                this.isPausedCache = engineState.isPaused;
                engineState.isPaused = true;
            }
        } else {
            if (engineState) {
                // 元の状態に戻す、ただし元々ポーズされてなかった場合のみ解除
                engineState.isPaused = this.isPausedCache || false;
            }
        }
    }
}

// グローバルインスタンスの作成 (互換性維持)
if (window.configManager) delete window.configManager;
window.configManager = new ConfigManager();