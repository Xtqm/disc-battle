/**
 * AchievementToast.js
 * Non-Intrusive In-Game Neon HUD Toast Banner & Notification Queue
 * for Tron Disc Arena (SPEC-ACHIEVE-001).
 */

import { SFX } from '../../audio/sfx.js';

export class AchievementToast {
  /**
   * @param {object} [options]
   * @param {HTMLElement} [options.container]
   * @param {number} [options.displayDuration=3800] Duration in milliseconds
   * @param {Function} [options.playFanfareFn]
   */
  constructor(options = {}) {
    this.displayDuration = options.displayDuration || 3800;
    this.playFanfareFn = typeof options.playFanfareFn === 'function'
      ? options.playFanfareFn
      : () => SFX.achievementFanfare();

    this.queue = [];
    this.isShowing = false;
    this.activeToastEl = null;
    this._container = options.container || null;
    this._hideTimeout = null;
  }

  get container() {
    if (this._container) return this._container;
    if (typeof document === 'undefined') return null;

    let el = document.getElementById('achievementToastContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'achievementToastContainer';
      el.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        max-width: 90vw;
        width: 440px;
      `;
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * Enqueues an achievement for presentation.
   * @param {object} achievement
   */
  show(achievement) {
    if (!achievement) return;

    this.queue.push(achievement);
    if (!this.isShowing) {
      this._processQueue();
    }
  }

  /**
   * Immediately clears all active and queued toasts.
   */
  clear() {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }
    if (this.activeToastEl && this.activeToastEl.parentNode) {
      this.activeToastEl.parentNode.removeChild(this.activeToastEl);
    }
    this.activeToastEl = null;
    this.queue = [];
    this.isShowing = false;
  }

  _processQueue() {
    if (this.queue.length === 0) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    const achievement = this.queue.shift();
    this._renderToast(achievement);
  }

  _renderToast(achievement) {
    const parent = this.container;
    if (!parent || typeof document === 'undefined') {
      this._processQueue();
      return;
    }

    // Play procedural synth audio fanfare
    try {
      this.playFanfareFn();
    } catch (_) {}

    const toast = document.createElement('div');
    toast.className = 'tron-achievement-toast';
    toast.style.cssText = `
      position: relative;
      width: 100%;
      background: rgba(0, 14, 26, 0.94);
      border: 1px solid #00f3ff;
      border-radius: 6px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 0 20px rgba(0, 243, 255, 0.4), inset 0 0 10px rgba(0, 243, 255, 0.15);
      backdrop-filter: blur(8px);
      pointer-events: auto;
      cursor: pointer;
      transform: translateY(-40px);
      opacity: 0;
      transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.35s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    // Reward pills
    let rewardHtml = '';
    if (achievement.reward?.bits > 0) {
      rewardHtml += `<span style="background:rgba(255,170,0,0.18); border:1px solid #ffaa00; color:#ffaa00; padding:2px 7px; border-radius:3px; font-size:11px; font-weight:bold; letter-spacing:0.5px;">+${achievement.reward.bits} BITS</span>`;
    }
    if (achievement.reward?.cosmetic) {
      const cosmeticName = achievement.reward.cosmetic.displayName || achievement.reward.cosmetic.itemId;
      rewardHtml += `<span style="background:rgba(255,0,85,0.2); border:1px solid #ff0055; color:#ff3377; padding:2px 7px; border-radius:3px; font-size:11px; font-weight:bold; letter-spacing:0.5px;">SKIN: ${cosmeticName.toUpperCase()}</span>`;
    }

    toast.innerHTML = `
      <div style="font-size:28px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; background:rgba(0,243,255,0.1); border:1px solid rgba(0,243,255,0.4); border-radius:4px; box-shadow:0 0 8px rgba(0,243,255,0.3); flex-shrink:0;">
        ${achievement.icon || '⚡'}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:10px; color:#00f3ff; letter-spacing:1.5px; font-weight:bold; text-transform:uppercase; margin-bottom:2px;">
          [ PROTOCOL UNLOCKED // ACCOLADE ]
        </div>
        <div style="font-size:15px; color:#ffffff; font-weight:bold; letter-spacing:0.5px; text-shadow:0 0 8px rgba(255,255,255,0.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${achievement.title}
        </div>
        <div style="display:flex; gap:6px; margin-top:5px; flex-wrap:wrap;">
          ${rewardHtml}
        </div>
      </div>
    `;

    // Click to dismiss
    toast.onclick = () => {
      this._dismissToast(toast);
    };

    parent.appendChild(toast);
    this.activeToastEl = toast;

    // Trigger animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    // Schedule dismiss
    this._hideTimeout = setTimeout(() => {
      this._dismissToast(toast);
    }, this.displayDuration);
  }

  _dismissToast(toast) {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }

    if (!toast || !toast.parentNode) {
      this.activeToastEl = null;
      this._processQueue();
      return;
    }

    toast.style.transform = 'translateY(-30px)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.activeToastEl = null;
      this._processQueue();
    }, 350);
  }
}

export const achievementToast = new AchievementToast();
