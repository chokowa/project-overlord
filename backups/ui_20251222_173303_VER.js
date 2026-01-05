/**
 * @fileoverview UIコンポーネント、DOM操作、描画ロジック
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 * 更新: PoE風HUD対応、スキルツリーのPan/Zoom、3択アップグレード
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
 * @param {Object} item 
 * @returns {string} HTML string
 */
export function generateTooltipContent(item) {
    if (!item) return "";
    let content = `<strong style="color:${item.color}; font-size:14px;">${item.name}</strong> <span style="font-size:10px; color:#95a5a6;">(Lv.${item.level})</span>\n`;
    
    let typeName = "その他";
    if (item.type === GEM_TYPES.ACTIVE) typeName = "メイン武器";
    else if (item.type === GEM_TYPES.SUPPORT) typeName = "改造パーツ";
    else if (item.type === 'RING') typeName = "指輪";
    else if (item.type === 'AMULET') typeName = "首飾り";
    
    content += `<div style="margin-top:4px; color:#bdc3c7; font-size:11px;">種別: ${typeName}</div>`;
    content += `<div style="margin-top:6px; border-top:1px solid #555; padding-top:4px;">`;
    
    if (item.type === GEM_TYPES.ACTIVE) {
        const dmg = Math.floor(item.damage * (1 + (item.level - 1) * 0.2));
        content += `💥 攻撃力: ${dmg}\n`;
        content += `⚡ 速さ: ${item.rate} (小さいほど速い)\n`;
    } else if (item.type === GEM_TYPES.SUPPORT) {
        if (item.damage_mod) {
            const mod = item.damage_mod * (1 + (item.level - 1) * 0.1);
            content += `⚔️ 威力倍率: x${mod.toFixed(2)}\n`;
        }
        if (item.chain_count) {
            const chain = item.chain_count + Math.floor(item.level / 2);
            content += `🔗 連鎖数: ${chain}\n`;
        }
    } else {
        if (item.stats) Object.entries(item.stats).forEach(([k, v]) => { 
            // 簡易翻訳
            let label = k;
            if (k === 'damage_pct') label = "ダメージ";
            if (k === 'rate_pct') label = "攻撃速度";
            if (k === 'crit_chance') label = "クリティカル率";
            if (k === 'xp_gain') label = "経験値効率";
            if (k === 'life_on_hit') label = "命中時回復";
            if (k === 'gold_gain') label = "ゴールド獲得";
            
            // %表示などの整形
            let valStr = v;
            if (v < 1 && v > -1) valStr = `${Math.floor(v * 100)}%`;
            
            content += `💍 ${label}: +${valStr}\n`; 
        });
    }
    content += `</div>`;
    return content;
}

export function handleTooltipShow(e, item) {
    tooltipContainer.innerHTML = generateTooltipContent(item);
    tooltipContainer.style.display = 'block';
    const rightOverflow = e.clientX + 200 > window.innerWidth;
    tooltipContainer.style.left = rightOverflow ? `${e.clientX - 200}px` : `${e.clientX + 15}px`;
    tooltipContainer.style.top = `${e.clientY + 15}px`;
}

export function handleTooltipHide() {
    tooltipContainer.style.display = 'none';
}

// --- Skill Tree UI (Pan & Zoom) ---

let treeState = {
    scale: 1.0,
    panning: false,
    pointX: 0,
    pointY: 0,
    startX: 0,
    startY: 0
};

/** スキルツリーの描画 */
window.renderSkillTree = function() {
    const engineState = window.engineState;
    if (!engineState) return;

    const container = document.getElementById('skill-tree-content');
    if (!container) return;
    container.innerHTML = '';

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
                // Line
                ctx.beginPath();
                ctx.strokeStyle = '#555';
                ctx.shadowBlur = 0;
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();

                // Active Line (Gold)
                const nodeRank = engineState.allocatedNodes[node.id] || 0;
                const targetRank = engineState.allocatedNodes[targetId] || 0;
                if (nodeRank > 0 && targetRank > 0) {
                    ctx.save();
                    ctx.strokeStyle = '#f1c40f';
                    ctx.shadowBlur = 10;
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

        // Click Handler
        el.onclick = (e) => {
            e.stopPropagation(); // Prevent drag start
            if (engineState.allocateNode(node.id)) {
                window.renderSkillTree();
                updateHudDisplay();
            }
        };

        // Tooltip logic inline for simplicity
        el.onmouseover = (e) => {
            let tooltipText = `<b>${node.name}</b> (ランク ${rank}/${max})<br>`;
            if (node.description) tooltipText += `<span style='font-size:11px'>${node.description}</span><br>`;
            handleTooltipShow(e, { name: node.name, color: '#f1c40f', level: rank, type: 'SKILL' }); 
            // Custom content override
            tooltipContainer.innerHTML = tooltipText;
        };
        el.onmouseout = handleTooltipHide;

        container.appendChild(el);
    });
};

