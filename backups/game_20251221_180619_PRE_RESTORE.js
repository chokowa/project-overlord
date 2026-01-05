/**
 * @fileoverview 究極の防衛ゲーム: Project OVERLORD Core Logic
 * 変更点: スキルツリーシステム(ランク制)、Chainサポート、GEMスケーリング改善、ショップ機能
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 */
import { GAME_SETTINGS, GEMS, GEM_TYPES, ARTIFACTS, ARTIFACT_TYPES, MISC_ITEMS, UNIQUES, SHOP_ITEMS, ENEMY_TIERS, STAGE_CONFIG, SKILL_TREE_NODES, UI_STRINGS } from './constants.js';

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

/** 演出・スキル効果用定数 */
const EFFECT_CONSTANTS = {
    PARTICLE_COUNT: 8,
    PARTICLE_LIFE_DECAY: 0.05,
    TEXT_LIFE_DECAY: 0.02,
    
    BASE_CRIT_CHANCE: 0.05,
    BASE_CRIT_MULTIPLIER: 1.5,
    
    BURN_DURATION: 180,
    BURN_TICK_RATE: 30,
    BURN_DAMAGE_RATIO: 0.2,

    NOVA_RADIUS: 120,
    FIREBALL_RADIUS: 100, // Fireball explosion radius
    FREEZE_CHANCE: 0.4,
    FREEZE_DURATION: 120,
    SHATTER_PROJECTILE_COUNT: 12,
    SHATTER_SPEED: 12,
    MULTISHOT_SPREAD_ANGLE: 0.26, 
    
    COLOR_CRIT: "#f1c40f",
    COLOR_NORMAL: "#ffffff",
    COLOR_BURN: "#e67e22",
    COLOR_FREEZE: "#74b9ff",
    COLOR_LEVELUP: "#00d2d3",
    COLOR_TARGET: "#ff0000",
    COLOR_CHAIN: "#f39c12"
};

/** 内部ロジック用定数 */
const SELECTION_CRITERIA = {
    MIN_DIST: "MIN_DIST",
    MAX_HP: "MAX_HP",
    MIN_HP: "MIN_HP"
};

function generateUuid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function createItemInstance(template, level = 1) {
    return {
        ...template,
        uuid: generateUuid(),
        level: level,
    };
}

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
        else if (this.itemTemplate.type === GEM_TYPES.SUPPORT) icon = "💎";
        else if (this.itemTemplate.type === ARTIFACT_TYPES.RING) icon = "💍";
        else if (this.itemTemplate.type === ARTIFACT_TYPES.AMULET) icon = "🧿";
        else if (this.itemTemplate.type === 'GOLD') icon = "💰";

        context.fillText(icon, 0, 1);
        context.restore();
    }
}

/** * ゲームエンジンクラス: 全体の状態とロジックを統括 */
class GameEngine {
    constructor() {
        this.baseIntegrity = GAME_SETTINGS.BASE_MAX_HP;
        this.experiencePoints = 0;
        this.currentLevel = 1;
        this.skillPoints = 0; // スキルポイント
        this.allocatedNodes = { 0: 1 }; // [Patch] ID: Rank map (Rank System)

        this.isPaused = false;
        this.isGameOver = false;
        
        this.currentStageIndex = 0;
        this.currentWaveNumber = 1;
        this.waveProgress = 0;      // [Patch] Current kills in wave
        this.waveQuota = 10;        // [Patch] Kills needed for next wave
        this.isBossWave = false;    // [Patch] Boss fight flag
        this.gold = 0; // 所持金初期化

        /** @type {(Object|null)[]} */
        this.equippedGems = [null, null, null];

        /** @type {Object} */
        this.equippedArtifacts = {
            [ARTIFACT_TYPES.RING]: null,
            [ARTIFACT_TYPES.AMULET]: null
        };

        this.inventory = [];
        this.activeDrops = [];
        this.activeSupportUnits = []; // [Patch] Support Units
        this.manualTargetId = null;
        this.inventoryDirty = false; // [Patch] Optimization flag
        // 集計ステータス
        this.stats = {
            damage_pct: 0,
            rate_pct: 0,
            crit_chance: 0,
            xp_gain: 0,
            hp_max: 0,
            speed_pct: 0,
            proj_speed_pct: 0,
            support_effect: 0,
            self_damage: 0
        };
    }

    reset() {
        this.baseIntegrity = GAME_SETTINGS.BASE_MAX_HP;
        this.experiencePoints = 0;
        this.currentLevel = 1;
        this.skillPoints = 0;
        this.allocatedNodes = { 0: 1 }; // Reset to Origin Rank 1
        this.recalcStats();

        this.isPaused = false;
        this.isGameOver = false;
        this.currentStageIndex = 0;
        this.currentWaveNumber = 1;
        this.waveProgress = 0;
        this.waveQuota = 10;
        this.isBossWave = false;
        this.gold = 0;

        // [Patch] Energy & Shield System
        this.energy = 100;
        this.maxEnergy = 100;
        this.isShieldActive = false;
        this.shieldTimer = 0;

        this.equippedGems = [null, null, null];
        this.equippedArtifacts = {
            [ARTIFACT_TYPES.RING]: null,
            [ARTIFACT_TYPES.AMULET]: null
        };

        this.inventory = [];
        this.activeDrops = [];
        this.activeSupportUnits = [];
        this.manualTargetId = null;

        // 初期装備
        this.addItemToInventory(GEMS.FIREBALL);
        this.equipItem(this.inventory[0].uuid, 0); 
    }

