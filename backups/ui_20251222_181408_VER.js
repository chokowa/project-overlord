/**
 * @fileoverview UIコンポーネント、DOM操作、描画ロジック
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 * 更新: スマートレベルアップ提案、スキルツリーラベル対応
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
        fontFamily: "'Hiragino Kaku Gothic Pro', sans-serif", fontSize: '12px', lineHeight: '1.4',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', whiteSpace: 'pre-wrap'
    });
    document.body.appendChild(tooltipContainer);
}

/**
 * ツールチップの内容を生成 (日本語化)
 */
function getTooltipContent(item) {
    if (!item) return '';
    let html = `<div style="font-weight:bold; color:${item.color || '#fff'}">${item.name}</div>`;
    if (item.level) html += `<div style="font-size:10px; color:#aaa">Lv.${item.level}</div>`;
    html += `<div style="margin-top:4px;">${item.description || item.desc || ''}</div>`;
    
    // Stats
    if (item.damage) html += `<div>攻撃力: ${item.damage}</div>`;
    if (item.speed) html += `<div>弾速: ${item.speed}</div>`;
    if (item.rate) html += `<div>連射: ${item.rate}F</div>`;
    
    if (item.stats) {
        Object.entries(item.stats).forEach(([k, v]) => {
            html += `<div style="font-size:10px; color:#bdc3c7">${k}: ${v}</div>`;
        });
    }
    return html;
}

window.showTooltip = function(ev, item) {
    if (!item) return;
    tooltipContainer.innerHTML = getTooltipContent(item);
    tooltipContainer.style.display = 'block';
    moveTooltip(ev);
};

window.moveTooltip = function(ev) {
    const offset = 15;
    let left = ev.clientX + offset;
    let top = ev.clientY + offset;
    
    // 画面端の調整
    if (left + 200 > window.innerWidth) left = ev.clientX - 210;
    if (top + 100 > window.innerHeight) top = ev.clientY - 110;

    tooltipContainer.style.left = `${left}px`;
    tooltipContainer.style.top = `${top}px`;
};

window.hideTooltip = function() {
    tooltipContainer.style.display = 'none';
};

// --- HUD & Interfaces ---

window.updateHudDisplay = function() {
    const engineState = window.engineState;
    if (!engineState) return;

    // HP Bar
    const maxHp = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
    const hpPct = Math.max(0, (engineState.baseIntegrity / maxHp) * 100);
    const hpBar = document.getElementById('hp-bar-fill');
    const hpText = document.getElementById('hp-val');
    if (hpBar) hpBar.style.width = `${hpPct}%`;
    if (hpText) hpText.innerText = `${Math.floor(engineState.baseIntegrity)} / ${maxHp}`;

    // XP Bar
    const xpPct = Math.max(0, (engineState.xp / engineState.xpToNext) * 100);
    const xpBar = document.getElementById('xp-bar-fill');
    const lvlText = document.getElementById('level-val');
    if (xpBar) xpBar.style.width = `${xpPct}%`;
    if (lvlText) lvlText.innerText = `Lv.${engineState.level}`;

    // Resources
    const goldEl = document.getElementById('gold-val');
    if (goldEl) goldEl.innerText = `${engineState.gold}`;
    
    const spEl = document.getElementById('sp-val');
    if (spEl) spEl.innerText = `SP: ${engineState.skillPoints}`;

    const waveEl = document.getElementById('wave-val');
    if (waveEl) waveEl.innerText = `Wave ${engineState.wave}`;
};

window.refreshInventoryInterface = function() {
    const engineState = window.engineState;
    const invDiv = document.getElementById('inventory-grid');
    if (!invDiv) return;
    invDiv.innerHTML = '';

    engineState.inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.style.borderColor = item.color;
        slot.innerText = item.icon || (item.name ? item.name[0] : '?');
        slot.draggable = true;
        
        // Data attributes for drag
        slot.dataset.uuid = item.uuid;
        
        slot.onmouseenter = (e) => window.showTooltip(e, item);
        slot.onmousemove = (e) => window.moveTooltip(e);
        slot.onmouseleave = () => window.hideTooltip();
        
        slot.ondragstart = (e) => window.handleDragStart(e, item.uuid);
        
        invDiv.appendChild(slot);
    });
};

