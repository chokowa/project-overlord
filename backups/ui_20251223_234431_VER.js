/**
 * @fileoverview UIコンポーネント、DOM操作、描画ロジック
 * 憲法準拠: 1文字変数禁止、型ヒント必須。
 * 更新: スマートレベルアップ提案、スキルツリーラベル対応、Export修正、アーティファクト対応
 */
import { GAME_SETTINGS, SKILL_TREE_NODES, GEM_TYPES, SHOP_ITEMS, GEMS, ARTIFACT_TYPES, BOSS_ARTIFACTS, CREW_DATA, EFFECT_CONSTANTS, ENEMY_TIERS } from './constants.js';
import { audioManager } from './audio-manager.js';

// --- UI Queue System (Conflict Resolver) ---
const uiQueue = [];

function isModalOpen() {
    const modal = document.getElementById('upgrade-selection-modal');
    return modal && !modal.classList.contains('hidden');
}

function processNextUiTask() {
    if (uiQueue.length > 0) {
        // 次のタスクを取り出して実行 (fromQueueフラグを立てる)
        const nextTask = uiQueue.shift();
        setTimeout(() => nextTask(true), 10); 
        return true; 
    }
    return false; 
}

// --- Tooltip System ---
const tooltipContainer = document.getElementById('ui-tooltip') || document.createElement('div');
if (!tooltipContainer.id) {
    tooltipContainer.id = 'ui-tooltip';
    Object.assign(tooltipContainer.style, {
        position: 'fixed', display: 'none', pointerEvents: 'none', zIndex: '9999', // Increased z-index
        backgroundColor: 'rgba(20, 20, 30, 0.95)', border: '1px solid #7f8c8d',
        padding: '8px 12px', borderRadius: '4px', color: '#ecf0f1',
        fontFamily: "'Hiragino Kaku Gothic Pro', sans-serif", fontSize: '12px', lineHeight: '1.4',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', whiteSpace: 'pre-wrap'
    });
    document.body.appendChild(tooltipContainer);
}

/**
 * ツールチップの内容を生成 (日本語化)
 * サポートGEMの場合はレベルに応じた具体的な数値を算出する
 */
export function getTooltipContent(item) {
    if (!item) return '';
    let html = `<div style="font-weight:bold; color:${item.color || '#fff'}">${item.name}</div>`;
    if (item.level) html += `<div style="font-size:10px; color:#aaa">Lv.${item.level}</div>`;

    // アイコンの表示
    let displayIcon = item.icon;
    if (!displayIcon && (item.type === GEM_TYPES.ACTIVE || item.type === GEM_TYPES.SUPPORT)) {
        displayIcon = (item.type === GEM_TYPES.ACTIVE) ? '⚔️' : '💠';
    }

    if (displayIcon) html += `<div style="font-size:24px; text-align:center; margin:4px 0;">${displayIcon}</div>`;

    // サポートGEM用の動的説明生成
    if (item.type === GEM_TYPES.SUPPORT) {
        // game.jsのロジックに基づき、Lv1以降、1レベルごとに10%のボーナスを加算
        const levelBonusMultiplier = 1 + (item.level - 1) * 0.1;
        let dynamicDescription = "";

        if (item.id === 'multishot') {
            const totalProjectiles = 1 + (item.projectiles || 1) + (item.level - 1);
            const damagePenalty = (item.damage_mod * levelBonusMultiplier).toFixed(2);
            dynamicDescription = `拡散射撃: 弾数 ${totalProjectiles}<br>1発あたりの威力 x${damagePenalty}`;
        } else if (item.id === 'power') {
            const damageBoost = (item.damage_mod * levelBonusMultiplier).toFixed(2);
            dynamicDescription = `威力強化: 全ダメージ x${damageBoost}`;
        } else if (item.id === 'speed') {
            const speedBoost = (item.speed_mod * levelBonusMultiplier).toFixed(2);
            const rateMod = (item.rate_mod / levelBonusMultiplier).toFixed(2);
            dynamicDescription = `高速化: 弾速 x${speedBoost}<br>連射間隔 x${rateMod}`;
        } else if (item.id === 'pierce') {
            const pierceCount = item.pierce_count + (item.level - 1);
            const damagePenalty = (item.damage_mod * levelBonusMultiplier).toFixed(2);
            dynamicDescription = `貫通: 最大 ${pierceCount}体貫通<br>ダメージ倍率 x${damagePenalty}`;
        } else if (item.id === 'chain') {
            const chainCount = item.chain_count + (item.level - 1);
            const damagePenalty = (item.damage_mod * levelBonusMultiplier).toFixed(2);
            dynamicDescription = `連鎖: 最大 ${chainCount}回連鎖<br>ダメージ倍率 x${damagePenalty}`;
        } else if (item.id === 'omega_prism') {
            const allBoost = (item.damage_mod * levelBonusMultiplier).toFixed(2);
            dynamicDescription = `全性能強化: 全てのステータス x${allBoost}`;
        }

        html += `<div style="margin-top:4px; color:#66fcf1; font-size:11px; line-height:1.2;">${dynamicDescription}</div>`;
    } else {
        html += `<div style="margin-top:4px;">${item.description || item.desc || ''}</div>`;
    }

    // Stats (Active Gems等)
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
    // 既存の非表示タイマーがあれば解除する
    if (window.tooltipHideTimer) {
        clearTimeout(window.tooltipHideTimer);
        window.tooltipHideTimer = null;
    }
    tooltipContainer.innerHTML = getTooltipContent(item);
    tooltipContainer.style.display = 'block';
    moveTooltip(ev);
}
window.showTooltip = showTooltip;

export function moveTooltip(ev) {
    const offset = 15;
    // Handle Touch Event
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;

    let left = clientX + offset;
    let top = clientY + offset;
    
    // 画面端の調整
    if (left + 200 > window.innerWidth) left = clientX - 210;
    if (top + 100 > window.innerHeight) top = clientY - 110;

    tooltipContainer.style.left = `${left}px`;
    tooltipContainer.style.top = `${top}px`;
}
window.moveTooltip = moveTooltip;

export function hideTooltip() {
    // 既にタイマーが動いている場合は重ねない
    if (window.tooltipHideTimer) clearTimeout(window.tooltipHideTimer);

    // 0.5秒後に非表示にする
    window.tooltipHideTimer = setTimeout(() => {
        tooltipContainer.style.display = 'none';
        window.tooltipHideTimer = null;
    }, 500);
}
window.hideTooltip = hideTooltip;

/**
 * 簡易トースト通知を表示 (UI最前面)
 */
export function showToast(message, color = "#fff") {
    const toast = document.createElement('div');
    toast.innerText = message;
    Object.assign(toast.style, {
        position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.9)', color: color, padding: '8px 16px',
        borderRadius: '20px', border: `1px solid ${color}`, zIndex: '10000',
        fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)', transition: 'all 0.3s ease-out',
        opacity: '0', marginTop: '10px'
    });
    document.body.appendChild(toast);
    
    // Animation frame
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.marginTop = '0px';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.marginTop = '-10px';
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}
window.showToast = showToast;

// --- HUD & Interfaces ---

