import { state, player } from '../core/state.js';
import { isLocked } from '../input/mouse.js';
import { getPlayerCurveIntent } from '../input/keyboard.js';

export const el = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
export const msgEl = el('msg');

export function message(t) {
  const msg = msgEl || el('msg');
  if (!msg) return;
  msg.textContent = t;
  msg.style.opacity = 1;
  state.msgT = 2;
  if (t === 'SURFACE COLLAPSE — JUMP / DASH!') {
    msg.style.color = 'var(--orange)';
    msg.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'RIVAL CAUGHT DISC!' || t === 'RIVAL COUNTER-CATCH!') {
    msg.style.color = 'var(--orange)';
    msg.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'DEFLECTED!') {
    msg.style.color = '#ffffff';
    msg.style.textShadow = '0 0 24px var(--cyan), 0 0 8px #ffffff';
  } else {
    msg.style.color = 'var(--cyan)';
    msg.style.textShadow = '0 0 22px var(--cyan)';
  }
}

export function updateHUD() {
  const hpb = el('hpbar');
  if (hpb && hpb.firstElementChild) hpb.firstElementChild.style.width = state.player.hp + '%';
  const db = el('discbar');
  if (db && db.firstElementChild) db.firstElementChild.style.width = (state.player.hasDisc ? 100 : 0) + '%';
  const eb = el('energybar');
  if (eb && eb.firstElementChild) eb.firstElementChild.style.width = state.player.energy + '%';

  if (state.gameMode === 'duel' || state.gameMode === 'duel_ai') {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `TIER: <span id="wave" class="big">${state.tier || state.duelTier || 1}</span>`;
    const boss = state.foes[0];
    const hpPct = boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100)) : 0;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `RIVAL INTEGRITY <span id="rivalHp">${hpPct}%</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'block';
    const bb = el('bossbar');
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = hpPct + '%';
  } else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `ROOM <span id="wave" class="big">${state.currentRoomId || '----'}</span>`;
    let oppHp = 0;
    for (const f of state.foes) {
      if (f.alive) oppHp += Math.max(0, Math.ceil(f.hp));
    }
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `RIVALS HP <span id="foes">${oppHp}</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'block';
    const bb = el('bossbar');
    const maxHp = (state.gameMode === 'duos_multi' ? 200 : 100);
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = (oppHp / maxHp * 100) + '%';
  } else {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `CYCLE <span id="wave" class="big">${state.wave}</span>`;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `HOSTILES <span id="foes">${state.foes.length}</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'none';
  }

  const sc = el('score');
  if (sc) sc.textContent = state.score;
}

export function updateCrosshair(aim, traj) {
  const ch = document.getElementById('crosshair');
  if (ch) {
    const onFoe = !!aim.foe || !!(traj && traj.willHit);
    ch.classList.toggle('hot', onFoe);
    ch.classList.toggle('bank', !!(traj && traj.willHit && traj.bounces > 0));
    ch.classList.toggle('empty', !state.player.hasDisc);
    const qHeld = (!!state.keys.KeyQ || state.touchCurveL) && !(!!state.keys.KeyE || state.touchCurveR);
    const eHeld = (!!state.keys.KeyE || state.touchCurveR) && !(!!state.keys.KeyQ || state.touchCurveL);
    ch.classList.toggle('curve-l', qHeld);
    ch.classList.toggle('curve-r', eHeld);
    const range = document.getElementById('range');
    if (range) range.textContent = aim.dist < 300 ? Math.round(aim.dist) + 'M' : '';
  }
}

export function updateKeyMonitor() {
  const km = document.getElementById('keymon');
  if (km && km.style.display === 'block') {
    const on = k => state.keys[k] ? 'style="color:#fff;text-shadow:0 0 8px #fff"' : 'style="opacity:.3"';
    km.innerHTML = `<b ${on('KeyW')}>W</b> <b ${on('KeyA')}>A</b> <b ${on('KeyS')}>S</b> <b ${on('KeyD')}>D</b>
      <b ${on('KeyQ')}>Q</b> <b ${on('KeyE')}>E</b>
      <b ${on('Space')}>SPACE</b> <b ${on('ShiftLeft')}>SHIFT</b><br>
      curve ${getPlayerCurveIntent().toFixed(2)} · y ${player.y.toFixed(2)} · jumps ${player.jumps} · grounded ${player.grounded}<br>
      pointerlock ${isLocked()} · focus ${document.hasFocus()}`;
  }
}

export function updateLockStateBanner() {
  const lb = document.getElementById('lockstate');
  if (lb) lb.style.display = (state.isTouchDevice || isLocked()) ? 'none' : 'block';
}

export function updateOfflineBanner(isOnline, pendingCount = 0) {
  if (typeof document === 'undefined') return;
  const banner = document.getElementById('offlineSyncBanner');
  if (!banner) return;
  if (!isOnline) {
    banner.style.display = 'flex';
    const textEl = document.getElementById('offlineBannerText');
    if (textEl) {
      textEl.textContent = pendingCount > 0
        ? `[GRID OFFLINE] ${pendingCount} MUTATIONS QUEUED // PROGRESS SAFEGUARDED`
        : `[GRID OFFLINE] SYNC BUFFER ACTIVE // PROGRESS SAFEGUARDED`;
    }
  } else {
    banner.style.display = 'none';
  }
}

/**
 * Spawns an animated kinetic floating neon +Bits indicator on the HUD.
 * @param {number} amount
 * @param {string} [label=''] e.g. "PARRY", "BANK SHOT", "CURVE KILL"
 * @param {object} [options]
 * @returns {object|null}
 */
export function showFloatingNeonBits(amount, label = '', options = {}) {
  if (typeof document === 'undefined') return null;

  let container = document.getElementById('floatingEconomyLayer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'floatingEconomyLayer';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
    if (document.body) {
      document.body.appendChild(container);
    }

    if (document.head && !document.getElementById('floatingNeonBitsStyle')) {
      const style = document.createElement('style');
      style.id = 'floatingNeonBitsStyle';
      style.textContent = `
        @keyframes neonFloatRise {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.85);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, -16px) scale(1.12);
          }
          75% {
            opacity: 1;
            transform: translate(-50%, -46px) scale(1.0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -70px) scale(0.9);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  const badge = document.createElement('div');
  badge.className = 'floating-neon-bits';
  const labelText = label ? ` // ${label}` : '';
  badge.textContent = `+${amount} BITS${labelText}`;

  const jitterX = (Math.random() - 0.5) * 80;
  const posX = options.x !== undefined ? options.x : (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth / 2 + jitterX : 200);
  const posY = options.y !== undefined ? options.y : (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight * 0.38 : 150);

  const accentColor = options.color || '#00f3ff';
  const glowColor = options.glow || '#0066ff';

  badge.style.cssText = `
    position: absolute;
    left: ${posX}px;
    top: ${posY}px;
    color: ${accentColor};
    font-family: inherit;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-shadow: 0 0 10px ${accentColor}, 0 0 20px ${glowColor}, 0 0 35px #ffffff;
    pointer-events: none;
    user-select: none;
    animation: neonFloatRise 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    white-space: nowrap;
    z-index: 10000;
  `;

  container.appendChild(badge);

  const timer = setTimeout(() => {
    if (badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  }, 950);

  return {
    element: badge,
    container,
    cleanup: () => {
      clearTimeout(timer);
      if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }
  };
}

