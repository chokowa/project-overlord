/**
 * @fileoverview UIコンポーネント、DOM操作、描画ロジック
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 * 注意: GameEngineへのアクセスは window.engineState を経由すること。
 */
import { GAME_SETTINGS, SKILL_TREE_NODES, GEM_TYPES, SHOP_ITEMS, GEMS } from './constants.js';

// --- Tooltip System ---
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

/**
 * ツールチップの内容を生成
 * @param {Object} item 
 * @returns {string} HTML string
 */
export function generateTooltipContent(item) {
    if (!item) return "";
    let content = `<strong style="color:${item.color}; font-size:14px;">${item.name}</strong> <span style="font-size:10px; color:#95a5a6;">(Lv.${item.level})</span>\n`;
    content += `<div style="margin-top:4px; color:#bdc3c7; font-size:11px;">Type: ${item.type}</div>`;
    content += `<div style="margin-top:6px; border-top:1px solid #555; padding-top:4px;">`;
    
    if (item.type === GEM_TYPES.ACTIVE) {
        const dmg = Math.floor(item.damage * (1 + (item.level - 1) * 0.2));
        content += `💥 Dmg: ${dmg}\n`;
        content += `⚡ Rate: ${item.rate}f\n`;
    } else if (item.type === GEM_TYPES.SUPPORT) {
        if (item.damage_mod) {
            const mod = item.damage_mod * (1 + (item.level - 1) * 0.1);
            content += `⚔️ Dmg: x${mod.toFixed(2)}\n`;
        }
        if (item.chain_count) {
            const chain = item.chain_count + Math.floor(item.level / 2);
            content += `🔗 Chain: ${chain}\n`;
        }
    } else {
        if (item.stats) Object.entries(item.stats).forEach(([k, v]) => { content += `💍 ${k}: ${v}\n`; });
    }
    content += `</div>`;
    return content;
}

/**
 * ツールチップを表示
 * @param {MouseEvent} e 
 * @param {Object} item 
 */
export function handleTooltipShow(e, item) {
    tooltipContainer.innerHTML = generateTooltipContent(item);
    tooltipContainer.style.display = 'block';
    const rightOverflow = e.clientX + 200 > window.innerWidth;
    tooltipContainer.style.left = rightOverflow ? `${e.clientX - 200}px` : `${e.clientX + 15}px`;
    tooltipContainer.style.top = `${e.clientY + 15}px`;
}

/** ツールチップを非表示 */
export function handleTooltipHide() {
    tooltipContainer.style.display = 'none';
}

// --- Skill Tree UI ---

/** スキルツリーの描画 (Windowオブジェクトに紐付け) */
window.renderSkillTree = function() {
    const engineState = window.engineState;
    if (!engineState) return;

    const container = document.getElementById('skill-tree-content');
    if (!container) return;
    container.innerHTML = ''; // Reset

    // Create Canvas for lines
    const canvas = document.createElement('canvas');
    canvas.width = GAME_SETTINGS.TREE_WIDTH;
    canvas.height = GAME_SETTINGS.TREE_HEIGHT;
    Object.assign(canvas.style, { position: 'absolute', top: '0', left: '0', zIndex: '1' });
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

    // Draw Nodes
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
                window.renderSkillTree();
                updateHudDisplay();
            }
        };

        const tip = document.createElement('div');
        tip.className = 'node-tooltip';
        tip.innerHTML = tooltipText;
        el.appendChild(tip);
        container.appendChild(el);
    });

    container.style.width = `${GAME_SETTINGS.TREE_WIDTH}px`;
    container.style.height = `${GAME_SETTINGS.TREE_HEIGHT}px`;

    // Center View
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

// --- Shop Interface ---

/** ショップUIの更新 */
export function refreshShopInterface() {
    const engineState = window.engineState;
    if (!engineState) return;

    const grid = document.getElementById('shop-grid');
    const goldDisplay = document.getElementById('shop-gold-display');
    if (!grid || !goldDisplay) return;

    goldDisplay.innerText = `FUNDS: ${engineState.gold} G`;
    grid.innerHTML = '';

    const createCard = (id, name, desc, cost, iconChar, isSoldOut = false, color = '#f1c40f') => {
        const card = document.createElement('div');
        card.style.cssText = `background: rgba(0,0,0,0.5); border: 1px solid #444; padding: 10px; border-radius: 6px; display: flex; align-items: center; cursor: ${isSoldOut ? 'default' : 'pointer'}; transition: all 0.2s; opacity: ${isSoldOut ? 0.5 : 1};`;
        
        if (!isSoldOut) {
            card.onmouseover = () => { card.style.borderColor = color; card.style.background = `rgba(255, 255, 255, 0.05)`; };
            card.onmouseout = () => { card.style.borderColor = '#444'; card.style.background = 'rgba(0,0,0,0.5)'; };
            card.onclick = () => id === 'mystery' ? engineState.buyMysteryBox() : engineState.buyShopItem(id);
        }

        const icon = document.createElement('div');
        icon.style.cssText = "font-size: 28px; margin-right: 10px; width:40px; text-align:center;";
        icon.innerText = iconChar;

        const info = document.createElement('div');
        const costText = isSoldOut ? "<span style='color:#e74c3c'>SOLD OUT</span>" : `${cost} G`;
        info.innerHTML = `<div style="color:${color}; font-weight:bold; font-size:13px;">${name}</div>
                          <div style="font-size:10px; color:#aaa;">${desc}</div>
                          <div style="color:#fff; font-weight:bold; margin-top:4px;">${costText}</div>`;
        card.appendChild(icon);
        card.appendChild(info);
        grid.appendChild(card);
    };

    // Standard Items
    Object.values(SHOP_ITEMS).forEach(item => {
        createCard(item.id, item.name, item.desc, item.cost, item.icon);
    });
    // Skill Gems
    Object.values(GEMS).forEach(gem => {
        if (gem.type !== 'ACTIVE') return;
        const isSoldOut = engineState.purchasedShopItems.includes(gem.id);
        createCard(gem.id, `GEM: ${gem.name}`, "Lv.1 Starter Skill", 300, "💎", isSoldOut, gem.color);
    });
}
// グローバルに関数を公開（index.htmlのonclick対応）
window.refreshShopInterface = refreshShopInterface;