export function updateHudDisplay() {
    const engineState = window.engineState;
    if (!engineState) return;

    // HP Bar
    const maxHp = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
    const hpPct = Math.max(0, (engineState.baseIntegrity / maxHp) * 100);
    const hpBar = document.getElementById('hp-orb-fill'); 
    const hpText = document.getElementById('hp-text');    
    if (hpBar) hpBar.style.height = `${hpPct}%`;          
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

    // モーダルヘッダー内の情報（SP/Gold）を同期
    const treeSpInfo = document.getElementById('tree-sp-info');
    if (treeSpInfo) treeSpInfo.innerText = `SP: ${engineState.skillPoints}`;

    const shopGoldInfo = document.getElementById('shop-gold-info');
    if (shopGoldInfo) shopGoldInfo.innerText = `💰 ${engineState.gold}`;

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

    // Quick Buy Buttons State Update
    const quickItems = [
        { id: 'qbtn-repair', cost: SHOP_ITEMS.REPAIR.cost },
        { id: 'qbtn-drone_col', cost: SHOP_ITEMS.DRONE_COL.cost },
        { id: 'qbtn-drone_atk', cost: SHOP_ITEMS.DRONE_ATK.cost },
        { id: 'qbtn-clone', cost: SHOP_ITEMS.CLONE.cost }
    ];
    quickItems.forEach(q => {
        const btn = document.getElementById(q.id);
        if (btn) {
            if (engineState.gold < q.cost) btn.classList.add('disabled');
            else btn.classList.remove('disabled');
        }
    });

    updateCrewHud();
}
window.updateHudDisplay = updateHudDisplay;

export function updateMainScreenLoadout() {
    // Placeholder required by game.js imports
}
window.updateMainScreenLoadout = updateMainScreenLoadout;

export function updateArtifactHud() {
    const container = document.getElementById('artifact-hud');
    if (!container) return;

    // 状態が変わっていない場合は再構築しない (イベントリスナー維持のため)
    const artifactCount = window.engineState.artifacts.length;
    if (container.dataset.lastCount === artifactCount.toString()) return;
    container.dataset.lastCount = artifactCount.toString();

    container.innerHTML = '';

    window.engineState.artifacts.forEach(art => {
        const icon = document.createElement('div');
        // pointer-events: none for inner content to prevent flickering
        icon.innerHTML = `<div style="pointer-events:none;">${art.icon}</div>`;
        icon.style.cssText = `width:32px; height:32px; background:rgba(0,0,0,0.6); border:1px solid ${art.color}; border-radius:4px; text-align:center; line-height:30px; font-size:18px; cursor:help; display:flex; align-items:center; justify-content:center;`;

        icon.onmouseenter = (e) => window.showTooltip(e, art);
        icon.onmousemove = (e) => window.moveTooltip(e); // Added move handler
        icon.onmouseleave = window.hideTooltip;

        // Touch support: Toggle tooltip on tap
        icon.ontouchstart = (e) => {
            e.preventDefault();
            window.showTooltip(e.touches[0], art);
        };
        icon.ontouchend = window.hideTooltip;
        icon.ontouchcancel = window.hideTooltip;

        container.appendChild(icon);
    });
}
window.updateArtifactHud = updateArtifactHud;

export function updateCrewHud() {
    const engineState = window.engineState;
    if (!engineState || !engineState.selectedCrew || engineState.selectedCrew.length === 0) return;

    let container = document.getElementById('crew-hud');
    if (!container) {
        container = document.createElement('div');
        container.id = 'crew-hud';
        container.style.cssText = "position:absolute; bottom:200px; right:10px; display:flex; flex-direction:column; gap:10px; z-index:45;";
        document.getElementById('device-frame').appendChild(container);
    }

    // クルーの状態（CD、活性化、表情）を文字列化して比較
    const currentStatus = engineState.selectedCrew.map(id => {
        const cd = Math.ceil((engineState.crewCooldowns[id] || 0) / 60);
        const active = (engineState.crewActiveBuffs[id] || 0) > 0 ? '1' : '0';
        return `${id}-${cd}-${active}-${engineState.crewStatusSuffix}`;
    }).join('|');

    // 状態に変更がないならDOMをいじらない
    if (container.dataset.lastStatus === currentStatus) return;
    container.dataset.lastStatus = currentStatus;

    container.innerHTML = '';

    engineState.selectedCrew.forEach(crewId => {
        const crew = CREW_DATA[crewId];
        if (!crew) return;

        // Cooldown Logic
        const currentCd = engineState.crewCooldowns[crewId] || 0;
        const maxCd = crew.ability ? crew.ability.cd : 1;
        const isReady = currentCd <= 0;

        // Active Buff Logic
        const isActive = (engineState.crewActiveBuffs[crewId] || 0) > 0;

        const wrapper = document.createElement('div');
        const borderColor = isActive ? '#00d2d3' : (engineState.isBossWave ? '#e74c3c' : '#444');
        const shadow = isActive ? '0 0 15px #00d2d3' : (engineState.isBossWave ? '0 0 15px red' : '0 0 5px #000');

        wrapper.style.cssText = `
            width: 48px; height: 48px; 
            background: #000; 
            border: 2px solid ${borderColor}; 
            border-radius: 4px; 
            overflow: hidden; 
            position: relative;
            box-shadow: ${shadow};
            transition: all 0.2s;
            cursor: ${isReady ? 'pointer' : 'default'};
            pointer-events: auto;
        `;

        // Activate (pointerdown: click/touchを統一して確実に拾う)
        wrapper.style.touchAction = 'manipulation';
        wrapper.onpointerdown = (e) => {
            // canvas等の背面がイベントを取るケースを潰す
            e.preventDefault();
            e.stopPropagation();

            if (isReady) {
                engineState.activateCrewAbility(crewId);
            } else {
                window.showToast("リチャージ中...", "#7f8c8d");
            }
        };

        const imgSrc = `${crew.imgBase}${engineState.crewStatusSuffix}.png`;
        const img = document.createElement('img');
        img.src = imgSrc;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.imageRendering = 'pixelated';
        img.style.pointerEvents = 'none';

        if (engineState.crewStatusSuffix === 'c') img.style.animation = 'pulse 1s infinite';
        if (engineState.crewStatusSuffix === 'b') wrapper.style.transform = `translate(${(Math.random()-0.5)*5}px, ${(Math.random()-0.5)*5}px)`;

        wrapper.appendChild(img);

        // Cooldown Overlay (Dark mask)
        if (!isReady) {
            const cdOverlay = document.createElement('div');
            const pct = (currentCd / maxCd) * 100;
            cdOverlay.style.cssText = `
                position: absolute; bottom: 0; left: 0; width: 100%; 
                height: ${pct}%; 
                background: rgba(0,0,0,0.7);
                pointer-events: none;
                transition: height 0.1s linear;
            `;
            wrapper.appendChild(cdOverlay);

            // Timer Text (if long)
            if (currentCd > 60) {
                const timer = document.createElement('div');
                timer.innerText = Math.ceil(currentCd / 60);
                timer.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:14px; font-weight:bold; text-shadow:0 0 2px #000;";
                wrapper.appendChild(timer);
            }
        }

        // Active Duration Overlay (Green ring or similar)
        if (isActive) {
             const buffOverlay = document.createElement('div');
             buffOverlay.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; border:2px solid rgba(0,210,211,0.5); box-sizing:border-box; animation: pulse 0.5s infinite alternate;";
             wrapper.appendChild(buffOverlay);
        }

        // Tooltip
        const abilityInfo = crew.ability ? `\n[Skill] ${crew.ability.name}\n${crew.ability.desc}` : '';
        const tooltipData = { name: crew.name, desc: crew.job + abilityInfo, color: isReady ? '#fff' : '#aaa' };

        wrapper.onmouseenter = (e) => window.showTooltip(e, tooltipData);
        wrapper.onmousemove = (e) => window.moveTooltip(e);
        wrapper.onmouseleave = window.hideTooltip;

        // Mobile touch support
        wrapper.ontouchstart = (e) => {
            // pointerdownとイベントが重複しないよう注意が必要な場合があるが、ここでは表示のみ
            window.showTooltip(e.touches[0], tooltipData);
        };
        wrapper.ontouchend = window.hideTooltip;
        wrapper.ontouchcancel = window.hideTooltip;

        container.appendChild(wrapper);
    });
}
window.updateCrewHud = updateCrewHud;