    /** スキルツリーのステータス再計算 (Rank System対応) */
    recalcStats() {
        this.stats = {
            damage_pct: 0, rate_pct: 0, crit_chance: 0, xp_gain: 0,
            hp_max: 0, speed_pct: 0, proj_speed_pct: 0, support_effect: 0, self_damage: 0,
            life_on_hit: 0, gold_gain: 0
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

        // HP Update (Max HP changed)
        const finalMaxHP = GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max;
        if (this.baseIntegrity > finalMaxHP) this.baseIntegrity = finalMaxHP;
    }

    // [Patch] Allocate Node with Rank Check
    allocateNode(nodeId) {
        if (this.skillPoints <= 0) return false;

        const node = SKILL_TREE_NODES[nodeId];
        const currentRank = this.allocatedNodes[nodeId] || 0;
        const maxRank = node.maxRank || 1;

        if (currentRank >= maxRank) return false;

        // Check connectivity
        let connected = false;
        if (currentRank > 0) {
            connected = true; // Upgrade existing node
        } else {
            // Unlock check (neighbors must have rank > 0)
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
            return true;
        }
        return false;
    }

    addItemToInventory(templateItem, level = 1) {
        if (this.inventory.length >= GAME_SETTINGS.INVENTORY_CAPACITY) {
            activeFloatingTexts.push(new FloatingText(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y - 100, "INVENTORY FULL", "#e74c3c", 20));
            return;
        }
        const newItem = createItemInstance(templateItem, level);
        this.inventory.push(newItem);
        refreshInventoryInterface();
    }

    equipItem(uuid, slotIndex) {
        const item = this.inventory.find(i => i.uuid === uuid);
        if (!item) return;
        this.unequipByUuid(uuid);

        if (typeof slotIndex === 'number') {
            if (slotIndex === 0 && item.type === GEM_TYPES.ACTIVE) {
                this.equippedGems[slotIndex] = item;
            } else if ((slotIndex === 1 || slotIndex === 2) && item.type === GEM_TYPES.SUPPORT) {
                this.equippedGems[slotIndex] = item;
            }
        }
        else if (typeof slotIndex === 'string' && item.type === slotIndex) {
            this.equippedArtifacts[slotIndex] = item;
        }

        this.recalcStats(); 
        refreshInventoryInterface();
        updateMainScreenLoadout();
    }

    unequipByUuid(uuid) {
        if (!uuid) return;
        for (let i = 0; i < 3; i++) {
            if (this.equippedGems[i] && this.equippedGems[i].uuid === uuid) this.equippedGems[i] = null;
        }
        if (this.equippedArtifacts.RING && this.equippedArtifacts.RING.uuid === uuid) this.equippedArtifacts.RING = null;
        if (this.equippedArtifacts.AMULET && this.equippedArtifacts.AMULET.uuid === uuid) this.equippedArtifacts.AMULET = null;
        
        this.recalcStats();
        refreshInventoryInterface();
        updateMainScreenLoadout();
    }

    salvageItem(uuid) {
        const index = this.inventory.findIndex(i => i.uuid === uuid);
        if (index === -1) return;
        const item = this.inventory[index];
        this.unequipByUuid(uuid);
        this.inventory.splice(index, 1);
        const xpGain = (GAME_SETTINGS.SALVAGE_XP_BASE || 50) * item.level;
        addExperience(xpGain);
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `SALVAGED: +${xpGain} XP`, "#2ecc71", 24));
        refreshInventoryInterface();
    }

    togglePause() {
        if (!this.isGameOver) this.isPaused = !this.isPaused;
    }

    fuseItems() {
        const groups = {};
        this.inventory.forEach(item => {
            const key = `${item.id}_${item.level}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        let fusedCount = 0;
        let fusionOccurred = false;

        Object.keys(groups).forEach(key => {
            const items = groups[key];
            while (items.length >= 3) {
                const materials = items.splice(0, 3);
                let equippedSlotIndex = -1;
                materials.forEach(mat => {
                    if (this.equippedGems.some(g => g && g.uuid === mat.uuid)) equippedSlotIndex = this.equippedGems.findIndex(g => g && g.uuid === mat.uuid);
                    else if (this.equippedArtifacts.RING && this.equippedArtifacts.RING.uuid === mat.uuid) equippedSlotIndex = ARTIFACT_TYPES.RING;
                    else if (this.equippedArtifacts.AMULET && this.equippedArtifacts.AMULET.uuid === mat.uuid) equippedSlotIndex = ARTIFACT_TYPES.AMULET;
                    
                    const idx = this.inventory.indexOf(mat);
                    if (idx > -1) this.inventory.splice(idx, 1);
                    this.unequipByUuid(mat.uuid);
                });

                const template = materials[0];
                let baseTemplate = Object.values(GEMS).find(g => g.id === template.id) || Object.values(ARTIFACTS).find(a => a.id === template.id);

                if (baseTemplate) {
                    const newItem = createItemInstance(baseTemplate, template.level + 1);
                    this.inventory.push(newItem);
                    fusionOccurred = true;
                    fusedCount++;
                    if (equippedSlotIndex !== -1) this.equipItem(newItem.uuid, equippedSlotIndex);
                    
                    activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2 - (fusedCount*20), `FUSION: ${baseTemplate.name} +1`, EFFECT_CONSTANTS.COLOR_LEVELUP, 24));
                }
            }
        });

        if (!fusionOccurred) {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "NO MATCHING ITEMS", "#95a5a6", 20));
        } else {
            refreshInventoryInterface();
        }
    }

    calculateNextLevelXp() {
        return Math.floor(GAME_SETTINGS.XP_PER_LEVEL_BASE * Math.pow(this.currentLevel, GAME_SETTINGS.XP_SCALING));
    }

    // [Patch] 基地修理機能
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
    }

    // [Patch] 闇市ガチャ機能
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

        // ガチャプール: Gem + Artifact + Unique
        const pool = [
            ...Object.values(GEMS), 
            ...Object.values(ARTIFACTS), 
            ...Object.values(UNIQUES)
        ];
        const template = pool[Math.floor(Math.random() * pool.length)];

        // Random Level (Lv1: 50%, Lv2: 30%, Lv3: 15%, Lv4: 5%)
        const roll = Math.random();
        let level = 1;
        if (roll > 0.95) level = 4;
        else if (roll > 0.80) level = 3;
        else if (roll > 0.50) level = 2;

        const newItem = createItemInstance(template, level);
        this.inventory.push(newItem);

        // 演出: ユニークなら特別な色
        const isUnique = Object.values(UNIQUES).some(u => u.id === template.id);
        const color = isUnique ? "#e056fd" : "#9b59b6";

        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `OBTAINED: ${template.name} Lv.${level}`, color, 28));

        // Shop Message Update
        if (shopMsg) {
            shopMsg.style.color = color;
            shopMsg.innerHTML = `OBTAINED: <span style="font-size:14px; font-weight:bold;">${template.name}</span> Lv.${level}`;
        }

        refreshInventoryInterface();
        if (typeof refreshShopInterface === 'function') refreshShopInterface();
    }

    // [Patch] Progression System
    checkProgression(killedEnemy) {
        // ボス戦中はボスの死亡のみをチェック
        if (this.isBossWave) {
            if (killedEnemy.tier.id === 'BOSS') {
                this.completeStage();
            }
            return;
        }

        // 通常WAVE進行
        this.waveProgress++;
        if (this.waveProgress >= this.waveQuota) {
            this.advanceWave();
        }
    }

    advanceWave() {
        const stage = this.getCurrentStageData();
        this.currentWaveNumber++;
        this.waveProgress = 0;
        // 難易度曲線: WAVEごとに必要撃破数増加
        this.waveQuota = Math.floor(10 + (this.currentWaveNumber * 2));

        // ステージの規定WAVE数を超えたらボス戦
        if (this.currentWaveNumber > stage.waveCount) {
            this.isBossWave = true;
            this.spawnStageBoss();
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, 250, "⚠ BOSS ENCOUNTER ⚠", "#e74c3c", 30));
            triggerScreenShake(30, 10);
        } else {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, 200, `WAVE ${this.currentWaveNumber}`, "#fff", 30));
            // WAVEクリアボーナス（HP回復）
            this.baseIntegrity = Math.min(this.baseIntegrity + 50, GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max);
        }
    }

    spawnStageBoss() {
        // 画面上部からボス出現
        const boss = new EnemyUnit(ENEMY_TIERS.BOSS, GAME_SETTINGS.SCREEN_WIDTH/2, -150);
        activeEnemies.push(boss);
    }

    completeStage() {
        this.currentStageIndex++;
        // ステージループまたは終了（ここでは難易度維持してループ）
        if (this.currentStageIndex >= STAGE_CONFIG.length) {
            this.currentStageIndex = STAGE_CONFIG.length - 1; 
        }

        const nextStage = this.getCurrentStageData();
        this.currentWaveNumber = 1;
        this.waveProgress = 0;
        this.waveQuota = 10;
        this.isBossWave = false;

        // ステージクリア演出 & ボーナス
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `${nextStage.name} REACHED`, "#f1c40f", 40));
        this.gold += 500;
        refreshInventoryInterface();
    }

    // [Patch] Shop System
    buyShopItem(itemId) {
        const item = Object.values(SHOP_ITEMS).find(i => i.id === itemId);
        if (!item) return;

        const shopMsg = document.getElementById('shop-message');

        if (this.gold < item.cost) {
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "NO FUNDS", "#e74c3c", 20));
            if (shopMsg) { shopMsg.style.color = "#e74c3c"; shopMsg.innerText = "INSUFFICIENT FUNDS"; }
            return;
        }

        // Apply Logic
        if (item.id === 'repair') {
            const maxHP = GAME_SETTINGS.BASE_MAX_HP + this.stats.hp_max;
            if (this.baseIntegrity >= maxHP) {
                activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, "HP FULL", "#e74c3c", 20));
                if (shopMsg) { shopMsg.style.color = "#e74c3c"; shopMsg.innerText = "HP IS ALREADY FULL"; }
                return;
            }
            this.gold -= item.cost;
            this.baseIntegrity = Math.min(this.baseIntegrity + (GAME_SETTINGS.REPAIR_AMOUNT || 200), maxHP);
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.CASTLE_Y, "REPAIRED!", "#2ecc71", 24));
            if (shopMsg) { shopMsg.style.color = "#2ecc71"; shopMsg.innerText = "SYSTEM REPAIRED"; }
        } 
        else if (item.id === 'mystery') {
            this.buyMysteryBox();
            return; 
        }
        else if (item.type === 'UNIT') {
            this.gold -= item.cost;
            this.activeSupportUnits.push(new SupportUnit(item.type === 'UNIT' ? (item.id === 'clone' ? 'CLONE' : (item.id === 'drone_atk' ? 'DRONE_ATK' : 'DRONE_COL')) : 'UNKNOWN', item.duration));
            activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.CASTLE_Y - 50, `${item.name} DEPLOYED`, "#00d2d3", 24));
            if (shopMsg) { shopMsg.style.color = "#00d2d3"; shopMsg.innerText = `${item.name} ACTIVE`; }
        }

        refreshInventoryInterface();
        if (typeof refreshShopInterface === 'function') refreshShopInterface();
    }

    getCurrentStageData() {
        return STAGE_CONFIG[this.currentStageIndex] || STAGE_CONFIG[0];
    }

    // [Patch] Energy Logic
    updateEnergy() {
        if (this.isShieldActive) {
            this.energy -= 1.5;
            this.shieldTimer++;
            if (this.energy <= 0) {
                this.energy = 0;
                this.isShieldActive = false;
                activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.CASTLE_Y - 50, "SHIELD BROKEN", "#e74c3c", 20));
            }
        } else {
            if (this.energy < this.maxEnergy) this.energy += 0.5;
        }
    }

    setShieldState(isActive) {
        if (isActive && this.energy > 10) {
            if (!this.isShieldActive) {
                this.isShieldActive = true;
                this.shieldTimer = 0;
            }
        } else {
            this.isShieldActive = false;
        }
        const btn = document.getElementById('btn-shield');
        if (btn) {
            btn.style.borderColor = this.isShieldActive ? "#66fcf1" : "#45a29e";
            btn.style.background = this.isShieldActive ? "rgba(102, 252, 241, 0.3)" : "#1f2833";
        }
    }
}

const engineState = new GameEngine();
window.engineState = engineState; 

const gameCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
const gameContext = gameCanvas.getContext('2d');

let activeEnemies = [];
let activeProjectiles = [];
let activeEnemyProjectiles = []; // [Patch] Boss Bullets
let activeParticles = [];
let activeFloatingTexts = [];
let enemySpawnCounter = 0;
let attackCooldownCounter = 0;
let shakeTime = 0;
let shakeIntensity = 0;
let customAiFunction = null;

// --- D&D Handlers ---
window.handleDragStart = function(ev, uuid) {
    ev.dataTransfer.setData("text/plain", uuid);
    ev.dataTransfer.effectAllowed = "move";
    ev.target.style.opacity = '0.5';
};
window.allowDrop = function(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
    const target = ev.target.closest('.gem-slot, #salvage-area, #inventory-grid');
    if (target) target.classList.add('drag-over');
};
window.handleDrop = function(ev, targetType, targetIndex) {
    ev.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const uuid = ev.dataTransfer.getData("text/plain");
    const itemElement = document.querySelector(`[data-uuid="${uuid}"]`);
    if (itemElement) itemElement.style.opacity = '1.0';
    if (!uuid) return;
    if (targetType === 'SLOT') engineState.equipItem(uuid, targetIndex);
    else if (targetType === 'SALVAGE') engineState.salvageItem(uuid);
    else if (targetType === 'INVENTORY') engineState.unequipByUuid(uuid);
};

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
            // [Patch] Gold pickup handling
            if (drop.itemTemplate.type === 'GOLD') {
                let val = (GAME_SETTINGS.GOLD_VALUE_BASE || 25) + Math.floor(Math.random() * 10);
                // ミダスの指輪効果
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

window.toggleMenu = function(menuId) {
    const menus = ['dock-modal', 'logic-modal', 'skill-tree-modal', 'shop-modal'];
    const target = document.getElementById(menuId);

    if (!target) {
        console.warn(`Menu target not found: ${menuId}`);
        return;
    }

    // スキルツリー/ショップの描画リクエスト
    if (menuId === 'skill-tree-modal' && target.classList.contains('hidden')) setTimeout(renderSkillTree, 100);
    if (menuId === 'shop-modal' && target.classList.contains('hidden')) refreshShopInterface();

    menus.forEach(id => {
        if (id !== menuId) {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        }
    });

    if (target.classList.contains('hidden')) {
        target.classList.remove('hidden');
        engineState.isPaused = true;
        refreshInventoryInterface();
    } else {
        target.classList.add('hidden');
        // engineState.isPaused = false; // [Fix] Prevent accidental unpause. Resume manually.
    }
};

// [Patch] Shop Interface
function refreshShopInterface() {
    const grid = document.getElementById('shop-grid');
    const goldDisplay = document.getElementById('shop-gold-display');
    if (!grid || !goldDisplay) return;

    goldDisplay.innerText = `FUNDS: ${engineState.gold} G`;
    grid.innerHTML = '';

    Object.values(SHOP_ITEMS).forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = "background: rgba(0,0,0,0.5); border: 1px solid #444; padding: 10px; border-radius: 6px; display: flex; align-items: center; cursor: pointer; transition: all 0.2s;";
        card.onmouseover = () => { card.style.borderColor = '#f1c40f'; card.style.background = 'rgba(241, 196, 15, 0.1)'; };
        card.onmouseout = () => { card.style.borderColor = '#444'; card.style.background = 'rgba(0,0,0,0.5)'; };

        // Click action
        if (item.id === 'mystery') card.onclick = () => engineState.buyMysteryBox();
        else card.onclick = () => engineState.buyShopItem(item.id);

        const icon = document.createElement('div');
        icon.style.cssText = "font-size: 32px; margin-right: 15px;";
        icon.innerText = item.icon;

        const info = document.createElement('div');
        info.innerHTML = `<div style="color:#f1c40f; font-weight:bold;">${item.name}</div>
                          <div style="font-size:10px; color:#aaa;">${item.desc}</div>
                          <div style="color:#fff; font-weight:bold; margin-top:5px;">${item.cost} G</div>`;

        card.appendChild(icon);
        card.appendChild(info);
        grid.appendChild(card);
    });
}

function triggerScreenShake(duration, intensity) {
    shakeTime = duration;
    shakeIntensity = intensity;
}

// --- Entities ---
class FloatingText {
    constructor(x, y, text, color, fontSize = 20) {
        this.positionX = x;
        this.positionY = y;
        this.text = text;
        this.color = color;
        this.fontSize = fontSize;
        this.life = 1.0;
        this.velocityY = -1; 
    }
    update() {
        this.positionY += this.velocityY;
        this.life -= EFFECT_CONSTANTS.TEXT_LIFE_DECAY;
    }
    draw(context) {
        context.save();
        context.globalAlpha = Math.max(0, this.life);
        context.fillStyle = this.color;
        context.font = `bold ${this.fontSize}px 'Segoe UI', sans-serif`;
        context.shadowColor = "#000";
        context.shadowBlur = 4;
        context.fillText(this.text, this.positionX, this.positionY);
        context.restore();
    }
}

class ParticleEffect {
    constructor(x, y, color, speed = 8) {
        this.positionX = x;
        this.positionY = y;
        this.color = color;
        this.size = Math.random() * 5 + 3;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.velocityX = Math.cos(angle) * velocity;
        this.velocityY = Math.sin(angle) * velocity;
        this.life = 1.0;
    }
    update() {
        this.positionX += this.velocityX;
        this.positionY += this.velocityY;
        this.life -= EFFECT_CONSTANTS.PARTICLE_LIFE_DECAY;
        this.size *= 0.95;
    }
    draw(context) {
        context.save();
        context.globalAlpha = Math.max(0, this.life);
        context.fillStyle = this.color;
        context.beginPath();
        context.rect(this.positionX, this.positionY, this.size, this.size);
        context.fill();
        context.restore();
    }
}

class MagicProjectile {
    constructor(startX, startY, target, config) {
        this.currentX = startX;
        this.currentY = startY;
        
        // Base Damage calculation
        let baseDmg = config.damage || 10;
        if (config.level > 1) baseDmg *= (1 + (config.level - 1) * 0.2); 
        
        this.damageValue = baseDmg;
        this.moveSpeed = config.speed || 5;
        this.glowColor = config.color || "#ffffff";
        this.effectType = config.id; 
        this.isAlive = true;
        this.isShatterShard = config.isShatter || false;
        
        // Support Effects
        this.pierceCount = config.pierce_count || 0;
        this.chainCount = config.chain_count || 0;
        this.chainRange = config.chain_range || 0;
        
        this.hitTargetIds = new Set();
        if (config.ignoreIds) config.ignoreIds.forEach(id => this.hitTargetIds.add(id));

        if (config.velocityX && config.velocityY) {
            this.velocityX = config.velocityX;
            this.velocityY = config.velocityY;
        } else if (target) {
            const deltaX = target.positionX - startX;
            const deltaY = target.positionY - startY;
            const totalDistance = Math.hypot(deltaX, deltaY);
            this.velocityX = (deltaX / totalDistance) * this.moveSpeed;
            this.velocityY = (deltaY / totalDistance) * this.moveSpeed;
        } else {
            this.velocityX = 0;
            this.velocityY = -this.moveSpeed;
            }
        }
        update() {
            this.currentX += this.velocityX;
            this.currentY += this.velocityY;
            if (this.currentX > gameCanvas.width + 100 || this.currentX < -100 || 
                this.currentY > gameCanvas.height + 100 || this.currentY < -100) {
                this.isAlive = false;
            }
        }
        draw(context) {
        context.save();
        context.shadowBlur = RENDER_CONSTANTS.EFFECT_SHADOW_BLUR;
        context.shadowColor = this.glowColor;
        context.fillStyle = this.glowColor;
        context.beginPath();
        if (this.isShatterShard) {
            context.moveTo(this.currentX + 5, this.currentY);
            context.lineTo(this.currentX - 5, this.currentY + 2);
            context.lineTo(this.currentX - 5, this.currentY - 2);
        } else {
            context.arc(this.currentX, this.currentY, RENDER_CONSTANTS.PROJECTILE_SIZE, 0, Math.PI * 2);
        }
        context.fill();
        context.restore();
    }
}

class SupportUnit {
    constructor(type, duration) {
        this.id = generateUuid();
        this.type = type; // 'DRONE_ATK', 'DRONE_COL', 'CLONE'
        this.life = duration;
        this.maxLife = duration;
        // 初期位置: タレット周辺
        this.x = RENDER_CONSTANTS.TURRET_POS_X + (Math.random() - 0.5) * 120;
        this.y = RENDER_CONSTANTS.TURRET_POS_Y + (Math.random() - 0.5) * 60 - 50;
        this.attackCooldown = 0;
        this.targetDrop = null;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update() {
        this.life--;
        this.floatOffset += 0.1;

        // ふわふわ移動
        if (this.type !== 'DRONE_COL') {
            this.y += Math.sin(this.floatOffset) * 0.5;
        }

        if (this.type === 'DRONE_ATK') {
            this.attackCooldown++;
            if (this.attackCooldown >= 60) { // 1秒に1回射撃
                const target = getTarget(); // 既存のターゲット取得関数を利用
                if (target) {
                    activeProjectiles.push(new MagicProjectile(this.x, this.y, target, {
                        id: 'drone_shot', damage: 20 + (engineState.currentLevel * 2), speed: 8, color: '#00d2d3'
                    }));
                    this.attackCooldown = 0;
                }
            }
        } else if (this.type === 'DRONE_COL') {
            // 最寄りのアイテムを探す
            if (!this.targetDrop || !engineState.activeDrops.includes(this.targetDrop)) {
                let minD = Infinity;
                this.targetDrop = null;
                engineState.activeDrops.forEach(drop => {
                    const d = Math.hypot(drop.x - this.x, drop.y - this.y);
                    if (d < minD) { minD = d; this.targetDrop = drop; }
                });
            }

            if (this.targetDrop) {
                // 移動
                const dx = this.targetDrop.x - this.x;
                const dy = this.targetDrop.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    this.x += (dx / dist) * 4; // Speed 4
                    this.y += (dy / dist) * 4;
                } else {
                    // 回収ロジック
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
                    // 配列から削除
                    const idx = engineState.activeDrops.indexOf(drop);
                    if (idx > -1) engineState.activeDrops.splice(idx, 1);
                    this.targetDrop = null;
                    engineState.inventoryDirty = true; // [Fix] Optimize update frequency
                }
            } else {
                // 待機位置へ戻る
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

        // 寿命バー
        const lifeRatio = this.life / this.maxLife;
        context.fillStyle = "#555";
        context.fillRect(-10, -20, 20, 4);
        context.fillStyle = "#fff";
        context.fillRect(-10, -20, 20 * lifeRatio, 4);

        // 本体描画
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
        
        const baseHp = 40 + (engineState.currentLevel * 10);
        this.maxHealth = baseHp * stage.enemyScale * tier.hpMod;
        this.health = this.maxHealth;
        
        const baseSpd = (1.2 + Math.random() * 0.8);
        this.baseSpeed = baseSpd * (0.9 + (engineState.currentWaveNumber * 0.1)) * tier.speedMod;
        
        this.isActive = true;
        this.flashTime = 0;
        this.burnTimer = 0;
        this.burnDamagePerTick = 0;
        this.freezeTimer = 0;
        this.size = 30 * tier.scale;

        // [Patch] Boss AI state
        this.bossState = 'ENTER'; // ENTER, FIGHT
        this.attackTimer = 0;
        this.moveAngle = 0;
    }

    applyStatus(type, power) {
        if (type === 'BURN') {
            this.burnTimer = EFFECT_CONSTANTS.BURN_DURATION;
            this.burnDamagePerTick = power * EFFECT_CONSTANTS.BURN_DAMAGE_RATIO;
        }
        if (type === 'FREEZE') {
            this.freezeTimer = EFFECT_CONSTANTS.FREEZE_DURATION;
        }
    }

    update() {
        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % EFFECT_CONSTANTS.BURN_TICK_RATE === 0) {
                this.takeDamage(this.burnDamagePerTick, false, 'burn_dot');
                activeParticles.push(new ParticleEffect(this.positionX, this.positionY, EFFECT_CONSTANTS.COLOR_BURN, 2));
                // [Patch] DoT Death Check
                if (this.health <= 0 && this.isActive) handleEnemyDeath(this, false);
            }
        }
        if (this.freezeTimer > 0) this.freezeTimer--;
        else {
            // [Patch] Boss Logic
            if (this.tier.id === 'BOSS') {
                if (this.bossState === 'ENTER') {
                    this.positionY += this.baseSpeed * 0.5;
                    if (this.positionY >= 120) this.bossState = 'FIGHT';
                } else {
                    // Hover motion
                    this.moveAngle += 0.02;
                    this.positionX += Math.sin(this.moveAngle) * 0.5;

                    // Attack Logic
                    this.attackTimer++;
                    if (this.attackTimer > 60) { // Fire every 1 sec
                        const bullet = new EnemyProjectile(this.positionX, this.positionY + 40);
                        activeEnemyProjectiles.push(bullet);
                        this.attackTimer = 0;
                        activeParticles.push(new ParticleEffect(this.positionX, this.positionY + 40, "#e74c3c", 4));
                    }
                }
            } else {
                // Normal Enemy
                this.positionY += this.baseSpeed;
            }
        }

        if (this.flashTime > 0) this.flashTime--;

        if (this.positionY > GAME_SETTINGS.CASTLE_Y) {
            engineState.baseIntegrity -= GAME_SETTINGS.CASTLE_DAMAGE;
            triggerScreenShake(10, 5); 
            this.isActive = false;
        }
    }

    takeDamage(damage, isCritical, sourceId) {
        this.health -= damage;
        this.flashTime = 5;

        // [Patch] Boss No-Knockback
        if (this.freezeTimer <= 0 && sourceId !== 'burn_dot') {
            if (this.tier.id !== 'BOSS') this.positionY -= 5;
        } 

        const popupColor = sourceId === 'burn_dot' ? EFFECT_CONSTANTS.COLOR_BURN : 
                           (isCritical ? EFFECT_CONSTANTS.COLOR_CRIT : EFFECT_CONSTANTS.COLOR_NORMAL);
        const fontSize = isCritical ? 28 : 18;
        const displayText = isCritical ? `${Math.floor(damage)}!` : `${Math.floor(damage)}`;
        activeFloatingTexts.push(new FloatingText(this.positionX, this.positionY - 20, displayText, popupColor, fontSize));
    }

    draw(context) {
        context.save();
        
        if (engineState.manualTargetId === this.id) {
            context.strokeStyle = EFFECT_CONSTANTS.COLOR_TARGET;
            context.lineWidth = 2;
            const markerSize = this.size + 10;
            const halfM = markerSize / 2;
            context.strokeRect(this.positionX - halfM, this.positionY - halfM, markerSize, markerSize);
        }

        if (this.flashTime > 0) context.fillStyle = "#ffffff";
        else if (this.freezeTimer > 0) context.fillStyle = EFFECT_CONSTANTS.COLOR_FREEZE;
        else if (this.burnTimer > 0) context.fillStyle = EFFECT_CONSTANTS.COLOR_BURN;
        else context.fillStyle = this.tier.color;
        
        const halfSize = this.size / 2;
        context.fillRect(this.positionX - halfSize, this.positionY - halfSize, this.size, this.size);
        
        if (this.tier.id === 'BOSS' || this.tier.id === 'RARE') {
            context.strokeStyle = "#fff";
            context.lineWidth = 2;
            context.strokeRect(this.positionX - halfSize, this.positionY - halfSize, this.size, this.size);
        }

        context.fillStyle = "#333";
        context.fillRect(this.positionX - halfSize, this.positionY - halfSize - 10, this.size, 5);
        context.fillStyle = this.freezeTimer > 0 ? "#74b9ff" : "#2ecc71";
        const healthRatio = Math.max(0, this.health / this.maxHealth);
        context.fillRect(this.positionX - halfSize, this.positionY - halfSize - 10, this.size * healthRatio, 5);
        context.restore();
    }
}

// --- Logic ---

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
    // [Patch] Stats scaling for AOE
    const finalRadius = radius * (1.0 + (engineState.stats.aoe_pct || 0));

    const color = sourceId === 'fireball' ? "#e67e22" : "#3498db";
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
            // [Patch] Fireball AOE applies burn
            if (sourceId === 'fireball') {
                enemy.applyStatus('BURN', damage);
            }
        }
    });
}

// [Patch] Common Death Logic
function handleEnemyDeath(enemy, isCrit, shatterDamage = 10) {
    if (!enemy.isActive) return; // Prevent double death
    enemy.isActive = false;

    if (isCrit) triggerScreenShake(5, 3);
    if (enemy.freezeTimer > 0) createIceShatter(enemy.positionX, enemy.positionY, shatterDamage);

    for(let i=0; i<EFFECT_CONSTANTS.PARTICLE_COUNT; i++) activeParticles.push(new ParticleEffect(enemy.positionX, enemy.positionY, "#e74c3c"));

    let xpGain = (20 * enemy.tier.xpMod) * (1.0 + engineState.stats.xp_gain);
    const amulet = engineState.equippedArtifacts.AMULET;
    if (amulet && amulet.stats && amulet.stats.xp_gain) xpGain *= (1 + amulet.stats.xp_gain);

    addExperience(xpGain);
    if (Math.random() < GAME_SETTINGS.DROP_CHANCE) generateDrop(enemy.positionX, enemy.positionY);

    // [Patch] Check Progression
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
    const activeGem = engineState.equippedGems[0];
    if (!activeGem) return;

    const target = getTarget();
    if (!target && activeGem.id !== 'nova') {}

    const supportGems = engineState.equippedGems.slice(1).filter(gem => gem !== null);
    
    // Stats Calculation
    let damageMod = 1.0 + engineState.stats.damage_pct;
    let rateMod = 1.0 + engineState.stats.rate_pct;
    let critMod = engineState.stats.crit_chance;
    let supportPower = 1.0 + engineState.stats.support_effect;
    
    let finalFireRate = activeGem.rate || 60;
    // Main Gem Level Scaling (Reduced cooldown per level)
    if (activeGem.level > 1) finalFireRate *= (1 - (activeGem.level * 0.02)); 
    finalFireRate /= rateMod;

    let isShotgun = false;
    let spreadCount = 1;

    const finalConfig = { ...activeGem };
    finalConfig.damage *= damageMod;

    // Apply Support Gems with Scaling
    supportGems.forEach(support => {
        const lvl = support.level || 1;
        const lvlBonus = 1 + ((lvl - 1) * 0.1 * supportPower); // +10% effectiveness per level

        if (support.damage_mod) finalConfig.damage *= (support.damage_mod * lvlBonus);
        
        if (support.id === 'multishot') {
            isShotgun = true;
            // Base 2 + 1 every 3 levels
            spreadCount = 1 + (support.projectiles || 2) + Math.floor((lvl-1)/3); 
        }
        
        if (support.speed_mod) finalConfig.speed *= (support.speed_mod * lvlBonus);
        if (support.rate_mod) finalFireRate *= (support.rate_mod); 
        
        if (support.pierce_count) {
            finalConfig.pierce_count = (finalConfig.pierce_count || 0) + support.pierce_count + Math.floor(lvl/2);
        }
        
        if (support.chain_count) {
            // Base 2 + 1 every 2 levels
            finalConfig.chain_count = (finalConfig.chain_count || 0) + support.chain_count + Math.floor(lvl/2);
            finalConfig.chain_range = support.range || 200;
        }
    });
    
    attackCooldownCounter++;
    if (attackCooldownCounter >= finalFireRate) {
        
        // Self Damage (Blood Magic)
        if (engineState.stats.self_damage > 0) {
            engineState.baseIntegrity -= engineState.stats.self_damage;
        }

        if (isShotgun) {
            let baseAngle = -Math.PI / 2; 
            if (target) {
                const deltaX = target.positionX - RENDER_CONSTANTS.TURRET_POS_X;
                const deltaY = target.positionY - RENDER_CONSTANTS.TURRET_POS_Y;
                baseAngle = Math.atan2(deltaY, deltaX);
            }
            for (let i = 0; i < spreadCount; i++) {
                const angleOffset = (i - (spreadCount - 1) / 2) * EFFECT_CONSTANTS.MULTISHOT_SPREAD_ANGLE;
                const finalAngle = baseAngle + angleOffset;
                const vx = Math.cos(finalAngle) * finalConfig.speed;
                const vy = Math.sin(finalAngle) * finalConfig.speed;
                activeProjectiles.push(new MagicProjectile(RENDER_CONSTANTS.TURRET_POS_X, RENDER_CONSTANTS.TURRET_POS_Y, null, { ...finalConfig, velocityX: vx, velocityY: vy }));
            }
        } else if (target || finalConfig.id === 'nova') {
            activeProjectiles.push(new MagicProjectile(RENDER_CONSTANTS.TURRET_POS_X, RENDER_CONSTANTS.TURRET_POS_Y, target, finalConfig));
        } else {
             activeProjectiles.push(new MagicProjectile(RENDER_CONSTANTS.TURRET_POS_X, RENDER_CONSTANTS.TURRET_POS_Y, null, finalConfig));
        }

        // [Patch] Clone Attack Logic
        engineState.activeSupportUnits.forEach(unit => {
            if (unit.type === 'CLONE') {
                // 分身も同じ弾を発射
                if (isShotgun) {
                    for (let i = 0; i < spreadCount; i++) {
                        const angleOffset = (i - (spreadCount - 1) / 2) * EFFECT_CONSTANTS.MULTISHOT_SPREAD_ANGLE;
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

        attackCooldownCounter = 0;
    }
}

function spawnEnemy() {
    // [Patch] Boss Wave Control
    if (engineState.isBossWave) {
        // ボス戦中は雑魚の湧きを抑制するか、取り巻きとして弱いのだけ出す
        if (Math.random() < 0.8) return; // 湧き頻度低下
        activeEnemies.push(new EnemyUnit(ENEMY_TIERS.NORMAL));
        return;
    }

    if (Math.random() < GAME_SETTINGS.FORMATION_CHANCE) {
        const pattern = Math.random();
        if (pattern < 0.33) spawnFormation_Line();
        else if (pattern < 0.66) spawnFormation_Horde();
        else spawnFormation_Guard();
    } else {
        const rand = Math.random();
        let tier = ENEMY_TIERS.NORMAL;
        const waveMod = engineState.currentWaveNumber * 0.005;
        // [Patch] Removed random BOSS spawns to reserve them for Stage Boss
        if (rand < ENEMY_TIERS.RARE.chance + waveMod) tier = ENEMY_TIERS.RARE;
        else if (rand < ENEMY_TIERS.MAGIC.chance + (waveMod*2)) tier = ENEMY_TIERS.MAGIC;
        activeEnemies.push(new EnemyUnit(tier));
    }
}

// Formations
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
    if (engineState.isGameOver) return; 

    if (!engineState.isPaused) {
        enemySpawnCounter++;
        const rate = Math.max(GAME_SETTINGS.SPAWN_RATE_MIN, GAME_SETTINGS.SPAWN_RATE_BASE - (engineState.currentWaveNumber * 2));
        if (enemySpawnCounter > rate) {
            spawnEnemy();
            enemySpawnCounter = 0;
        }

        handleAutoAttack();
        engineState.updateEnergy(); // [Patch] Energy Update

        // [Patch] Update Support Units
        engineState.activeSupportUnits.forEach(unit => unit.update());
        engineState.activeSupportUnits = engineState.activeSupportUnits.filter(u => u.life > 0);

        activeProjectiles.forEach(projectile => projectile.update());

        // [Patch] Update Enemy Projectiles
        activeEnemyProjectiles.forEach(ep => ep.update());
        activeEnemyProjectiles = activeEnemyProjectiles.filter(ep => ep.isAlive);

        engineState.activeDrops.forEach(drop => drop.update());
        activeEnemies.forEach(enemy => {
            enemy.update();
            activeProjectiles.forEach(projectile => {
                if (projectile.hitTargetIds.has(enemy.id)) return;
                const hitDist = (enemy.size / 2) + RENDER_CONSTANTS.PROJECTILE_SIZE;
                const collisionDistance = Math.hypot(enemy.positionX - projectile.currentX, enemy.positionY - projectile.currentY);
                
                if (collisionDistance < hitDist) {
                    projectile.hitTargetIds.add(enemy.id);

                    // [Patch] 吸血の牙効果 (Life on Hit)
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
                    
                    if (projectile.effectType === 'fireball') enemy.applyStatus('BURN', projectile.damageValue);
                    else if (projectile.effectType === 'nova') applyAreaDamage(enemy.positionX, enemy.positionY, EFFECT_CONSTANTS.NOVA_RADIUS, finalDamage * 0.5, 'nova');

                    // Pierce Logic
                    if (projectile.pierceCount > 0) {
                        projectile.pierceCount--;
                    } else {
                        projectile.isAlive = false;

                        // Chain Logic (貫通終了後に発動)
                        if (projectile.chainCount > 0) {
                            let nearest = null;
                            let minD = Infinity;

                            // [Patch] Chain Range Scaling
                            const effectiveRange = (projectile.chainRange || 200) * (1.0 + (engineState.stats.chain_range_pct || 0));

                            // 既にHitした敵を除外して、最も近い敵を探す
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
                                // 連鎖弾の生成: プロパティを明示的にマッピングして引き継ぐ
                                const chainConfig = {
                                    id: projectile.effectType,         // ID引継ぎ
                                    damage: projectile.damageValue * 0.8, // ダメージ減衰
                                    speed: projectile.moveSpeed,       // 速度維持
                                    color: EFFECT_CONSTANTS.COLOR_CHAIN,
                                    level: 1,                          // 計算済みダメージを使うためレベル補正はリセット
                                    chain_count: projectile.chainCount - 1,
                                    chain_range: projectile.chainRange,
                                    pierce_count: 0,
                                    ignoreIds: projectile.hitTargetIds // 同じ敵には戻らない
                                };

                                const chainProj = new MagicProjectile(enemy.positionX, enemy.positionY, nearest, chainConfig);
                                activeProjectiles.push(chainProj);
                                activeFloatingTexts.push(new FloatingText(enemy.positionX, enemy.positionY - 40, "CHAIN!", EFFECT_CONSTANTS.COLOR_CHAIN, 14));
                            } else if (projectile.effectType === 'fireball') {
                                // Chain failed (no targets), treat as end -> Explode
                                applyAreaDamage(enemy.positionX, enemy.positionY, EFFECT_CONSTANTS.FIREBALL_RADIUS, finalDamage * 0.5, 'fireball');
                            }
                        } else {
                            // No Chain left -> End -> Explode if Fireball
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
        activeParticles.forEach(p => p.update());
        activeFloatingTexts.forEach(t => t.update());

        activeEnemies = activeEnemies.filter(enemy => enemy.isActive);
        activeProjectiles = activeProjectiles.filter(projectile => projectile.isAlive);
        activeParticles = activeParticles.filter(p => p.life > 0);
        activeFloatingTexts = activeFloatingTexts.filter(t => t.life > 0);
        
        if (engineState.baseIntegrity <= 0) {
            displayGameOver();
            engineState.isGameOver = true;
        }
    }
    renderScene();

    // [Fix] Lazy UI Update
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
    
    // Background
    gameContext.fillStyle = "#1e272e";
    gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Castle Line
    gameContext.fillStyle = "#2c3e50";
    gameContext.fillRect(0, GAME_SETTINGS.CASTLE_Y, gameCanvas.width, gameCanvas.height - GAME_SETTINGS.CASTLE_Y);

    // [Patch] Draw Shield
    if (engineState.isShieldActive) {
        gameContext.save();
        if (engineState.shieldTimer < 15) {
            gameContext.strokeStyle = `rgba(102, 252, 241, ${0.8 - (engineState.shieldTimer/30)})`;
            gameContext.lineWidth = 10;
        } else {
            gameContext.strokeStyle = "rgba(69, 162, 158, 0.5)";
            gameContext.lineWidth = 5;
        }
        gameContext.shadowBlur = 20;
        gameContext.shadowColor = "#66fcf1";
        gameContext.beginPath();
        gameContext.arc(RENDER_CONSTANTS.TURRET_POS_X, GAME_SETTINGS.CASTLE_Y, 60, Math.PI, 0);
        gameContext.stroke();
        gameContext.restore();
    }

    // Turret
    const equippedActive = engineState.equippedGems[0];
    gameContext.fillStyle = equippedActive ? equippedActive.color : "#95a5a6";
    gameContext.shadowBlur = 25;
    gameContext.shadowColor = gameContext.fillStyle;
    
    const tx = RENDER_CONSTANTS.TURRET_POS_X;
    const ty = RENDER_CONSTANTS.TURRET_POS_Y;
    
    gameContext.beginPath();
    gameContext.moveTo(tx, ty - 20);
    gameContext.lineTo(tx - 20, ty + 20);
    gameContext.lineTo(tx + 20, ty + 20);
    gameContext.fill();
    gameContext.shadowBlur = 0;

    engineState.activeDrops.forEach(drop => drop.draw(gameContext));
    engineState.activeSupportUnits.forEach(unit => unit.draw(gameContext));
    activeEnemies.forEach(enemy => enemy.draw(gameContext));
    activeProjectiles.forEach(projectile => projectile.draw(gameContext));
    activeEnemyProjectiles.forEach(ep => ep.draw(gameContext)); // [Patch] Draw Enemy Bullets
    activeParticles.forEach(particle => particle.draw(gameContext));
    activeFloatingTexts.forEach(text => text.draw(gameContext));
    
    gameContext.restore();
    updateHudDisplay();
}

function addExperience(value) {
    engineState.experiencePoints += value;
    if (engineState.experiencePoints >= engineState.calculateNextLevelXp()) {
        engineState.experiencePoints = 0;
        engineState.currentLevel++;
        engineState.skillPoints++; // Skill Point GET
        activeFloatingTexts.push(new FloatingText(GAME_SETTINGS.SCREEN_WIDTH/2, GAME_SETTINGS.SCREEN_HEIGHT/2, `LEVEL UP! +1 Skill Point`, "#00d2d3", 28));
    }
}

function generateDrop(x, y) {
    // [Patch] Gold Drop Chance
    if (Math.random() < (GAME_SETTINGS.GOLD_DROP_CHANCE || 0.4)) {
        engineState.activeDrops.push(new DropItem(x, y, MISC_ITEMS.GOLD));
    } else {
        const allGems = Object.values(GEMS);
        const allArtifacts = Object.values(ARTIFACTS);
        const pool = [...allGems, ...allArtifacts];
        const dropTemplate = pool[Math.floor(Math.random() * pool.length)];
        engineState.activeDrops.push(new DropItem(x, y, dropTemplate));
    }
}

function updateHudDisplay() {
    const hpBarFill = document.getElementById('hp-bar-fill');
    const xpBarFill = document.getElementById('xp-bar-fill');
    const waveBarFill = document.getElementById('wave-bar-fill'); // [Patch]

    if (hpBarFill) {
        const hpPercent = Math.max(0, (engineState.baseIntegrity / (GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max)) * 100);
        hpBarFill.style.width = `${hpPercent}%`;
    }
    if (xpBarFill) xpBarFill.style.width = `${(engineState.experiencePoints / engineState.calculateNextLevelXp()) * 100}%`;

    // [Patch] Wave Bar Update
    if (waveBarFill) {
        if (engineState.isBossWave) {
            waveBarFill.style.width = "100%";
            waveBarFill.style.backgroundColor = "#e74c3c"; // Red for Boss
        } else {
            const wavePercent = Math.min(100, (engineState.waveProgress / engineState.waveQuota) * 100);
            waveBarFill.style.width = `${wavePercent}%`;
            waveBarFill.style.backgroundColor = "#f1c40f";
        }
    }

    // [Patch] Energy Bar
    const energyBarFill = document.getElementById('energy-bar-fill');
    if (energyBarFill) {
        const energyPercent = (engineState.energy / engineState.maxEnergy) * 100;
        energyBarFill.style.width = `${energyPercent}%`;
        energyBarFill.style.backgroundColor = energyPercent < 30 ? "#e74c3c" : "#66fcf1";
    }

    const statsText = document.getElementById('game-stats');
    if (statsText) {
        const stage = engineState.getCurrentStageData();
        const progressStr = engineState.isBossWave ? "⚠ BOSS ⚠" : `NEXT: ${engineState.waveQuota - engineState.waveProgress}`;
        statsText.innerText = `STAGE: ${stage.name} | WAVE: ${engineState.currentWaveNumber} (${progressStr}) | LV: ${engineState.currentLevel}`;
    }
}

// [Patch] Enemy Projectile Class
class EnemyProjectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 6;
        this.size = 8;
        this.damage = 15;
        this.isAlive = true;
    }

    update() {
        this.y += this.speed;
        // Check collision with Castle Line
        if (this.y >= GAME_SETTINGS.CASTLE_Y) {
            engineState.baseIntegrity -= this.damage;
            activeParticles.push(new ParticleEffect(this.x, this.y, "#e74c3c", 6));
            triggerScreenShake(5, 2);
            this.isAlive = false;
        }
        // Out of bounds
        if (this.y > GAME_SETTINGS.SCREEN_HEIGHT) this.isAlive = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = "#e74c3c";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#c0392b";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Skill Tree Renderer ---
window.renderSkillTree = function() {
    const container = document.getElementById('skill-tree-content');
    if (!container) return;
    container.innerHTML = ''; // Reset

    // Create Canvas for lines
    const canvas = document.createElement('canvas');
    canvas.width = GAME_SETTINGS.TREE_WIDTH;
    canvas.height = GAME_SETTINGS.TREE_HEIGHT;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '1';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Draw connections
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    Object.values(SKILL_TREE_NODES).forEach(node => {
        node.connections.forEach(targetId => {
            const target = SKILL_TREE_NODES[targetId];
            if (target) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();

                // If allocated line
                const nodeRank = engineState.allocatedNodes[node.id] || 0;
                const targetRank = engineState.allocatedNodes[targetId] || 0;
                if (nodeRank > 0 && targetRank > 0) {
                    ctx.save();
                    ctx.strokeStyle = '#f1c40f'; // Gold line for active
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#f1c40f';
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        });
    });

    // Draw Nodes (DOM Elements for interaction)
    Object.values(SKILL_TREE_NODES).forEach(node => {
        const rank = engineState.allocatedNodes[node.id] || 0;
        const max = node.maxRank || 1;

        const el = document.createElement('div');
        el.className = `tree-node node-${node.type.toLowerCase()}`;
        if (rank > 0) el.classList.add('allocated');

        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        // Rank Badge
        const badge = document.createElement('div');
        badge.innerText = `${rank}/${max}`;
        badge.style.cssText = "position:absolute; bottom:-15px; width:100%; text-align:center; font-size:10px; color:#fff; font-weight:bold; text-shadow:1px 1px 1px #000;";
        el.appendChild(badge);

        // Tooltip
        let tooltipText = `<b>${node.name}</b> (Rank ${rank}/${max})<br>`;
        if (node.description) tooltipText += `<span style='font-size:10px'>${node.description}</span><br>`;
        if (node.stats) Object.entries(node.stats).forEach(([k,v]) => tooltipText += `<span style='color:#aaa'>${k}: ${v} (Total: ${(v*rank).toFixed(2)})</span><br>`);

        // Click Handler
        el.onclick = () => {
            if (engineState.allocateNode(node.id)) {
                window.renderSkillTree(); // Redraw
                updateHudDisplay();
            }
        };

        const tip = document.createElement('div');
        tip.className = 'node-tooltip';
        tip.innerHTML = tooltipText;
        el.appendChild(tip);
        container.appendChild(el);
    });

    // [Fix] Ensure container fits the large canvas to enable scrolling on parent
    container.style.width = `${GAME_SETTINGS.TREE_WIDTH}px`;
    container.style.height = `${GAME_SETTINGS.TREE_HEIGHT}px`;

    // [Fix] Center the view on Origin (1000, 750)
    // Scroll the PARENT element (.modal-content), not the container itself
    const scrollParent = container.parentElement;
    if (scrollParent) {
        setTimeout(() => {
            const viewportW = scrollParent.clientWidth;
            const viewportH = scrollParent.clientHeight;
            scrollParent.scrollLeft = 1000 - (viewportW / 2);
            scrollParent.scrollTop = 750 - (viewportH / 2);
        }, 10);
    }
};

// ... (Rest of existing UI update/helper functions) ...
const tooltipContainer = document.getElementById('ui-tooltip') || document.createElement('div');
if (!tooltipContainer.id) {
    tooltipContainer.id = 'ui-tooltip';
    Object.assign(tooltipContainer.style, {
        position: 'fixed', display: 'none', pointerEvents: 'none', zIndex: '1000',
        backgroundColor: 'rgba(20, 20, 30, 0.95)', border: '1px solid #7f8c8d',
        padding: '8px 12px', borderRadius: '4px', color: '#ecf0f1',
        fontFamily: "'Segoe UI', sans-serif", fontSize: '12px', lineHeight: '1.4',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', whiteSpace: 'pre-wrap'
    });
    document.body.appendChild(tooltipContainer);
}

function generateTooltipContent(item) {
    if (!item) return "";
    let content = `<strong style="color:${item.color}; font-size:14px;">${item.name}</strong> <span style="font-size:10px; color:#95a5a6;">(Lv.${item.level})</span>\n`;
    content += `<div style="margin-top:4px; color:#bdc3c7; font-size:11px;">Type: ${item.type}</div>`;
    content += `<div style="margin-top:6px; border-top:1px solid #555; padding-top:4px;">`;
    if (item.type === GEM_TYPES.ACTIVE) {
        content += `💥 Dmg: ${Math.floor(item.damage * (1+(item.level-1)*0.2))}\n`;
        content += `⚡ Rate: ${item.rate}f\n`;
    } else if (item.type === GEM_TYPES.SUPPORT) {
        if (item.damage_mod) content += `⚔️ Dmg: x${(item.damage_mod * (1+(item.level-1)*0.1)).toFixed(2)}\n`;
        if (item.chain_count) content += `🔗 Chain: ${item.chain_count + Math.floor(item.level/2)}\n`;
    } else {
        if (item.stats) Object.entries(item.stats).forEach(([k, v]) => { content += `💍 ${k}: ${v}\n`; });
    }
    content += `</div>`;
    return content;
}

function handleTooltipShow(e, item) {
    tooltipContainer.innerHTML = generateTooltipContent(item);
    tooltipContainer.style.display = 'block';
    const rightOverflow = e.clientX + 200 > window.innerWidth;
    tooltipContainer.style.left = rightOverflow ? `${e.clientX - 200}px` : `${e.clientX + 15}px`;
    tooltipContainer.style.top = `${e.clientY + 15}px`;
}
function handleTooltipHide() { tooltipContainer.style.display = 'none'; }

function refreshInventoryInterface() {
    const gridElement = document.getElementById('inventory-grid');
    if (!gridElement) return;
    gridElement.innerHTML = '';

    // [Patch] Gold Display
    const goldInfo = document.createElement('div');
    goldInfo.style.cssText = "grid-column: span 5; text-align: right; color: #f1c40f; font-weight: bold; font-size: 12px; margin-bottom: 5px;";
    goldInfo.innerText = `GOLD: ${engineState.gold}`;
    gridElement.appendChild(goldInfo);

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = "grid-column: span 5; display: flex; gap: 5px; margin-bottom: 5px;";

    const fuseBtn = document.createElement('div');
    fuseBtn.className = "btn-action";
    fuseBtn.style.cssText = "flex:1; background: #8e44ad; color: white; text-align: center; padding: 5px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 10px;";
    fuseBtn.innerText = "🌀 FUSE";
    fuseBtn.onclick = () => engineState.fuseItems();
    btnContainer.appendChild(fuseBtn);

    const repairBtn = document.createElement('div');
    repairBtn.className = "btn-action";
    repairBtn.style.cssText = "flex:1; background: #e67e22; color: white; text-align: center; padding: 5px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 10px;";
    repairBtn.innerText = `🔧 REPAIR (${GAME_SETTINGS.REPAIR_COST}G)`;
    repairBtn.onclick = () => engineState.repairCastle();
    btnContainer.appendChild(repairBtn);

    const gachaBtn = document.createElement('div');
    gachaBtn.className = "btn-action";
    gachaBtn.style.cssText = "flex:1; background: #2c3e50; border: 1px solid #9b59b6; color: #9b59b6; text-align: center; padding: 5px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 10px;";
    gachaBtn.innerText = `🎲 MYSTERY (${GAME_SETTINGS.MYSTERY_BOX_COST}G)`;
    gachaBtn.onclick = () => engineState.buyMysteryBox();
    btnContainer.appendChild(gachaBtn);

    // [Patch] スキルツリーボタンを追加
    const skillBtn = document.createElement('div');
    skillBtn.className = "btn-action";
    skillBtn.style.cssText = "flex:1; background: #16a085; color: white; text-align: center; padding: 5px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 10px;";
    skillBtn.innerText = "🌲 SKILL TREE";
    skillBtn.onclick = () => window.toggleMenu('skill-tree-modal');
    btnContainer.appendChild(skillBtn);

    gridElement.appendChild(btnContainer);

    engineState.inventory.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.style.backgroundColor = item.color;
        el.innerHTML = `${item.name}<br>Lv.${item.level}`;
        el.dataset.uuid = item.uuid; 

        el.draggable = true;
        el.ondragstart = (e) => window.handleDragStart(e, item.uuid);
        el.ondragend = (e) => { e.target.style.opacity = '1.0'; };

        el.ondblclick = () => {
            if (item.type === 'ACTIVE') engineState.equipItem(item.uuid, 0);
            else if (item.type === 'SUPPORT') {
                if (!engineState.equippedGems[1]) engineState.equipItem(item.uuid, 1);
                else if (!engineState.equippedGems[2]) engineState.equipItem(item.uuid, 2);
                else engineState.equipItem(item.uuid, 1);
            }
            else if (item.type === 'RING') engineState.equipItem(item.uuid, 'RING');
            else if (item.type === 'AMULET') engineState.equipItem(item.uuid, 'AMULET');
        };

        el.onmousemove = (e) => handleTooltipShow(e, item);
        el.onmouseleave = handleTooltipHide;

        const isEquipped = engineState.equippedGems.some(g => g && g.uuid === item.uuid) || 
                           (engineState.equippedArtifacts.RING && engineState.equippedArtifacts.RING.uuid === item.uuid) ||
                           (engineState.equippedArtifacts.AMULET && engineState.equippedArtifacts.AMULET.uuid === item.uuid);

        if (isEquipped) {
            el.style.border = "2px solid #fff";
            el.style.opacity = "0.4";
            el.innerHTML += `<div style="position:absolute; bottom:0; right:0; background:#3498db; color:#fff; font-size:8px; padding:2px;">EQP</div>`;
        }
        gridElement.appendChild(el);
    });

    engineState.equippedGems.forEach((g, i) => updateSlotUI(`slot-${i}`, g, i===0?'ACTIVE':'SUPPORT'));
    updateSlotUI('slot-ring', engineState.equippedArtifacts.RING, 'RING');
    updateSlotUI('slot-amulet', engineState.equippedArtifacts.AMULET, 'AMULET');

    updateMainScreenLoadout();
}

function updateSlotUI(id, item, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.onmousemove = null; el.onmouseleave = null;
    
    if (item) {
        el.innerHTML = `<div style="text-align:center;">${item.name}<br><span style="font-size:9px;">Lv.${item.level}</span></div>`;
        el.style.background = item.color;
        el.style.color = '#fff';
        el.style.border = '1px solid #fff';

        el.draggable = true;
        el.ondragstart = (e) => window.handleDragStart(e, item.uuid);
        el.ondragend = (e) => { e.target.style.opacity = '1.0'; };

        el.onmousemove = (e) => handleTooltipShow(e, item);
        el.onmouseleave = handleTooltipHide;
    } else {
        el.innerText = label;
        el.style.background = 'rgba(0,0,0,0.2)';
        el.style.color = '#666';
        el.style.border = '1px solid #45a29e';
        el.draggable = false;
    }
}

function updateMainScreenLoadout() {
    const activeGem = engineState.equippedGems[0];
    const footerIcon = document.getElementById('footer-active-icon');
    if (footerIcon) {
        if (activeGem) {
            footerIcon.style.background = activeGem.color;
            footerIcon.innerText = activeGem.name.substring(0, 1);
        } else {
            footerIcon.style.background = '#333';
            footerIcon.innerText = '-';
        }
    }
}

function displayGameOver() {
    gameContext.fillStyle = "rgba(0,0,0,0.85)";
    gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    gameContext.fillStyle = "#e74c3c";
    gameContext.font = "bold 40px Courier New";
    gameContext.textAlign = "center";
    gameContext.fillText(UI_STRINGS.GAME_OVER, gameCanvas.width / 2, gameCanvas.height / 2);
    gameContext.font = "20px Arial";
    gameContext.fillStyle = "#fff";
    gameContext.fillText("Press [R] to Retry", gameCanvas.width / 2, gameCanvas.height / 2 + 50);
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') engineState.togglePause();
    if (e.code === 'KeyR' && engineState.isGameOver) {
        engineState.reset();
        activeEnemies = [];
        activeProjectiles = [];
        activeParticles = [];
        activeFloatingTexts = [];
        requestAnimationFrame(mainLoop);
    }
});

engineState.reset();
refreshInventoryInterface();
mainLoop();