// --- Inventory & Loadout UI ---

/** インベントリUIの更新 */
export function refreshInventoryInterface() {
    const engineState = window.engineState;
    if (!engineState) return;

    const gridElement = document.getElementById('inventory-grid');
    if (!gridElement) return;
    gridElement.innerHTML = '';

    // Tab State
    const tab1 = document.getElementById('tab-set-1');
    const tab2 = document.getElementById('tab-set-2');
    if (tab1 && tab2) {
        if (engineState.currentLoadoutId === 1) {
            tab1.classList.add('active');
            tab2.classList.remove('active');
        } else {
            tab1.classList.remove('active');
            tab2.classList.add('active');
        }
    }

    // Gold Display
    const goldInfo = document.createElement('div');
    goldInfo.style.cssText = "grid-column: span 5; text-align: right; color: #f1c40f; font-weight: bold; font-size: 12px; margin-bottom: 10px; padding-right:5px; border-bottom:1px solid #333; padding-bottom:5px;";
    goldInfo.innerText = `GOLD: ${engineState.gold}`;
    gridElement.appendChild(goldInfo);

    // Items
    engineState.inventory.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.style.backgroundColor = item.color;
        el.innerHTML = `${item.name}<br>Lv.${item.level}`;
        el.dataset.uuid = item.uuid;

        el.draggable = true;
        el.ondragstart = (e) => window.handleDragStart(e, item.uuid);
        el.ondragend = (e) => { e.target.style.opacity = '1.0'; };

        el.ondblclick = () => {
            if (item.type === GEM_TYPES.ACTIVE) engineState.equipItem(item.uuid, 0);
            else if (item.type === GEM_TYPES.SUPPORT) {
                if (!engineState.equippedGems[1]) engineState.equipItem(item.uuid, 1);
                else if (!engineState.equippedGems[2]) engineState.equipItem(item.uuid, 2);
                else engineState.equipItem(item.uuid, 1);
            }
            else if (item.type === 'RING') engineState.equipItem(item.uuid, 'RING');
            else if (item.type === 'AMULET') engineState.equipItem(item.uuid, 'AMULET');
        };

        el.onmousemove = (e) => handleTooltipShow(e, item);
        el.onmouseleave = handleTooltipHide;

        // Equipped Indicator
        const isEquippedMain = engineState.equippedGems.some(g => g && g.uuid === item.uuid);
        const isEquippedAlt = engineState.altGems.some(g => g && g.uuid === item.uuid);
        const isArtifact = (engineState.equippedArtifacts.RING && engineState.equippedArtifacts.RING.uuid === item.uuid) ||
                           (engineState.equippedArtifacts.AMULET && engineState.equippedArtifacts.AMULET.uuid === item.uuid);

        if (isEquippedMain || isEquippedAlt || isArtifact) {
            el.style.border = "2px solid #fff";
            el.style.opacity = "0.4";
            let label = "EQP";
            let color = "#3498db";
            if (isEquippedAlt) { label = "SUB"; color = "#95a5a6"; }
            el.innerHTML += `<div style="position:absolute; bottom:0; right:0; background:${color}; color:#fff; font-size:8px; padding:2px;">${label}</div>`;
        }
        gridElement.appendChild(el);
    });

    engineState.equippedGems.forEach((g, i) => updateSlotUI(`slot-${i}`, g, i === 0 ? 'ACTIVE' : 'SUPPORT'));
    updateSlotUI('slot-ring', engineState.equippedArtifacts.RING, 'RING');
    updateSlotUI('slot-amulet', engineState.equippedArtifacts.AMULET, 'AMULET');

    updateMainScreenLoadout();
}