export function showCrewSelection(onComplete) {
    const modal = document.getElementById('upgrade-selection-modal');
    const container = document.getElementById('upgrade-options-container');
    const titleEl = modal.querySelector('h2');

    if (!modal || !container) return;

    // フッターボタン（あとで決める）を非表示
    const footerBtn = document.getElementById('btn-upgrade-close');
    if (footerBtn) footerBtn.style.display = 'none';

    modal.classList.remove('hidden');
    if (titleEl) titleEl.innerText = "作戦準備：クルー選抜";
    container.innerHTML = '';
    container.style.flexDirection = 'column'; // Vertical stack
    container.style.alignItems = 'center';

    // 選択状態
    let selectedCrewIds = [];
    let selectedGemId = 'fireball'; // Default

    // --- 1. 初期装備選択エリア ---
    const gemSection = document.createElement('div');
    gemSection.style.width = '100%';
    gemSection.innerHTML = '<div style="color:#00d2d3; font-weight:bold; margin-bottom:5px; text-align:center;">初期ウェポン選択</div>';

    const gemOptions = document.createElement('div');
    gemOptions.style.display = 'flex';
    gemOptions.style.gap = '10px';
    gemOptions.style.justifyContent = 'center';
    gemOptions.style.marginBottom = '15px';

    // 選択可能な初期GEM（使いやすいものを選抜: 火球、矢、電気）
    const targetIds = ['fireball', 'arrow', 'electric']; 
    const availableGems = targetIds.map(id => Object.values(GEMS).find(g => g.id === id)).filter(g => g);

    availableGems.forEach(gem => {
        const el = document.createElement('div');
        el.className = 'upgrade-card';
        el.style.width = '70px';
        el.style.flexDirection = 'column';
        el.style.padding = '8px';
        el.style.border = gem.id === selectedGemId ? '2px solid #f1c40f' : '1px solid #555';
        el.style.background = gem.id === selectedGemId ? 'rgba(241, 196, 15, 0.2)' : 'rgba(0,0,0,0.5)';
        el.innerHTML = `<div style="font-size:20px; margin-bottom:4px;">⚔️</div><div style="font-size:10px; text-align:center;">${gem.name}</div>`;
        el.onclick = () => {
            selectedGemId = gem.id;
            Array.from(gemOptions.children).forEach(c => {
                c.style.border = '1px solid #555';
                c.style.background = 'rgba(0,0,0,0.5)';
            });
            el.style.border = '2px solid #f1c40f';
            el.style.background = 'rgba(241, 196, 15, 0.2)';
        };
        gemOptions.appendChild(el);
    });
    gemSection.appendChild(gemOptions);
    container.appendChild(gemSection);

    // --- 2. クルー選択エリア ---
    const crewSection = document.createElement('div');
    crewSection.style.width = '100%';
    crewSection.innerHTML = '<div style="color:#e74c3c; font-weight:bold; margin-bottom:5px; text-align:center;">クルー選択 (2名)</div>';

    const crewGrid = document.createElement('div');
    crewGrid.style.display = 'grid';
    crewGrid.style.gridTemplateColumns = '1fr 1fr';
    crewGrid.style.gap = '8px';
    crewGrid.style.width = '100%';

    Object.values(CREW_DATA).forEach(crew => {
        const el = document.createElement('div');
        el.className = 'upgrade-card';
        el.style.padding = '5px';
        el.style.alignItems = 'center';
        el.style.gap = '8px';
        el.style.cursor = 'pointer';

        // Render content
        const render = () => {
            const isSelected = selectedCrewIds.includes(crew.id);
            el.style.borderColor = isSelected ? '#f1c40f' : '#555';
            el.style.background = isSelected ? 'rgba(231, 76, 60, 0.3)' : 'rgba(0,0,0,0.5)';
            el.innerHTML = `
                <img src="${crew.imgBase}a.png" style="width:36px; height:36px; border-radius:4px; image-rendering:pixelated; border:1px solid #777;">
                <div style="flex:1;">
                    <div style="font-size:11px; font-weight:bold; color:${isSelected ? '#f1c40f' : '#fff'};">${crew.name}</div>
                    <div style="font-size:8px; color:#ccc;">${crew.desc}</div>
                </div>
            `;
        };
        render();

        el.onclick = () => {
            if (selectedCrewIds.includes(crew.id)) {
                selectedCrewIds = selectedCrewIds.filter(id => id !== crew.id);
            } else {
                if (selectedCrewIds.length < 2) {
                    selectedCrewIds.push(crew.id);
                }
            }
            // Re-render all to update styles (simple enough)
            Array.from(crewGrid.children).forEach((child, idx) => {
                // Warning: This depends on order matching. 
                // Better to just update styles here or re-render logical state.
                // For simplicity, we just toggle this element's style logic via closure
            });
            // Re-render *all* because we need to reflect selection limit? 
            // Actually just re-rendering this one and updating the button is enough.
            render();
            updateStartBtn();
        };
        crewGrid.appendChild(el);
    });
    crewSection.appendChild(crewGrid);
    container.appendChild(crewSection);

    // --- 3. 開始ボタン ---
    const btnArea = document.createElement('div');
    btnArea.style.width = '100%';
    btnArea.style.marginTop = '15px';

    const startBtn = document.createElement('button');
    startBtn.className = 'upgrade-btn';
    startBtn.style.width = '100%';
    startBtn.style.fontWeight = 'bold';
    startBtn.style.fontSize = '16px';
    startBtn.style.padding = '12px';
    startBtn.innerText = "出撃不可 (クルーを2名選択)";
    startBtn.disabled = true;
    startBtn.style.opacity = 0.5;

    startBtn.onclick = () => {
        const startGem = availableGems.find(g => g.id === selectedGemId) || GEMS.FIREBALL;
        modal.classList.add('hidden');
        onComplete(selectedCrewIds, startGem);
    };

    btnArea.appendChild(startBtn);
    container.appendChild(btnArea);

    function updateStartBtn() {
        if (selectedCrewIds.length === 2) {
            startBtn.disabled = false;
            startBtn.style.opacity = 1;
            startBtn.style.background = '#e74c3c';
            startBtn.style.color = '#fff';
            startBtn.innerText = "MISSION START";
        } else {
            startBtn.disabled = true;
            startBtn.style.opacity = 0.5;
            startBtn.style.background = '#333';
            startBtn.innerText = `クルーを選択 (${selectedCrewIds.length}/2)`;
        }
    }
}
window.showCrewSelection = showCrewSelection;

let selectedItemUuid = null; // Global state for tap interaction