/** ツリー操作の初期化 (Pan/Zoom) */
function initSkillTreeControls() {
    const viewport = document.getElementById('skill-tree-viewport');
    const content = document.getElementById('skill-tree-content');
    if (!viewport || !content) return;

    const setTransform = () => {
        content.style.transform = `translate(${treeState.pointX}px, ${treeState.pointY}px) scale(${treeState.scale})`;
    };
    
    // Initial Center
    treeState.pointX = (viewport.clientWidth / 2) - 1000;
    treeState.pointY = (viewport.clientHeight / 2) - 750;
    setTransform();

    // Mouse Drag
    viewport.onmousedown = (e) => {
        treeState.panning = true;
        treeState.startX = e.clientX - treeState.pointX;
        treeState.startY = e.clientY - treeState.pointY;
    };
    window.onmousemove = (e) => {
        if (!treeState.panning) return;
        e.preventDefault();
        treeState.pointX = e.clientX - treeState.startX;
        treeState.pointY = e.clientY - treeState.startY;
        setTransform();
    };
    window.onmouseup = () => { treeState.panning = false; };

    // Wheel Zoom
    viewport.onwheel = (e) => {
        e.preventDefault();
        const xs = (e.clientX - treeState.pointX) / treeState.scale;
        const ys = (e.clientY - treeState.pointY) / treeState.scale;
        const delta = -e.deltaY;
        
        (delta > 0) ? (treeState.scale *= 1.1) : (treeState.scale /= 1.1);
        
        // Limits
        if (treeState.scale > 2.0) treeState.scale = 2.0;
        if (treeState.scale < 0.3) treeState.scale = 0.3;

        treeState.pointX = e.clientX - xs * treeState.scale;
        treeState.pointY = e.clientY - ys * treeState.scale;
        setTransform();
    };
    
    // Touch Logic (Simple Pinch)
    // (Simplification: just basic drag for now to save tokens, pinch can be complex)
    viewport.ontouchstart = (e) => {
        if (e.touches.length === 1) {
            treeState.panning = true;
            treeState.startX = e.touches[0].clientX - treeState.pointX;
            treeState.startY = e.touches[0].clientY - treeState.pointY;
        }
    };
    viewport.ontouchmove = (e) => {
        if (treeState.panning && e.touches.length === 1) {
            e.preventDefault();
            treeState.pointX = e.touches[0].clientX - treeState.startX;
            treeState.pointY = e.touches[0].clientY - treeState.startY;
            setTransform();
        }
    };
    viewport.ontouchend = () => { treeState.panning = false; };
}
// Init immediately
setTimeout(initSkillTreeControls, 500);


// --- Shop Interface ---

export function refreshShopInterface() {
    const engineState = window.engineState;
    if (!engineState) return;

    const grid = document.getElementById('shop-grid');
    const msg = document.getElementById('shop-message');
    if (!grid) return;
    
    grid.innerHTML = '';
    // msg.innerText = `所持金: ${engineState.gold} G`; // HUDにあるので不要

    const createCard = (id, name, desc, cost, iconChar, isSoldOut = false, color = '#f1c40f') => {
        const card = document.createElement('div');
        card.style.cssText = `background: rgba(0,0,0,0.5); border: 1px solid #444; padding: 10px; border-radius: 6px; display: flex; align-items: center; cursor: ${isSoldOut ? 'default' : 'pointer'}; opacity: ${isSoldOut ? 0.5 : 1};`;
        if (!isSoldOut) {
            card.onclick = () => id === 'mystery' ? engineState.buyMysteryBox() : engineState.buyShopItem(id);
            card.onmouseover = () => { card.style.borderColor = color; card.style.background = 'rgba(255,255,255,0.1)'; };
            card.onmouseout = () => { card.style.borderColor = '#444'; card.style.background = 'rgba(0,0,0,0.5)'; };
        }

        const costText = isSoldOut ? "<span style='color:#e74c3c'>売切れ</span>" : `${cost} G`;
        
        card.innerHTML = `
            <div style="font-size:24px; margin-right:10px; width:30px; text-align:center;">${iconChar}</div>
            <div style="flex:1;">
                <div style="color:${color}; font-weight:bold; font-size:12px;">${name}</div>
                <div style="font-size:10px; color:#aaa;">${desc}</div>
                <div style="color:#fff; font-weight:bold; margin-top:2px;">${costText}</div>
            </div>
        `;
        grid.appendChild(card);
    };

    Object.values(SHOP_ITEMS).forEach(item => {
        createCard(item.id, item.name, item.desc, item.cost, item.icon);
    });
    // Gems
    Object.values(GEMS).forEach(gem => {
        if (gem.type !== 'ACTIVE') return;
        const isSoldOut = engineState.purchasedShopItems.includes(gem.id);
        createCard(gem.id, gem.name, "Lv.1 スキル習得", 300, "💎", isSoldOut, gem.color);
    });
}
window.refreshShopInterface = refreshShopInterface;

