/**
 * @fileoverview UIコンポーネント、DOM操作、描画ロジック
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 * 更新: スマートレベルアップ提案、スキルツリーラベル対応、Export修正
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
export function getTooltipContent(item) {
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

export function showTooltip(ev, item) {
    if (!item) return;
    tooltipContainer.innerHTML = getTooltipContent(item);
    tooltipContainer.style.display = 'block';
    moveTooltip(ev);
}
window.showTooltip = showTooltip;

export function moveTooltip(ev) {
    const offset = 15;
    let left = ev.clientX + offset;
    let top = ev.clientY + offset;
    
    // 画面端の調整
    if (left + 200 > window.innerWidth) left = ev.clientX - 210;
    if (top + 100 > window.innerHeight) top = ev.clientY - 110;

    tooltipContainer.style.left = `${left}px`;
    tooltipContainer.style.top = `${top}px`;
}
window.moveTooltip = moveTooltip;

export function hideTooltip() {
    tooltipContainer.style.display = 'none';
}
window.hideTooltip = hideTooltip;

// --- HUD & Interfaces ---

export function updateHudDisplay() {
    const engineState = window.engineState;
    if (!engineState) return;

    // HP Bar
    const maxHp = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
    const hpPct = Math.max(0, (engineState.baseIntegrity / maxHp) * 100);
    const hpBar = document.getElementById('hp-orb-fill'); // Fixed ID based on HTML
    const hpText = document.getElementById('hp-text');    // Fixed ID based on HTML
    if (hpBar) hpBar.style.height = `${hpPct}%`;          // Orb uses height
    if (hpText) hpText.innerText = `${Math.floor(engineState.baseIntegrity)}`;

    // XP Bar
    const nextXp = engineState.calculateNextLevelXp();
    const xpPct = Math.max(0, (engineState.experiencePoints / nextXp) * 100);
    const xpBar = document.getElementById('xp-bar-fill');
    if (xpBar) xpBar.style.width = `${xpPct}%`;

    // Resources
    const goldEl = document.getElementById('gold-display');
    if (goldEl) goldEl.innerText = `${engineState.gold}`;
    
    const spEl = document.getElementById('sp-display');
    if (spEl) spEl.innerText = `${engineState.skillPoints}`;

    const statsText = document.getElementById('game-stats');
    if (statsText) statsText.innerText = `LV: ${engineState.currentLevel}`;
    
    const waveEl = document.getElementById('wave-info');
    const waveBar = document.getElementById('wave-bar-fill');
    if (waveEl && waveBar) {
        if (engineState.isBossWave) {
             waveBar.style.width = "100%";
             waveBar.style.backgroundColor = "#e74c3c";
             waveEl.innerText = "⚠ BOSS";
             waveEl.style.color = "#e74c3c";
             waveEl.style.borderColor = "#e74c3c";
        } else {
             const wavePct = Math.min(100, (engineState.waveProgress / engineState.waveQuota) * 100);
             waveBar.style.width = `${wavePct}%`;
             waveBar.style.backgroundColor = "#f1c40f";
             waveEl.innerText = `WAVE ${engineState.currentWaveNumber}`;
             waveEl.style.color = "#f1c40f";
             waveEl.style.borderColor = "#f1c40f";
        }
    }
    
    // Energy Orb
    const enFill = document.getElementById('energy-orb-fill');
    const enText = document.getElementById('energy-text');
    if (enFill) {
        const enPct = (engineState.energy / engineState.maxEnergy) * 100;
        enFill.style.height = `${enPct}%`;
        enText.innerText = `${Math.floor(engineState.energy)}`;
    }
}
window.updateHudDisplay = updateHudDisplay;

export function updateMainScreenLoadout() {
    // Placeholder required by game.js imports
    // 将来的にメイン画面に装備アイコンを表示する場合はここに実装
}
window.updateMainScreenLoadout = updateMainScreenLoadout;

let selectedItemUuid = null; // Global state for tap interaction

export function refreshInventoryInterface() {
    const engineState = window.engineState;
    if (!engineState) return;

    const container = document.getElementById('dock-content');
    if (!container) return;
    container.innerHTML = '';

    // Remove old menu if exists
    const oldMenu = document.getElementById('action-menu');
    if (oldMenu) oldMenu.remove();

    // --- Interaction Handler (Tap/Click) ---
    const handleSlotClick = (e, uuid, type, slotId) => {
        e.stopPropagation();

        // Case 1: Item Selected -> Move to Target
        if (selectedItemUuid) {
            // If clicking same item, deselect
            if (selectedItemUuid === uuid) {
                selectedItemUuid = null;
                refreshInventoryInterface();
                return;
            }

            // Execute Move
            const fromInv = engineState.inventory.find(i => i.uuid === selectedItemUuid);

            if (fromInv) {
                // Moving from Inventory to Slot
                if (type === 'SLOT') {
                    engineState.equipItem(selectedItemUuid, slotId);
                    selectedItemUuid = null;
                } else if (type === 'SALVAGE') {
                    engineState.salvageItem(selectedItemUuid);
                    selectedItemUuid = null;
                }
            } else {
                // Moving from Slot (Not implemented in simplified logic, assume unequip first)
                // For now, only support Inv -> Slot via tap
            }
            refreshInventoryInterface();
            return;
        }

        // Case 2: No Selection -> Select Item or Show Menu
        if (uuid) {
            if (type === 'SLOT') {
                // Show Unequip Menu
                showActionMenu(e.clientX, e.clientY, uuid);
            } else {
                // Select Inventory Item
                selectedItemUuid = uuid;
                refreshInventoryInterface(); // Redraw to show highlight
            }
        }
    };

    const showActionMenu = (x, y, uuid) => {
        const menu = document.createElement('div');
        menu.id = 'action-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        const btnUnequip = document.createElement('button');
        btnUnequip.className = 'action-btn';
        btnUnequip.innerText = '外す (Unequip)';
        btnUnequip.onclick = () => {
            engineState.unequipByUuid(uuid);
            menu.remove();
        };

        const btnCancel = document.createElement('button');
        btnCancel.className = 'action-btn';
        btnCancel.innerText = '閉じる';
        btnCancel.onclick = () => menu.remove();

        menu.appendChild(btnUnequip);
        menu.appendChild(btnCancel);
        document.body.appendChild(menu);

        // Close on outside click
        setTimeout(() => {
            window.addEventListener('click', function close(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    window.removeEventListener('click', close);
                }
            });
        }, 0);
    };

    // --- Helper to create a slot ---
    const createSlot = (id, item, label, typeHint, dropTargetId) => {
        const el = document.createElement('div');
        el.className = 'gem-slot';
        if (id.includes('ring') || id.includes('amulet')) el.classList.add('acc-slot');

        if (typeHint === 'ACTIVE') el.classList.add('slot-active-bg');
        if (typeHint === 'SUPPORT') el.classList.add('slot-support-bg');

        if (item) {
            el.innerHTML = `<div style="text-align:center; color:${item.color}; line-height:1.1;">${item.name}<br><span style="font-size:9px; color:#fff;">Lv.${item.level}</span></div>`;
            el.style.borderColor = item.color;
            el.draggable = true;
            el.ondragstart = (e) => window.handleDragStart(e, item.uuid);
            el.onclick = (e) => handleSlotClick(e, item.uuid, 'SLOT', dropTargetId);
        } else {
            el.innerText = label;
            if (typeHint === 'ACTIVE') el.style.borderColor = '#c0392b';
            else if (typeHint === 'SUPPORT') el.style.borderColor = '#27ae60';
            else el.style.borderColor = '#444';

            // Allow clicking empty slot to place selected item
            el.onclick = (e) => handleSlotClick(e, null, 'SLOT', dropTargetId);
        }

        el.ondragover = window.allowDrop;
        el.ondrop = (e) => window.handleDrop(e, 'SLOT', dropTargetId);

        return el;
    };

    // --- 1. Main Loadout (Set 1) ---
    const mainRow = document.createElement('div');
    mainRow.className = 'loadout-row';
    mainRow.innerHTML = `<div class="loadout-label">MAIN<br><span style="color:#00d2d3">ACTIVE</span></div>`;
    engineState.equippedGems.forEach((g, i) => {
        const label = i === 0 ? "スキル" : "サポ";
        const type = i === 0 ? "ACTIVE" : "SUPPORT";
        mainRow.appendChild(createSlot(`main-slot-${i}`, g, label, type, `MAIN_${i}`));
    });
    container.appendChild(mainRow);

    // --- 2. Sub Loadout (Set 2) ---
    const subRow = document.createElement('div');
    subRow.className = 'loadout-row';
    subRow.innerHTML = `<div class="loadout-label">SUB<br><span style="color:#f39c12">50%</span></div>`;
    engineState.altGems.forEach((g, i) => {
        const label = i === 0 ? "スキル" : "サポ";
        const type = i === 0 ? "ACTIVE" : "SUPPORT";
        subRow.appendChild(createSlot(`sub-slot-${i}`, g, label, type, `SUB_${i}`));
    });
    container.appendChild(subRow);

    // --- 3. Accessories ---
    const accRow = document.createElement('div');
    accRow.className = 'acc-row';
    accRow.appendChild(createSlot('slot-ring', engineState.equippedArtifacts.RING, "指輪", "RING", "RING"));
    accRow.appendChild(createSlot('slot-amulet', engineState.equippedArtifacts.AMULET, "首飾り", "AMULET", "AMULET"));
    container.appendChild(accRow);

    // --- 4. Inventory (Sorted) ---
    const invTitle = document.createElement('div');
    invTitle.className = 'inv-section-header';
    invTitle.innerText = `インベントリ (${engineState.inventory.length}/${GAME_SETTINGS.INVENTORY_CAPACITY})`;
    if (selectedItemUuid) {
        invTitle.innerHTML += ` <span style="color:#f1c40f; animation:pulse 1s infinite;">(配置先を選択...)</span>`;
    }
    container.appendChild(invTitle);

    const invGrid = document.createElement('div');
    invGrid.id = 'inventory-grid';
    invGrid.ondragover = window.allowDrop;
    invGrid.ondrop = (e) => window.handleDrop(e, 'INVENTORY');

    // Sort: Active -> Support -> Ring -> Amulet -> Others
    const sortedInv = [...engineState.inventory].sort((a, b) => {
        const typeOrder = { 'ACTIVE': 1, 'SUPPORT': 2, 'RING': 3, 'AMULET': 4 };
        const ta = typeOrder[a.type] || 99;
        const tb = typeOrder[b.type] || 99;
        if (ta !== tb) return ta - tb;
        return b.level - a.level;
    });

    sortedInv.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inv-item';
        if (selectedItemUuid === item.uuid) slot.classList.add('selected-item');

        // Background Tint based on Type
        if (item.type === 'ACTIVE') slot.style.background = "rgba(192, 57, 43, 0.1)";
        if (item.type === 'SUPPORT') slot.style.background = "rgba(39, 174, 96, 0.1)";
        if (item.type === 'RING') slot.style.background = "rgba(41, 128, 185, 0.1)";
        if (item.type === 'AMULET') slot.style.background = "rgba(142, 68, 173, 0.1)";

        slot.style.borderColor = item.color;

        // Icon Logic
        let icon = '?';
        if (item.type === 'ACTIVE') icon = '⚔️'; // TODO: unique icon per id?
        else if (item.type === 'SUPPORT') icon = '💎';
        else if (item.type === 'RING') icon = '💍';
        else if (item.type === 'AMULET') icon = '🧿';
        else if (item.id === 'gold') icon = '💰';

        // Rich Content: Icon + Name
        slot.innerHTML = `
            <div style="font-size:14px;">${icon}</div>
            <div class="inv-name" style="color:${item.color}">${item.name}</div>
            <span style="font-size:8px; color:#aaa; position:absolute; top:2px; right:2px;">Lv.${item.level}</span>
        `;

        slot.draggable = true;
        slot.dataset.uuid = item.uuid;

        slot.onmouseenter = (e) => window.showTooltip(e, item);
        slot.onmousemove = (e) => window.moveTooltip(e);
        slot.onmouseleave = () => window.hideTooltip();

        slot.ondragstart = (e) => window.handleDragStart(e, item.uuid);
        slot.onclick = (e) => handleSlotClick(e, item.uuid, 'INVENTORY');

        invGrid.appendChild(slot);
    });
    container.appendChild(invGrid);

    // Salvage Area
    const salvage = document.createElement('div');
    salvage.id = 'salvage-area';
    salvage.style.cssText = "margin-top:15px; border:2px dashed #e74c3c; color:#e74c3c; padding:10px; text-align:center; font-size:12px; cursor:pointer;";
    salvage.innerText = "ここに捨てて XP に変換 (タップ選択可)";
    salvage.ondragover = window.allowDrop;
    salvage.ondrop = (e) => window.handleDrop(e, 'SALVAGE');
    salvage.onclick = (e) => handleSlotClick(e, null, 'SALVAGE');
    container.appendChild(salvage);
}
window.refreshInventoryInterface = refreshInventoryInterface;

export function refreshShopInterface() {
    const container = document.getElementById('shop-grid');
    if (!container) return;
    container.innerHTML = '';
    const engineState = window.engineState;

    const createCard = (item, isGem = false) => {
        const isSoldOut = isGem && engineState.purchasedShopItems.includes(item.id);
        const card = document.createElement('div');
        // Simple card style inline
        card.style.cssText = `background:rgba(0,0,0,0.5); border:1px solid #444; padding:5px; border-radius:4px; display:flex; align-items:center; opacity:${isSoldOut ? 0.5 : 1}; cursor:${isSoldOut ? 'default' : 'pointer'};`;
        
        const cost = isGem ? 300 : item.cost;
        const icon = isGem ? '💎' : item.icon;
        const desc = isGem ? 'Lv.1 習得' : item.desc;
        const name = item.name;

        card.innerHTML = `
            <div style="font-size:20px; margin-right:8px;">${icon}</div>
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:12px; color:${item.color || '#f1c40f'}">${name}</div>
                <div style="font-size:10px; color:#aaa;">${desc}</div>
                <div style="color:${isSoldOut ? '#e74c3c' : '#fff'}; font-size:11px;">${isSoldOut ? 'SOLD OUT' : cost + ' G'}</div>
            </div>
        `;

        if (!isSoldOut) {
            card.onclick = () => {
                if (item.id === 'mystery') engineState.buyMysteryBox();
                else engineState.buyShopItem(item.id);
            };
        }
        container.appendChild(card);
    };

    Object.values(SHOP_ITEMS).forEach(item => createCard(item));
    Object.values(GEMS).forEach(gem => {
        if (gem.type === GEM_TYPES.ACTIVE) createCard(gem, true);
    });
}
window.refreshShopInterface = refreshShopInterface;

// --- Skill Tree Renderer ---

export function renderSkillTree() {
    const container = document.getElementById('skill-tree-content');
    if (!container) return;
    container.innerHTML = '';

    const engineState = window.engineState;
    
    // Canvas for lines
    const canvas = document.createElement('canvas');
    canvas.width = GAME_SETTINGS.TREE_WIDTH;
    canvas.height = GAME_SETTINGS.TREE_HEIGHT;
    canvas.style.cssText = "position:absolute; top:0; left:0; pointer-events:none; z-index:1;";
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Render Connections
    ctx.lineWidth = 4;
    Object.values(SKILL_TREE_NODES).forEach(node => {
        if (node.connections) {
            node.connections.forEach(targetId => {
                const target = SKILL_TREE_NODES[targetId];
                if (target) {
                    const nodeRank = engineState.allocatedNodes[node.id] || 0;
                    const targetRank = engineState.allocatedNodes[targetId] || 0;
                    const isAllocated = (nodeRank > 0 && targetRank > 0);
                    
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = isAllocated ? "#f1c40f" : "#444";
                    ctx.stroke();
                }
            });
        }
    });

    // Render Nodes
    Object.values(SKILL_TREE_NODES).forEach(node => {
        const el = document.createElement('div');
        const rank = engineState.allocatedNodes[node.id] || 0;
        const max = node.maxRank || 1;
        const isAllocated = rank > 0;

        let className = 'tree-node '; // Matches CSS
        if (node.type === 'START') className += 'node-start';
        else if (node.type === 'KEYSTONE') className += 'node-keystone';
        else if (node.type === 'MEDIUM') className += 'node-medium';

        if (isAllocated) className += ' allocated';

        el.className = className;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
        
        // Rank Badge
        const badge = document.createElement('div');
        badge.innerText = `${rank}/${max}`;
        badge.style.cssText = "position:absolute; bottom:-15px; width:100%; text-align:center; font-size:10px; color:#fff; font-weight:bold; text-shadow:1px 1px 1px #000;";
        el.appendChild(badge);

        // Label (Japanese Name)
        if (node.label) {
            const label = document.createElement('div');
            label.className = 'node-label'; // Matches CSS
            label.innerText = node.label;
            el.appendChild(label);
        }

        // Interaction
        el.onclick = (e) => {
            e.stopPropagation();
            if (engineState.allocateNode(node.id)) {
                window.renderSkillTree();
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
}
window.renderSkillTree = renderSkillTree;

// =====================================================
// Skill Tree Viewport Controls (mouse / keyboard / touch)
// =====================================================

function _getSkillTreeEls() {
    const modal = document.getElementById('skill-tree-modal');
    const viewport = document.getElementById('skill-tree-viewport');
    const content = document.getElementById('skill-tree-content');
    return { modal, viewport, content };
}

function _ensureSkillTreeViewState() {
    if (!window.skillTreeViewState) {
        window.skillTreeViewState = {
            scale: 1,
            x: 0,
            y: 0,
            initialized: false,
            _controlsBound: false,
            _renderWrapped: false
        };
    }
    return window.skillTreeViewState;
}

function _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function applySkillTreeTransform() {
    const { content } = _getSkillTreeEls();
    if (!content) return;
    const state = _ensureSkillTreeViewState();
    content.style.transformOrigin = '0 0';
    content.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}
window.applySkillTreeTransform = applySkillTreeTransform;

function centerSkillTreeViewport(force = false) {
    const { viewport, content } = _getSkillTreeEls();
    if (!viewport || !content) return;

    const state = _ensureSkillTreeViewState();

    // If already initialized and not forced, just re-apply transform after re-render
    if (state.initialized && !force) {
        applySkillTreeTransform();
        return;
    }

    const vw = viewport.clientWidth || 1;
    const vh = viewport.clientHeight || 1;

    const treeW = (window.GAME_SETTINGS && window.GAME_SETTINGS.TREE_WIDTH)
        ? window.GAME_SETTINGS.TREE_WIDTH
        : (parseFloat(content.style.width) || 2000);

    const treeH = (window.GAME_SETTINGS && window.GAME_SETTINGS.TREE_HEIGHT)
        ? window.GAME_SETTINGS.TREE_HEIGHT
        : (parseFloat(content.style.height) || 1500);

    // Fit inside viewport a bit
    const fitScale = Math.min(vw / treeW, vh / treeH) * 0.92;
    state.scale = _clamp(fitScale, 0.35, 2.5);

    state.x = (vw - treeW * state.scale) / 2;
    state.y = (vh - treeH * state.scale) / 2;

    state.initialized = true;
    applySkillTreeTransform();
}
window.centerSkillTreeViewport = centerSkillTreeViewport;

function _zoomAtScreenPoint(screenX, screenY, nextScale) {
    const { viewport } = _getSkillTreeEls();
    if (!viewport) return;

    const state = _ensureSkillTreeViewState();

    const rect = viewport.getBoundingClientRect();
    const vx = screenX - rect.left;
    const vy = screenY - rect.top;

    const prev = state.scale;
    const ns = _clamp(nextScale, 0.35, 2.5);
    if (Math.abs(ns - prev) < 1e-6) return;

    // Keep (vx, vy) stable
    const contentX = (vx - state.x) / prev;
    const contentY = (vy - state.y) / prev;

    state.scale = ns;
    state.x = vx - contentX * ns;
    state.y = vy - contentY * ns;

    applySkillTreeTransform();
}

export function initSkillTreeViewportControls() {
    const { modal, viewport } = _getSkillTreeEls();
    if (!modal || !viewport) return;

    const state = _ensureSkillTreeViewState();
    if (state._controlsBound) return;
    state._controlsBound = true;

    viewport.tabIndex = 0;

    const activePointers = new Map();
    let isDragging = false;
    let isRealDrag = false; // 移動量が閾値を超えたかどうかのフラグ
    let dragBase = { x: 0, y: 0, baseX: 0, baseY: 0 };
    let startPos = { x: 0, y: 0 }; // クリック判定用の開始座標
    let pinch = null; // { dist, baseScale }

    function isOpen() {
        return !modal.classList.contains('hidden');
    }

    function dist(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.hypot(dx, dy);
    }

    function mid(p1, p2) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }

    viewport.addEventListener('pointerdown', (e) => {
        if (!isOpen()) return;
        e.preventDefault();
        viewport.setPointerCapture(e.pointerId);
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const pts = Array.from(activePointers.values());
        if (pts.length === 1) {
            isDragging = true;
            isRealDrag = false;
            startPos = { x: e.clientX, y: e.clientY };
            dragBase = { x: e.clientX, y: e.clientY, baseX: state.x, baseY: state.y };
            pinch = null;
        } else if (pts.length === 2) {
            pinch = { dist: dist(pts[0], pts[1]), baseScale: state.scale };
            isDragging = false;
            isRealDrag = true; // ピンチ操作はクリックとみなさない
        }
    }, { passive: false });

    viewport.addEventListener('pointermove', (e) => {
        if (!isOpen()) return;
        if (!activePointers.has(e.pointerId)) return;

        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = Array.from(activePointers.values());

        if (pts.length === 1 && isDragging) {
            const dx = e.clientX - dragBase.x;
            const dy = e.clientY - dragBase.y;

            // 閾値判定 (5px以上動いたらドラッグとみなす)
            if (!isRealDrag && Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) > 5) {
                isRealDrag = true;
            }

            state.x = dragBase.baseX + dx;
            state.y = dragBase.baseY + dy;
            applySkillTreeTransform();
            return;
        }

        if (pts.length === 2 && pinch) {
            const m = mid(pts[0], pts[1]);
            const d = dist(pts[0], pts[1]);
            const ratio = d / (pinch.dist || 1);
            _zoomAtScreenPoint(m.x, m.y, pinch.baseScale * ratio);
        }
    }, { passive: false });

    function endPointer(e) {
        if (activePointers.has(e.pointerId)) {
            // クリック判定: ドラッグ（移動）しておらず、かつ指が1本だけの操作終了時
            if (!isRealDrag && activePointers.size === 1) {
                // setPointerCaptureしているため、ターゲット要素を再取得する
                // 要素の重なりを考慮し、pointer-events: none の要素を貫通させるために
                // viewportのキャプチャを一瞬解除するか、elementFromPointを使用する
                try {
                    viewport.releasePointerCapture(e.pointerId);
                } catch(err) {}

                const el = document.elementFromPoint(e.clientX, e.clientY);
                // ツリーノードまたはその子要素をクリックしたか判定
                const nodeEl = el?.closest('.tree-node');
                if (nodeEl && typeof nodeEl.onclick === 'function') {
                    // 明示的にクリックハンドラを実行
                    nodeEl.onclick(e);
                }
            }
            activePointers.delete(e.pointerId);
        }

        const pts = Array.from(activePointers.values());
        if (pts.length < 2) pinch = null;
        if (pts.length === 0) isDragging = false;
    }

    viewport.addEventListener('pointerup', endPointer, { passive: true });
    viewport.addEventListener('pointercancel', endPointer, { passive: true });

    // Wheel zoom (desktop)
    viewport.addEventListener('wheel', (e) => {
        if (!isOpen()) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        _zoomAtScreenPoint(e.clientX, e.clientY, state.scale * factor);
    }, { passive: false });

    // Keyboard pan/zoom (when skill tree open)
    window.addEventListener('keydown', (e) => {
        if (!isOpen()) return;

        const step = e.shiftKey ? 80 : 40;
        let handled = true;

        if (e.key === 'ArrowLeft') state.x += step;
        else if (e.key === 'ArrowRight') state.x -= step;
        else if (e.key === 'ArrowUp') state.y += step;
        else if (e.key === 'ArrowDown') state.y -= step;
        else if (e.key === '+' || e.key === '=') {
            const r = viewport.getBoundingClientRect();
            _zoomAtScreenPoint(r.left + r.width / 2, r.top + r.height / 2, state.scale * 1.10);
        }
        else if (e.key === '-' || e.key === '_') {
            const r = viewport.getBoundingClientRect();
            _zoomAtScreenPoint(r.left + r.width / 2, r.top + r.height / 2, state.scale * 0.90);
        }
        else if (e.key === '0') {
            centerSkillTreeViewport(true);
        }
        else {
            handled = false;
        }

        if (handled) {
            e.preventDefault();
            applySkillTreeTransform();
        }
    }, { passive: false });

    // Wrap renderSkillTree once so transform persists after re-render
    const original = window.renderSkillTree;
    if (!state._renderWrapped && typeof original === 'function') {
        state._renderWrapped = true;
        window.renderSkillTree = function () {
            original();
            requestAnimationFrame(() => {
                applySkillTreeTransform();
            });
        };
    }
}
window.initSkillTreeViewportControls = initSkillTreeViewportControls;

// --- Level Up Options (Smart Suggestion System V2) ---

export function showLevelUpOptions() {
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
    const isRapid = hasMain && (mainGem.rate < 20);

    // Priority 1: Survival
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

    // Priority 2: Skill Tree (Synergy)
    const availableNodes = [];
    Object.values(SKILL_TREE_NODES).forEach(node => {
        const rank = engineState.allocatedNodes[node.id] || 0;
        const max = node.maxRank || 1;
        
        if (rank < max) {
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
                let score = 10;
                if (node.type === 'KEYSTONE') score += 50;
                
                if (node.stats) {
                    if (node.stats.damage_pct) score += 20;
                    if (node.stats.rate_pct) score += 20;
                    if (node.stats.proj_speed_pct && isProjectile) score += 40;
                    if (node.stats.aoe_pct && isAoE) score += 40;
                    if (node.stats.crit_chance && (isRapid || engineState.stats.crit_chance > 0.1)) score += 30;
                    if (node.stats.life_on_hit && isRapid) score += 30;
                }
                availableNodes.push({ node, score });
            }
        }
    });

    if (availableNodes.length > 0) {
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

    // Priority 3: Equipment
    if (options.length < 3) {
        const allGems = Object.values(GEMS);
        let candidates = [];
        if (!hasMain) candidates = allGems.filter(g => g.type === GEM_TYPES.ACTIVE);
        else candidates = allGems.filter(g => g.type === GEM_TYPES.SUPPORT);

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

    // Fillers
    while (options.length < 3) {
        const statTypes = [
            { name: '攻撃力微増', desc: '全ダメージ +3%', apply: () => engineState.stats.damage_pct += 0.03, icon: '⚔️' },
            { name: '速度微増', desc: '攻撃速度 +3%', apply: () => engineState.stats.rate_pct += 0.03, icon: '⚡' },
            { name: '小銭', desc: '150 Gold獲得', apply: () => engineState.gold += 150, icon: '💰' }
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

    // Render
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
}
window.showLevelUpOptions = showLevelUpOptions;

export function closeUpgradeModal() {
    document.getElementById('upgrade-selection-modal').classList.add('hidden');
    window.engineState.isPaused = false;
}
window.closeUpgradeModal = closeUpgradeModal;

// --- General Menu Toggles ---


export function toggleMenu(menuId) {
    const menus = ['skill-tree-modal', 'logic-modal', 'shop-modal', 'dock-modal', 'help-modal'];
    const target = document.getElementById(menuId);

    // pre-render hooks
    if (menuId === 'skill-tree-modal' && target.classList.contains('hidden')) {
        window.renderSkillTree();
    }
    if (menuId === 'shop-modal' && target.classList.contains('hidden')) {
        window.refreshShopInterface();
    }

    menus.forEach(id => {
        if (id !== menuId) document.getElementById(id).classList.add('hidden');
    });

    if (target.classList.contains('hidden')) {
        target.classList.remove('hidden');
        window.engineState.isPaused = true;
        window.refreshInventoryInterface();

        // Skill Tree: viewport init + center + focus
        if (menuId === 'skill-tree-modal') {
            try {
                if (typeof window.initSkillTreeViewportControls === 'function') {
                    window.initSkillTreeViewportControls();
                }
                if (typeof window.centerSkillTreeViewport === 'function') {
                    window.centerSkillTreeViewport(true);
                }
                const vp = document.getElementById('skill-tree-viewport');
                if (vp) {
                    vp.tabIndex = 0;
                    vp.focus({ preventScroll: true });
                }
            } catch (e) {
                // ignore
            }
        }
    } else {
        target.classList.add('hidden');
        window.engineState.isPaused = false;
    }
}
window.toggleMenu = toggleMenu;

// --- Drag & Drop Handlers ---

export function handleDragStart(ev, uuid) {
    ev.dataTransfer.setData("text/plain", uuid);
    ev.dataTransfer.effectAllowed = "move";
    ev.target.style.opacity = '0.5';
}
window.handleDragStart = handleDragStart;

export function allowDrop(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
}
window.allowDrop = allowDrop;

export function handleDrop(ev, targetType, targetIndex) {
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
}
window.handleDrop = handleDrop;