export function refreshInventoryInterface() {
    // 画面更新時はツールチップを確実に消す
    if (window.hideTooltip) window.hideTooltip();

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
                } else if (type === 'SELL') {
                    engineState.sellItem(selectedItemUuid);
                    selectedItemUuid = null;
                }
            }
            refreshInventoryInterface();
            return;
        }

        // Case 2: No Selection -> Select Item or Show Menu
        if (uuid) {
            audioManager.play('CLICK');
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
            el.ondragend = (e) => window.handleDragEnd(e);
            el.onclick = (e) => handleSlotClick(e, item.uuid, 'SLOT', dropTargetId);
            
            // Hover Tooltip
            el.onmouseenter = (e) => window.showTooltip(e, item);
            el.onmousemove = (e) => window.moveTooltip(e);
            el.onmouseleave = () => window.hideTooltip();
        } else {
            el.innerText = label;
            if (typeHint === 'ACTIVE') el.style.borderColor = '#c0392b';
            else if (typeHint === 'SUPPORT') el.style.borderColor = '#27ae60';
            else el.style.borderColor = '#444';
            
            el.onclick = (e) => handleSlotClick(e, null, 'SLOT', dropTargetId);
        }

        el.ondragover = window.allowDrop;
        el.ondrop = (e) => window.handleDrop(e, 'SLOT', dropTargetId);
        
        return el;
    };

    // [UI Patch] Sticky Loadout Header Container
    // 装備エリアを固定表示にし、スクロール時も常にドロップ先が見えるようにする
    const stickyHeader = document.createElement('div');
    stickyHeader.style.cssText = `
        position: sticky; top: -10px; z-index: 100;
        background: #0b0c10;
        margin: -10px -10px 10px -10px; padding: 10px 10px 5px 10px;
        border-bottom: 2px solid #45a29e;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;

    // --- 0. Crew Info ---
    if (engineState.selectedCrew && engineState.selectedCrew.length > 0) {
        const crewHeader = document.createElement('div');
        crewHeader.className = 'inv-section-header';
        crewHeader.innerText = "CREW (編成)";
        stickyHeader.appendChild(crewHeader);

        const crewRow = document.createElement('div');
        crewRow.style.cssText = "display:flex; gap:6px; margin-bottom:5px;";

        engineState.selectedCrew.forEach(crewId => {
            const crew = CREW_DATA[crewId];
            if (!crew) return;
            const el = document.createElement('div');
            el.style.cssText = "flex:1; display:flex; gap:4px; align-items:center; background:rgba(255,255,255,0.05); padding:4px; border:1px solid #555; border-radius:4px;";
            el.innerHTML = `
                <img src="${crew.imgBase}a.png" style="width:24px; height:24px; border-radius:4px; image-rendering:pixelated; border:1px solid #777; flex-shrink:0;">
                <div style="flex:1; overflow:hidden;">
                    <div style="font-size:10px; font-weight:bold; color:#f1c40f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${crew.name}</div>
                </div>
            `;
            crewRow.appendChild(el);
        });
        stickyHeader.appendChild(crewRow);
    }

    // --- 1. Main Loadout (Set 1) ---
    const mainRow = document.createElement('div');
    mainRow.className = 'loadout-row';
    mainRow.innerHTML = `<div class="loadout-label">MAIN<br><span style="color:#00d2d3">ACTIVE</span></div>`;
    engineState.equippedGems.forEach((g, i) => {
        const label = i === 0 ? "スキル" : "サポ";
        const type = i === 0 ? "ACTIVE" : "SUPPORT";
        mainRow.appendChild(createSlot(`main-slot-${i}`, g, label, type, `MAIN_${i}`));
    });
    stickyHeader.appendChild(mainRow);

    // --- 2. Sub Loadout (Set 2) ---
    const subRow = document.createElement('div');
    subRow.className = 'loadout-row';
    subRow.innerHTML = `<div class="loadout-label">SUB<br><span style="color:#f39c12">50%</span></div>`;
    engineState.altGems.forEach((g, i) => {
        const label = i === 0 ? "スキル" : "サポ";
        const type = i === 0 ? "ACTIVE" : "SUPPORT";
        subRow.appendChild(createSlot(`sub-slot-${i}`, g, label, type, `SUB_${i}`));
    });
    stickyHeader.appendChild(subRow);

    // --- 3. Accessories ---
    const accRow = document.createElement('div');
    accRow.className = 'acc-row';
    accRow.style.margin = "5px 0"; // Reduce margin
    accRow.appendChild(createSlot('slot-ring', engineState.equippedArtifacts.RING, "指輪", "RING", "RING"));
    accRow.appendChild(createSlot('slot-amulet', engineState.equippedArtifacts.AMULET, "首飾り", "AMULET", "AMULET"));
    stickyHeader.appendChild(accRow);

    // Append sticky header to container
    container.appendChild(stickyHeader);

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
    // [UI Patch] Increase columns to 6 for smaller items
    invGrid.style.gridTemplateColumns = "repeat(6, 1fr)";
    invGrid.style.gap = "4px";

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
        
        // Background Tint & Border based on Type Category
        if (item.type === 'ACTIVE') {
             slot.style.background = "rgba(192, 57, 43, 0.2)";
             slot.style.borderColor = "#c0392b"; 
        }
        else if (item.type === 'SUPPORT') {
             slot.style.background = "rgba(39, 174, 96, 0.2)";
             slot.style.borderColor = "#27ae60";
        }
        else if (item.type === 'RING') {
             slot.style.background = "rgba(41, 128, 185, 0.2)";
             slot.style.borderColor = "#2980b9";
        }
        else if (item.type === 'AMULET') {
             slot.style.background = "rgba(142, 68, 173, 0.2)";
             slot.style.borderColor = "#8e44ad";
        }
        else {
             slot.style.borderColor = item.color;
        }
        
        // Icon Logic
        let icon = '?';
        if (item.type === 'ACTIVE') icon = '⚔️'; 
        else if (item.type === 'SUPPORT') icon = '💠';
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
        slot.ondragend = (e) => window.handleDragEnd(e);
        slot.onclick = (e) => handleSlotClick(e, item.uuid, 'INVENTORY');

        invGrid.appendChild(slot);
    });
    container.appendChild(invGrid);

    // --- 5. Conversion Areas (XP & Sell) ---
    const convertContainer = document.createElement('div');
    convertContainer.style.cssText = "margin-top:15px; display:flex; gap:10px;";

    // XP Convert
    const salvage = document.createElement('div');
    salvage.id = 'salvage-area';
    salvage.style.cssText = "flex:1; border:2px dashed #00d2d3; color:#00d2d3; padding:10px; text-align:center; font-size:12px; cursor:pointer; border-radius:4px;";
    salvage.innerHTML = "XP変換<br>(タップ/ドロップ)";
    salvage.ondragover = window.allowDrop;
    salvage.ondrop = (e) => window.handleDrop(e, 'SALVAGE');
    salvage.onclick = (e) => handleSlotClick(e, null, 'SALVAGE');
    
    // Sell
    const sell = document.createElement('div');
    sell.id = 'sell-area';
    sell.style.cssText = "flex:1; border:2px dashed #f1c40f; color:#f1c40f; padding:10px; text-align:center; font-size:12px; cursor:pointer; border-radius:4px;";
    sell.innerHTML = "売却 (Gold)<br>(タップ/ドロップ)";
    sell.ondragover = window.allowDrop;
    sell.ondrop = (e) => window.handleDrop(e, 'SELL');
    sell.onclick = (e) => handleSlotClick(e, null, 'SELL');

    convertContainer.appendChild(salvage);
    convertContainer.appendChild(sell);
    container.appendChild(convertContainer);

    // --- 6. Boss Artifacts List ---
    if (engineState.artifacts.length > 0) {
        const artHeader = document.createElement('div');
        artHeader.className = 'inv-section-header';
        artHeader.innerText = "所持アーティファクト";
        container.appendChild(artHeader);

        const artGrid = document.createElement('div');
        artGrid.style.cssText = "display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;";
        
        engineState.artifacts.forEach((art, idx) => {
            const el = document.createElement('div');
            el.style.cssText = `width:40px; height:40px; border:1px solid ${art.color}; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; font-size:20px; cursor:pointer; position:relative;`;
            el.innerHTML = art.icon;
            
            // Delete button on hover/tap
            const delBtn = document.createElement('div');
            delBtn.innerText = "×";
            delBtn.style.cssText = "position:absolute; top:-5px; right:-5px; background:red; color:white; width:15px; height:15px; border-radius:50%; font-size:10px; line-height:15px; text-align:center; display:none;";
            el.appendChild(delBtn);

            el.onmouseenter = (e) => {
                delBtn.style.display = "block";
                window.showTooltip(e, art);
            };
            el.onmouseleave = () => {
                delBtn.style.display = "none";
                window.hideTooltip();
            };
            
            // Touch support for delete
            el.onclick = (e) => {
                if (confirm(`「${art.name}」を破棄しますか？`)) {
                    engineState.artifacts.splice(idx, 1);
                    engineState.recalcStats();
                    window.refreshInventoryInterface();
                    window.updateArtifactHud();
                }
            };

            artGrid.appendChild(el);
        });
        container.appendChild(artGrid);
    }
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

        let icon = item.icon;
        if (isGem) {
            icon = (item.type === GEM_TYPES.ACTIVE) ? '⚔️' : '💠';
        }

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
        // アクティブGEMおよびサポートGEMの両方をショップのラインナップに表示
        createCard(gem, true);
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
        const isMaxed = rank >= max;

        // Base Classes
        let className = 'tree-node '; 
        if (node.type === 'START') className += 'node-start';
        else if (node.type === 'KEYSTONE') className += 'node-keystone';
        else if (node.type === 'MEDIUM') className += 'node-medium';
        if (isAllocated) className += ' allocated';

        el.className = className;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        // Reset default border/bg to handle custom progress ring
        el.style.border = 'none';
        el.style.background = 'transparent';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';

        // 1. Progress Ring (Background)
        const progressEl = document.createElement('div');
        const percent = (rank / max) * 100;
        // Color: Max=Cyan, Allocated=Gold, Locked=Gray
        let progressColor = isMaxed ? '#00d2d3' : (isAllocated ? '#f1c40f' : '#444'); 
        if (rank === 0) progressColor = '#555'; 

        // Keystone(45deg) needs rotation fix for gradient start
        const startAngle = node.type === 'KEYSTONE' ? 'from -45deg' : 'from 0deg';

        progressEl.style.cssText = `
            position: absolute; top:0; left:0; width:100%; height:100%;
            border-radius: ${node.type === 'KEYSTONE' ? '8px' : '50%'};
            background: conic-gradient(${startAngle} at 50% 50%, ${progressColor} ${percent}%, #2c3e50 0);
            z-index: 0;
            box-shadow: ${isMaxed ? `0 0 15px ${progressColor}` : '0 0 5px rgba(0,0,0,0.5)'};
        `;
        el.appendChild(progressEl);

        // 2. Inner Content (The actual "Node" look)
        const innerEl = document.createElement('div');
        const borderW = 4; // Thickness of the progress ring
        let bg = '#222';
        if (isAllocated) {
            if (node.type === 'KEYSTONE') bg = '#c0392b';
            else if (node.type === 'MEDIUM') bg = '#6c5ce7';
            else bg = '#f1c40f';
        }

        innerEl.style.cssText = `
            position: absolute; 
            top:${borderW}px; left:${borderW}px; 
            width:calc(100% - ${borderW*2}px); height:calc(100% - ${borderW*2}px);
            background: ${bg};
            border-radius: ${node.type === 'KEYSTONE' ? '4px' : '50%'};
            z-index: 1;
            display: flex; align-items: center; justify-content: center;
        `;
        el.appendChild(innerEl);

        // Rank Badge (High Visibility)
        if (max > 1) {
            const badge = document.createElement('div');
            badge.innerText = `${rank}/${max}`;
            // Rotate back if keystone
            const transform = node.type === 'KEYSTONE' ? 'rotate(-45deg)' : '';
            // Center the badge inside the node to avoid overlapping with the label below
            badge.style.cssText = `
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%) ${transform};
                font-size: 10px; font-weight: bold; color: #fff;
                text-shadow: 0 0 3px #000, 0 0 1px #000;
                pointer-events: none; z-index: 10;
                white-space: nowrap;
            `;
            // Highlight if maxed
            if (isMaxed) {
                badge.style.color = '#00d2d3';
                badge.style.textShadow = '0 0 3px #000';
            }
            el.appendChild(badge);
        }

        // Label
        if (node.label) {
            const label = document.createElement('div');
            label.className = 'node-label';
            label.innerText = node.label;
            // Keystone label positioning fix
            if (node.type === 'KEYSTONE') {
                 label.style.transform = 'translateX(-50%) rotate(-45deg)';
                 label.style.top = '120%';
            }
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
    // Queue Check
    if (isModalOpen()) {
        uiQueue.push(showLevelUpOptions);
        return;
    }

    const engineState = window.engineState;
    const modal = document.getElementById('upgrade-selection-modal');
    const container = document.getElementById('upgrade-options-container');
    if (!modal || !container) return;

    // フッターボタン（あとで決める）を表示復帰
    const footerBtn = document.getElementById('btn-upgrade-close');
    if (footerBtn) footerBtn.style.display = 'block';

    // Set Title
    const titleEl = modal.querySelector('h2');
    if (titleEl) titleEl.innerText = "レベルアップ！";

    engineState.isPaused = true;
    modal.classList.remove('hidden');
    container.innerHTML = '';

    const options = [];
    const maxHP = GAME_SETTINGS.BASE_MAX_HP + engineState.stats.hp_max;
    const hpRatio = engineState.baseIntegrity / maxHP;

    const mainGem = engineState.equippedGems[0];
    const hasMain = !!mainGem;
    const isProjectile = hasMain && ['arrow', 'fireball', 'knife', 'shuriken'].includes(mainGem.id);
    const isAoE = hasMain && ['fireball', 'nova', 'rock', 'meteor'].includes(mainGem.id);
    const isRapid = hasMain && (mainGem.rate < 20);

    // 1. Survival
    if (hpRatio < 0.4) {
        options.push({
            name: '緊急メンテナンス',
            desc: 'HP全回復 + シールド展開',
            icon: '🚑',
            isRare: true,
            action: () => {
                engineState.baseIntegrity = maxHP;
                engineState.setShieldState(true);
            }
        });
    }

    // 2. Skill Tree
    const availableNodes = [];
    Object.values(SKILL_TREE_NODES).forEach(node => {
        const rank = engineState.allocatedNodes[node.id] || 0;
        const max = node.maxRank || 1;
        if (rank < max) {
            let connectable = (rank > 0);
            if (!connectable) {
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
                // allocateNodeはSPを消費するため、一時的にSPを付与して相殺する (レベルアップ報酬はコストフリー)
                engineState.skillPoints++;
                if (engineState.allocateNode(node.id)) {
                    window.renderSkillTree();
                    window.updateHudDisplay();
                } else {
                    engineState.skillPoints--; // 万が一失敗した場合は戻す
                }
            }
        });
    }

    // 3. Equipment
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
                }
            });
        }
    }

    // 4. Fillers
    while (options.length < 3) {
        const statTypes = [
            { 
                name: '攻撃力微増', desc: '全ダメージ +3%', icon: '⚔️',
                apply: () => {
                    engineState.bonusStats.damage_pct = (engineState.bonusStats.damage_pct || 0) + 0.03;
                    engineState.recalcStats();
                } 
            },
            { 
                name: '速度微増', desc: '攻撃速度 +3%', icon: '⚡',
                apply: () => {
                    engineState.bonusStats.rate_pct = (engineState.bonusStats.rate_pct || 0) + 0.03;
                    engineState.recalcStats();
                } 
            },
            { 
                name: '小銭', desc: '150 Gold獲得', icon: '💰',
                apply: () => engineState.gold += 150 
            }
        ];
        const statOpt = statTypes[Math.floor(Math.random() * statTypes.length)];
        options.push({
            name: statOpt.name,
            desc: statOpt.desc,
            icon: statOpt.icon,
            isRare: false,
            action: () => {
                statOpt.apply();
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
            audioManager.play('CLICK');
            // SPチェック削除: 報酬はコストフリーで受け取れる
            opt.action();

            // Check Queue: If next task exists, run it and DO NOT hide modal
            if (processNextUiTask()) {
                return;
            }

            // No tasks left, close modal
            modal.classList.add('hidden');
            engineState.isPaused = false;
        };
        container.appendChild(card);
    });
}
window.showLevelUpOptions = showLevelUpOptions;

export function showArtifactSelection(fromQueue = false) {
    if (!fromQueue && isModalOpen()) {
        uiQueue.push(showArtifactSelection);
        return;
    }

    const engineState = window.engineState;
    const modal = document.getElementById('upgrade-selection-modal');
    const container = document.getElementById('upgrade-options-container');
    if (!modal || !container) return;

    // フッターボタン（あとで決める）を非表示
    const footerBtn = document.getElementById('btn-upgrade-close');
    if (footerBtn) footerBtn.style.display = 'none';

    // Force clear & update title
    container.innerHTML = '';
    const titleEl = modal.querySelector('h2');
    if (titleEl) titleEl.innerText = "ボス撃破報酬！";

    engineState.isPaused = true;
    modal.classList.remove('hidden');

    const pool = Object.values(BOSS_ARTIFACTS).filter(a => !engineState.artifacts.some(owned => owned.id === a.id));
    const choices = [];

    for(let i=0; i<3; i++) {
        if(pool.length === 0) break;
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool[idx]);
        pool.splice(idx, 1);
    }

    if (choices.length === 0) {
        choices.push({ name: "大金貨", desc: "1000 Gold", icon: "💰", action: () => engineState.gold += 1000 });
    }

    // [Fix] 連打防止フラグ
    let selectionMade = false;

    choices.forEach(art => {
        const card = document.createElement('div');
        card.className = 'upgrade-card rare';
        card.style.borderColor = art.color || '#f1c40f';
        card.innerHTML = `
            <div class="upgrade-icon">${art.icon}</div>
            <div class="upgrade-info">
                <div class="upgrade-name" style="color:${art.color}">${art.name}</div>
                <div class="upgrade-desc">${art.desc}</div>
            </div>
        `;
        card.onclick = () => {
            audioManager.play('CLICK');
            // 既に選択済みなら無視
            if (selectionMade) return;
            selectionMade = true;

            // 全カードを無効化（視覚的フィードバック）
            const allCards = container.querySelectorAll('.upgrade-card');
            allCards.forEach(c => {
                c.style.pointerEvents = 'none';
                c.style.opacity = '0.5';
            });
            card.style.opacity = '1';
            card.style.boxShadow = `0 0 15px ${art.color || '#fff'}`;

            if (art.action) {
                art.action();
            } else {
                engineState.artifacts.push(art);
                engineState.recalcStats();
                window.updateArtifactHud();
                window.showToast(`獲得: ${art.name}`, art.color);
            }

            // 少し待ってから閉じる（選択した感を出すため）
            setTimeout(() => {
                if (processNextUiTask()) return;
                modal.classList.add('hidden');
                engineState.isPaused = false;
            }, 300);
        };
        container.appendChild(card);
    });
}
window.showArtifactSelection = showArtifactSelection;

export function closeUpgradeModal() {
    // If user explicitly closes (skips), we still check queue?
    // Usually 'skip' means they keep the SP.
    // Let's assume queue tasks should be processed even if skipped.
    if (processNextUiTask()) return;

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

    audioManager.play('CLICK');
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
    if (window.hideTooltip) window.hideTooltip(); // ドラッグ開始時に消す
    ev.dataTransfer.setData("text/plain", uuid);
    ev.dataTransfer.effectAllowed = "move";
    // opacity変更は setTimeout で遅らせないとドラッグ画像まで透明になることがある
    setTimeout(() => {
        if (ev.target) ev.target.style.opacity = '0.5';
    }, 0);
}
window.handleDragStart = handleDragStart;

export function handleDragEnd(ev) {
    if (window.hideTooltip) window.hideTooltip(); // ドラッグ終了時に消す
    if (ev.target) ev.target.style.opacity = '1.0';
}
window.handleDragEnd = handleDragEnd;

export function allowDrop(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
}
window.allowDrop = allowDrop;

export function handleDrop(ev, targetType, targetIndex) {
    ev.preventDefault();
    const uuid = ev.dataTransfer.getData("text/plain");
    
    // 全アイテムの透明度をリセット (念のため)
    const allItems = document.querySelectorAll('.inv-item, .gem-slot');
    allItems.forEach(el => el.style.opacity = '1.0');

    if (!uuid) return;
    const engineState = window.engineState;

    if (targetType === 'SLOT') engineState.equipItem(uuid, targetIndex);
    else if (targetType === 'SALVAGE') engineState.salvageItem(uuid);
    else if (targetType === 'SELL') engineState.sellItem(uuid);
    else if (targetType === 'INVENTORY') engineState.unequipByUuid(uuid);
    
    window.updateHudDisplay();
}
window.handleDrop = handleDrop;

/**
 * クルーの必殺技カットインを表示する (アーケード演出)
 * @param {number} crewId - 発動したクルーのID
 */
export function showAbilityCutIn(crewId) {
    const crewData = CREW_DATA[crewId];
    if (!crewData || !crewData.ability) return;

    const overlay = document.getElementById('cutin-overlay');
    const banner = document.getElementById('cutin-banner');
    const imageElement = document.getElementById('cutin-img');
    const crewNameElement = document.getElementById('cutin-crew-name');
    const abilityNameElement = document.getElementById('cutin-ability');

    if (!overlay || !banner || !imageElement) return;

    // 演出データのセットアップ
    imageElement.src = `${crewData.imgBase}a.png`; // 通常時の顔を使用
    crewNameElement.innerText = `${crewData.job} ${crewData.name}`;
    abilityNameElement.innerText = crewData.ability.name;

    // アニメーションのトリガー
    overlay.style.display = 'block';
    banner.classList.remove('animate-cutin');

    // 強制リフロー (アニメーションを最初から再生させるため)
    void banner.offsetWidth; 

    banner.classList.add('animate-cutin');

    // 演出終了後に非表示に戻す (CSSの1.2秒に合わせて少し長めに設定)
    setTimeout(() => {
        overlay.style.display = 'none';
        banner.classList.remove('animate-cutin');
    }, 1300);
}
window.showAbilityCutIn = showAbilityCutIn;

/**
 * ゲームクリアリザルト画面を表示する
 */
/**
 * ゲームクリアリザルト画面を表示する
 */
export function showGameClearScreen() {
    const engineState = window.engineState;
    if (!engineState) return;

    // BGMを停止
    audioManager.stopBgm();

    // 既存のリザルトがあれば削除
    const oldScreen = document.getElementById('result-screen');
    if (oldScreen) oldScreen.remove();

    // オーバーレイ作成
    const overlay = document.createElement('div');
    overlay.id = 'result-screen';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(10, 12, 16, 0.95); z-index: 9000;
        display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
        color: #fff; padding: 20px; box-sizing: border-box; overflow-y: auto;
        animation: fadeIn 1s ease-out; font-family: 'Hiragino Kaku Gothic Pro', sans-serif;
    `;

    // --- Header ---
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.innerHTML = `
        <div style="font-size: 32px; font-weight: bold; color: #f1c40f; text-shadow: 0 0 20px #f1c40f; margin-bottom: 5px;">
            MISSION COMPLETE
        </div>
        <div style="font-size: 14px; color: #aaa; margin-bottom: 20px;">
            全WAVE クリア達成
        </div>
    `;
    overlay.appendChild(header);

    // --- Clear Time & Basic Stats ---
    const totalTimeSec = (Date.now() - engineState.startTime) / 1000;
    const mins = Math.floor(totalTimeSec / 60);
    const secs = Math.floor(totalTimeSec % 60);

    const infoBar = document.createElement('div');
    infoBar.style.cssText = "display:flex; gap:20px; font-size:14px; margin-bottom:30px; background:rgba(255,255,255,0.1); padding:10px 20px; border-radius:20px;";
    infoBar.innerHTML = `
        <div>⏱ TIME: <span style="color:#00d2d3; font-weight:bold;">${mins}m ${secs}s</span></div>
        <div>💀 KILLS: <span style="color:#e74c3c; font-weight:bold;">${engineState.experiencePoints || 0}</span> (XP Calc)</div>
        <div>💰 GOLD: <span style="color:#f1c40f; font-weight:bold;">${engineState.gold}</span></div>
    `;
    overlay.appendChild(infoBar);

    // --- Loadout Analysis Section ---
    const loadoutTitle = document.createElement('div');
    loadoutTitle.innerHTML = "📝 最終装備 & 性能分析";
    loadoutTitle.style.cssText = "width:100%; max-width:600px; border-bottom:1px solid #444; margin-bottom:15px; color:#aaa; font-size:14px;";
    overlay.appendChild(loadoutTitle);

    // Helper: Analyze and Render Skill Set
    const renderSkillSet = (gems, label, scale) => {
        const activeGem = gems[0];
        if (!activeGem) return null;

        const supports = gems.slice(1).filter(g => g !== null);
        const container = document.createElement('div');
        container.style.cssText = "width:100%; max-width:600px; background:rgba(30, 40, 50, 0.6); border:1px solid #555; border-radius:8px; padding:15px; margin-bottom:15px; display:flex; flex-direction:column; gap:10px;";

        // 1. Header (Active Skill)
        const headerRow = document.createElement('div');
        headerRow.style.cssText = "display:flex; align-items:center; gap:15px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;";

        // Icon
        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = `width:50px; height:50px; background:#222; border:2px solid ${activeGem.color}; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; position:relative; box-shadow:0 0 10px ${activeGem.color};`;
        iconDiv.innerHTML = "⚔️";
        const lvBadge = document.createElement('div');
        lvBadge.innerText = `Lv.${activeGem.level}`;
        lvBadge.style.cssText = "position:absolute; bottom:-5px; right:-5px; background:#000; color:#fff; font-size:10px; padding:2px 4px; border-radius:4px; border:1px solid #555;";
        iconDiv.appendChild(lvBadge);

        // Name & Label
        const nameDiv = document.createElement('div');
        nameDiv.innerHTML = `
            <div style="font-size:12px; color:#aaa;">${label} ARMAMENT</div>
            <div style="font-size:18px; font-weight:bold; color:${activeGem.color};">${activeGem.name}</div>
        `;

        // Stats Calculation (Approximation)
        // Base
        let damage = activeGem.damage || 10;
        if (activeGem.level > 1) damage *= (1 + (activeGem.level - 1) * 0.2);
        let rate = activeGem.rate || 60;
        if (activeGem.level > 1) rate *= (1 - (activeGem.level * 0.02));

        // Multipliers
        const stats = engineState.stats;
        damage *= (1.0 + stats.damage_pct);
        damage *= scale; // Main(1.0) or Sub(0.5)
        rate /= (1.0 + stats.rate_pct);

        // Apply Supports
        const supportDetails = [];
        const supportPower = 1.0 + stats.support_effect;

        supports.forEach(sup => {
            const lvl = (sup.level || 1) + (stats.support_level_bonus || 0);
            const lvlBonus = 1 + ((lvl - 1) * 0.1 * supportPower);

            let desc = "";
            if (sup.damage_mod) {
                damage *= (sup.damage_mod * lvlBonus);
                desc += `威力x${(sup.damage_mod * lvlBonus).toFixed(2)} `;
            }
            if (sup.rate_mod) {
                rate *= (sup.rate_mod / lvlBonus);
                desc += `間隔x${(sup.rate_mod / lvlBonus).toFixed(2)} `;
            }
            if (sup.id === 'multishot') {
                const count = 1 + (sup.projectiles || 1) + (lvl - 1);
                desc += `弾数+${count} `;
            }
            if (sup.pierce_count) {
                const p = sup.pierce_count + (lvl - 1);
                desc += `貫通+${p} `;
            }
            if (sup.chain_count) desc += `連鎖追加 `;

            supportDetails.push({ name: sup.name, lv: lvl, color: sup.color, desc: desc });
        });

        // Final Artifact/Passive Mods
        if (stats.final_damage_mul > 0) damage *= stats.final_damage_mul;

        const dpsTheoretical = (damage * (60 / rate)).toFixed(0);
        const rateSec = (rate / 60).toFixed(2);

        // Stats Display
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = "margin-left:auto; text-align:right; font-size:12px; line-height:1.4;";
        statsDiv.innerHTML = `
            <div>単発威力: <span style="color:#f1c40f;">${Math.floor(damage)}</span></div>
            <div>発射間隔: ${rateSec}s</div>
            <div>理論DPS: <span style="color:#00d2d3; font-weight:bold;">${dpsTheoretical}</span></div>
        `;

        headerRow.appendChild(iconDiv);
        headerRow.appendChild(nameDiv);
        headerRow.appendChild(statsDiv);
        container.appendChild(headerRow);

        // 2. Supports Visualization
        if (supportDetails.length > 0) {
            const linkRow = document.createElement('div');
            linkRow.style.cssText = "display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.3); padding:8px; border-radius:4px;";
            linkRow.innerHTML = `<div style="font-size:10px; color:#aaa; width:60px;">LINKS:</div>`;

            supportDetails.forEach(sup => {
                const supTag = document.createElement('div');
                supTag.style.cssText = `display:flex; align-items:center; gap:5px; border:1px solid ${sup.color}; padding:2px 6px; border-radius:4px; font-size:11px;`;
                supTag.innerHTML = `
                    <span style="color:${sup.color}; font-weight:bold;">${sup.name} Lv.${sup.lv}</span>
                    <span style="color:#fff; opacity:0.8; font-size:10px;">${sup.desc}</span>
                `;
                linkRow.appendChild(supTag);
            });
            container.appendChild(linkRow);
        }

        return container;
    };

    const mainPanel = renderSkillSet(engineState.equippedGems, "MAIN", 1.0);
    if (mainPanel) overlay.appendChild(mainPanel);

    const subPanel = renderSkillSet(engineState.altGems, "SUB", 0.5);
    if (subPanel) overlay.appendChild(subPanel);

    // --- Artifacts ---
    if (engineState.artifacts.length > 0) {
        const artContainer = document.createElement('div');
        artContainer.style.cssText = "width:100%; max-width:600px; display:flex; gap:5px; flex-wrap:wrap; margin-bottom:20px;";
        engineState.artifacts.forEach(art => {
            const icon = document.createElement('div');
            icon.innerHTML = art.icon;
            icon.style.cssText = `width:32px; height:32px; border:1px solid ${art.color}; background:rgba(0,0,0,0.5); border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:help;`;
            // Tooltip integration
            icon.onmouseenter = (e) => window.showTooltip(e, art);
            icon.onmouseleave = window.hideTooltip;
            artContainer.appendChild(icon);
        });
        overlay.appendChild(artContainer);
    }

    // --- Actual DPS Report ---
    const statsSection = document.createElement('div');
    statsSection.style.cssText = "width:100%; max-width:600px; margin-bottom:20px;";
    statsSection.innerHTML = `<div style="border-bottom:1px solid #444; margin-bottom:10px; font-size:14px; color:#aaa;">⚔️ 戦闘実績 (Total Damage & DPS)</div>`;

    const table = document.createElement('table');
    table.style.cssText = "width:100%; font-size:12px; border-collapse:collapse;";
    table.innerHTML = `
        <tr style="color:#888; text-align:left; border-bottom:1px solid #555;">
            <th style="padding:5px;">SOURCE</th>
            <th style="text-align:right">TOTAL</th>
            <th style="text-align:right">DPS</th>
            <th style="text-align:right">%</th>
        </tr>
    `;

    // Total for percentage
    const totalDamageAll = Object.values(engineState.damageLog).reduce((a, b) => a + b, 0) || 1;
    const sortedLogs = Object.entries(engineState.damageLog).sort(([,a], [,b]) => b - a);

    sortedLogs.slice(0, 8).forEach(([srcId, val]) => { // Top 8 only
        let name = srcId;
        let color = "#fff";

        // Resolve Name (Use imported GEMS constant)
        const gem = Object.values(GEMS).find(g => g.id === srcId);

        // Check local GEMS import or use fallback
        // Since we are in ui.js which imports GEMS, use local reference.
        // Wait, GEMS might not include synergy names.

        if (gem) { name = gem.name; color = gem.color; }
        else if (srcId === 'shield_bash') { name = "シールドバッシュ"; color = "#66fcf1"; }
        else if (srcId === 'reflected_orb') { name = "反射弾"; color = "#66fcf1"; }
        else if (srcId === 'burn_dot') { name = "炎上(DoT)"; color = "#e67e22"; }
        else if (srcId === 'poison_dot') { name = "毒(DoT)"; color = "#8e44ad"; }
        // Synergy names
        else if (srcId === 'steam') { name = "蒸発反応"; color = "#dff9fb"; }
        else if (srcId === 'meltdown') { name = "融解反応"; color = "#fab1a0"; }
        else if (srcId === 'overload') { name = "過負荷"; color = "#ff5252"; }
        else if (srcId === 'superconduct') { name = "超電導"; color = "#a29bfe"; }

        const dps = (val / totalTimeSec).toFixed(1);
        const pct = ((val / totalDamageAll) * 100).toFixed(1);

        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #333";
        tr.innerHTML = `
            <td style="padding:4px; color:${color}">${name}</td>
            <td style="text-align:right; color:#ddd;">${Math.floor(val).toLocaleString()}</td>
            <td style="text-align:right; font-weight:bold;">${dps}</td>
            <td style="text-align:right; color:#888;">${pct}%</td>
        `;
        table.appendChild(tr);
    });
    statsSection.appendChild(table);
    overlay.appendChild(statsSection);

    // --- Buttons ---
    const btnRow = document.createElement('div');
    btnRow.style.cssText = "display:flex; gap:20px; margin-top:20px; margin-bottom:40px;";

    // Skill Tree View Button
    const treeBtn = document.createElement('button');
    treeBtn.innerHTML = "🌲 スキルツリー確認";
    treeBtn.style.cssText = "padding:12px 24px; background:#2c3e50; border:1px solid #00d2d3; color:#00d2d3; border-radius:4px; cursor:pointer; font-weight:bold;";
    treeBtn.onclick = () => {
        // Open tree modal on top of result screen
        const treeModal = document.getElementById('skill-tree-modal');
        if (treeModal) {
            toggleMenu('skill-tree-modal');
            // Force high z-index to overlay result screen
            treeModal.style.zIndex = "10000";

            // Add a temporary "Close" listener to restore z-index logic if needed, 
            // but toggleMenu handles hidden class.
            // When closing tree (via its X button), we just want to see the result screen again.
            // Result screen is z-index 9000. Tree default is lower? No, modal-overlay is 6000.
            // So manually setting 10000 works.
        }
    };
    btnRow.appendChild(treeBtn);

    // Return Button
    const returnBtn = document.createElement('button');
    returnBtn.innerText = "タイトルに戻る";
    returnBtn.style.cssText = "padding:12px 24px; background:#e74c3c; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;";
    returnBtn.onclick = () => location.reload();
    btnRow.appendChild(returnBtn);

    overlay.appendChild(btnRow);

    // --- Wave Graph (Canvas) ---
    // (Optional: If screen space allows, keep it at bottom or remove to reduce clutter)
    // Let's keep it but make it compact.
    const chartDiv = document.createElement('div');
    chartDiv.style.cssText = "width:100%; max-width:600px; height:100px; border:1px solid #333; background:#111; border-radius:4px; position:relative;";
    const cvs = document.createElement('canvas');
    cvs.width = 600; cvs.height = 100;
    cvs.style.width = "100%"; cvs.style.height = "100%";
    chartDiv.appendChild(cvs);
    overlay.appendChild(chartDiv);

    // Simple Graph
    const ctx = cvs.getContext('2d');
    const logs = engineState.waveLog;
    if (logs.length > 1) {
        const maxTime = logs[logs.length-1].time;
        ctx.beginPath();
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 2;
        ctx.moveTo(0, 100);
        logs.forEach((log, i) => {
            const x = (log.time / maxTime) * 600;
            const y = 100 - ((i / logs.length) * 80 + 10); // Rough step up
            ctx.lineTo(x, y);
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(x-2, y-2, 4, 4);
        });
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px sans-serif";
        ctx.fillText("PROGRESS", 5, 15);
    }

    // Inject Styles for FadeIn
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
    overlay.appendChild(style);

    document.body.appendChild(overlay);
}
window.showGameClearScreen = showGameClearScreen;
window.showAbilityCutIn = showAbilityCutIn;