// --- Inventory & Loadout UI ---

export function updateMainScreenLoadout() {
    // エラー回避用スタブ: 将来的にロードアウト表示のDOM更新が必要な場合はここに記述
}

export function refreshInventoryInterface() {
    const engineState = window.engineState;
    if (!engineState) return;

    const gridElement = document.getElementById('inventory-grid');
    if (!gridElement) return;
    gridElement.innerHTML = '';

    engineState.inventory.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.style.backgroundColor = 'rgba(30,30,40,0.6)';
        el.style.borderColor = item.color;
        
        // 簡易表示
        el.innerHTML = `<span style="color:${item.color}; font-weight:bold;">${item.name.substring(0,2)}</span><span style="font-size:8px; color:#fff;">Lv.${item.level}</span>`;
        el.dataset.uuid = item.uuid;

        el.draggable = true;
        el.ondragstart = (e) => window.handleDragStart(e, item.uuid);
        el.ondragend = (e) => { e.target.style.opacity = '1.0'; };
        
        // Double Click Equip
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

        // Equipped Mark
        const isEquipped = [...engineState.equippedGems, ...engineState.altGems, engineState.equippedArtifacts.RING, engineState.equippedArtifacts.AMULET]
            .some(g => g && g.uuid === item.uuid);
        
        if (isEquipped) {
            el.style.opacity = "0.4";
            el.innerHTML += `<div style="position:absolute; bottom:0; right:0; background:#3498db; color:#fff; font-size:8px; padding:1px;">E</div>`;
        }
        gridElement.appendChild(el);
    });

    engineState.equippedGems.forEach((g, i) => updateSlotUI(`slot-${i}`, g, i === 0 ? 'メイン' : '改造'));
    updateSlotUI('slot-ring', engineState.equippedArtifacts.RING, '指輪');
    updateSlotUI('slot-amulet', engineState.equippedArtifacts.AMULET, '首飾り');
}

export function updateSlotUI(id, item, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.onmousemove = null; el.onmouseleave = null;

    if (item) {
        el.innerHTML = `<div style="text-align:center; color:${item.color}">${item.name}<br><span style="font-size:9px; color:#fff;">Lv.${item.level}</span></div>`;
        el.style.borderColor = item.color;
        el.draggable = true;
        el.ondragstart = (e) => window.handleDragStart(e, item.uuid);
        el.onmousemove = (e) => handleTooltipShow(e, item);
        el.onmouseleave = handleTooltipHide;
    } else {
        el.innerText = label;
        el.style.borderColor = '#444';
        el.style.color = '#666';
        el.draggable = false;
    }
}

// --- HUD (PoE Style Orbs) ---

export function updateHudDisplay() {
    const engineState = window.engineState;
    if (!engineState) return;

    // 1. HP Orb (Height)
    const hpFill = document.getElementById('hp-orb-fill');
    const hpText = document.getElementById('hp-text');
    if (hpFill) {
        const maxHP = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
        const pct = Math.max(0, Math.min(100, (engineState.baseIntegrity / maxHP) * 100));
        hpFill.style.height = `${pct}%`;
        hpText.innerText = `${Math.floor(engineState.baseIntegrity)}`;
    }

    // 2. XP Bar (Width)
    const xpFill = document.getElementById('xp-bar-fill');
    if (xpFill) {
        const next = engineState.calculateNextLevelXp();
        const pct = (engineState.experiencePoints / next) * 100;
        xpFill.style.width = `${pct}%`;
    }

    // 3. Wave Progress
    const waveFill = document.getElementById('wave-bar-fill');
    const waveInfo = document.getElementById('wave-info');
    if (waveFill && waveInfo) {
        if (engineState.isBossWave) {
            waveFill.style.width = "100%";
            waveFill.style.backgroundColor = "#e74c3c";
            waveInfo.innerText = "⚠ BOSS BATTLE";
            waveInfo.style.borderColor = "#e74c3c";
            waveInfo.style.color = "#e74c3c";
        } else {
            const pct = Math.min(100, (engineState.waveProgress / engineState.waveQuota) * 100);
            waveFill.style.width = `${pct}%`;
            waveFill.style.backgroundColor = "#f1c40f";
            waveInfo.innerText = `WAVE ${engineState.currentWaveNumber}`;
            waveInfo.style.borderColor = "#f1c40f";
            waveInfo.style.color = "#f1c40f";
        }
    }

    // 4. Energy Orb (Height)
    const enFill = document.getElementById('energy-orb-fill');
    const enText = document.getElementById('energy-text');
    if (enFill) {
        const pct = (engineState.energy / engineState.maxEnergy) * 100;
        enFill.style.height = `${pct}%`;
        enText.innerText = `${Math.floor(engineState.energy)}`;
    }

    // 5. Text Stats
    const goldDisp = document.getElementById('gold-display');
    const spDisp = document.getElementById('sp-display');
    if (goldDisp) goldDisp.innerText = engineState.gold;
    if (spDisp) spDisp.innerText = engineState.skillPoints;

    const statsText = document.getElementById('game-stats');
    if (statsText) statsText.innerText = `LV: ${engineState.currentLevel}`;
}