window.refreshShopInterface = function() {
    const container = document.getElementById('shop-grid');
    if (!container) return;
    container.innerHTML = '';

    Object.values(SHOP_ITEMS).forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
            <div style="font-size:24px;">${item.icon}</div>
            <div style="font-weight:bold; margin:4px 0;">${item.name}</div>
            <div style="font-size:11px; color:#aaa;">${item.desc}</div>
            <div style="margin-top:auto; color:#f1c40f;">${item.cost} G</div>
        `;
        card.onclick = () => {
            window.engineState.buyShopItem(item);
            window.updateHudDisplay();
            window.refreshInventoryInterface();
        };
        container.appendChild(card);
    });
};

// --- Skill Tree Renderer ---

window.renderSkillTree = function() {
    const container = document.getElementById('skill-tree-container');
    if (!container) return;
    container.innerHTML = '';

    const engineState = window.engineState;
    
    // SVG Lines Container
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;";
    container.appendChild(svg);

    // Render Connections first
    Object.values(SKILL_TREE_NODES).forEach(node => {
        if (node.connections) {
            node.connections.forEach(targetId => {
                const target = SKILL_TREE_NODES[targetId];
                if (target) {
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", node.x);
                    line.setAttribute("y1", node.y);
                    line.setAttribute("x2", target.x);
                    line.setAttribute("y2", target.y);
                    
                    const isAllocated = (engineState.allocatedNodes[node.id] && engineState.allocatedNodes[targetId]);
                    line.setAttribute("stroke", isAllocated ? "#f1c40f" : "#555");
                    line.setAttribute("stroke-width", "4");
                    svg.appendChild(line);
                }
            });
        }
    });

    // Render Nodes
    Object.values(SKILL_TREE_NODES).forEach(node => {
        const el = document.createElement('div');
        const rank = engineState.allocatedNodes[node.id] || 0;
        const max = node.maxRank || 1;
        const isMaxed = rank >= max;
        const isAllocated = rank > 0;

        let className = 'node-circle ';
        if (node.type === 'START') className += 'node-start';
        else if (node.type === 'KEYSTONE') className += 'node-keystone';
        else if (node.type === 'MEDIUM') className += 'node-medium';
        else className += 'node-small';

        if (isAllocated) className += ' allocated';

        el.className = className;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
        
        // Icon/Text
        el.innerHTML = `<span>${node.id === 0 ? 'Start' : ''}</span>`;

        // Rank Badge
        const badge = document.createElement('div');
        badge.innerText = `${rank}/${max}`;
        badge.style.cssText = "position:absolute; bottom:-15px; width:100%; text-align:center; font-size:10px; color:#fff; font-weight:bold; text-shadow:1px 1px 1px #000;";
        el.appendChild(badge);

        // Label (Japanese Name) - Added Feature
        if (node.label) {
            const label = document.createElement('div');
            label.className = 'node-label';
            label.innerText = node.label;
            el.appendChild(label);
        }

        // Interaction
        el.onclick = () => {
            if (engineState.allocateNode(node.id)) {
                window.renderSkillTree(); // Redraw to update lines
                window.updateHudDisplay();
            }
        };

        // Tooltip
        el.onmouseenter = (e) => window.showTooltip(e, {
            name: node.name,
            desc: node.description,
            color: isAllocated ? '#f1c40f' : '#aaa'
        });
        el.onmouseleave = window.hideTooltip;

        container.appendChild(el);
    });
};

// --- Level Up Options (Smart Suggestion System V2) ---

window.showLevelUpOptions = function() {
    const engineState = window.engineState;
    const modal = document.getElementById('upgrade-selection-modal');
    const container = document.getElementById('upgrade-options-container');
    if (!modal || !container) return;

    engineState.isPaused = true;
    modal.classList.remove('hidden');
    container.innerHTML = '';
    
    const options = [];
    const maxHP = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
    const hpRatio = engineState.baseIntegrity / maxHP;
    
    // Helper: Analyze current loadout
    const mainGem = engineState.equippedGems[0];
    const hasMain = !!mainGem;
    const isProjectile = hasMain && ['arrow', 'fireball', 'knife', 'shuriken'].includes(mainGem.id);
    const isAoE = hasMain && ['fireball', 'nova', 'rock', 'meteor'].includes(mainGem.id);
    const isRapid = hasMain && (mainGem.rate < 20); // Fast firing

    // --- Priority 1: Survival (HP < 40%) ---
    if (hpRatio < 0.4) {
        options.push({
            name: '緊急メンテナンス',
            desc: 'HP全回復 + シールド展開',
            icon: '🚑',
            isRare: true,
            action: () => {
                engineState.baseIntegrity = maxHP;
                engineState.setShieldState(true);
                engineState.skillPoints--;
                modal.classList.add('hidden');
                engineState.isPaused = false;
            }
        });
    }

    // --- Priority 2: Skill Tree Suggestions (Synergy Based) ---
    const availableNodes = [];
    Object.values(SKILL_TREE_NODES).forEach(node => {
        const rank = engineState.allocatedNodes[node.id] || 0;
        const max = node.maxRank || 1;
        
        if (rank < max) {
            // Check connectivity
            let connectable = false;
            if (rank > 0) connectable = true;
            else {
                Object.keys(engineState.allocatedNodes).forEach(ownedId => {
                    const oid = parseInt(ownedId);
                    if (engineState.allocatedNodes[oid] > 0) {
                        if (SKILL_TREE_NODES[oid].connections.includes(node.id)) connectable = true;
                        if (node.connections.includes(oid)) connectable = true;
                    }
                });
            }

            if (connectable) {
                // Calculate Score based on Synergy
                let score = 10; // Base score
                if (node.type === 'KEYSTONE') score += 50;
                
                // Stat matching
                if (node.stats) {
                    if (node.stats.damage_pct) score += 20; // Always good
                    if (node.stats.rate_pct) score += 20;   // Always good
                    
                    if (node.stats.proj_speed_pct && isProjectile) score += 40;
                    if (node.stats.aoe_pct && isAoE) score += 40;
                    if (node.stats.crit_chance && (isRapid || engineState.stats.crit_chance > 0.1)) score += 30;
                    
                    if (node.stats.life_on_hit && isRapid) score += 30; // High rate loves LoH
                }
                
                availableNodes.push({ node, score });
            }
        }
    });

    if (availableNodes.length > 0) {
        // Sort by score desc, take top 3, then pick 1 random from them
        availableNodes.sort((a, b) => b.score - a.score);
        const topCandidates = availableNodes.slice(0, 3);
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        const node = selected.node;
        options.push({
            name: `習得: ${node.label || node.name}`,
            desc: `${node.description} (ランク ${engineState.allocatedNodes[node.id]||0}/${node.maxRank})`,
            icon: '🌲',
            isRare: node.type === 'KEYSTONE',
            action: () => {
                if (engineState.allocateNode(node.id)) {
                    window.renderSkillTree();
                    window.updateHudDisplay();
                    modal.classList.add('hidden');
                    engineState.isPaused = false;
                }
            }
        });
    }

    // --- Priority 3: Equipment (Smart Supply) ---
    if (options.length < 3) {
        const allGems = Object.values(GEMS);
        let candidates = [];

        if (!hasMain) {
            // No main weapon? Suggest Active Gems
            candidates = allGems.filter(g => g.type === GEM_TYPES.ACTIVE);
        } else {
            // Has main weapon? Suggest Synergistic Support Gems
            candidates = allGems.filter(g => g.type === GEM_TYPES.SUPPORT);
        }

        if (candidates.length > 0) {
            const randomGem = candidates[Math.floor(Math.random() * candidates.length)];
            options.push({
                name: `支給: ${randomGem.name}`,
                desc: `インベントリに「${randomGem.name}」を追加`,
                icon: '💎',
                isRare: false,
                action: () => {
                    engineState.addItemToInventory(randomGem);
                    engineState.skillPoints--;
                    modal.classList.add('hidden');
                    engineState.isPaused = false;
                }
            });
        }
    }

    // --- Fillers: Stat Boosts (Nerfed) ---
    while (options.length < 3) {
        const statTypes = [
            // Values nerfed to be less than Skill Tree (Tree Small Node = 5-6%)
            { id: 'dmg', name: '攻撃力微増', desc: '全ダメージ +3%', apply: () => engineState.stats.damage_pct += 0.03, icon: '⚔️' },
            { id: 'spd', name: '速度微増', desc: '攻撃速度 +3%', apply: () => engineState.stats.rate_pct += 0.03, icon: '⚡' },
            { id: 'gold', name: '小銭', desc: '150 Gold獲得', apply: () => engineState.gold += 150, icon: '💰' }
        ];
        const statOpt = statTypes[Math.floor(Math.random() * statTypes.length)];
        options.push({
            name: statOpt.name,
            desc: statOpt.desc,
            icon: statOpt.icon,
            isRare: false,
            action: () => {
                statOpt.apply();
                engineState.skillPoints--;
                modal.classList.add('hidden');
                engineState.isPaused = false;
            }
        });
    }

    // Render Cards (Limit to 3)
    options.slice(0, 3).forEach(opt => {
        const card = document.createElement('div');
        card.className = `upgrade-card ${opt.isRare ? 'rare' : ''}`;
        card.innerHTML = `
            <div class="upgrade-icon">${opt.icon}</div>
            <div class="upgrade-info">
                <div class="upgrade-name">${opt.name}</div>
                <div class="upgrade-desc">${opt.desc}</div>
            </div>
        `;
        card.onclick = () => {
            if (window.engineState.skillPoints <= 0) {
                 alert("SPが足りません");
                 return;
            }
            opt.action();
        };
        container.appendChild(card);
    });
};

window.closeUpgradeModal = function() {
    document.getElementById('upgrade-selection-modal').classList.add('hidden');
    window.engineState.isPaused = false;
};

// --- General Menu Toggles ---

window.toggleMenu = function(menuId) {
    const menus = ['skill-tree-modal', 'ai-logic-modal', 'shop-modal'];
    const target = document.getElementById(menuId);
    
    if (menuId === 'skill-tree-modal' && target.classList.contains('hidden')) window.renderSkillTree();
    if (menuId === 'shop-modal' && target.classList.contains('hidden')) window.refreshShopInterface();

    menus.forEach(id => {
        if (id !== menuId) document.getElementById(id).classList.add('hidden');
    });
    
    if (target.classList.contains('hidden')) {
        target.classList.remove('hidden');
        window.engineState.isPaused = true;
        window.refreshInventoryInterface();
    } else {
        target.classList.add('hidden');
        window.engineState.isPaused = false;
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
};

window.handleDrop = function(ev, targetType, targetIndex) {
    ev.preventDefault();
    const uuid = ev.dataTransfer.getData("text/plain");
    const itemElement = document.querySelector(`[data-uuid="${uuid}"]`);
    if (itemElement) itemElement.style.opacity = '1.0';
    if (!uuid) return;
    const engineState = window.engineState;

    if (targetType === 'SLOT') engineState.equipItem(uuid, targetIndex);
    else if (targetType === 'SALVAGE') engineState.salvageItem(uuid);
    else if (targetType === 'INVENTORY') engineState.unequipByUuid(uuid);
    
    window.updateHudDisplay();
};