/**
 * GEMレベルアップ（合成）の演出を表示
 */
export function showFuseEffect(item) {
    const overlay = document.getElementById('fuse-overlay');
    const banner = document.getElementById('fuse-banner');
    const nameEl = document.getElementById('fuse-item-name');
    const lvEl = document.getElementById('fuse-item-lv');

    if (!overlay || !banner) return;

    nameEl.innerText = item.name.toUpperCase();
    lvEl.innerText = `Lv.${item.level}`;

    // アイテムの色をテーマカラーに反映
    banner.style.borderColor = item.color;
    banner.style.background = `linear-gradient(90deg, transparent, ${item.color}33 50%, transparent)`;
    nameEl.style.color = item.color;
    nameEl.style.textShadow = `0 0 10px ${item.color}`;

    overlay.style.display = 'block';
    banner.classList.remove('animate-fuse');
    void banner.offsetWidth; // reflow
    banner.classList.add('animate-fuse');

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 1900);
}
window.showFuseEffect = showFuseEffect;

export function toggleBgmState() {
    // クリック音を鳴らす
    audioManager.play('CLICK');

    // ミュート状態を切り替え
    const isMuted = audioManager.toggleBgm();

    // ボタンの見た目を更新
    const btn = document.getElementById('bgm-btn');
    if (btn) {
        if (isMuted) {
            btn.innerText = "♫ OFF";
            btn.style.color = "#7f8c8d";
            btn.style.borderColor = "#7f8c8d";
        } else {
            btn.innerText = "♫ ON";
            btn.style.color = "#66fcf1";
            btn.style.borderColor = "#66fcf1";
        }
    }
}
window.toggleBgmState = toggleBgmState;