// --- Level Up Options (Vampire Survivors Style) ---

window.showLevelUpOptions = function() {
    const engineState = window.engineState;
    const modal = document.getElementById('upgrade-selection-modal');
    const container = document.getElementById('upgrade-options-container');
    if (!modal || !container) return;

    engineState.isPaused = true;
    modal.classList.remove('hidden');
    container.innerHTML = '';

    // Generate 3 Random Options
    // Options: [Heal], [Gold], [Stat Boost], [New Item(Random Gem)]
    const options = [];

    // 1. Guaranteed: Random Stat Boost
    const statTypes = [
        { id: 'dmg', name: '攻撃力アップ', desc: '全ダメージ +10%', apply: () => engineState.stats.damage_pct += 0.1, icon: '⚔️' },
        { id: 'spd', name: '攻撃速度アップ', desc: '攻撃速度 +10%', apply: () => engineState.stats.rate_pct += 0.1, icon: '⚡' },
        { id: 'hp', name: '最大HPアップ', desc: '最大HP +200', apply: () => { engineState.stats.hp_max += 200; engineState.baseIntegrity += 200; }, icon: '❤️' },
        { id: 'crit', name: 'クリティカル率', desc: 'クリティカル率 +5%', apply: () => engineState.stats.crit_chance += 0.05, icon: '🎯' }
    ];
    const statOpt = statTypes[Math.floor(Math.random() * statTypes.length)];
    options.push({
        name: statOpt.name,
        desc: statOpt.desc,
        icon: statOpt.icon,
        isRare: false,
        action: () => {
            statOpt.apply();
            engineState.skillPoints--; // Cost 1 SP
        }
    });

    // 2. Consumable or Resource
    options.push({
        name: '緊急補給',
        desc: 'HPを50%回復し、500ゴールド獲得',
        icon: '📦',
        isRare: false,
        action: () => {
            const max = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
            engineState.baseIntegrity = Math.min(max, engineState.baseIntegrity + (max * 0.5));
            engineState.gold += 500;
            engineState.skillPoints--;
        }
    });

    // 3. Random Gem (New Weapon)
    const allGems = Object.values(GEMS);
    const randomGem = allGems[Math.floor(Math.random() * allGems.length)];
    options.push({
        name: `新装備: ${randomGem.name}`,
        desc: `インベントリに「${randomGem.name}」を追加`,
        icon: '💎',
        isRare: true,
        action: () => {
            engineState.addItemToInventory(randomGem);
            engineState.skillPoints--;
        }
    });

    // Render Cards
    options.forEach(opt => {
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
            if (engineState.skillPoints > 0) {
                opt.action();
                updateHudDisplay();
                // Close
                modal.classList.add('hidden');
                engineState.isPaused = false;
            } else {
                alert("スキルポイント(SP)が足りません！");
            }
        };
        container.appendChild(card);
    });
};

// --- Common Menu Logic ---

window.toggleMenu = function(menuId) {
    const engineState = window.engineState;
    if (!engineState) return;
    const menus = ['dock-modal', 'logic-modal', 'skill-tree-modal', 'shop-modal'];
    const target = document.getElementById(menuId);
    
    if (menuId === 'skill-tree-modal' && target.classList.contains('hidden')) window.renderSkillTree();
    if (menuId === 'shop-modal' && target.classList.contains('hidden')) refreshShopInterface();

    menus.forEach(id => {
        if (id !== menuId) document.getElementById(id).classList.add('hidden');
    });

    if (target.classList.contains('hidden')) {
        target.classList.remove('hidden');
        engineState.isPaused = true;
        refreshInventoryInterface();
    } else {
        target.classList.add('hidden');
        engineState.isPaused = false;
    }
};

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
};