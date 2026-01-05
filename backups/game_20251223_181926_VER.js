/**
 * @fileoverview 究極の防衛ゲーム: Project OVERLORD Core Logic
 * 変更点: モジュール分割によるリファクタリング (Utils, Effects, UI分離)
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 */
import { GAME_SETTINGS, GEMS, GEM_TYPES, ARTIFACTS, ARTIFACT_TYPES, BOSS_ARTIFACTS, MISC_ITEMS, UNIQUES, SHOP_ITEMS, ENEMY_TIERS, STAGE_CONFIG, BOSS_WAVES, UI_STRINGS, CREW_DATA, EFFECT_CONSTANTS } from './constants.js';
import { generateUuid, createItemInstance } from './utils.js';
import { FloatingText, ParticleEffect, ShockwaveEffect, StarField } from './effects.js';
import { refreshInventoryInterface, updateMainScreenLoadout, updateHudDisplay, refreshShopInterface } from './ui.js';

/** ゲーム内描画・計算用定数 */
const RENDER_CONSTANTS = {
    PROJECTILE_SIZE: 10,
    ENEMY_HITBOX_SIZE: 30,
    TURRET_POS_X: GAME_SETTINGS.SCREEN_WIDTH / 2, 
    TURRET_POS_Y: GAME_SETTINGS.CASTLE_Y,         
    EFFECT_SHADOW_BLUR: 20,
    DROP_SIZE: 24,          
    DROP_FLOAT_SPEED: 0.05, 
    DROP_FLOAT_RANGE: 5     
};

/** 内部ロジック用定数 */
const SELECTION_CRITERIA = {
    MIN_DIST: "MIN_DIST",
    MAX_HP: "MAX_HP",
    MIN_HP: "MIN_HP"
};

/** フィールド上に落ちているアイテムクラス */
class DropItem {
    constructor(x, y, itemTemplate) {
        this.uuid = generateUuid();
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.itemTemplate = itemTemplate;
        this.floatTimer = Math.random() * Math.PI * 2;
        this.creationTime = Date.now();
    }

    update() {
        this.floatTimer += RENDER_CONSTANTS.DROP_FLOAT_SPEED;
        this.y = this.baseY + Math.sin(this.floatTimer) * RENDER_CONSTANTS.DROP_FLOAT_RANGE;
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.shadowBlur = 10;
        context.shadowColor = this.itemTemplate.color;
        
        context.fillStyle = "rgba(20, 20, 30, 0.8)";
        context.strokeStyle = this.itemTemplate.color;
        context.lineWidth = 2;
        const size = RENDER_CONSTANTS.DROP_SIZE;
        const halfSize = size / 2;
        context.beginPath();
        context.roundRect(-halfSize, -halfSize, size, size, 4);
        context.fill();
        context.stroke();

        context.shadowBlur = 0;
        context.fillStyle = "#fff";
        context.font = "14px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        
        let icon = "?";
        if (this.itemTemplate.type === GEM_TYPES.ACTIVE) icon = "⚔️";
        else if (this.itemTemplate.type === GEM_TYPES.SUPPORT) icon = "💠";
        else if (this.itemTemplate.type === ARTIFACT_TYPES.RING) icon = "💍";
        else if (this.itemTemplate.type === ARTIFACT_TYPES.AMULET) icon = "🧿";
        else if (this.itemTemplate.type === 'GOLD') icon = "💰";

        context.fillText(icon, 0, 1);
        context.restore();
    }
}

/** ゲームエンジンクラス: 全体の状態とロジックを統括 */
class GameEngine {
    constructor() {
        this.baseIntegrity = GAME_SETTINGS.BASE_MAX_HP;
        this.experiencePoints = 0;
        this.currentLevel = 1;
        this.skillPoints = 0; 
        this.allocatedNodes = { 0: 1 };

        this.isPaused = false;
        this.isGameOver = false;
        this.currentStageIndex = 0;
        this.currentWaveNumber = 1;
        this.waveProgress = 0;      
        this.waveQuota = 40; // 10 -> 40: Wave 1のプレイ時間を約1分半に延長
        this.isBossWave = false;
        this.gold = 0;

        /** @type {(Object|null)[]} */
        this.equippedGems = [null, null, null];
        this.altGems = [null, null, null]; 
        this.currentLoadoutId = 1;
        /** @type {Object} */
        this.equippedArtifacts = {
            [ARTIFACT_TYPES.RING]: null,
            [ARTIFACT_TYPES.AMULET]: null
        };
        this.inventory = [];
        this.activeDrops = [];
        this.activeSupportUnits = []; 
        this.manualTargetId = null;
        this.inventoryDirty = false; 
        this.purchasedShopItems = [];
        this.artifacts = []; // Obtained Boss Artifacts

        this.stats = {
            damage_pct: 0, rate_pct: 0, crit_chance: 0, xp_gain: 0,
            hp_max: 0, speed_pct: 0, proj_speed_pct: 0, support_effect: 0, self_damage: 0
        };
        
        this.energy = 100;
        this.maxEnergy = 100;
        this.isShieldActive = false;
        this.shieldTimer = 0;
        this.shieldImpactTimer = 0; 
        this.emergencyCooldown = 0; // For Emergency Core
        this.timeStopTimer = 0; // Artifact: Time Stopper

        // Crew System
        this.selectedCrew = []; // Array of Crew IDs (e.g. [1, 2])
        this.crewStatusSuffix = 'a'; // 'a'=Normal, 'b'=Damage, 'c'=Pinch
        this.crewDamageTimer = 0;
        this._lastIntegrity = this.baseIntegrity;

        this.crewCooldowns = {};   // { crewId: framesRemaining }
        this.crewActiveBuffs = {}; // { crewId: framesRemaining }
        this.bonusStats = {};      // Permanent stats from Level Up choices

        // [Patch] Game Speed Control
        this.timeScale = 0.7; // Default 0.7 (Slow)
        this.speedLevel = 0;  // 0: x0.7, 1: x1.0, 2: x2.0
        this.accumulator = 0;
    }

    toggleGameSpeed() {
        this.speedLevel = (this.speedLevel + 1) % 3;
        if (this.speedLevel === 0) this.timeScale = 0.7;
        else if (this.speedLevel === 1) this.timeScale = 1.0;
        else if (this.speedLevel === 2) this.timeScale = 2.0;

        const btn = document.getElementById('speed-btn');
        if (btn) {
            // Internal 0.7 -> Display x1.0 (Base)
            // Internal 1.0 -> Display x1.5
            // Internal 2.0 -> Display x3.0
            btn.innerHTML = this.speedLevel === 0 ? "▶️ x1.0" : (this.speedLevel === 1 ? "⏩️ x1.5" : "⏩️⏩️ x3.0");
        }
    }

    reset() {
        this.baseIntegrity = GAME_SETTINGS.BASE_MAX_HP;
        this.experiencePoints = 0;
        this.currentLevel = 1;
        this.skillPoints = 0;
        this.allocatedNodes = { 0: 1 };
        this.bonusStats = {}; 
        this.recalcStats();

        this.isPaused = false;
        this.isGameOver = false;
        this.currentStageIndex = 0;
        this.currentWaveNumber = 1;
        this.waveProgress = 0;
        this.waveQuota = 40;
        this.isBossWave = false;
        this.gold = 0;
        
        this.energy = 100;
        this.maxEnergy = 100;
        this.isShieldActive = false;
        this.shieldTimer = 0;
        this.shieldImpactTimer = 0;
        this.timeStopTimer = 0;

        this.equippedGems = [null, null, null];
        this.altGems = [null, null, null];
        this.currentLoadoutId = 1;
        this.equippedArtifacts = {
            [ARTIFACT_TYPES.RING]: null,
            [ARTIFACT_TYPES.AMULET]: null
        };
        this.inventory = [];
        this.activeDrops = [];
        this.activeSupportUnits = [];
        activeZoneEffects = [];
        activeShockwaves = [];
        this.manualTargetId = null;

        // Reset speed logic (keep setting or reset? defaulting to reset for safety)
        this.timeScale = 0.7;
        this.speedLevel = 0;
        this.accumulator = 0;
        const btn = document.getElementById('speed-btn');
        if (btn) btn.innerHTML = "▶️ x1.0";
    }

    /** スキルツリーのステータス再計算 (Rank System対応) */
    recalcStats() {
        this.stats = {
            damage_pct: 0, rate_pct: 0, crit_chance: 0, xp_gain: 0,
            hp_max: 0, speed_pct: 0, proj_speed_pct: 0, support_effect: 0, self_damage: 0,
            life_on_hit: 0, gold_gain: 0, aoe_pct: 0, crit_damage: 0, damage_reduction: 0,
            chain_range_pct: 0, support_level_bonus: 0,
            final_damage_mul: 0, self_damage_pct: 0,
            hit_damage_mul_pct: 0, dot_power_pct: 0
        };

        // Tree Stats (Rank Multiplier)
        Object.entries(this.allocatedNodes).forEach(([nodeId, rank]) => {
            const node = SKILL_TREE_NODES[nodeId];
            if (node && node.stats) {
                Object.entries(node.stats).forEach(([key, val]) => {
                    if (this.stats[key] !== undefined) this.stats[key] += (val * rank);
                });
            }
        });

        // Artifact Stats
        Object.values(this.equippedArtifacts).forEach(art => {
            if (art && art.stats) {
                Object.entries(art.stats).forEach(([key, val]) => {
                    if (this.stats[key] !== undefined) this.stats[key] += val;
                });
            }
        });

        // HP Update
        const finalMaxHP = GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max;
        if (this.baseIntegrity > finalMaxHP) this.baseIntegrity = finalMaxHP;
    }
}
// 補足: GameEngineは大きく、全メソッド書き直しはトークン消費が激しいため、
// クラスメソッドは元のロジックを維持しつつ、UI呼び出し部分を修正します。

// --- 修正版 GameEngine ---
import { SKILL_TREE_NODES } from './constants.js'; // Ensure this is available