/** スロットUIの更新 */
export function updateSlotUI(id, item, label) {
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

/** メイン画面のロードアウト表示更新 */
export function updateMainScreenLoadout() {
    const engineState = window.engineState;
    if (!engineState) return;

    const activeGem = engineState.equippedGems[0];
    const footerIcon = document.getElementById('footer-active-icon');
    const swapBtn = document.getElementById('footer-swap-btn');
    if (swapBtn) swapBtn.style.display = 'none';

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

/** HUD（ヘルスバー、XPバー、DPS等）の更新 */
export function updateHudDisplay() {
    const engineState = window.engineState;
    if (!engineState) return;

    const hpBarFill = document.getElementById('hp-bar-fill');
    const xpBarFill = document.getElementById('xp-bar-fill');
    const waveBarFill = document.getElementById('wave-bar-fill');
    const energyBarFill = document.getElementById('energy-bar-fill');

    if (hpBarFill) {
        const hpPercent = Math.max(0, (engineState.baseIntegrity / (GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max)) * 100);
        hpBarFill.style.width = `${hpPercent}%`;
    }
    if (xpBarFill) xpBarFill.style.width = `${(engineState.experiencePoints / engineState.calculateNextLevelXp()) * 100}%`;
    
    if (waveBarFill) {
        if (engineState.isBossWave) {
            waveBarFill.style.width = "100%";
            waveBarFill.style.backgroundColor = "#e74c3c";
        } else {
            const wavePercent = Math.min(100, (engineState.waveProgress / engineState.waveQuota) * 100);
            waveBarFill.style.width = `${wavePercent}%`;
            waveBarFill.style.backgroundColor = "#f1c40f";
        }
    }
    if (energyBarFill) {
        const energyPercent = (engineState.energy / engineState.maxEnergy) * 100;
        energyBarFill.style.width = `${energyPercent}%`;
        energyBarFill.style.backgroundColor = energyPercent < 30 ? "#e74c3c" : "#66fcf1";
    }

    // DPS Monitor
    const updateDpsDisplay = (elementId, gems, scale) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        const activeGem = gems[0];
        if (!activeGem) {
            el.innerHTML = `<span style="opacity:0.5;">EMPTY</span>`;
            return;
        }

        let dmg = activeGem.damage * (activeGem.level > 1 ? (1 + (activeGem.level - 1) * 0.2) : 1);
        dmg *= (1.0 + engineState.stats.damage_pct) * scale;

        const supportGems = gems.slice(1).filter(g => g);
        const supportPower = 1.0 + engineState.stats.support_effect;
        let supportTags = "";
        
        supportGems.forEach(s => {
            const lvlBonus = 1 + ((s.level - 1) * 0.1 * supportPower);
            if (s.damage_mod) dmg *= (s.damage_mod * lvlBonus);
            supportTags += s.id.charAt(0).toLowerCase();
        });

        let rate = activeGem.rate || 60;
        if (activeGem.level > 1) rate *= (1 - (activeGem.level * 0.02));
        rate /= (1.0 + engineState.stats.rate_pct);
        supportGems.forEach(s => {
            if (s.rate_mod) rate *= s.rate_mod;
        });

        let attacksPerSec = 60 / Math.max(1, rate);
        if (scale < 1.0) attacksPerSec *= 0.5;

        const finalDps = Math.floor(dmg * attacksPerSec);
        el.innerHTML = `
            <span style="color:${activeGem.color || "#fff"};">${activeGem.name}</span><span style="color:#aaa; font-size:0.8em;">${supportTags}</span> 
            <span style="margin-left:5px;">DPS${finalDps}</span>
        `;
    };

    updateDpsDisplay('dps-main', engineState.equippedGems, 1.0);
    updateDpsDisplay('dps-sub', engineState.altGems, 0.5);

    const statsText = document.getElementById('game-stats');
    if (statsText) {
        const stage = engineState.getCurrentStageData();
        const progressStr = engineState.isBossWave ? "⚠ BOSS ⚠" : `NEXT: ${engineState.waveQuota - engineState.waveProgress}`;
        statsText.innerText = `STAGE: ${stage.name} | WAVE: ${engineState.currentWaveNumber} (${progressStr}) | LV: ${engineState.currentLevel}`;
    }
}

// --- Menu Controls ---

/** メニューの表示切り替え */
window.toggleMenu = function(menuId) {
    const engineState = window.engineState;
    if (!engineState) return;

    const menus = ['dock-modal', 'logic-modal', 'skill-tree-modal', 'shop-modal'];
    const target = document.getElementById(menuId);
    if (!target) return;

    if (menuId === 'skill-tree-modal' && target.classList.contains('hidden')) setTimeout(window.renderSkillTree, 100);
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
        // Resume manually.
    }
};

// --- Drag & Drop Handlers ---
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

    const engineState = window.engineState;
    if (!engineState) return;

    if (targetType === 'SLOT') engineState.equipItem(uuid, targetIndex);
    else if (targetType === 'SALVAGE') engineState.salvageItem(uuid);
    else if (targetType === 'INVENTORY') engineState.unequipByUuid(uuid);
};