Object.assign(GameEngine.prototype, {
    recalcStats() {
        this.stats = {
            damage_pct: 0, rate_pct: 0, crit_chance: 0, xp_gain: 0,
            hp_max: 0, speed_pct: 0, proj_speed_pct: 0, support_effect: 0, self_damage: 0,
            life_on_hit: 0, gold_gain: 0, aoe_pct: 0, crit_damage: 0, damage_reduction: 0,
            chain_range_pct: 0, support_level_bonus: 0,
            final_damage_mul: 0, self_damage_pct: 0,
            hit_damage_mul_pct: 0, dot_power_pct: 0,
            chain_count: 0, shield_bash_mul: 0, mp_regen_pct: 0, // Artifact stats
            hp_regen: 0, // Crew stats
            damage_taken_mul: 0
        };

        // Bonus Stats (Level Up Fillers)
        Object.entries(this.bonusStats).forEach(([key, val]) => {
            if (this.stats[key] !== undefined) this.stats[key] += val;
        });

        // Crew Stats & Ability Buffs
        this.selectedCrew.forEach(crewId => {
            const crew = CREW_DATA[crewId];
            if (crew) {
                // Passive Stats
                if (crew.stats) {
                    Object.entries(crew.stats).forEach(([key, val]) => {
                        if (this.stats[key] !== undefined) this.stats[key] += val;
                    });
                }

                // Active Buffs (Wolf / Luna)
                if (this.crewActiveBuffs[crewId] > 0) {
                    if (crew.id === 1) { // Wolf: Alpha Command
                        this.stats.damage_pct += 0.50;
                        this.stats.crit_chance += 0.20;
                    } else if (crew.id === 2) { // Luna: Hyper Thruster
                        this.stats.rate_pct += 1.00;
                    }
                }
            }
        });

        Object.entries(this.allocatedNodes).forEach(([nodeId, rank]) => {
            const node = SKILL_TREE_NODES[nodeId];
            if (node && node.stats) {
                Object.entries(node.stats).forEach(([key, val]) => {
                    if (this.stats[key] !== undefined) this.stats[key] += (val * rank);
                });
            }
        });

        Object.values(this.equippedArtifacts).forEach(art => {
            if (art && art.stats) {
                Object.entries(art.stats).forEach(([key, val]) => {
                    if (this.stats[key] !== undefined) this.stats[key] += val;
                });
            }
        });

        // Boss Artifacts Stats
        this.artifacts.forEach(art => {
            if (art && art.stats) {
                Object.entries(art.stats).forEach(([key, val]) => {
                    if (this.stats[key] !== undefined) this.stats[key] += val;
                });
            }
            // Dynamic Stats: Merchant Soul (1% dmg per 100G)
            if (art.id === 'merchant_soul') {
                this.stats.damage_pct += Math.floor(this.gold / 100) * 0.01;
            }
        });

        const finalMaxHP = GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max;
        if (this.baseIntegrity > finalMaxHP) this.baseIntegrity = finalMaxHP;
    },

    allocateNode(nodeId) {
        const node = SKILL_TREE_NODES[nodeId];
        if (!node) return false;

        if (this.skillPoints <= 0) {
            if (window.showToast) window.showToast("SPが不足しています", "#e74c3c");
            return false;
        }

        const currentRank = this.allocatedNodes[nodeId] || 0;
        const maxRank = node.maxRank || 1;

        if (currentRank >= maxRank) {
            if (window.showToast) window.showToast("これ以上強化できません", "#f1c40f");
            return false;
        }

        let connected = false;
        if (currentRank > 0) {
            connected = true;
        } else {
            Object.keys(this.allocatedNodes).forEach(ownedId => {
                const oid = parseInt(ownedId);
                if (this.allocatedNodes[oid] > 0) {
                     if (SKILL_TREE_NODES[oid].connections.includes(nodeId)) connected = true;
                     if (node.connections.includes(oid)) connected = true;
                }
            });
        }

        if (connected) {
            this.allocatedNodes[nodeId] = currentRank + 1;
            this.skillPoints--;
            this.recalcStats();
            if (window.showToast) window.showToast(`${node.label || node.name} 強化完了 (Lv.${currentRank + 1})`, "#2ecc71");
            return true;
        } else {
            if (window.showToast) window.showToast("隣接するノードを取得してください", "#e74c3c");
            return false;
        }
    },

    addItemToInventory(templateItem, level = 1) {
        const actualLevel = templateItem.forcedLevel || level;

        // [Patch] Smart Fuse Check: Allow pickup if inventory is full but fusion is possible
        // 既存のインベントリ＋装備品をスキャンして、今回拾うアイテムを含めれば3つになるか確認
        let canFuse = false;
        if (this.inventory.length >= GAME_SETTINGS.INVENTORY_CAPACITY) {
            const sameItems = this.inventory.filter(i => i.id === templateItem.id && i.level === actualLevel).length;
            const equippedSame = [...this.equippedGems, ...this.altGems].filter(i => i && i.id === templateItem.id && i.level === actualLevel).length;
            const artifactSame = Object.values(this.equippedArtifacts).filter(i => i && i.id === templateItem.id && i.level === actualLevel).length;

            if ((sameItems + equippedSame + artifactSame) >= 2) {
                canFuse = true; // 合成可能なら満杯でも許可
            } else {
                activeFloatingTexts.push(new FloatingText(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y - 100, "INVENTORY FULL", "#e74c3c", 20));
                return;
            }
        }

        const cleanTemplate = { ...templateItem };
        delete cleanTemplate.forcedLevel; 

        const newItem = createItemInstance(cleanTemplate, actualLevel);
        this.inventory.push(newItem);

        // Always try to fuse immediately
        this.fuseItems();
        refreshInventoryInterface();
    },

    swapLoadout() {
        // [Patch] Prevent swap if target loadout has no active weapon (slot 0)
        // altGems is the "next" loadout because we are about to swap
        const nextMainGem = this.altGems[0];

        if (!nextMainGem) {
            activeFloatingTexts.push(new FloatingText(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y - 80, "NO WEAPON!", "#e74c3c", 20));
            return;
        }

        const temp = this.equippedGems;
        this.equippedGems = this.altGems;
        this.altGems = temp;
        this.currentLoadoutId = (this.currentLoadoutId === 1) ? 2 : 1;
        this.recalcStats();
        updateMainScreenLoadout();
        refreshInventoryInterface();
        const color = this.currentLoadoutId === 1 ? "#00d2d3" : "#ff9f43";
        activeFloatingTexts.push(new FloatingText(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y - 80, `LOADOUT ${this.currentLoadoutId}`, color, 20));
    },

    selectLoadout(targetId) {
        if (this.currentLoadoutId !== targetId) {
            this.swapLoadout();
        }
    },

    equipItem(uuid, slotIndex) {
            const invIndex = this.inventory.findIndex(i => i.uuid === uuid);
            if (invIndex === -1) return;
            const item = this.inventory[invIndex];

            let targetArray = null;
            let targetKey = null;
            let targetSlotRef = null;

            // slotIndexが文字列の場合 (MAIN_0, SUB_1, RING, AMULET)
            if (typeof slotIndex === 'string') {
                if (slotIndex.startsWith('MAIN_')) {
                    const idx = parseInt(slotIndex.split('_')[1]);
                    if (idx === 0 && item.type !== GEM_TYPES.ACTIVE) return;
                    if (idx > 0 && item.type !== GEM_TYPES.SUPPORT) return;
                    targetArray = this.equippedGems;
                    targetKey = idx;
                } 
                else if (slotIndex.startsWith('SUB_')) {
                    const idx = parseInt(slotIndex.split('_')[1]);
                    if (idx === 0 && item.type !== GEM_TYPES.ACTIVE) return;
                    if (idx > 0 && item.type !== GEM_TYPES.SUPPORT) return;
                    targetArray = this.altGems;
                    targetKey = idx;
                } 
                else if (slotIndex === 'RING' || slotIndex === 'AMULET') {
                    const typeCheck = slotIndex === 'RING' ? ARTIFACT_TYPES.RING : ARTIFACT_TYPES.AMULET;
                    if (item.type !== typeCheck) return;
                    targetSlotRef = this.equippedArtifacts;
                    targetKey = slotIndex;
                }
            }
            // 数値の場合（レガシー互換/簡易指定）: 現在のメイン装備を対象とする
            else if (typeof slotIndex === 'number') {
                if (slotIndex === 0 && item.type === GEM_TYPES.ACTIVE) {
                    targetArray = this.equippedGems; targetKey = 0;
                } else if ((slotIndex === 1 || slotIndex === 2) && item.type === GEM_TYPES.SUPPORT) {
                    targetArray = this.equippedGems; targetKey = slotIndex;
                }
            }

            // 装備実行処理
            if (targetArray || targetSlotRef) {
                const existing = targetArray ? targetArray[targetKey] : targetSlotRef[targetKey];
                if (existing) {
                    this.inventory.push(existing);
                }

                if (targetArray) targetArray[targetKey] = item;
                else targetSlotRef[targetKey] = item;

                this.inventory.splice(invIndex, 1);
            }

            this.recalcStats(); 
            refreshInventoryInterface();
            updateMainScreenLoadout();
        },

    unequipByUuid(uuid) {
        if (!uuid) return;
        let unequippedItem = null;

        for (let i = 0; i < 3; i++) {
            if (this.equippedGems[i] && this.equippedGems[i].uuid === uuid) {
                unequippedItem = this.equippedGems[i];
                this.equippedGems[i] = null;
            }
        }
        // altGems は swapLoadout で中身が入れ替わるだけなので、実体は equippedGems と共有しない運用であればここもチェック
        for (let i = 0; i < 3; i++) {
            if (this.altGems[i] && this.altGems[i].uuid === uuid) {
                unequippedItem = this.altGems[i];
                this.altGems[i] = null;
            }
        }
        if (this.equippedArtifacts.RING && this.equippedArtifacts.RING.uuid === uuid) {
            unequippedItem = this.equippedArtifacts.RING;
            this.equippedArtifacts.RING = null;
        }
        if (this.equippedArtifacts.AMULET && this.equippedArtifacts.AMULET.uuid === uuid) {
            unequippedItem = this.equippedArtifacts.AMULET;
            this.equippedArtifacts.AMULET = null;
        }

        if (unequippedItem) {
            this.inventory.push(unequippedItem);
        }

        this.recalcStats();
        refreshInventoryInterface();
        updateMainScreenLoadout();
    },

    salvageItem(uuid) {
        const index = this.inventory.findIndex(i => i.uuid === uuid);
        if (index === -1) return;
        const item = this.inventory[index];
        this.unequipByUuid(uuid);
        this.inventory.splice(index, 1);
        const xpGain = (GAME_SETTINGS.SALVAGE_XP_BASE || 50) * item.level;
        addExperience(xpGain);

        // Floating Text (In-game)
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `XP +${xpGain}`, "#2ecc71", 24));
        // Toast (UI Overlay)
        if (window.showToast) window.showToast(`XP変換: +${xpGain} XP`, "#2ecc71");

        refreshInventoryInterface();
    },

    sellItem(uuid) {
        const index = this.inventory.findIndex(i => i.uuid === uuid);
        if (index === -1) return;
        const item = this.inventory[index];
        this.unequipByUuid(uuid);
        this.inventory.splice(index, 1);

        const base = GAME_SETTINGS.SELL_PRICE_BASE || 50;
        const price = base * item.level;

        this.gold += price;

        // Floating Text (In-game)
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `SOLD: +${price} G`, "#f1c40f", 24));
        // Toast (UI Overlay)
        if (window.showToast) window.showToast(`売却完了: +${price} G`, "#f1c40f");

        refreshInventoryInterface();
    },

    togglePause() {
        if (!this.isGameOver) this.isPaused = !this.isPaused;
    },

    fuseItems() {
        let fusionOccurred = false;
        let loopSafety = 0;
        do {
            fusionOccurred = false;
            loopSafety++;
            if (loopSafety > 10) break;

            const groups = {};
            const allItems = [];
            this.inventory.forEach(i => allItems.push({ item: i, source: { type: 'INV', index: this.inventory.indexOf(i) } }));
            this.equippedGems.forEach((i, idx) => { if(i) allItems.push({ item: i, source: { type: 'MAIN', index: idx } }); });
            this.altGems.forEach((i, idx) => { if(i) allItems.push({ item: i, source: { type: 'SUB', index: idx } }); });
            if(this.equippedArtifacts.RING) allItems.push({ item: this.equippedArtifacts.RING, source: { type: 'ART', index: 'RING' } });
            if(this.equippedArtifacts.AMULET) allItems.push({ item: this.equippedArtifacts.AMULET, source: { type: 'ART', index: 'AMULET' } });
            
            allItems.forEach(entry => {
                const key = `${entry.item.id}_${entry.item.level}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(entry);
            });

            for (const key in groups) {
                const entries = groups[key];
                if (entries.length >= 3) {
                    const materials = entries.slice(0, 3);
                    const baseItem = materials[0].item;
                    const nextLevel = baseItem.level + 1;
                    
                    let targetSlot = null;
                    const equippedMat = materials.find(m => m.source.type !== 'INV');
                    if (equippedMat) targetSlot = equippedMat.source;

                    materials.forEach(m => {
                        if (m.source.type === 'INV') {
                            const idx = this.inventory.findIndex(x => x.uuid === m.item.uuid);
                            if (idx > -1) this.inventory.splice(idx, 1);
                        } else if (m.source.type === 'MAIN') {
                            this.equippedGems[m.source.index] = null;
                        } else if (m.source.type === 'SUB') {
                            this.altGems[m.source.index] = null;
                        } else if (m.source.type === 'ART') {
                             this.equippedArtifacts[m.source.index] = null;
                        }
                    });

                    const newItem = createItemInstance(baseItem, nextLevel);
                    if (targetSlot) {
                        if (targetSlot.type === 'MAIN') this.equippedGems[targetSlot.index] = newItem;
                        else if (targetSlot.type === 'SUB') this.altGems[targetSlot.index] = newItem;
                        else if (targetSlot.type === 'ART') this.equippedArtifacts[targetSlot.index] = newItem;
                    } else {
                        this.inventory.push(newItem);
                    }

                    fusionOccurred = true;
                    activeFloatingTexts.push(new FloatingText(
                        GAME_SETTINGS.SCREEN_WIDTH/2, 
                        GAME_SETTINGS.SCREEN_HEIGHT/2 - 50, 
                        `FUSE: ${baseItem.name} Lv.${nextLevel}`, 
                        EFFECT_CONSTANTS.COLOR_LEVELUP, 30
                    ));
                    break;
                }
            }
            if (fusionOccurred) this.recalcStats();
        } while (fusionOccurred);
        refreshInventoryInterface();
        updateMainScreenLoadout();
    },

    calculateNextLevelXp() {
        return Math.floor(GAME_SETTINGS.XP_PER_LEVEL_BASE * Math.pow(this.currentLevel, GAME_SETTINGS.XP_SCALING));
    },

    repairCastle() {
        const cost = GAME_SETTINGS.REPAIR_COST || 100;
        const healAmount = GAME_SETTINGS.REPAIR_AMOUNT || 200;
        const maxHP = GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max;
        if (this.baseIntegrity >= maxHP) {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "HP FULL", "#e74c3c", 20));
            return;
        }
        if (this.gold < cost) {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "NO FUNDS", "#e74c3c", 20));
            return;
        }
        this.gold -= cost;
        this.baseIntegrity = Math.min(this.baseIntegrity + healAmount, maxHP);
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.CASTLE_Y, `REPAIRED! +${healAmount}`, "#2ecc71", 24));
        refreshInventoryInterface();
    },

    buyMysteryBox() {
        const cost = GAME_SETTINGS.MYSTERY_BOX_COST || 500;
        const shopMsg = document.getElementById('shop-message');
        if (this.gold < cost) {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "NEED MORE GOLD", "#e74c3c", 20));
            if (shopMsg) { shopMsg.style.color = "#e74c3c"; shopMsg.innerText = "INSUFFICIENT FUNDS"; }
            return;
        }
        if (this.inventory.length >= GAME_SETTINGS.INVENTORY_CAPACITY) {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "INVENTORY FULL", "#e74c3c", 20));
            if (shopMsg) { shopMsg.style.color = "#e74c3c"; shopMsg.innerText = "INVENTORY FULL"; }
            return;
        }

        this.gold -= cost;
        const pool = [ ...Object.values(GEMS), ...Object.values(ARTIFACTS), ...Object.values(UNIQUES) ];
        const template = pool[Math.floor(Math.random() * pool.length)];

        const roll = Math.random();
        let level = 1;
        if (roll > 0.95) level = 4;
        else if (roll > 0.80) level = 3;
        else if (roll > 0.50) level = 2;

        const newItem = createItemInstance(template, level);
        this.inventory.push(newItem);
        const isUnique = Object.values(UNIQUES).some(u => u.id === template.id);
        const color = isUnique ? "#e056fd" : "#9b59b6";

        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `OBTAINED: ${template.name} Lv.${level}`, color, 28));
        if (shopMsg) {
            shopMsg.style.color = color;
            shopMsg.innerHTML = `OBTAINED: <span style="font-size:14px; font-weight:bold;">${template.name}</span> Lv.${level}`;
        }
        refreshInventoryInterface();
        refreshShopInterface();
    },

    checkProgression(killedEnemy) {
        if (this.isBossWave) {
            if (killedEnemy.tier.id === 'BOSS') {
                const remainingBosses = activeEnemies.filter(e => e.isActive && e.tier.id === 'BOSS' && e.id !== killedEnemy.id);
                if (remainingBosses.length === 0) {
                    this.completeWaveOrGame();
                }
            }
            return;
        }
        this.waveProgress++;
        if (this.waveProgress >= this.waveQuota) {
            this.advanceWave();
        }
    },

    advanceWave() {
        this.isBossWave = true;
        this.spawnStageBoss();
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, 250, `⚠ WAVE ${this.currentWaveNumber} BOSS ⚠`, "#e74c3c", 30));
        triggerScreenShake(30, 10);
    },

    spawnStageBoss() {
        const waveConfig = BOSS_WAVES[this.currentWaveNumber] || BOSS_WAVES[1];
        const count = waveConfig.count || 1;
        const spacing = 100;
        const startX = (GAME_SETTINGS.SCREEN_WIDTH - ((count - 1) * spacing)) / 2;
        for (let i = 0; i < count; i++) {
            const bossTier = { ...ENEMY_TIERS.BOSS };
            bossTier.name = waveConfig.name;
            bossTier.color = waveConfig.color;
            bossTier.scale = (waveConfig.scale || 2.0);
            bossTier.hpMod = (waveConfig.hp || 10.0);
            bossTier.speedMod = (waveConfig.speed || 1.0);
            const x = startX + (i * spacing);
            const boss = new EnemyUnit(bossTier, x, -150);
            activeEnemies.push(boss);
        }

        // Artifact: Time Stopper
        if (this.artifacts.some(a => a.id === 'time_stopper')) {
            this.timeStopTimer = 300; // 5 seconds
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "TIME STOP!", "#34495e", 40));
        }
    },

    completeWaveOrGame() {
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "エリア確保！", "#f1c40f", 40));
        this.gold += 300 + (this.currentWaveNumber * 50);

        if (this.currentWaveNumber >= 10) {
            this.isGameOver = true;
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2 + 60, "全ミッション完了！", "#2ecc71", 50));
            return;
        }

        // Trigger Artifact Selection
        if (window.showArtifactSelection) setTimeout(() => window.showArtifactSelection(), 1500);

        this.currentWaveNumber++;
        this.waveProgress = 0;
        // 増加量を調整 (3 -> 12): 後半に向けてWaveが徐々に長く重厚になるように
        this.waveQuota = Math.floor(30 + (this.currentWaveNumber * 12));
        this.isBossWave = false;
        this.baseIntegrity = Math.min(this.baseIntegrity + 200, GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max);
        refreshInventoryInterface();
    },

    buyShopItem(itemId) {
        let item = Object.values(SHOP_ITEMS).find(i => i.id === itemId);
        let isGem = false;
        let cost = 0;

        if (item) {
            cost = item.cost;
        } else {
            const gem = Object.values(GEMS).find(g => g.id === itemId);
            if (gem && !this.purchasedShopItems.includes(gem.id)) {
                item = gem;
                isGem = true;
                cost = 300; 
            }
        }

        if (!item) return;
        const shopMsg = document.getElementById('shop-message');

        if (this.gold < cost) {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "NO FUNDS", "#e74c3c", 20));
            if (shopMsg) { shopMsg.style.color = "#e74c3c"; shopMsg.innerText = "INSUFFICIENT FUNDS"; }
            return;
        }

        if (isGem) {
            if (this.inventory.length >= GAME_SETTINGS.INVENTORY_CAPACITY) {
                activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "INVENTORY FULL", "#e74c3c", 20));
                return;
            }
            this.gold -= cost;
            this.addItemToInventory(item, 1);
            this.purchasedShopItems.push(item.id);
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `${item.name} PURCHASED`, "#2ecc71", 24));
            if (shopMsg) { shopMsg.style.color = "#2ecc71"; shopMsg.innerText = `${item.name} ACQUIRED`; }
        }
        else if (item.id === 'repair') {
            this.repairCastle(); 
            if (shopMsg) { shopMsg.style.color = "#2ecc71"; shopMsg.innerText = "SYSTEM REPAIRED"; }
        } 
        else if (item.type === 'UNIT') {
            this.gold -= cost;
            this.activeSupportUnits.push(new SupportUnit(item.type === 'UNIT' ? (item.id === 'clone' ? 'CLONE' : (item.id === 'drone_atk' ? 'DRONE_ATK' : 'DRONE_COL')) : 'UNKNOWN', item.duration));
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.CASTLE_Y - 50, `${item.name} DEPLOYED`, "#00d2d3", 24));
            if (shopMsg) { shopMsg.style.color = "#00d2d3"; shopMsg.innerText = `${item.name} ACTIVE`; }
        }

        refreshInventoryInterface();
        refreshShopInterface();
    },

    getCurrentStageData() {
        return STAGE_CONFIG[this.currentStageIndex] || STAGE_CONFIG[0];
    },

    updateEnergy() {
        // --- Crew & Status Logic ---
        // 1. Damage Detection (Trigger 'b' face)
        if (this.baseIntegrity < this._lastIntegrity) {
            this.crewDamageTimer = 30; // 0.5 sec shock
        }
        this._lastIntegrity = this.baseIntegrity;

        // 2. Determine Face Suffix
        if (this.crewDamageTimer > 0) {
            this.crewDamageTimer--;
            this.crewStatusSuffix = 'b';
        } else {
            const maxHP = GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max;
            const ratio = this.baseIntegrity / maxHP;
            this.crewStatusSuffix = ratio < 0.3 ? 'c' : 'a';
        }

        // 3. HP Regeneration (Dr. Xeno etc)
        if (this.stats.hp_regen > 0 && this.baseIntegrity > 0 && !this.isGameOver) {
            const maxHP = GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max;
            if (this.baseIntegrity < maxHP) {
                // Apply regen (approx per frame, assuming 60FPS, stats.hp_regen is per second)
                this.baseIntegrity = Math.min(maxHP, this.baseIntegrity + (this.stats.hp_regen / 60));
                this._lastIntegrity = this.baseIntegrity; // Prevent self-healing from triggering damage check
            }
        }

        // Artifact: Emergency Core logic
        if (this.emergencyCooldown > 0) this.emergencyCooldown--;

        const hpRatio = this.baseIntegrity / (GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max);
        if (hpRatio <= 0.3 && this.emergencyCooldown <= 0 && this.artifacts.some(a => a.id === 'emergency_core')) {
            if (!this.isShieldActive) {
                this.setShieldState(true);
                this.energy = Math.max(this.energy, 50); // Free energy boost
                this.emergencyCooldown = 3600; // 60 sec cooldown
                activeFloatingTexts.push(new FloatingText(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y - 80, "EMERGENCY SHIELD!", "#e74c3c", 24));
            }
        }

        if (this.isShieldActive) {
            this.energy -= 1.5;
            this.shieldTimer++;
            if (this.energy <= 0) {
                this.energy = 0;
                this.isShieldActive = false;
                activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.CASTLE_Y - 50, "SHIELD BROKEN", "#e74c3c", 20));
            }
        } else {
            if (this.energy < this.maxEnergy) {
                // Artifact: Infinity Battery (mp_regen_pct)
                const regenMult = 1 + (this.stats.mp_regen_pct || 0);
                this.energy += 0.5 * regenMult;
            }
        }
    },

    setShieldState(isActive) {
        if (isActive && this.energy > 10) {
            if (!this.isShieldActive) {
                this.isShieldActive = true;
                this.shieldTimer = 0;
            }
        } else {
            this.isShieldActive = false;
        }
        const btn = document.getElementById('btn-shield-orb');
        if (btn) {
            btn.style.borderColor = this.isShieldActive ? "#66fcf1" : "#333";
            btn.style.boxShadow = this.isShieldActive ? "0 0 15px #66fcf1" : "0 0 20px rgba(0,0,0,0.8)";
        }
    },

    updateCrewAbilities() {
        let statsChanged = false;
        // Update Cooldowns
        Object.keys(this.crewCooldowns).forEach(id => {
            if (this.crewCooldowns[id] > 0) this.crewCooldowns[id]--;
        });

        // Update Active Buffs
        Object.keys(this.crewActiveBuffs).forEach(id => {
            if (this.crewActiveBuffs[id] > 0) {
                this.crewActiveBuffs[id]--;
                if (this.crewActiveBuffs[id] <= 0) statsChanged = true; // Buff expired
            }
        });

        if (statsChanged) this.recalcStats();
    },

    activateCrewAbility(crewId) {
        if (this.crewCooldowns[crewId] > 0) return; // CD中

        const crew = CREW_DATA[crewId];
        if (!crew || !crew.ability) return;

        // アーケード演出: カットインの呼び出し
        if (window.showAbilityCutIn) {
            window.showAbilityCutIn(crewId);
        }

        const ability = crew.ability;
        this.crewCooldowns[crewId] = ability.cd;

        // Visual & Sound Effect
        activeFloatingTexts.push(new FloatingText(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y - 120, ability.name.toUpperCase() + "!", "#fff", 30));
        triggerScreenShake(15, 8);

        // Apply Effect
        if (crew.id === 1 || crew.id === 2) {
            // Buff type (Wolf, Luna)
            this.crewActiveBuffs[crewId] = ability.duration;
            this.recalcStats();
            // Particle Aura
            const color = crew.id === 1 ? "#e74c3c" : "#f1c40f";
            for(let i=0; i<20; i++) activeParticles.push(new ParticleEffect(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y, color, 10));
        }
        else if (crew.id === 3) {
            // R-22: EMP Blast
            applyAreaDamage(RENDER_CONSTANTS.TURRET_POS_X, 400, 800, 200 + (this.currentLevel * 10), 'electric');
            activeEnemies.forEach(e => { if(e.isActive) e.applyStatus('STUN'); });
            activeZoneEffects.push(new ZoneEffect(RENDER_CONSTANTS.TURRET_POS_X, 450, 'STATIC_FIELD', { damage: 10 }));
        }
        else if (crew.id === 4) {
            // Xeno: Meltdown Rain
            // Apply Acid (x2 Damage) & Poison to ALL enemies
            // [Patch] Scaling Poison: Based on Level & Damage%
            const poisonPower = (30 + (this.currentLevel * 5)) * (1 + this.stats.damage_pct);

            activeEnemies.forEach(e => {
                if (!e.isActive) return;
                e.acidTimer = 600; // 10 seconds vulnerability
                e.poisonStacks += 5;
                e.poisonTimer = 300;
                // Update poison damage to the new powerful value
                e.poisonDamage = Math.max(e.poisonDamage || 0, poisonPower * 0.2); 

                activeFloatingTexts.push(new FloatingText(e.positionX, e.positionY, "MELTDOWN!", "#2ecc71", 20));
            });
            // Visual Overlay
            activeZoneEffects.push(new ZoneEffect(RENDER_CONSTANTS.TURRET_POS_X, 450, 'POISON_CLOUD', { damage: 0 })); // Visuals
            activeFloatingTexts.push(new FloatingText(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y - 100, "ACID RAIN!!", "#2ecc71", 40));
        }
        else if (crew.id === 5) {
            // Mida: Bribe
            let count = 0;
            // [Patch] Scaling Gold: Apply gold_gain stat
            const goldMult = 1.0 + (this.stats.gold_gain || 0);

            activeEnemies.forEach(e => {
                if (!e.isActive || e.tier.id === 'BOSS') return;
                if (count < 5) {
                    e.takeDamage(99999, true, 'bribe'); // Instant Kill

                    let goldVal = 50 + Math.floor(Math.random() * 50);
                    goldVal = Math.floor(goldVal * goldMult);

                    this.gold += goldVal;
                    activeFloatingTexts.push(new FloatingText(e.positionX, e.positionY, `+${goldVal}G`, "#f1c40f", 20));
                    count++;
                }
            });
        }

        // UI Refresh trigger
        if(window.updateCrewHud) window.updateCrewHud();
    }
});

const engineState = new GameEngine();
window.engineState = engineState; 

const gameCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
const gameContext = gameCanvas.getContext('2d');

let activeEnemies = [];
let activeProjectiles = [];
let activeEnemyProjectiles = []; 
let activeParticles = [];
let activeShockwaves = [];
let activeFloatingTexts = [];
let activeZoneEffects = []; 
let starField = new StarField(GAME_SETTINGS.SCREEN_WIDTH, GAME_SETTINGS.SCREEN_HEIGHT);

// [Patch] Inject All Elemental Gems
if (!GEMS.POISON) {
    GEMS.POISON = { id: 'poison', name: '毒弾', type: 'ACTIVE', color: '#8e44ad', damage: 15, rate: 100, speed: 3.5, forcedLevel: 1 };
    GEMS.PSYCHIC = { id: 'psychic', name: '念動力', type: 'ACTIVE', color: '#e056fd', damage: 10, rate: 45, speed: 7, forcedLevel: 1 };
    GEMS.WATER   = { id: 'water',   name: '激流',   type: 'ACTIVE', color: '#3498db', damage: 20, rate: 30, speed: 9, forcedLevel: 1 };
    GEMS.ELECTRIC= { id: 'electric',name: '電撃',   type: 'ACTIVE', color: '#f1c40f', damage: 12, rate: 29, speed: 20, forcedLevel: 1, chain_count: 3, chain_range: 250 };
    GEMS.ROCK    = { id: 'rock',    name: '隕石',   type: 'ACTIVE', color: '#7f8c8d', damage: 90, rate: 70, speed: 8, forcedLevel: 1 };
    GEMS.PLANT   = { id: 'plant',   name: '茨',     type: 'ACTIVE', color: '#2ecc71', damage: 18, rate: 40, speed: 8, forcedLevel: 1, pierce_count: 2 };
}

let enemySpawnCounter = 0;
let attackCooldownCounter = 0; 
let attackCooldownSub = 0;
let shakeTime = 0;
let shakeIntensity = 0;
let customAiFunction = null;

// --- Input Handling ---
gameCanvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) engineState.setShieldState(true);
    else handleCanvasInput(e);
});
gameCanvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) engineState.setShieldState(false);
});
window.addEventListener('keydown', (e) => {
    if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        if (!engineState.isPaused && !engineState.isGameOver) engineState.setShieldState(true);
    }
});
window.addEventListener('keyup', (e) => {
    if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) engineState.setShieldState(false);
});
gameCanvas.addEventListener('contextmenu', e => e.preventDefault());
gameCanvas.addEventListener('touchstart', (e) => {
    const touch = e.changedTouches[0];
    handleCanvasInput({ clientX: touch.clientX, clientY: touch.clientY });
}, { passive: false });

function handleCanvasInput(event) {
    const rect = gameCanvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) * (gameCanvas.width / rect.width);
    const clickY = (event.clientY - rect.top) * (gameCanvas.height / rect.height);
    
    // Pickup
    for (let i = engineState.activeDrops.length - 1; i >= 0; i--) {
        const drop = engineState.activeDrops[i];
        const dist = Math.hypot(drop.x - clickX, drop.y - clickY);
        if (dist < RENDER_CONSTANTS.DROP_SIZE * 1.5) { 
            if (drop.itemTemplate.type === 'GOLD') {
                let val = (GAME_SETTINGS.GOLD_VALUE_BASE || 25) + Math.floor(Math.random() * 10);
                if (engineState.stats.gold_gain > 0) val = Math.floor(val * (1 + engineState.stats.gold_gain));
                engineState.gold += val;
                activeFloatingTexts.push(new FloatingText(drop.x, drop.y, `+${val} G`, "#f1c40f", 20));
                refreshInventoryInterface();
            } else {
                engineState.addItemToInventory(drop.itemTemplate);
                activeFloatingTexts.push(new FloatingText(drop.x, drop.y, "GET!", "#f1c40f", 20));
            }
            engineState.activeDrops.splice(i, 1);
            return; 
        }
    }

    // Target
    let clickedEnemy = null;
    for (const enemy of activeEnemies) {
        const dist = Math.hypot(enemy.positionX - clickX, enemy.positionY - clickY);
        if (dist < enemy.size * 1.2) {
            clickedEnemy = enemy;
            break;
        }
    }
    if (clickedEnemy) {
        engineState.manualTargetId = clickedEnemy.id;
        activeParticles.push(new ParticleEffect(clickedEnemy.positionX, clickedEnemy.positionY, EFFECT_CONSTANTS.COLOR_TARGET, 8));
        activeFloatingTexts.push(new FloatingText(clickedEnemy.positionX, clickedEnemy.positionY - 20, "TARGET!", EFFECT_CONSTANTS.COLOR_TARGET, 16));
    } else {
        engineState.manualTargetId = null;
    }
}

window.updateCustomAi = function(codeString) {
    try {
        customAiFunction = new Function('enemyList', 'selectEnemyHelper', `
            const context = { targetEnemy: null };
            (function(enemyList, selectEnemyHelper) {
                ${codeString}
            }).call(context, enemyList, selectEnemyHelper);
            return context.targetEnemy;
        `);
    } catch (errorInstance) {
        console.error("Failed to compile AI code:", errorInstance);
    }
};

function triggerScreenShake(duration, intensity) {
    shakeTime = duration;
    shakeIntensity = intensity;
}

// --- Entities ---
class MagicProjectile {
    constructor(startX, startY, target, config) {
        this.currentX = startX;
        this.currentY = startY;
        this.target = target; 

        let baseDmg = config.damage || 10;
        if (config.level > 1) baseDmg *= (1 + (config.level - 1) * 0.2); 

        // DoT (status) should be able to reference "pre-hit-multiplier" damage.
        // - rawDamageValue: status power baseline (defaults to baseDmg)
        // - hitDamageMultiplier: affects hit damage only (defaults to 1.0)
        const hitDamageMultiplier = (config.hitDamageMultiplier !== undefined) ? config.hitDamageMultiplier : 1.0;
        this.rawDamageValue = (config.rawDamageValue !== undefined) ? config.rawDamageValue : baseDmg;
        this.damageValue = baseDmg * hitDamageMultiplier;

        this.moveSpeed = config.speed || 5;
        this.glowColor = config.color || "#ffffff";
        this.effectType = config.id; 
        this.isAlive = true;
        this.isShatterShard = config.isShatter || false;
        this.isFallingRock = config.isFallingRock || false;
        this.targetY = config.targetY || 9999;
        this.pierceCount = config.pierce_count || 0;
        this.chainCount = config.chain_count || 0;
        this.chainRange = config.chain_range || 0;

        // Artifact Flags
        this.isHoming = config.isHoming || false;
        this.isBound = config.isBound || false;

        if (this.isHoming) {
            this.damageValue *= 0.7; // -30% Hit Damage Penalty
            this.homingLifeTimer = 180; // 消滅タイマー: 3秒 (60fps * 3)
        }
        this.boundCount = 0;

        this.hitTargetIds = new Set();
        if (config.ignoreIds) config.ignoreIds.forEach(id => this.hitTargetIds.add(id));

        if (config.velocityX !== undefined && config.velocityY !== undefined) {
            this.velocityX = config.velocityX;
            this.velocityY = config.velocityY;
        } else if (target) {
            const deltaX = target.positionX - startX;
            const deltaY = target.positionY - startY;
            const dist = Math.hypot(deltaX, deltaY);
            this.velocityX = (deltaX / dist) * this.moveSpeed;
            this.velocityY = (deltaY / dist) * this.moveSpeed;
        } else {
            this.velocityX = 0;
            this.velocityY = -this.moveSpeed;
        }
    }

    update() {
        // Homing Logic (Artifact: Homing Beacon)
        if (this.isHoming && !this.isFallingRock) {
            // 時間経過による消滅
            this.homingLifeTimer--;
            if (this.homingLifeTimer <= 0) {
                this.isAlive = false;
                return;
            }

            if (!this.target || !this.target.isActive) {
                let minDist = 400;
                let newTarget = null;
                for (const enemy of activeEnemies) {
                    if (!enemy.isActive) continue;
                    const d = Math.hypot(enemy.positionX - this.currentX, enemy.positionY - this.currentY);
                    if (d < minDist) { minDist = d; newTarget = enemy; }
                }
                this.target = newTarget;
            }
            if (this.target && this.target.isActive) {
                const dx = this.target.positionX - this.currentX;
                const dy = this.target.positionY - this.currentY;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    const steerStrength = 0.05; 
                    const desiredVx = (dx / dist) * this.moveSpeed;
                    const desiredVy = (dy / dist) * this.moveSpeed;
                    this.velocityX = (this.velocityX * (1 - steerStrength)) + (desiredVx * steerStrength);
                    this.velocityY = (this.velocityY * (1 - steerStrength)) + (desiredVy * steerStrength);
                }
            }
        }

        if (this.effectType === 'psychic' && this.target && this.target.isActive) {
            const dx = this.target.positionX - this.currentX;
            const dy = this.target.positionY - this.currentY;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                this.velocityX = (this.velocityX * 0.9) + ((dx/dist) * this.moveSpeed * 0.1);
                this.velocityY = (this.velocityY * 0.9) + ((dy/dist) * this.moveSpeed * 0.1);
            }
        }

        if (this.isFallingRock) {
            this.currentY += this.velocityY;
            if (this.currentY >= this.targetY) {
                this.isAlive = false;
                applyAreaDamage(this.currentX, this.currentY, 100, this.damageValue, 'rock');
                activeFloatingTexts.push(new FloatingText(this.currentX, this.currentY, "CRASH!", "#7f8c8d", 28));
                triggerScreenShake(8, 8);
            }
            return;
        }

        this.currentX += this.velocityX;
        this.currentY += this.velocityY;

        // Bound Logic (Artifact: Bound Orb)
        if (this.isBound && this.boundCount < 1) {
            if (this.currentX <= 0 || this.currentX >= GAME_SETTINGS.SCREEN_WIDTH) {
                this.velocityX *= -1;
                this.boundCount++;
                this.currentX = Math.max(1, Math.min(GAME_SETTINGS.SCREEN_WIDTH - 1, this.currentX));
            }
        }

        if (this.currentX > gameCanvas.width + 100 || this.currentX < -100 || 
            this.currentY > gameCanvas.height + 100 || this.currentY < -100) {
            this.isAlive = false;
        }
    }

    draw(context) {
        context.save();

        // 1. Electric (Lightning Bolt)
        if (this.effectType === 'electric') {
            context.shadowBlur = 15;
            context.shadowColor = "#f1c40f";
            context.strokeStyle = "#fff";
            context.lineWidth = 3;
            context.beginPath();
            const tailLen = 40;
            const angle = Math.atan2(this.velocityY, this.velocityX);
            const tailX = this.currentX - Math.cos(angle) * tailLen;
            const tailY = this.currentY - Math.sin(angle) * tailLen;
            context.moveTo(tailX, tailY);
            // Jagged line
            const midX = (tailX + this.currentX) / 2 + (Math.random() - 0.5) * 15;
            const midY = (tailY + this.currentY) / 2 + (Math.random() - 0.5) * 15;
            context.lineTo(midX, midY);
            context.lineTo(this.currentX, this.currentY);
            context.stroke();
            context.restore();
            return;
        }

        // 2. Falling Rock (Meteor)
        if (this.isFallingRock) {
            context.save();
            // Warning Indicator on ground
            const pulse = (Date.now() % 500) / 500; 
            context.fillStyle = `rgba(231, 76, 60, ${0.1 + pulse * 0.2})`;
            context.strokeStyle = `rgba(231, 76, 60, ${0.4 + pulse * 0.4})`;
            context.lineWidth = 2;
            context.translate(this.currentX, this.targetY);
            context.beginPath();
            context.scale(1, 0.5);
            context.arc(0, 0, 100, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.restore();

            // The Rock itself
            context.shadowBlur = 10;
            context.shadowColor = "#e67e22";
            context.fillStyle = "#596275"; // Darker rock color
            context.translate(this.currentX, this.currentY);

            // Rotating rock visual
            const rockRotation = (Date.now() / 200) + this.currentX; 
            context.rotate(rockRotation);
            context.beginPath();
            // Irregular jagged shape
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6;
                const r = 30 + (i % 2 === 0 ? 5 : -5);
                const rx = Math.cos(angle) * r;
                const ry = Math.sin(angle) * r;
                if (i === 0) context.moveTo(rx, ry);
                else context.lineTo(rx, ry);
            }
            context.closePath();
            context.fill();

            // Trail
            context.rotate(-rockRotation); // Reset rotation for trail
            context.fillStyle = "rgba(231, 76, 60, 0.6)";
            context.beginPath();
            context.moveTo(-25, 0);
            context.lineTo(25, 0);
            context.lineTo(0, -90); // Trail goes up
            context.fill();
        } 
        else {
            // 3. Standard Projectiles (Shape based on type)
            context.shadowBlur = RENDER_CONSTANTS.EFFECT_SHADOW_BLUR;
            context.shadowColor = this.glowColor;
            context.fillStyle = this.glowColor;

            // Rotate based on velocity
            const angle = Math.atan2(this.velocityY, this.velocityX);
            const size = RENDER_CONSTANTS.PROJECTILE_SIZE;

            context.translate(this.currentX, this.currentY);
            context.rotate(angle);

            context.beginPath();

            if (this.isShatterShard) {
                // Shard: Small Diamond
                context.moveTo(8, 0);
                context.lineTo(-4, 4);
                context.lineTo(-4, -4);
                context.closePath();
            }
            else if (this.effectType === 'arrow') {
                // Arrow: Sharp Triangle / Arrowhead
                // Tip at (size*1.5, 0), Tail at (-size, +/- size)
                context.moveTo(size * 1.5, 0);
                context.lineTo(-size, size * 0.8);
                context.lineTo(-size * 0.5, 0); // Indent at back
                context.lineTo(-size, -size * 0.8);
                context.closePath();
            }
            else if (this.effectType === 'fireball' || this.effectType === 'drone_shot') {
                // Fireball: Tear shape (Round front, pointy back)
                context.arc(0, 0, size, 0, Math.PI * 2);
                // Add a trail shape behind
                context.moveTo(0, size);
                context.lineTo(-size * 2.5, 0);
                context.lineTo(0, -size);
                context.fill(); // Fill the trail separately combined
            }
            else if (this.effectType === 'plant') {
                // Plant: Shuriken / Thorn (Spinning)
                const spin = (Date.now() / 100);
                context.rotate(spin); // Extra spin on top of directional
                for (let i = 0; i < 4; i++) {
                    const theta = (Math.PI / 2) * i;
                    const x = Math.cos(theta) * size * 1.5;
                    const y = Math.sin(theta) * size * 1.5;
                    context.lineTo(x, y);
                    // Curve inward
                    const thetaMid = theta + Math.PI / 4;
                    const xm = Math.cos(thetaMid) * size * 0.4;
                    const ym = Math.sin(thetaMid) * size * 0.4;
                    context.lineTo(xm, ym);
                }
                context.closePath();
            }
            else if (this.effectType === 'poison') {
                // Poison: Blob
                context.arc(0, 0, size, 0, Math.PI * 2);
                // Dripping effect (random small circles behind)
                if (Math.random() < 0.3) {
                     context.arc(-size * 2, (Math.random()-0.5)*size, size/2, 0, Math.PI*2);
                }
            }
            else if (this.effectType === 'water') {
                 // Water: Streamlined Drop
                 context.moveTo(size, 0);
                 context.bezierCurveTo(-size, size, -size*2, 0, -size, -size);
                 context.closePath();
            }
            else if (this.effectType === 'psychic') {
                 // Psychic: Ring / Hollow Circle
                 context.arc(0, 0, size * 1.2, 0, Math.PI * 2);
                 context.fill(); // Outer glow
                 context.globalCompositeOperation = 'destination-out';
                 context.beginPath();
                 context.arc(0, 0, size * 0.6, 0, Math.PI * 2);
                 context.fill(); // Hole in middle
                 context.globalCompositeOperation = 'source-over';
            }
            else if (this.effectType === 'nova') {
                // Nova: Diamond / Crystal
                context.moveTo(size, 0);
                context.lineTo(0, size);
                context.lineTo(-size, 0);
                context.lineTo(0, -size);
                context.closePath();
            }
            else {
                // Default: Circle
                context.arc(0, 0, size, 0, Math.PI * 2);
            }

            context.fill();
        }
        context.restore();
    }
}

class SupportUnit {
    constructor(type, duration) {
        this.id = generateUuid();
        this.type = type; 
        this.life = duration;
        this.maxLife = duration;
        this.x = RENDER_CONSTANTS.TURRET_POS_X + (Math.random() - 0.5) * 120;
        this.y = RENDER_CONSTANTS.TURRET_POS_Y + (Math.random() - 0.5) * 60 - 50;
        this.attackCooldown = 0;
        this.targetDrop = null;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update() {
        this.life--;
        this.floatOffset += 0.1;
        if (this.type !== 'DRONE_COL') {
            this.y += Math.sin(this.floatOffset) * 0.5;
        }

        if (this.type === 'DRONE_ATK') {
            this.attackCooldown++;
            if (this.attackCooldown >= 60) { 
                const target = getTarget();
                if (target) {
                    // [Patch] Drone Scaling: Apply Damage% and Support Effect
                    let dmg = 20 + (engineState.currentLevel * 3); // Base scaling buffed (2->3)
                    dmg *= (1.0 + engineState.stats.damage_pct);
                    dmg *= (1.0 + engineState.stats.support_effect);

                    activeProjectiles.push(new MagicProjectile(this.x, this.y, target, {
                        id: 'drone_shot', damage: dmg, speed: 8, color: '#00d2d3'
                    }));
                    this.attackCooldown = 0;
                }
            }
        } else if (this.type === 'DRONE_COL') {
            if (!this.targetDrop || !engineState.activeDrops.includes(this.targetDrop)) {
                let minD = Infinity;
                this.targetDrop = null;
                engineState.activeDrops.forEach(drop => {
                    const d = Math.hypot(drop.x - this.x, drop.y - this.y);
                    if (d < minD) { minD = d; this.targetDrop = drop; }
                });
            }

            if (this.targetDrop) {
                const dx = this.targetDrop.x - this.x;
                const dy = this.targetDrop.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    this.x += (dx / dist) * 4;
                    this.y += (dy / dist) * 4;
                } else {
                    const drop = this.targetDrop;
                    if (drop.itemTemplate.type === 'GOLD') {
                        let val = (GAME_SETTINGS.GOLD_VALUE_BASE || 25) + Math.floor(Math.random() * 10);
                        if (engineState.stats.gold_gain > 0) val = Math.floor(val * (1 + engineState.stats.gold_gain));
                        engineState.gold += val;
                        activeFloatingTexts.push(new FloatingText(drop.x, drop.y, `+${val} G`, "#f1c40f", 20));
                    } else {
                        engineState.addItemToInventory(drop.itemTemplate);
                        activeFloatingTexts.push(new FloatingText(drop.x, drop.y, "GET!", "#f1c40f", 20));
                    }
                    const idx = engineState.activeDrops.indexOf(drop);
                    if (idx > -1) engineState.activeDrops.splice(idx, 1);
                    this.targetDrop = null;
                    engineState.inventoryDirty = true;
                }
            } else {
                const homeX = RENDER_CONSTANTS.TURRET_POS_X - 100;
                const homeY = RENDER_CONSTANTS.TURRET_POS_Y;
                const dx = homeX - this.x;
                const dy = homeY - this.y;
                if (Math.hypot(dx, dy) > 10) {
                    this.x += dx * 0.05;
                    this.y += dy * 0.05;
                }
            }
        }
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);

        const lifeRatio = this.life / this.maxLife;
        context.fillStyle = "#555";
        context.fillRect(-10, -20, 20, 4);
        context.fillStyle = "#fff";
        context.fillRect(-10, -20, 20 * lifeRatio, 4);

        if (this.type === 'DRONE_ATK') {
            context.fillStyle = "#e74c3c";
            context.beginPath(); context.moveTo(0, -10); context.lineTo(10, 5); context.lineTo(-10, 5); context.fill();
            context.shadowBlur = 10; context.shadowColor = "#e74c3c";
        } else if (this.type === 'DRONE_COL') {
            context.fillStyle = "#f1c40f";
            context.beginPath(); context.arc(0, 0, 8, 0, Math.PI*2); context.fill();
            context.strokeStyle = "#fff"; context.stroke();
        } else if (this.type === 'CLONE') {
            context.fillStyle = "rgba(100, 255, 218, 0.7)";
            context.beginPath(); context.moveTo(0, -15); context.lineTo(-10, 10); context.lineTo(10, 10); context.fill();
            context.shadowBlur = 15; context.shadowColor = "#64ffda";
        }

        context.restore();
    }
}

class EnemyUnit {
    constructor(tier = ENEMY_TIERS.NORMAL, xOverride = null, yOverride = null) {
        this.id = generateUuid();
        this.tier = tier;
        const stage = engineState.getCurrentStageData();
        
        if (xOverride !== null) this.positionX = xOverride;
        else this.positionX = Math.random() * (GAME_SETTINGS.SCREEN_WIDTH - 60) + 30;
        
        if (yOverride !== null) this.positionY = yOverride;
        else this.positionY = -50;

        let waveMultiplier = 1.0;
        if (tier.id !== 'BOSS') {
            waveMultiplier = Math.pow(1.20, Math.max(0, engineState.currentWaveNumber - 1));
        }

        // [Patch] Configurable Base HP
        const baseHp = GAME_SETTINGS.ENEMY_BASE_HP !== undefined ? GAME_SETTINGS.ENEMY_BASE_HP : 60;
        this.maxHealth = baseHp * tier.hpMod * waveMultiplier;
        this.health = this.maxHealth;

        const baseSpd = (1.2 + Math.random() * 0.8);
        this.baseSpeed = baseSpd * (0.9 + (engineState.currentWaveNumber * 0.1)) * tier.speedMod;
        
        this.isActive = true;
        this.flashTime = 0;
        this.burnTimer = 0;
        this.burnDamagePerTick = 0;
        this.freezeTimer = 0;
        this.poisonTimer = 0;
        this.poisonStacks = 0;
        this.confusionTimer = 0;
        this.soakedTimer = 0;
        this.shockTimer = 0;
        this.shockMultiplier = 1.0;
        this.stunTimer = 0;
        this.acidTimer = 0; // New: Dr. Xeno's Meltdown

        // [Patch] Leech Status
        this.leechTimer = 0;
        this.leechPower = 0; 
        this.leechRatio = GAME_SETTINGS.LEECH_RATIO || 0.02; // Configurable ratio

        // [Patch] Chaos Synergy Cooldown
        this.chaosCooldown = 0;

        this.size = 30 * tier.scale;
        this.bossState = 'ENTER'; 
        this.attackTimer = 0;
        this.moveAngle = 0;
    }

    applyStatus(type, power, level = 1) {
        if (type === 'BURN') {
            this.burnTimer = EFFECT_CONSTANTS.BURN_DURATION;
            this.burnDamagePerTick = power * EFFECT_CONSTANTS.BURN_DAMAGE_RATIO;
        }
        if (type === 'FREEZE') {
            this.freezeTimer = EFFECT_CONSTANTS.FREEZE_DURATION;
        }
        // [Patch] Poison Rework: 20% of damage, 5 sec duration
        if (type === 'POISON') {
            this.poisonTimer = 300;
            this.poisonStacks++;
            this.poisonDamage = power * 0.2; 
        }
        if (type === 'CONFUSION') {
            const chance = 0.1 * level;
            if (this.tier.id === 'NORMAL' && Math.random() < chance) {
                this.confusionTimer = 300;
                activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY-30, "CONFUSED!", "#e056fd", 20));
            } else if (this.tier.id === 'NORMAL') {
                 activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY-30, "RESIST", "#ccc", 12));
            }
        }
        if (type === 'SOAKED') {
            this.soakedTimer = 180;
        }
        if (type === 'SHOCK') { 
            // [Patch] Shock Rebalance: Base 1.15x, scales better with damage but has better floor
            const damageRatio = power / this.maxHealth;
            let mult = 1.15 + (damageRatio * 50.0); // Ratio weight increased significantly

            // Soft caps
            if (mult > 2.5) mult = 2.5;
            if (this.tier.id === 'BOSS' && mult > 1.4) mult = 1.4; // Boss cap

            if (mult > this.shockMultiplier) {
                this.shockMultiplier = mult;
                this.shockTimer = 300; 
                const percent = Math.floor((this.shockMultiplier - 1.0) * 100);
                activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 40, `SHOCK +${percent}%`, "#f1c40f", 20));
            } else {
                this.shockTimer = 300;
            }
        }
        if (type === 'STUN') { 
            this.stunTimer = 60;
            if (this.tier.id !== 'BOSS') this.positionY -= 10;
        }

        // [Patch] Leech Seed
        if (type === 'LEECH') {
            this.leechTimer = 180; // 3 seconds
            this.leechPower = power; 
        }

        // Trigger Synergy Check
        this.checkSynergy();
    }

    checkSynergy() {
        // --- EXISTING SYNERGIES (1-6) ---

        // 1. STEAM ERUPTION: Burn + Soaked -> "蒸発"
        if (this.burnTimer > 0 && this.soakedTimer > 0) {
            this.burnTimer = 0;
            this.soakedTimer = 0;
            const steamDmg = (this.maxHealth * 0.15) + 150; 

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 60, "蒸発", "#dff9fb", 40)); 
            for(let i=0; i<35; i++) {
                const color = Math.random() > 0.7 ? "#c7ecee" : "#ffffff"; 
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, color, 8 + Math.random() * 4));
            }
            triggerScreenShake(12, 8); 
            applyAreaDamage(this.positionX, this.positionY, 160, steamDmg, 'steam');
        }

        // 2. TOXIC DETONATION: Burn + Poison -> "毒爆"
        if (this.burnTimer > 0 && this.poisonStacks > 0) {
            this.burnTimer = 0;
            const stacks = this.poisonStacks;
            this.poisonStacks = 0;
            this.poisonTimer = 0;

            const blastDmg = (stacks * 80) + (this.maxHealth * 0.05) + 100;

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 60, "毒爆", "#be2edd", 40));
            for(let i=0; i<40; i++) {
                const color = Math.random() > 0.5 ? "#8e44ad" : "#2ecc71"; 
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, color, 10 + Math.random() * 5));
            }
            triggerScreenShake(15, 10);
            applyAreaDamage(this.positionX, this.positionY, 140, blastDmg, 'poison_blast');
        }

        // 3. ELECTRO-CHARGED: Shock + Soaked -> "感電"
        if (this.shockTimer > 0 && this.soakedTimer > 0) {
            let chains = 0;
            const range = 250;

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 50, "感電", "#f6e58d", 36));
            for(let i=0; i<25; i++) {
                const color = Math.random() > 0.5 ? "#f1c40f" : "#66fcf1"; 
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, color, 12));
            }

            activeEnemies.forEach(other => {
                if (chains >= 4) return;
                if (other === this || !other.isActive) return;

                const d = Math.hypot(other.positionX - this.positionX, other.positionY - this.positionY);
                if (d < range) {
                    activeProjectiles.push(new MagicProjectile(this.positionX, this.positionY, other, {
                        id: 'electric', 
                        damage: 50 + (engineState.currentLevel * 10), 
                        speed: 25, 
                        color: '#66fcf1', 
                        chain_count: 0
                    }));
                    chains++;
                }
            });
        }

        // 4. MELTDOWN: Burn + Freeze -> "融解"
        if (this.burnTimer > 0 && this.freezeTimer > 0) {
            this.burnTimer = 0;
            this.freezeTimer = 0;
            const meltDmg = (this.maxHealth * 0.25) + 300;

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 70, "融解", "#fab1a0", 45));
            for(let i=0; i<30; i++) {
                const color = Math.random() > 0.5 ? "#ff7675" : "#74b9ff"; 
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, color, 6));
            }
            triggerScreenShake(8, 6);
            this.takeDamage(meltDmg, true, 'meltdown');
        }

        // 5. OVERLOAD: Burn + Shock -> "過負荷"
        if (this.burnTimer > 0 && this.shockTimer > 0) {
            this.burnTimer = 0;
            this.shockTimer = 0;
            const overloadDmg = (this.maxHealth * 0.1) + 200;

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 60, "過負荷", "#ff5252", 38));
            for(let i=0; i<40; i++) {
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, "#ff5252", 10));
            }
            triggerScreenShake(15, 12);
            applyAreaDamage(this.positionX, this.positionY, 180, overloadDmg, 'overload');

            activeEnemies.forEach(e => {
                if(!e.isActive) return;
                const d = Math.hypot(e.positionX - this.positionX, e.positionY - this.positionY);
                if(d < 180 && e.tier.id !== 'BOSS') {
                    const angle = Math.atan2(e.positionY - this.positionY, e.positionX - this.positionX);
                    e.positionX += Math.cos(angle) * 60;
                    e.positionY += Math.sin(angle) * 60;
                }
            });
        }

        // 6. SUPERCONDUCT: Freeze + Shock -> "超電導"
        if (this.freezeTimer > 0 && this.shockTimer > 0) {
            this.freezeTimer = 0;
            this.shockTimer = 0;
            const superDmg = (this.maxHealth * 0.1) + 150;

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 60, "超電導", "#a29bfe", 38));
            for(let i=0; i<30; i++) {
                const color = Math.random() > 0.5 ? "#dfe6e9" : "#6c5ce7"; 
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, color, 8));
            }
            triggerScreenShake(10, 5);
            applyAreaDamage(this.positionX, this.positionY, 200, superDmg, 'superconduct');
            createIceShatter(this.positionX, this.positionY, superDmg);
        }

        // --- NEW SYNERGIES (7-9) ---

        // 7. CORROSION: Poison + Soaked -> "腐食"
        // Effect: Acid cloud, high damage tick
        if (this.poisonStacks > 0 && this.soakedTimer > 0) {
            const stacks = this.poisonStacks;
            this.poisonStacks = 0; 
            this.soakedTimer = 0;
            // High base damage + stacks
            const acidDmg = 50 + (stacks * 30);

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 60, "腐食", "#7fff00", 38));
            for(let i=0; i<25; i++) {
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, "#2ecc71", 6)); // Toxic Green
            }

            // Create a persistent acid zone
            activeZoneEffects.push(new ZoneEffect(this.positionX, this.positionY, 'POISON_CLOUD', { damage: acidDmg }));
            this.takeDamage(acidDmg * 2, true, 'corrosion');
        }

        // 8. PLAGUE: Poison + Shock -> "伝染"
        // Effect: Spreads poison to neighbors via lightning
        if (this.poisonStacks > 0 && this.shockTimer > 0) {
            // Keep poison stacks, spread them!
            const stacksToSpread = Math.max(1, this.poisonStacks);
            this.shockTimer = 0; // Consume shock

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 60, "伝染", "#9b59b6", 36));
            for(let i=0; i<20; i++) {
                const color = Math.random() > 0.5 ? "#8e44ad" : "#f1c40f";
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, color, 8));
            }

            // Chain to neighbors
            const range = 250;
            let count = 0;
            activeEnemies.forEach(other => {
                if (count > 5) return;
                if (other === this || !other.isActive) return;
                const d = Math.hypot(other.positionX - this.positionX, other.positionY - this.positionY);
                if (d < range) {
                    // Spread poison
                    other.poisonStacks += stacksToSpread;
                    other.poisonTimer = 300;
                    other.takeDamage(stacksToSpread * 20, false, 'plague');

                    // Visual beam
                    activeProjectiles.push(new MagicProjectile(this.positionX, this.positionY, other, {
                        id: 'electric', 
                        damage: 10, 
                        speed: 30, 
                        color: '#9b59b6', // Purple lightning
                        chain_count: 0
                    }));
                    count++;
                }
            });
        }

        // 9. GLACIER: Freeze + Soaked -> "氷河"
        // Effect: Long freeze + Crushing damage
        if (this.freezeTimer > 0 && this.soakedTimer > 0) {
            // Consume soaked, Extend freeze massively
            this.soakedTimer = 0;
            this.freezeTimer = 300; // 5 seconds freeze
            const crushDmg = (this.maxHealth * 0.2) + 100;

            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 70, "氷河", "#74b9ff", 42));
            for(let i=0; i<40; i++) {
                const color = Math.random() > 0.5 ? "#74b9ff" : "#ffffff";
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, color, 10)); // Big ice chunks
            }
            triggerScreenShake(10, 5);
            this.takeDamage(crushDmg, true, 'glacier');
        }

        // --- CHAOS SYNERGIES (Confusion + Elements) ---
        // Confused enemies act as conduits, creating zones on the ground

        // [Patch] Cooldown check to prevent lag spike / infinite loop
        if (this.chaosCooldown > 0) return;

        let chaosTriggered = false;

        // 10. CHAOS FLARE: Confusion + Burn
        if (this.confusionTimer > 0 && this.burnTimer > 0) {
            this.burnTimer = 0; 
            const dmg = 40 + (engineState.currentLevel * 5);
            activeZoneEffects.push(new ZoneEffect(this.positionX, this.positionY, 'FIRE_ZONE', { damage: dmg }));
            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 50, "カオスフレア", "#e74c3c", 24));
            chaosTriggered = true;
        }

        // 11. CHAOS MIASMA: Confusion + Poison
        if (this.confusionTimer > 0 && this.poisonStacks > 0) {
            this.poisonStacks = 0;
            const dmg = 30 + (engineState.currentLevel * 4);
            activeZoneEffects.push(new ZoneEffect(this.positionX, this.positionY, 'POISON_CLOUD', { damage: dmg }));
            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 50, "カオスマイズマ", "#8e44ad", 24));
            chaosTriggered = true;
        }

        // 12. CHAOS STORM: Confusion + Shock
        if (this.confusionTimer > 0 && this.shockTimer > 0) {
            this.shockTimer = 0;
            const dmg = 50 + (engineState.currentLevel * 6);
            activeZoneEffects.push(new ZoneEffect(this.positionX, this.positionY, 'STATIC_FIELD', { damage: dmg }));
            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 50, "カオスストーム", "#f1c40f", 24));
            chaosTriggered = true;
        }

        // 13. CHAOS FROST: Confusion + Freeze
        if (this.confusionTimer > 0 && this.freezeTimer > 0) {
            this.freezeTimer = 0;
            const dmg = 20 + (engineState.currentLevel * 3);
            activeZoneEffects.push(new ZoneEffect(this.positionX, this.positionY, 'FREEZE_ZONE', { damage: dmg }));
            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 50, "カオスフロスト", "#74b9ff", 24));
            chaosTriggered = true;
        }

        if (chaosTriggered) {
            this.chaosCooldown = 60; // 1 second cooldown
        }
    }

    update() {
        // Time Stop Check
        if (engineState.timeStopTimer > 0) return;

        // [Patch] Chaos Synergy Cooldown Tick
        if (this.chaosCooldown > 0) this.chaosCooldown--;

        // [Patch] Leech Effect
        if (this.leechTimer > 0) {
            this.leechTimer--;
            if (this.leechTimer % 30 === 0) {
                const amount = this.leechPower;
                const maxHP = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
                if (engineState.baseIntegrity < maxHP) {
                    engineState.baseIntegrity = Math.min(engineState.baseIntegrity + amount, maxHP);
                    activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY, `+${Math.floor(amount)}`, "#2ecc71", 14));
                }
                this.takeDamage(amount, false, 'leech_dot');
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, "#2ecc71", 2));
            }
        }

        if (this.confusionTimer > 0) {
            this.confusionTimer--;
            let target = null;
            let minD = Infinity;
            for (const other of activeEnemies) {
                if (other !== this && other.isActive && other.confusionTimer <= 0) {
                    const d = Math.hypot(other.positionX - this.positionX, other.positionY - this.positionY);
                    if (d < minD) { minD = d; target = other; }
                }
            }

            if (target) {
                const dx = target.positionX - this.positionX;
                const dy = target.positionY - this.positionY;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    this.positionX += (dx/dist) * this.baseSpeed * 2;
                    this.positionY += (dy/dist) * this.baseSpeed * 2;
                }
                if (dist < (this.size + target.size) * 0.8) {
                    target.takeDamage(this.maxHealth * 0.05, true, 'betrayal');
                    activeParticles.push(new ParticleEffect(target.positionX, target.positionY, "#e056fd", 3));
                    if (this.confusionTimer % 30 === 0) activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY, "ATTACK!", "#e056fd", 14));
                }
            }
        } 
        else if (this.freezeTimer > 0 || this.stunTimer > 0) {
            if (this.freezeTimer > 0) this.freezeTimer--;
            if (this.stunTimer > 0) this.stunTimer--;
        }
        else {
            let moveSpeed = this.baseSpeed;
            let canMove = true;

            if (this.soakedTimer > 0) {
                this.soakedTimer--;
                moveSpeed *= 0.5; 
                if (this.soakedTimer % 30 === 0) activeParticles.push(new ParticleEffect(this.positionX, this.positionY + this.size/2, "#3498db", 1));
            }

            // Artifact: Gravity Anchor
            if (engineState.isShieldActive && engineState.artifacts.some(a => a.id === 'gravity_anchor')) {
                moveSpeed *= 0.2; // 80% Slow
                if (engineState.shieldTimer % 10 === 0) activeParticles.push(new ParticleEffect(this.positionX, this.positionY, "#2c3e50", 4));
            }

            if (this.shockTimer > 0) {
                this.shockTimer--;
                if (this.shockTimer <= 0) this.shockMultiplier = 1.0; 
                if (this.shockTimer % 15 === 0) {
                    activeParticles.push(new ParticleEffect(this.positionX + (Math.random()-0.5)*this.size, this.positionY + (Math.random()-0.5)*this.size, "#f1c40f", 2));
                }
            }

            if (this.acidTimer > 0) {
                this.acidTimer--;
                // Acid dripping effect
                if (this.acidTimer % 10 === 0) {
                    activeParticles.push(new ParticleEffect(this.positionX + (Math.random()-0.5)*this.size, this.positionY, "#2ecc71", 3));
                }
            }

            if (canMove) {
                if (this.tier.id === 'BOSS') {
                    if (this.bossState === 'ENTER') {
                        // [Patch] Boss Enter Speed Up
                        this.positionY += Math.max(moveSpeed * 3.0, 2.5);
                        if (this.positionY >= 120) this.bossState = 'FIGHT';
                    } else {
                        // [Patch] Boss Anchor Logic (Prevent knockback OOB)
                        // 強制的にY=120付近に戻す力を働かせ、画面外への逸脱を防ぐ
                        const targetY = 120;
                        const drift = targetY - this.positionY;
                        this.positionY += drift * 0.1; 

                        this.moveAngle += 0.02;
                        this.positionX += Math.sin(this.moveAngle) * 0.5;
                        this.attackTimer++;
                        if (this.attackTimer > 60) { 
                            const bullet = new EnemyProjectile(this.positionX, this.positionY + 40);
                            activeEnemyProjectiles.push(bullet);
                            this.attackTimer = 0;
                            activeParticles.push(new ParticleEffect(this.positionX, this.positionY + 40, "#e74c3c", 4));
                        }
                    }
                } else {
                    // [Patch] Unique Enemy Behaviors
                    if (this.tier.id === 'ROGUE') {
                        // Zig-Zag Movement
                        this.moveAngle += 0.15;
                        this.positionX += Math.sin(this.moveAngle) * 2.5;
                        // Keep within bounds
                        if (this.positionX < 30) this.positionX = 30;
                        if (this.positionX > GAME_SETTINGS.SCREEN_WIDTH - 30) this.positionX = GAME_SETTINGS.SCREEN_WIDTH - 30;

                        this.positionY += moveSpeed;
                    } 
                    else if (this.tier.id === 'SWARM') {
                        // Rush when close
                        const distToCastle = GAME_SETTINGS.CASTLE_Y - this.positionY;
                        const swarmMod = distToCastle < 300 ? 1.8 : 1.0;
                        this.positionY += moveSpeed * swarmMod;
                    }
                    else {
                        // TANK, NORMAL, MAGIC, RARE
                        this.positionY += moveSpeed;
                    }
                }
            }
        }

        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % EFFECT_CONSTANTS.BURN_TICK_RATE === 0) {
                this.takeDamage(this.burnDamagePerTick, false, 'burn_dot');
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, EFFECT_CONSTANTS.COLOR_BURN, 2));
            }
        }
        if (this.poisonTimer > 0) {
            this.poisonTimer--;
            if (this.poisonTimer % 30 === 0) { 
                // [Patch] Linear scaling: Base (20%) * Stacks
                const dmg = (this.poisonDamage || 5) * this.poisonStacks;
                this.takeDamage(dmg, false, 'poison_dot');
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, "#8e44ad", 2));
            }
        }

        if (this.health <= 0 && this.isActive) handleEnemyDeath(this, false);
        if (this.flashTime > 0) this.flashTime--;

        // [Patch] Improved Shield Collision (Hitbox Extended Upwards)
        // シールド有効時は、ドーム状のシールド判定を行う
        if (engineState.isShieldActive && engineState.energy > 15) {
            // ドームの高さに合わせて判定ラインを調整
            if (this.positionY + (this.size / 2) > GAME_SETTINGS.CASTLE_Y - 60) {
                // Shield Bash Logic
                // Artifact: Spike Shield (shield_bash_mul)
                const bashMult = 1 + (engineState.stats.shield_bash_mul || 0);
                const bashDamage = (50 + (engineState.currentLevel * 10)) * bashMult;

                this.takeDamage(bashDamage, false, 'shield_bash');

                engineState.energy -= 15; // Consume MP
                engineState.shieldImpactTimer = 10; // Trigger shield flash
                triggerScreenShake(8, 5);

                // Massive Impact Effect
                for(let i=0; i<10; i++) {
                    activeParticles.push(new ParticleEffect(this.positionX, this.positionY + (this.size/2), "#ffffff", 12));
                    activeParticles.push(new ParticleEffect(this.positionX, this.positionY + (this.size/2), "#66fcf1", 8));
                }

                activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 40, "SHIELD BASH!", "#fff", 30));

                if (this.health <= 0) {
                    this.isActive = false;
                    handleEnemyDeath(this, false); 
                } else {
                    // Knockback to safe distance (Prevent getting stuck)
                    this.positionY = GAME_SETTINGS.CASTLE_Y - 100; 
                    this.stunTimer = 30;
                }
                return; // Prevent falling through to castle damage
            }
        }

        // Castle Damage Logic (If passed shield or shield inactive)
        if (this.positionY > GAME_SETTINGS.CASTLE_Y) {
            let dmg = GAME_SETTINGS.CASTLE_DAMAGE;
            // Apply Damage Taken Multiplier (e.g. Glass Cannon)
            dmg *= (1.0 + (engineState.stats.damage_taken_mul || 0));

            engineState.baseIntegrity -= dmg;
            triggerScreenShake(10, 5); 
            this.isActive = false;
        }
    }

    takeDamage(damage, isCritical, sourceId) {
            let finalDamage = damage;
            const artifacts = engineState.artifacts;

            // Artifact: Giant Killer
            const giantKiller = artifacts.find(a => a.id === 'giant_killer');
            if ((this.tier.id === 'BOSS' || this.tier.id === 'TANK') && giantKiller) {
                finalDamage *= (giantKiller.config ? giantKiller.config.multiplier : 1.4);
            }

            // Artifact: Sniper Scope (Distance Bonus: Top half of screen)
            const sniperScope = artifacts.find(a => a.id === 'sniper_scope');
            if (sniperScope) {
                const rangeY = sniperScope.config ? sniperScope.config.range_y : 400;
                if (this.positionY < rangeY) {
                    finalDamage *= (sniperScope.config ? sniperScope.config.multiplier : 1.3);
                }
            }

            // Artifact: Elemental Mixer (2+ Statuses)
            if (artifacts.some(a => a.id === 'elem_mixer')) {
                let statusCount = 0;
                if (this.burnTimer > 0) statusCount++;
                if (this.poisonStacks > 0) statusCount++;
                if (this.freezeTimer > 0) statusCount++;
                if (this.shockTimer > 0) statusCount++;
                if (this.soakedTimer > 0) statusCount++;
                if (this.confusionTimer > 0) statusCount++;

                if (statusCount >= 2) finalDamage *= 1.5;
            }

            // Artifact: Oil Flask (Direct hit boost for fireball)
            const oilFlask = artifacts.find(a => a.id === 'oil_flask');
            if (sourceId === 'fireball' && oilFlask) {
                finalDamage *= (oilFlask.config ? oilFlask.config.multiplier : 1.5); 
            }

            // Artifact: Zero Crystal (Instant Kill Check)
            if (this.freezeTimer > 0 && artifacts.some(a => a.id === 'zero_crystal')) {
                // No instant kill on Bosses
                if (this.tier.id !== 'BOSS' && Math.random() < 0.1) {
                    finalDamage = this.health + 9999; 
                    activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY, "INSTANT KILL", "#74b9ff", 24));
                }
            }

            // Shock Multiplier
            if (this.shockTimer > 0) {
                finalDamage *= this.shockMultiplier;
            }

            // Dr. Xeno: Acid Multiplier (Vulnerability)
            if (this.acidTimer > 0) {
                finalDamage *= 2.0; 
            }

            this.health -= finalDamage;
            this.flashTime = 5;

            // Knockback Logic
            if (this.freezeTimer <= 0 && sourceId !== 'burn_dot' && sourceId !== 'poison_dot' && sourceId !== 'leech_dot') {
                if (this.tier.id === 'TANK') {
                    this.positionY -= 1; 
                } else if (this.tier.id !== 'BOSS') {
                    this.positionY -= 5;
                }
            } 

            // [Patch] Synergy Damage Colors
            let popupColor = EFFECT_CONSTANTS.COLOR_NORMAL;
            if (sourceId === 'steam') popupColor = "#dff9fb";        
            else if (sourceId === 'poison_blast') popupColor = "#be2edd"; 
            else if (sourceId === 'electric') popupColor = "#f6e58d";     
            else if (sourceId === 'meltdown') popupColor = "#fab1a0";     
            else if (sourceId === 'overload') popupColor = "#ff5252";     
            else if (sourceId === 'superconduct') popupColor = "#a29bfe"; 
            else if (sourceId === 'corrosion') popupColor = "#7fff00";    
            else if (sourceId === 'plague') popupColor = "#9b59b6";       
            else if (sourceId === 'glacier') popupColor = "#74b9ff";      
            else if (sourceId === 'shield_bash') popupColor = "#66fcf1";  
            else if (sourceId === 'burn_dot') popupColor = EFFECT_CONSTANTS.COLOR_BURN;
            else if (isCritical) popupColor = EFFECT_CONSTANTS.COLOR_CRIT;

            const synergyIds = [
                'steam','poison_blast','electric','meltdown','overload','superconduct','corrosion','plague','glacier'
            ];
            const fontSize = (isCritical || synergyIds.includes(sourceId)) ? 28 : 18;
            const displayText = isCritical ? `${Math.floor(finalDamage)}!` : `${Math.floor(finalDamage)}`;
            activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 20, displayText, popupColor, fontSize));
        }

    draw(context) {
        context.save();

        // 1. Target Marker
        if (engineState.manualTargetId === this.id) {
            context.strokeStyle = EFFECT_CONSTANTS.COLOR_TARGET;
            context.lineWidth = 2;
            context.beginPath();
            context.arc(this.positionX, this.positionY, this.size * 0.8, 0, Math.PI * 2);
            context.stroke();
        }

        // 2. Determine Color based on Status
        if (this.flashTime > 0) context.fillStyle = "#ffffff";
        else if (this.confusionTimer > 0) context.fillStyle = "#e056fd";
        else if (this.freezeTimer > 0) context.fillStyle = EFFECT_CONSTANTS.COLOR_FREEZE;
        else if (this.stunTimer > 0) context.fillStyle = "#7f8c8d";
        else if (this.burnTimer > 0) context.fillStyle = EFFECT_CONSTANTS.COLOR_BURN;
        else if (this.poisonTimer > 0) context.fillStyle = "#8e44ad";
        else if (this.soakedTimer > 0) context.fillStyle = "#3498db";
        else if (this.shockTimer > 0) context.fillStyle = "#f1c40f";
        else if (this.leechTimer > 0) context.fillStyle = "#2ecc71";
        else context.fillStyle = this.tier.color;

        const drawSize = this.size;
        const halfSize = drawSize / 2;

        // 3. Draw Shape based on Tier ID
        context.shadowBlur = 10;
        context.shadowColor = this.tier.color;

        context.beginPath();
        if (this.tier.id === 'BOSS') {
            // Hexagon with rotation
            const rot = Date.now() / 1000;
            for (let i = 0; i < 6; i++) {
                const angle = rot + (i * Math.PI / 3);
                const x = this.positionX + Math.cos(angle) * halfSize;
                const y = this.positionY + Math.sin(angle) * halfSize;
                if (i === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.closePath();
        } 
        else if (this.tier.id === 'TANK') {
            // Heavy Square
            context.rect(this.positionX - halfSize, this.positionY - halfSize, drawSize, drawSize);
        }
        else if (this.tier.id === 'ROGUE') {
            // Triangle pointing down (V shape)
            context.moveTo(this.positionX - halfSize, this.positionY - halfSize);
            context.lineTo(this.positionX + halfSize, this.positionY - halfSize);
            context.lineTo(this.positionX, this.positionY + halfSize);
            context.closePath();
        }
        else if (this.tier.id === 'SWARM') {
            // Diamond / Rhombus
            context.moveTo(this.positionX, this.positionY - halfSize);
            context.lineTo(this.positionX + halfSize, this.positionY);
            context.lineTo(this.positionX, this.positionY + halfSize);
            context.lineTo(this.positionX - halfSize, this.positionY);
            context.closePath();
        }
        else {
            // NORMAL / MAGIC / RARE: Circle or Standard
            if (this.tier.id === 'MAGIC') {
                 // Star-ish (Pentagon)
                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2 / 5) - Math.PI/2;
                    const x = this.positionX + Math.cos(angle) * halfSize;
                    const y = this.positionY + Math.sin(angle) * halfSize;
                    if (i === 0) context.moveTo(x, y);
                    else context.lineTo(x, y);
                }
                context.closePath();
            } else {
                // Normal Circle
                context.arc(this.positionX, this.positionY, halfSize, 0, Math.PI * 2);
            }
        }
        context.fill();

        // 4. Inner Details (Eyes/Core)
        context.fillStyle = "rgba(0,0,0,0.5)";
        context.beginPath();
        if (this.tier.id === 'ROGUE') {
             context.arc(this.positionX, this.positionY - 5, 4, 0, Math.PI*2);
        } else {
             context.arc(this.positionX, this.positionY, 4, 0, Math.PI*2);
        }
        context.fill();

        // 5. Status Icons
        if (this.confusionTimer > 0) {
            context.fillStyle = "#fff";
            context.font = "bold 14px Arial";
            context.fillText("?", this.positionX + halfSize, this.positionY - halfSize);
        }
        if (this.poisonStacks > 0) {
            context.fillStyle = "#8e44ad";
            context.font = "10px Arial";
            context.fillText(`${this.poisonStacks}`, this.positionX, this.positionY + 5);
        }

        // 6. Health Bar
        context.shadowBlur = 0;
        const hpBarW = 40;
        const hpBarH = 4;
        const hpY = this.positionY - halfSize - 10;

        context.fillStyle = "#333";
        context.fillRect(this.positionX - hpBarW/2, hpY, hpBarW, hpBarH);

        context.fillStyle = this.freezeTimer > 0 ? "#74b9ff" : (this.tier.id === 'BOSS' ? "#e74c3c" : "#2ecc71");
        const healthRatio = Math.max(0, this.health / this.maxHealth);
        context.fillRect(this.positionX - hpBarW/2, hpY, hpBarW * healthRatio, hpBarH);

        context.restore();
    }
}

class ZoneEffect {
    constructor(x, y, type, config) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 300; // 5 seconds
        this.maxLife = 300;
        this.radius = 100; // Large area
        this.config = config;
        this.tickTimer = 0;
        this.rotation = Math.random() * Math.PI * 2;

        // [Patch] Spike Trap Settings
        if (this.type === 'SPIKE_TRAP') {
            this.life = 600; // 10 seconds duration
            this.maxLife = 600;
            this.radius = 25; // Small trigger radius
        }
    }

    update() {
        this.life--;
        this.tickTimer++;
        this.rotation += 0.01;

        // [Patch] Spike Trap Logic: Trigger on contact
        if (this.type === 'SPIKE_TRAP') {
            for (const enemy of activeEnemies) {
                if (!enemy.isActive) continue;
                const d = Math.hypot(enemy.positionX - this.x, enemy.positionY - this.y);
                // Hitbox overlap check
                if (d < this.radius + (enemy.size / 2)) {
                    // Trigger Trap
                    const dmg = this.config.damage || 50;
                    enemy.takeDamage(dmg, false, 'spike_trap');
                    activeParticles.push(new ParticleEffect(this.x, this.y, "#7f8c8d", 8));
                    activeFloatingTexts.push(new FloatingText(this.x, this.y, "BOOM!", "#7f8c8d", 24));
                    triggerScreenShake(5, 3);
                    this.life = 0; // Destroy trap immediately
                    break; 
                }
            }
            return; // Skip normal tick logic
        }

        // Apply effects every 0.33s (20 ticks)
        if (this.tickTimer % 20 === 0) {
            const damage = this.config.damage || 10;

            for (const enemy of activeEnemies) {
                if (!enemy.isActive) continue;
                const d = Math.hypot(enemy.positionX - this.x, enemy.positionY - this.y);

                if (d < this.radius) {
                    if (this.type === 'POISON_CLOUD') {
                        enemy.applyStatus('POISON', damage * 0.5);
                    } 
                    else if (this.type === 'FIRE_ZONE') {
                        enemy.takeDamage(damage, false, 'fire_zone');
                        enemy.applyStatus('BURN', damage * 0.2);
                    }
                    else if (this.type === 'STATIC_FIELD') {
                        enemy.takeDamage(damage * 0.8, false, 'static_field');
                        if (Math.random() < 0.3) enemy.applyStatus('SHOCK', damage);
                    }
                    else if (this.type === 'FREEZE_ZONE') {
                        enemy.takeDamage(damage * 0.5, false, 'freeze_zone');
                        // Slow down or freeze
                        if (Math.random() < 0.2) enemy.applyStatus('FREEZE');
                        else enemy.applyStatus('SOAKED'); // Wet/Slow effect
                    }
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // [Patch] Spike Trap Visuals
        if (this.type === 'SPIKE_TRAP') {
             ctx.fillStyle = "#95a5a6";
             ctx.beginPath();
             // Draw spiky shape
             for(let i=0; i<8; i++) {
                 const angle = (Math.PI * 2 / 8) * i;
                 const r = (i % 2 === 0) ? this.radius : this.radius * 0.4;
                 const px = Math.cos(angle) * r;
                 const py = Math.sin(angle) * r;
                 if (i===0) ctx.moveTo(px, py);
                 else ctx.lineTo(px, py);
             }
             ctx.closePath();
             ctx.fill();

             // Blinking red light center
             if (Math.floor(Date.now() / 200) % 2 === 0) {
                 ctx.fillStyle = "#e74c3c";
                 ctx.beginPath(); ctx.arc(0,0, 5, 0, Math.PI*2); ctx.fill();
             }
             ctx.restore();
             return;
        }

        const opacity = (this.life / this.maxLife) * 0.6;
        ctx.globalAlpha = opacity;

        let mainColor = "#fff";
        let subColor = "#fff";

        if (this.type === 'POISON_CLOUD') { mainColor = "#8e44ad"; subColor = "#2ecc71"; }
        else if (this.type === 'FIRE_ZONE') { mainColor = "#e74c3c"; subColor = "#f39c12"; }
        else if (this.type === 'STATIC_FIELD') { mainColor = "#f1c40f"; subColor = "#66fcf1"; }
        else if (this.type === 'FREEZE_ZONE') { mainColor = "#74b9ff"; subColor = "#dfe6e9"; }

        // Draw Zone Base
        ctx.fillStyle = mainColor;
        ctx.beginPath(); 
        ctx.arc(0, 0, this.radius, 0, Math.PI*2); 
        ctx.fill();

        // Draw Swirl Effect
        ctx.strokeStyle = subColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for(let i=0; i<3; i++) {
            const r = this.radius * (0.3 + (i * 0.2));
            const start = i * 2;
            ctx.arc(0, 0, r, start, start + 3);
        }
        ctx.stroke();

        ctx.restore();
    }
}

class EnemyProjectile {
    constructor(x, y, isReflected = false) {
        this.x = x;
        this.y = y;
        this.speed = isReflected ? -12 : 6;
        this.size = 8;
        // [Patch] Configurable Enemy Damage
        this.damage = GAME_SETTINGS.ENEMY_PROJECTILE_DAMAGE !== undefined ? GAME_SETTINGS.ENEMY_PROJECTILE_DAMAGE : 15;
        this.isAlive = true;
        this.isReflected = isReflected;
        this.color = isReflected ? "#66fcf1" : "#e74c3c";
    }

    update() {
        this.y += this.speed;
        if (this.isReflected) {
            if (this.y < -50) this.isAlive = false;
            for (const enemy of activeEnemies) {
                if (!enemy.isActive) continue;
                const dist = Math.hypot(enemy.positionX - this.x, enemy.positionY - this.y);
                if (dist < enemy.size + this.size) {
                    enemy.takeDamage(500, true, 'reflected_orb');
                    this.isAlive = false;
                    activeParticles.push(new ParticleEffect(this.x, this.y, "#66fcf1", 8));
                    break;
                }
            }
            return;
        }

        if (engineState.isShieldActive) {
            const distToCastle = GAME_SETTINGS.CASTLE_Y - this.y;
            // ドーム高さに合わせて判定距離を調整
            if (distToCastle < 75 && distToCastle > 0) {
                if (engineState.shieldTimer < 20) { // [Patch] Ease JG window (15->20)
                    this.isReflected = true;
                    this.speed = -15;
                    this.color = "#66fcf1";
                    activeFloatingTexts.push(new FloatingText(this.x, this.y, "PERFECT!", "#66fcf1", 28));
                    engineState.energy = Math.min(engineState.maxEnergy, engineState.energy + 15);
                    triggerScreenShake(5, 5);

                    // Artifact: Mana Converter
                    const manaConv = engineState.artifacts.find(a => a.id === 'mana_conv');
                    if (manaConv) {
                        const heal = manaConv.config ? manaConv.config.heal_amount : 20;
                        const maxHP = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
                        engineState.baseIntegrity = Math.min(engineState.baseIntegrity + heal, maxHP);
                        activeFloatingTexts.push(new FloatingText(this.x, this.y - 30, `HP+${heal}`, "#3498db", 16));
                    }
                    // Artifact: Reflect Prism
                    if (engineState.artifacts.some(a => a.id === 'reflect_prism')) {
                        applyAreaDamage(this.x, this.y, 200, 100 + (engineState.currentLevel * 5), 'nova');
                    }

                } else {
                    engineState.energy -= 10;
                    activeFloatingTexts.push(new FloatingText(this.x, this.y, "BLOCKED", "#ccc", 18));
                    activeParticles.push(new ParticleEffect(this.x, this.y, "#66fcf1", 6));
                    this.isAlive = false;
                }
                return;
            }
        }

        if (this.y >= GAME_SETTINGS.CASTLE_Y) {
            let dmg = this.damage;
            // Apply Damage Taken Multiplier (e.g. Glass Cannon)
            dmg *= (1.0 + (engineState.stats.damage_taken_mul || 0));

            engineState.baseIntegrity -= dmg;
            activeParticles.push(new ParticleEffect(this.x, this.y, "#e74c3c", 6));
            triggerScreenShake(5, 2);
            this.isAlive = false;
        }
        if (this.y > GAME_SETTINGS.SCREEN_HEIGHT) this.isAlive = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Logic Helpers ---

function createIceShatter(centerX, centerY, damage) {
    const shardDamage = damage * 0.5;
    const shardCount = EFFECT_CONSTANTS.SHATTER_PROJECTILE_COUNT;
    for (let i = 0; i < shardCount; i++) {
        const angle = (Math.PI * 2 / shardCount) * i;
        const vx = Math.cos(angle) * EFFECT_CONSTANTS.SHATTER_SPEED;
        const vy = Math.sin(angle) * EFFECT_CONSTANTS.SHATTER_SPEED;
        activeProjectiles.push(new MagicProjectile(centerX, centerY, null, {
            damage: shardDamage,
            speed: EFFECT_CONSTANTS.SHATTER_SPEED,
            color: "#a29bfe",
            id: 'shatter_shard',
            isShatter: true,
            pierce_count: 2,
            velocityX: vx,
            velocityY: vy
        }));
    }
    activeFloatingTexts.push(new FloatingText(centerX, centerY, "SHATTER!", "#74b9ff", 22));
}

function applyAreaDamage(centerX, centerY, radius, damage, sourceId) {
    // [Patch] Rock Spikes (Mines) - Configurable
    if (sourceId === 'rock') {
        const base = GAME_SETTINGS.ROCK_SPIKES_BASE !== undefined ? GAME_SETTINGS.ROCK_SPIKES_BASE : 3;
        const variance = GAME_SETTINGS.ROCK_SPIKES_VAR !== undefined ? GAME_SETTINGS.ROCK_SPIKES_VAR : 3;
        const spikeCount = base + Math.floor(Math.random() * variance);

        for (let i = 0; i < spikeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const sx = centerX + Math.cos(angle) * dist;
            const sy = centerY + Math.sin(angle) * dist;
            // Spikes deal heavy physical damage
            activeZoneEffects.push(new ZoneEffect(sx, sy, 'SPIKE_TRAP', { damage: damage * 1.5 }));
        }
    }

    const finalRadius = radius * (1.0 + (engineState.stats.aoe_pct || 0));
    const color = sourceId === 'fireball' ? "#e67e22" : (sourceId === 'rock' ? "#7f8c8d" : "#3498db");

    // Shockwave Effect (Arcade Upgrade)
    activeShockwaves.push(new ShockwaveEffect(centerX, centerY, color, finalRadius));

    for (let i = 0; i < 15; i++) {
        activeParticles.push(new ParticleEffect(centerX, centerY, color, 6));
    }
    activeEnemies.forEach(enemy => {
        if (!enemy.isActive) return;
        const dist = Math.hypot(enemy.positionX - centerX, enemy.positionY - centerY);
        if (dist <= finalRadius + (enemy.size/2)) { 
            enemy.takeDamage(damage, false, sourceId);

            if (sourceId === 'nova' && Math.random() < EFFECT_CONSTANTS.FREEZE_CHANCE) {
                enemy.applyStatus('FREEZE');
                 activeFloatingTexts.push(new FloatingText(enemy.positionX, enemy.positionY - 40, "FROZEN", "#74b9ff", 14));
            }
            if (sourceId === 'fireball') {
                enemy.applyStatus('BURN', damage);
            }
        }
    });
}

function handleEnemyDeath(enemy, isCrit, shatterDamage = 10) {
    if (!enemy.isActive) return;
    enemy.isActive = false;

    if (isCrit) triggerScreenShake(5, 3);
    if (enemy.freezeTimer > 0) createIceShatter(enemy.positionX, enemy.positionY, shatterDamage);

    // Artifact: Corrosive Crown
    if (enemy.poisonStacks > 0 && engineState.artifacts.some(a => a.id === 'corrosive_crown')) {
         activeZoneEffects.push(new ZoneEffect(enemy.positionX, enemy.positionY, 'POISON_CLOUD', { damage: 20 }));
    }

    // Artifact: Vampire Cup
    const vampireCup = engineState.artifacts.find(a => a.id === 'vampire_cup');
    if (vampireCup) {
        const pct = vampireCup.config ? vampireCup.config.heal_pct : 0.01;
        const heal = (GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max) * pct;
        engineState.baseIntegrity = Math.min(engineState.baseIntegrity + heal, GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max);
    }

    // Artifact: Ancient Coin
    const ancientCoin = engineState.artifacts.find(a => a.id === 'ancient_coin');
    if (ancientCoin) {
        const chance = ancientCoin.config ? ancientCoin.config.chance : 0.05;
        const amount = ancientCoin.config ? ancientCoin.config.amount : 10;
        if (Math.random() < chance) {
            engineState.gold += amount;
            activeFloatingTexts.push(new FloatingText(enemy.positionX, enemy.positionY, `+${amount}G`, "#f1c40f", 14));
        }
    }

    for(let i=0; i<EFFECT_CONSTANTS.PARTICLE_COUNT; i++) activeParticles.push(new ParticleEffect(enemy.positionX, enemy.positionY, "#e74c3c"));
    let xpGain = (20 * enemy.tier.xpMod) * (1.0 + engineState.stats.xp_gain);
    const amulet = engineState.equippedArtifacts.AMULET;
    if (amulet && amulet.stats && amulet.stats.xp_gain) xpGain *= (1 + amulet.stats.xp_gain);

    addExperience(xpGain);
    if (Math.random() < GAME_SETTINGS.DROP_CHANCE) generateDrop(enemy.positionX, enemy.positionY);
    engineState.checkProgression(enemy);
}

function selectEnemyHelper(enemyList, criteria) {
    if (!enemyList || enemyList.length === 0) return null;
    let selectedEnemy = enemyList[0];
    switch (criteria) {
        case SELECTION_CRITERIA.MIN_DIST:
            let minDistance = Infinity;
            enemyList.forEach(enemyUnit => {
                const distance = Math.hypot(enemyUnit.positionX - RENDER_CONSTANTS.TURRET_POS_X, enemyUnit.positionY - RENDER_CONSTANTS.TURRET_POS_Y);
                if (distance < minDistance) {
                    minDistance = distance;
                    selectedEnemy = enemyUnit;
                }
            });
            break;
        case SELECTION_CRITERIA.MAX_HP:
            selectedEnemy = enemyList.reduce((prev, curr) => (prev.health > curr.health) ? prev : curr);
            break;
        case SELECTION_CRITERIA.MIN_HP:
            selectedEnemy = enemyList.reduce((prev, curr) => (prev.health < curr.health) ? prev : curr);
            break;
    }
    return selectedEnemy;
}

function getTarget() {
    if (engineState.manualTargetId) {
        const manualTarget = activeEnemies.find(e => e.id === engineState.manualTargetId);
        if (manualTarget && manualTarget.isActive) return manualTarget;
        else engineState.manualTargetId = null;
    }
    if (customAiFunction) {
        try {
            return customAiFunction(activeEnemies, selectEnemyHelper);
        } catch (errorInstance) { console.warn("AI Error"); }
    }
    return selectEnemyHelper(activeEnemies, SELECTION_CRITERIA.MIN_DIST);
}

function handleAutoAttack() {
    const loadouts = [
        { gems: engineState.equippedGems, isMain: true, scale: 1.0 },
        { gems: engineState.altGems,      isMain: false, scale: 0.5 }
    ];
    loadouts.forEach(loadout => {
        const activeGem = loadout.gems[0];
        if (!activeGem) return;

        const target = getTarget();
        // [Patch] Prevent firing at nothing unless it's an area/random skill
        const isAreaSkill = ['nova', 'rock'].includes(activeGem.id);
        if (!target && !isAreaSkill) return;

        const supportGems = loadout.gems.slice(1).filter(gem => gem !== null);
        let damageMod = 1.0 + engineState.stats.damage_pct;
        let rateMod = 1.0 + engineState.stats.rate_pct;
        let supportPower = 1.0 + engineState.stats.support_effect;
        let finalFireRate = activeGem.rate || 60;
        
        if (activeGem.level > 1) finalFireRate *= (1 - (activeGem.level * 0.02)); 
        finalFireRate /= rateMod;

        let isShotgun = false;
        let spreadCount = 1;

        const finalConfig = { ...activeGem };
        finalConfig.damage *= damageMod;
        finalConfig.damage *= loadout.scale; 

        // [Patch] Apply Artifact Flags globally to all projectiles in this loadout
        finalConfig.isHoming = engineState.artifacts.some(a => a.id === 'homing_beacon');
        finalConfig.isBound = engineState.artifacts.some(a => a.id === 'bound_orb');

        // Apply Final Damage Multiplier (Keystones)
        if (engineState.stats.final_damage_mul > 0) {
            finalConfig.damage *= engineState.stats.final_damage_mul;
        }

        // Artifact: Berserker Helm (HP Loss Bonus)
        const berserkerHelm = engineState.artifacts.find(a => a.id === 'berserker_helm');
        if (berserkerHelm) {
            const maxHP = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
            const currentHP = engineState.baseIntegrity;
            // 減少率 (0.0 ~ 1.0)
            const lossRatio = Math.max(0, 1.0 - (currentHP / maxHP));
            const maxBonus = berserkerHelm.config ? berserkerHelm.config.max_bonus : 0.5;
            finalConfig.damage *= (1.0 + (lossRatio * maxBonus));
        }

        // HIT/DoT 分離（System Hacker 等）
        // - rawDamageValue: DoT計算の基準（HIT減衰の影響を受けない）
        // - hitDamageMultiplier: HITのみに掛かる倍率
        const hitDamageMultiplier = 1 + (engineState.stats.hit_damage_mul_pct || 0);
        const dotPowerMultiplier = 1 + (engineState.stats.dot_power_pct || 0);
        finalConfig.rawDamageValue = finalConfig.damage * dotPowerMultiplier;
        finalConfig.hitDamageMultiplier = hitDamageMultiplier;


        supportGems.forEach(support => {
            // Apply Support Level Bonus (Nanotech Swarm)
            const lvl = (support.level || 1) + (engineState.stats.support_level_bonus || 0);
            const lvlBonus = 1 + ((lvl - 1) * 0.1 * supportPower);
            if (support.damage_mod) finalConfig.damage *= (support.damage_mod * lvlBonus);
            if (support.id === 'multishot') {
                isShotgun = true;
                // 初期弾数+1、レベルごとに+1 (Lv1=2, Lv2=3...)
                spreadCount = 1 + (support.projectiles || 1) + (lvl - 1); 
            }
            if (support.speed_mod) finalConfig.speed *= (support.speed_mod * lvlBonus);
            if (support.rate_mod) {
                // 連射速度もレベルで強化 (1.1, 1.2... で割ることで間隔を短縮)
                finalFireRate *= (support.rate_mod / lvlBonus); 
            }
            if (support.pierce_count) {
                // 初期貫通1、レベルごとに+1
                finalConfig.pierce_count = (finalConfig.pierce_count || 0) + support.pierce_count + (lvl - 1);
            }
            if (support.chain_count) {
                // 初期連鎖+2、レベルごとに+1
                finalConfig.chain_count = (finalConfig.chain_count || 0) + support.chain_count + (lvl - 1);
                finalConfig.chain_range = support.range || 200;
            }
        });

        // Artifact: Tesla Coil (Global Chain Count)
        if (engineState.stats.chain_count > 0) {
            finalConfig.chain_count = (finalConfig.chain_count || 0) + engineState.stats.chain_count;
            if (!finalConfig.chain_range) finalConfig.chain_range = 200;
        }

        let fire = false;
        if (loadout.isMain) {
            attackCooldownCounter++;
            if (attackCooldownCounter >= finalFireRate) {
                fire = true;
                attackCooldownCounter = 0;
            }
        } else {
            attackCooldownSub++;
            if (attackCooldownSub >= finalFireRate * 2) {
                fire = true;
                attackCooldownSub = 0;
            }
        }

        if (fire) {
            // Flat Self Damage
            if (engineState.stats.self_damage > 0) {
                engineState.baseIntegrity -= (engineState.stats.self_damage * (loadout.isMain ? 1.0 : 0.5));
            }
            // Percentage Self Damage (Blood Rite)
            if (engineState.stats.self_damage_pct > 0) {
                const cost = engineState.baseIntegrity * engineState.stats.self_damage_pct * (loadout.isMain ? 1.0 : 0.5);
                engineState.baseIntegrity -= cost;
            }

            const fireProjectile = (cfg, tgt, x, y) => {
                // Artifact: Phantom Barrel (Extra Shot)
                const phantomBarrel = engineState.artifacts.find(a => a.id === 'phantom_barrel');
                let shots = 1;
                if (phantomBarrel) {
                    const chance = phantomBarrel.config ? phantomBarrel.config.chance : 0.20;
                    const extra = phantomBarrel.config ? phantomBarrel.config.extra_shots : 1;
                    if (Math.random() < chance) shots += extra;
                }

                // Artifact: Chaos Dice
                if (engineState.artifacts.some(a => a.id === 'chaos_dice')) {
                    cfg.damage *= (0.5 + Math.random() * 1.5);
                }

                for(let s=0; s<shots; s++) {
                    const finalCfg = { ...cfg };

                    let aimTarget = tgt;
                    // ... (Original Aim Logic)
                    if (tgt && finalCfg.id !== 'nova') {
                        const dist = Math.hypot(tgt.positionX - x, tgt.positionY - y);
                        const timeToHit = dist / finalCfg.speed;
                        const enemySpeed = (tgt.freezeTimer > 0) ? 0 : tgt.baseSpeed;
                        const predictedY = tgt.positionY + (enemySpeed * timeToHit);
                        aimTarget = { positionX: tgt.positionX, positionY: predictedY };
                    }
                    // Scatter Phantom shots slightly
                    const originX = s===0 ? x : x + (Math.random()-0.5)*20;

                    activeProjectiles.push(new MagicProjectile(originX, y, aimTarget, finalCfg));
                }
            };

            const sourceX = RENDER_CONSTANTS.TURRET_POS_X;
            const sourceY = RENDER_CONSTANTS.TURRET_POS_Y;

            if (finalConfig.id === 'rock') {
                let baseTargetX = target ? target.positionX : (Math.random() * (GAME_SETTINGS.SCREEN_WIDTH - 100) + 50);
                let baseTargetY = target ? target.positionY : (400 + Math.random() * 200);
                const safeMargin = 40;

                for (let i = 0; i < spreadCount; i++) {
                    const scatterW = 120 + (spreadCount * 10);
                    const scatterH = 80;
                    let offsetX = (Math.random() - 0.5) * scatterW * 2;
                    let offsetY = (Math.random() - 0.5) * scatterH;
                    if (target && i === 0) { offsetX *= 0.2; offsetY *= 0.2; }
                    let tx = baseTargetX + offsetX;
                    let ty = baseTargetY + offsetY;
                    if (tx < safeMargin) tx = safeMargin + (Math.random() * 20);
                    if (tx > GAME_SETTINGS.SCREEN_WIDTH - safeMargin) tx = GAME_SETTINGS.SCREEN_WIDTH - safeMargin - (Math.random() * 20);
                    const startY = -100 - (Math.random() * 150);
                    activeProjectiles.push(new MagicProjectile(tx, startY, null, {
                        ...finalConfig,
                        velocityX: 0,
                        velocityY: finalConfig.speed * 2,
                        isFallingRock: true,
                        targetY: ty
                    }));
                }
            }
            else if (isShotgun) {
                let baseAngle = -Math.PI / 2;
                if (target) {
                    const dist = Math.hypot(target.positionX - sourceX, target.positionY - sourceY);
                    const timeToHit = dist / finalConfig.speed;
                    const enemySpeed = (target.freezeTimer > 0) ? 0 : target.baseSpeed;
                    const predictedY = target.positionY + (enemySpeed * timeToHit);
                    const deltaX = target.positionX - sourceX;
                    const deltaY = predictedY - sourceY;
                    baseAngle = Math.atan2(deltaY, deltaX);
                }
                for (let i = 0; i < spreadCount; i++) {
                    // [Fix] Smart Spread: 最初の1発は常に正面、2発目以降を左右に振り分けることで偶数時の「中央の穴」を防止
                    const angleOffset = (i === 0) ? 0 : Math.ceil(i / 2) * (i % 2 === 0 ? 1 : -1) * EFFECT_CONSTANTS.MULTISHOT_SPREAD_ANGLE;
                    const finalAngle = baseAngle + angleOffset;
                    const vx = Math.cos(finalAngle) * finalConfig.speed;
                    const vy = Math.sin(finalAngle) * finalConfig.speed;
                    activeProjectiles.push(new MagicProjectile(sourceX, sourceY, null, { ...finalConfig, velocityX: vx, velocityY: vy }));
                }
            } else {
                fireProjectile(finalConfig, target, sourceX, sourceY);
            }

            engineState.activeSupportUnits.forEach(unit => {
                if (unit.type === 'CLONE') {
                    if (isShotgun) {
                         for (let i = 0; i < spreadCount; i++) {
                            // [Fix] Smart Spread for Clone
                            const angleOffset = (i === 0) ? 0 : Math.ceil(i / 2) * (i % 2 === 0 ? 1 : -1) * EFFECT_CONSTANTS.MULTISHOT_SPREAD_ANGLE;
                            let baseAngle = -Math.PI / 2;
                            if (target) baseAngle = Math.atan2(target.positionY - unit.y, target.positionX - unit.x);
                            const finalAngle = baseAngle + angleOffset;
                            const vx = Math.cos(finalAngle) * finalConfig.speed;
                            const vy = Math.sin(finalAngle) * finalConfig.speed;
                            activeProjectiles.push(new MagicProjectile(unit.x, unit.y, null, { ...finalConfig, velocityX: vx, velocityY: vy }));
                        }
                    } else {
                        activeProjectiles.push(new MagicProjectile(unit.x, unit.y, target, finalConfig));
                    }
                }
            });
        }
    });
}

function spawnEnemy() {
    if (engineState.isBossWave) {
        if (Math.random() < 0.85) return; // Reduce noise during boss
        // Spawns minions during boss fight
        const minionTier = Math.random() < 0.3 ? ENEMY_TIERS.SWARM : ENEMY_TIERS.NORMAL;
        activeEnemies.push(new EnemyUnit(minionTier));
        return;
    }

    // [Patch] Advanced Spawn Logic
    if (Math.random() < GAME_SETTINGS.FORMATION_CHANCE) {
        const pattern = Math.random();
        if (pattern < 0.33) spawnFormation_Line();
        else if (pattern < 0.66) spawnFormation_Horde();
        else spawnFormation_Guard();
    } else {
        const rand = Math.random();
        const wave = engineState.currentWaveNumber;
        let tier = ENEMY_TIERS.NORMAL;

        // Dynamic Probability based on ENEMY_TIERS.chance and Wave
        // Higher wave = higher chance for advanced types
        // Base chances: TANK(0.15), ROGUE(0.30), SWARM(0.45), MAGIC(0.60), RARE(0.70)

        const difficultyMod = Math.min(0.25, (wave - 1) * 0.02); // Increases 2% per wave, cap at 25%

        // Check from rarest to common
        if (rand > (1.0 - (0.05 + difficultyMod))) tier = ENEMY_TIERS.RARE;
        else if (rand > (1.0 - (0.15 + difficultyMod))) tier = ENEMY_TIERS.MAGIC;
        else if (rand > 0.75) tier = ENEMY_TIERS.TANK;  // 25% chance
        else if (rand > 0.55) tier = ENEMY_TIERS.ROGUE; // 20% chance
        else if (rand > 0.35) tier = ENEMY_TIERS.SWARM; // 20% chance
        // else NORMAL (35% chance)

        activeEnemies.push(new EnemyUnit(tier));
    }
}

function spawnFormation_Line() {
    const count = 3 + Math.floor(Math.random() * 2); 
    const spacing = 60;
    const startX = Math.random() * (GAME_SETTINGS.SCREEN_WIDTH - (count * spacing));
    for(let i=0; i<count; i++) activeEnemies.push(new EnemyUnit(ENEMY_TIERS.NORMAL, startX + i*spacing, -50));
    activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, 100, "⚠ LINE FORMATION", "#e74c3c", 16));
}
function spawnFormation_Horde() {
    const count = 5 + Math.floor(Math.random() * 3);
    const centerX = Math.random() * (GAME_SETTINGS.SCREEN_WIDTH - 100) + 50;
    for(let i=0; i<count; i++) {
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80 - 50;
        activeEnemies.push(new EnemyUnit(ENEMY_TIERS.NORMAL, centerX + offsetX, offsetY));
    }
    activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, 100, "⚠ HORDE INCOMING", "#e74c3c", 16));
}
function spawnFormation_Guard() {
    const centerX = Math.random() * (GAME_SETTINGS.SCREEN_WIDTH - 100) + 50;
    const leaderTier = Math.random() < 0.2 ? ENEMY_TIERS.RARE : ENEMY_TIERS.MAGIC;
    activeEnemies.push(new EnemyUnit(leaderTier, centerX, -50));
    activeEnemies.push(new EnemyUnit(ENEMY_TIERS.NORMAL, centerX - 40, -30));
    activeEnemies.push(new EnemyUnit(ENEMY_TIERS.NORMAL, centerX + 40, -30));
    activeEnemies.push(new EnemyUnit(ENEMY_TIERS.NORMAL, centerX - 40, -70));
    activeEnemies.push(new EnemyUnit(ENEMY_TIERS.NORMAL, centerX + 40, -70));
    activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, 100, "⚠ ELITE GUARD", "#f1c40f", 16));
}

function mainLoop() {
    if (engineState.isGameOver) {
        displayGameOver();
        return;
    }
    if (!engineState.isPaused) {
        // [Patch] Variable Time Step Logic
        engineState.accumulator += engineState.timeScale;
        // Cap accumulator to prevent spiral of death
        if (engineState.accumulator > 5.0) engineState.accumulator = 5.0;

        while (engineState.accumulator >= 1.0) {
            engineState.accumulator -= 1.0;

            // --- Core Update Logic ---
            if (engineState.timeStopTimer > 0) {
                engineState.timeStopTimer--;
                if (engineState.timeStopTimer <= 0) {
                    activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "RESUME", "#fff", 30));
                }
            }

            // Spawn Logic (Paused during Time Stop)
            if (engineState.timeStopTimer <= 0) {
                enemySpawnCounter++;
                const rate = Math.max(GAME_SETTINGS.SPAWN_RATE_MIN, GAME_SETTINGS.SPAWN_RATE_BASE - (engineState.currentWaveNumber * 2));
                if (enemySpawnCounter > rate) {
                    spawnEnemy();
                    enemySpawnCounter = 0;
                }
            }

            handleAutoAttack();
            engineState.updateEnergy();
            engineState.updateCrewAbilities(); // Crew CD tick
            engineState.activeSupportUnits.forEach(unit => unit.update());
            engineState.activeSupportUnits = engineState.activeSupportUnits.filter(u => u.life > 0);
            activeZoneEffects.forEach(zone => zone.update());
            activeZoneEffects = activeZoneEffects.filter(z => z.life > 0);

            activeProjectiles.forEach(projectile => projectile.update());
            activeEnemyProjectiles.forEach(ep => ep.update());
            activeEnemyProjectiles = activeEnemyProjectiles.filter(ep => ep.isAlive);
            engineState.activeDrops.forEach(drop => drop.update());

            activeEnemies.forEach(enemy => {
                enemy.update();
                activeProjectiles.forEach(projectile => {
                    if (!projectile.isAlive) return;
                    if (projectile.hitTargetIds.has(enemy.id)) return;
                    if (enemy.confusionTimer > 0) return;

                    const hitDist = (enemy.size / 2) + RENDER_CONSTANTS.PROJECTILE_SIZE;
                    const collisionDistance = Math.hypot(enemy.positionX - projectile.currentX, enemy.positionY - projectile.currentY);

                    if (collisionDistance < hitDist) {
                        projectile.hitTargetIds.add(enemy.id);

                        if (engineState.stats.life_on_hit > 0) {
                            const maxHP = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
                            if (engineState.baseIntegrity < maxHP) {
                                engineState.baseIntegrity = Math.min(engineState.baseIntegrity + engineState.stats.life_on_hit, maxHP);
                            }
                        }

                        let critChance = EFFECT_CONSTANTS.BASE_CRIT_CHANCE + engineState.stats.crit_chance;
                        const amulet = engineState.equippedArtifacts.AMULET;
                        if (amulet && amulet.stats && amulet.stats.crit_chance) critChance += amulet.stats.crit_chance;
                        const isCrit = Math.random() < critChance;
                        const finalDamage = isCrit ? projectile.damageValue * EFFECT_CONSTANTS.BASE_CRIT_MULTIPLIER : projectile.damageValue;

                        enemy.takeDamage(finalDamage, isCrit, projectile.effectType);

                        const statusPower = (projectile.rawDamageValue !== undefined) ? projectile.rawDamageValue : projectile.damageValue;

                        if (projectile.effectType === 'fireball') enemy.applyStatus('BURN', statusPower);
                        else if (projectile.effectType === 'nova') applyAreaDamage(enemy.positionX, enemy.positionY, EFFECT_CONSTANTS.NOVA_RADIUS, finalDamage * 0.5, 'nova');
                        else if (projectile.effectType === 'poison') {
                            activeZoneEffects.push(new ZoneEffect(enemy.positionX, enemy.positionY, 'POISON_CLOUD', { damage: statusPower }));
                            projectile.isAlive = false; 
                        }
                        else if (projectile.effectType === 'psychic') enemy.applyStatus('CONFUSION', 0, engineState.currentLevel);
                        else if (projectile.effectType === 'water') enemy.applyStatus('SOAKED', 0);
                        else if (projectile.effectType === 'electric') enemy.applyStatus('SHOCK', finalDamage);
                        else if (projectile.effectType === 'plant') {
                            const ratio = GAME_SETTINGS.LEECH_RATIO || 0.02;
                            const healPerTick = finalDamage * ratio; 
                            enemy.applyStatus('LEECH', healPerTick);
                            activeParticles.push(new ParticleEffect(enemy.positionX, enemy.positionY, "#2ecc71", 3));
                        }

                        if (projectile.pierceCount > 0) {
                            projectile.pierceCount--;
                        } else {
                            projectile.isAlive = false;
                            if (projectile.chainCount > 0) {
                                let nearest = null;
                                let minD = Infinity;
                                const effectiveRange = (projectile.chainRange || 200) * (1.0 + (engineState.stats.chain_range_pct || 0));
                                for (const other of activeEnemies) {
                                    if (other.id !== enemy.id && other.isActive && !projectile.hitTargetIds.has(other.id)) {
                                         const d = Math.hypot(other.positionX - enemy.positionX, other.positionY - enemy.positionY);
                                        if (d < effectiveRange && d < minD) {
                                            minD = d;
                                            nearest = other;
                                        }
                                    }
                                }

                                if (nearest) {
                                    const chainConfig = {
                                        id: projectile.effectType, 
                                        damage: projectile.damageValue * 0.8, 
                                        speed: projectile.moveSpeed,       
                                        color: EFFECT_CONSTANTS.COLOR_CHAIN,
                                        level: 1,                          
                                        chain_count: projectile.chainCount - 1,
                                        chain_range: projectile.chainRange,
                                        pierce_count: 0,
                                        ignoreIds: projectile.hitTargetIds 
                                    };
                                    const chainProj = new MagicProjectile(enemy.positionX, enemy.positionY, nearest, chainConfig);
                                    activeProjectiles.push(chainProj);
                                    activeFloatingTexts.push(new FloatingText(enemy.positionX, enemy.positionY - 40, "CHAIN!", EFFECT_CONSTANTS.COLOR_CHAIN, 14));
                                } else if (projectile.effectType === 'fireball') {
                                    applyAreaDamage(enemy.positionX, enemy.positionY, EFFECT_CONSTANTS.FIREBALL_RADIUS, finalDamage * 0.5, 'fireball');
                                }
                            } else {
                                if (projectile.effectType === 'fireball') {
                                    applyAreaDamage(enemy.positionX, enemy.positionY, EFFECT_CONSTANTS.FIREBALL_RADIUS, finalDamage * 0.5, 'fireball');
                                }
                            }
                        }

                        if (enemy.health <= 0 && enemy.isActive) {
                            handleEnemyDeath(enemy, isCrit, projectile.damageValue);
                        }
                    }
                });
            });
            activeParticles.forEach(particleInstance => particleInstance.update());
            activeShockwaves.forEach(shockwaveInstance => shockwaveInstance.update());
            activeFloatingTexts.forEach(textInstance => textInstance.update());

            activeEnemies = activeEnemies.filter(enemy => enemy.isActive);
            activeProjectiles = activeProjectiles.filter(projectile => projectile.isAlive);
            activeParticles = activeParticles.filter(particleInstance => particleInstance.life > 0);
            activeShockwaves = activeShockwaves.filter(shockwaveInstance => shockwaveInstance.currentLife > 0);
            activeFloatingTexts = activeFloatingTexts.filter(textInstance => textInstance.life > 0);
            if (engineState.baseIntegrity <= 0) {
                engineState.isGameOver = true;
            }
        }
    }

    // Background Update
    if (starField) starField.update(engineState.currentWaveNumber);

    renderScene();

    if (engineState.inventoryDirty) {
        refreshInventoryInterface();
        engineState.inventoryDirty = false;
    }

    if (shakeTime > 0) {
        shakeTime--;
        shakeIntensity *= 0.9;
    }
    requestAnimationFrame(mainLoop);
}

function renderScene() {
    gameContext.save();
    gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        gameContext.translate(dx, dy);
    }

    // Draw Dynamic Starfield Background
    if (starField) {
        starField.draw(gameContext, engineState.currentWaveNumber);
    } else {
        gameContext.fillStyle = "#1e272e";
        gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    }

    // Draw Ground (Castle Area)
    gameContext.fillStyle = "#2c3e50";
    gameContext.fillRect(0, GAME_SETTINGS.CASTLE_Y, gameCanvas.width, gameCanvas.height - GAME_SETTINGS.CASTLE_Y);

    // --- Enhanced Shield Rendering (Arc Dome) ---
    if (engineState.isShieldActive || engineState.shieldImpactTimer > 0) {
        gameContext.save();
        const isJust = engineState.shieldTimer < 20;
        const isImpact = engineState.shieldImpactTimer > 0;

        if (isImpact) engineState.shieldImpactTimer--;

        // シールドの設定
        const centerX = RENDER_CONSTANTS.TURRET_POS_X;
        const centerY = GAME_SETTINGS.CASTLE_Y;
        const radiusX = gameCanvas.width / 1.5; // 横幅広めになだらかに
        const radiusY = 70; // 砲台の先端より少し高い位置
        const baseColor = isImpact ? "#ffffff" : (isJust ? "#66fcf1" : "#45a29e");
        const glowColor = isImpact ? "#ffffff" : "#66fcf1";

        // パスの作成（ドーム型）
        gameContext.beginPath();
        gameContext.ellipse(centerX, centerY, radiusX, radiusY, 0, Math.PI, 2 * Math.PI);

        // 1. 内部グラデーション（放射状）
        const grad = gameContext.createRadialGradient(
            centerX, centerY, radiusY * 0.2,
            centerX, centerY, radiusY
        );
        const alphaMain = isImpact ? 0.6 : 0.25;
        const alphaCore = isImpact ? 0.3 : 0.05;

        grad.addColorStop(0, `rgba(102, 252, 241, ${alphaCore})`);
        grad.addColorStop(0.7, `rgba(102, 252, 241, ${alphaMain})`);
        grad.addColorStop(1, `rgba(102, 252, 241, 0.7)`); // 縁付近を濃く

        gameContext.fillStyle = grad;
        gameContext.fill();

        // 2. 発光する縁（アウトライン）
        gameContext.shadowBlur = isImpact ? 40 : (isJust ? 25 : 15);
        gameContext.shadowColor = glowColor;
        gameContext.strokeStyle = baseColor;
        gameContext.lineWidth = isImpact ? 6 : (isJust ? 4 : 2);
        gameContext.stroke();

        // 3. ヘックスグリッド模様（Tech感）
        if (!isImpact) {
            gameContext.save();
            gameContext.clip(); // ドーム内に限定

            gameContext.strokeStyle = "rgba(102, 252, 241, 0.15)";
            gameContext.lineWidth = 1;
            gameContext.shadowBlur = 0;

            // 簡易的なハニカム風ライン描画
            const hexSize = 40;
            gameContext.beginPath();
            // 斜め線のみでグリッド感を出す
            for (let x = -gameCanvas.width; x < gameCanvas.width * 2; x += hexSize) {
                gameContext.moveTo(x, centerY);
                gameContext.lineTo(x + radiusY, centerY - radiusY * 1.5);
                gameContext.moveTo(x, centerY);
                gameContext.lineTo(x - radiusY, centerY - radiusY * 1.5);
            }
            gameContext.stroke();
            gameContext.restore();
        }

        gameContext.restore();
    }

    const equippedActive = engineState.equippedGems[0];
    const turretColor = equippedActive ? equippedActive.color : "#95a5a6";
    const tx = RENDER_CONSTANTS.TURRET_POS_X;
    const ty = RENDER_CONSTANTS.TURRET_POS_Y;

    // --- Enhanced Turret Drawing ---
    gameContext.save();
    gameContext.translate(tx, ty);

    // 1. Turret Base (Fixed Dome)
    gameContext.beginPath();
    gameContext.arc(0, 10, 25, Math.PI, 0); 
    gameContext.fillStyle = "#2c3e50";
    gameContext.fill();
    gameContext.strokeStyle = "#555";
    gameContext.lineWidth = 2;
    gameContext.stroke();

    // 2. Rotating Barrel
    let angle = -Math.PI / 2; 
    // Simple target tracking for visuals
    const aimingTarget = getTarget(); 
    if (aimingTarget) {
        angle = Math.atan2(aimingTarget.positionY - ty, aimingTarget.positionX - tx);
    } else if (engineState.manualTargetId) {
        // Fallback for manual target logic if getTarget returns null
        const mTarget = activeEnemies.find(e => e.id === engineState.manualTargetId);
        if (mTarget) angle = Math.atan2(mTarget.positionY - ty, mTarget.positionX - tx);
    } else {
        // Idle animation (breath)
        angle = -Math.PI / 2 + Math.sin(Date.now() / 1000) * 0.1;
    }

    gameContext.rotate(angle);

    // Recoil Animation
    const recoil = (attackCooldownCounter < 4) ? (4 - attackCooldownCounter) * 2 : 0;

    // Barrel Body
    gameContext.fillStyle = "#34495e";
    gameContext.fillRect(0, -10, 45 - recoil, 20); 

    // Colored Stripe (Weapon Type Indicator)
    gameContext.fillStyle = turretColor;
    gameContext.shadowColor = turretColor;
    gameContext.shadowBlur = 10;
    gameContext.fillRect(10, -6, 25 - recoil, 12);
    gameContext.shadowBlur = 0;

    // Muzzle
    gameContext.fillStyle = "#7f8c8d";
    gameContext.fillRect(40 - recoil, -12, 8, 24);

    // 3. Central Pivot (On top)
    gameContext.rotate(-angle); // Cancel rotation for the core
    gameContext.beginPath();
    gameContext.arc(0, 0, 12, 0, Math.PI * 2);
    gameContext.fillStyle = "#bdc3c7";
    gameContext.fill();
    gameContext.strokeStyle = "#2c3e50";
    gameContext.stroke();

    // Core Light
    gameContext.beginPath();
    gameContext.arc(0, 0, 6, 0, Math.PI * 2);
    gameContext.fillStyle = turretColor;
    gameContext.shadowColor = turretColor;
    gameContext.shadowBlur = 15;
    gameContext.fill();
    gameContext.shadowBlur = 0;

    gameContext.restore();

    engineState.activeDrops.forEach(drop => drop.draw(gameContext));
    activeZoneEffects.forEach(zone => zone.draw(gameContext));
    engineState.activeSupportUnits.forEach(unit => unit.draw(gameContext));
    activeEnemies.forEach(enemy => enemy.draw(gameContext));
    activeProjectiles.forEach(projectile => projectile.draw(gameContext));
    activeEnemyProjectiles.forEach(enemyProjectileInstance => enemyProjectileInstance.draw(gameContext));
    activeParticles.forEach(particleInstance => particleInstance.draw(gameContext));
    activeShockwaves.forEach(shockwaveInstance => shockwaveInstance.draw(gameContext));
    activeFloatingTexts.forEach(textInstance => textInstance.draw(gameContext));
    
    gameContext.restore();
    updateHudDisplay();
}

function displayGameOver() {
    gameContext.save();
    gameContext.fillStyle = "rgba(0,0,0,0.85)";
    gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    gameContext.fillStyle = "#e74c3c";
    gameContext.font = "bold 40px 'Hiragino Kaku Gothic Pro', sans-serif";
    gameContext.textAlign = "center";
    gameContext.fillText("通信途絶 (ゲームオーバー)", gameCanvas.width / 2, gameCanvas.height / 2);
    gameContext.font = "20px sans-serif";
    gameContext.fillStyle = "#fff";
    gameContext.fillText("[R]キー でリトライ", gameCanvas.width / 2, gameCanvas.height / 2 + 50);
    gameContext.restore();
}

function addExperience(value) {
    engineState.experiencePoints += value;
    if (engineState.experiencePoints >= engineState.calculateNextLevelXp()) {
        engineState.experiencePoints = 0;
        engineState.currentLevel++;
        engineState.skillPoints++; 

        // [Patch] Trigger New Upgrade UI
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2 - 100, `レベルアップ！`, "#f1c40f", 30));
        triggerScreenShake(10, 5);

        // Open Modal after a short delay
        setTimeout(() => {
            if (window.showLevelUpOptions) window.showLevelUpOptions();
        }, 600);
    }
}

/**
 * 敵撃破時のアイテム/ゴールドドロップ生成
 * @param {number} positionX - 生成X座標
 * @param {number} positionY - 生成Y座標
 */
function generateDrop(positionX, positionY) {
    // 1. ゴールドドロップ判定
    if (Math.random() < (GAME_SETTINGS.GOLD_DROP_CHANCE || 0.4)) {
        engineState.activeDrops.push(new DropItem(positionX, positionY, MISC_ITEMS.GOLD));
        return;
    }

    // 2. アイテムドロッププールの構築
    const itemPool = [];
    const allTemplates = [...Object.values(GEMS), ...Object.values(ARTIFACTS)];

    // 現在の装備状況を確認
    const currentEquippedItems = [...engineState.equippedGems, ...engineState.altGems].filter(itemInstance => itemInstance !== null);
    const equippedActiveGems = currentEquippedItems.filter(itemInstance => itemInstance.type === GEM_TYPES.ACTIVE);
    const equippedItemIds = currentEquippedItems.map(itemInstance => itemInstance.id);

    // アクティブGEMが2つ以上装備されているか（ビルドの方向性が決まっているか）
    const isBuildEstablished = equippedActiveGems.length >= 2;

    allTemplates.forEach(template => {
        // 全アイテムをプールに入れる。
        // サポートGEMは種類が少ないため、ベースの重みを増やす(1->3)
        const baseWeight = (template.type === GEM_TYPES.SUPPORT) ? 3 : 1;
        for (let count = 0; count < baseWeight; count++) {
            itemPool.push(template);
        }

        // 装備中のアイテム（Active/Support問わず）の重みを大幅に増やす
        // ビルド確定（Active2種以上）ならさらに強力なボーナス
        if (equippedItemIds.includes(template.id)) {
            const weightBonus = isBuildEstablished ? 15 : 8; 
            for (let count = 0; count < weightBonus; count++) {
                itemPool.push(template);
            }
        }
    });

    const selectedTemplate = itemPool[Math.floor(Math.random() * itemPool.length)];

    // 3. ドロップレベルの決定
    let dropLevel = 1;
    const currentWave = engineState.currentWaveNumber;
    const levelRoll = Math.random();

    const chanceLevel3 = Math.min(0.20, Math.max(0, (currentWave - 10) * 0.02));
    const chanceLevel2 = Math.min(0.40, Math.max(0, (currentWave - 3) * 0.03));

    if (levelRoll < chanceLevel3) {
        dropLevel = 3;
    } else if (levelRoll < (chanceLevel3 + chanceLevel2)) {
        dropLevel = 2;
    }

    const finalItemTemplate = { ...selectedTemplate, forcedLevel: dropLevel };
    engineState.activeDrops.push(new DropItem(positionX, positionY, finalItemTemplate));
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ') engineState.swapLoadout(); 
    if (e.code === 'Space') engineState.togglePause();
    if (e.code === 'KeyR' && engineState.isGameOver) {
        location.reload();
    }
});

// --- Game Flow Control ---
window.isGameRunning = false;

window.startGame = function() {
    // Show Crew Selection first
    if (window.showCrewSelection) {
        window.showCrewSelection((selectedCrewIds, startGem) => {
            const title = document.getElementById('title-screen');
            if (title) title.classList.add('hidden');

            // Reset and Start
            engineState.reset();

            // Apply Selection
            engineState.selectedCrew = selectedCrewIds;
            engineState.recalcStats();
            engineState.addItemToInventory(startGem);
            engineState.equipItem(engineState.inventory[0].uuid, 0);

            activeEnemies = [];
            activeProjectiles = [];
            activeEnemyProjectiles = [];
            activeParticles = [];
            activeFloatingTexts = [];
            // Reset Background
            starField = new StarField(GAME_SETTINGS.SCREEN_WIDTH, GAME_SETTINGS.SCREEN_HEIGHT);

            refreshInventoryInterface();
            if(window.updateArtifactHud) window.updateArtifactHud();
            if(window.updateCrewHud) window.updateCrewHud();

            if (!window.isGameRunning) {
                window.isGameRunning = true;
                mainLoop();
            }
        });
    } else {
        console.error("UI Module not loaded.");
    }
};