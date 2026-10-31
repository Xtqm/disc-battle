/**
 * SettingsModal.js
 * In-Game System Configuration Modal for Tron Disc Arena (SPEC-SETTINGS-001)
 * Manages Display, Performance FPS caps, Audio volume sliders, and Graphics quality.
 */

import { settingsManager } from '../../core/settings.js';
import { toggleFullScreen, isFullScreen } from '../modals.js';
import { setCursor } from '../../input/InputManager.js';

export class SettingsModal {
  constructor(options = {}) {
    this.settings = options.settings || settingsManager;
    this._containerId = 'settingsModal';
    this._onClose = null;

    if (typeof window !== 'undefined') {
      window.__tronCloseSettings = () => this.hide();
      window.__tronOpenSettings = () => this.show();
    }
  }

  get container() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById(this._containerId);
    if (!el && typeof document.createElement === 'function') {
      el = document.createElement('div');
      el.id = this._containerId;
      el.className = 'modal-overlay';
      el.style.display = 'none';
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.zIndex = '1000';
      el.style.background = 'rgba(0, 10, 16, 0.88)';
      el.style.backdropFilter = 'blur(6px)';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      if (document.body) document.body.appendChild(el);
    }
    return el;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style && el.style.display !== 'none');
  }

  setOnClose(callback) {
    this._onClose = callback;
  }

  show() {
    const el = this.container;
    if (!el) return;

    this.settings.load();
    this.render();
    el.style.display = 'flex';
    setCursor(true);
  }

  hide() {
    const el = this.container;
    if (el) el.style.display = 'none';
    if (typeof this._onClose === 'function') {
      this._onClose();
    }
  }

  render() {
    const el = this.container;
    if (!el) return;

    const currentMaster = Math.round(this.settings.get('masterVolume', 1.0) * 100);
    const currentSFX = Math.round(this.settings.get('sfxVolume', 1.0) * 100);
    const currentFPS = Number(this.settings.get('fpsCap', 60));
    const currentDisplay = this.settings.get('displayMode', isFullScreen() ? 'fullscreen' : 'windowed');
    const currentMute = this.settings.get('muteOnBlur', true);
    const currentBloom = this.settings.get('bloom', true);
    const currentParticles = this.settings.get('particles', true);

    el.innerHTML = `
      <div class="card" style="max-width:540px; text-align:left; padding:28px 32px; border:1px solid rgba(79,242,255,0.6); box-shadow:0 0 35px rgba(79,242,255,0.22); background:rgba(2,16,24,0.95); color:var(--cyan); border-radius:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(79,242,255,0.3); padding-bottom:12px; margin-bottom:20px;">
          <h1 style="font-size:20px; letter-spacing:4px; margin:0; text-transform:uppercase;">SYSTEM SETTINGS</h1>
          <button id="closeSettingsX" class="btn" style="padding:4px 10px; font-size:14px; min-width:32px; border-color:rgba(79,242,255,0.4); cursor:pointer;">✕</button>
        </div>

        <!-- Section: Audio -->
        <div style="margin-bottom:22px;">
          <div style="font-size:12px; letter-spacing:2px; font-weight:bold; margin-bottom:10px; color:#fff; text-transform:uppercase;">Audio Configuration</div>
          
          <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
              <span>MASTER VOLUME</span>
              <span id="masterVolReadout">${currentMaster}%</span>
            </div>
            <input id="masterVolSlider" type="range" min="0" max="100" value="${currentMaster}" style="width:100%; accent-color:var(--cyan); cursor:pointer;">
          </div>

          <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
              <span>SFX / SYNTHESIZER VOLUME</span>
              <span id="sfxVolReadout">${currentSFX}%</span>
            </div>
            <input id="sfxVolSlider" type="range" min="0" max="100" value="${currentSFX}" style="width:100%; accent-color:var(--cyan); cursor:pointer;">
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-top:6px;">
            <span>MUTE ON FOCUS LOSS</span>
            <button id="toggleMuteBlurBtn" class="btn" style="padding:4px 12px; font-size:11px; cursor:pointer;">${currentMute ? 'ENABLED' : 'DISABLED'}</button>
          </div>
        </div>

        <!-- Section: Display & Performance -->
        <div style="margin-bottom:22px;">
          <div style="font-size:12px; letter-spacing:2px; font-weight:bold; margin-bottom:10px; color:#fff; text-transform:uppercase;">Display & Performance</div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-bottom:10px;">
            <span>DISPLAY MODE</span>
            <button id="toggleDisplayModeBtn" class="btn" style="padding:4px 14px; font-size:11px; cursor:pointer;">${currentDisplay.toUpperCase()}</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
            <span>FRAME RATE LIMIT</span>
            <div style="display:flex; gap:6px;">
              <button class="btn fps-btn ${currentFPS === 60 ? 'hot' : ''}" data-fps="60" style="padding:4px 8px; font-size:10px; cursor:pointer;">60</button>
              <button class="btn fps-btn ${currentFPS === 120 ? 'hot' : ''}" data-fps="120" style="padding:4px 8px; font-size:10px; cursor:pointer;">120</button>
              <button class="btn fps-btn ${currentFPS === 144 ? 'hot' : ''}" data-fps="144" style="padding:4px 8px; font-size:10px; cursor:pointer;">144</button>
              <button class="btn fps-btn ${currentFPS === 0 ? 'hot' : ''}" data-fps="0" style="padding:4px 8px; font-size:10px; cursor:pointer;">MAX</button>
            </div>
          </div>
        </div>

        <!-- Section: Graphics -->
        <div style="margin-bottom:24px;">
          <div style="font-size:12px; letter-spacing:2px; font-weight:bold; margin-bottom:10px; color:#fff; text-transform:uppercase;">Visual Quality</div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-bottom:8px;">
            <span>NEON GLOW / BLOOM</span>
            <button id="toggleBloomBtn" class="btn" style="padding:4px 12px; font-size:11px; cursor:pointer;">${currentBloom ? 'ACTIVE' : 'OFF'}</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
            <span>PARTICLE SPARK DENSITY</span>
            <button id="toggleParticlesBtn" class="btn" style="padding:4px 12px; font-size:11px; cursor:pointer;">${currentParticles ? 'HIGH' : 'LOW'}</button>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid rgba(79,242,255,0.3); padding-top:14px;">
          <button id="closeSettingsBtn" class="btn" style="padding:8px 24px; font-size:12px; letter-spacing:2px; cursor:pointer;">RETURN</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const el = this.container;
    if (!el) return;

    const closeBtn = el.querySelector('#closeSettingsBtn');
    if (closeBtn) closeBtn.onclick = () => this.hide();

    const closeX = el.querySelector('#closeSettingsX');
    if (closeX) closeX.onclick = () => this.hide();

    // Audio Sliders
    const masterSlider = el.querySelector('#masterVolSlider');
    const masterReadout = el.querySelector('#masterVolReadout');
    if (masterSlider) {
      masterSlider.oninput = (e) => {
        const val = Number(e.target.value);
        if (masterReadout) masterReadout.textContent = `${val}%`;
        this.settings.set('masterVolume', val / 100);
      };
    }

    const sfxSlider = el.querySelector('#sfxVolSlider');
    const sfxReadout = el.querySelector('#sfxVolReadout');
    if (sfxSlider) {
      sfxSlider.oninput = (e) => {
        const val = Number(e.target.value);
        if (sfxReadout) sfxReadout.textContent = `${val}%`;
        this.settings.set('sfxVolume', val / 100);
      };
    }

    // Mute on Blur Toggle
    const muteBlurBtn = el.querySelector('#toggleMuteBlurBtn');
    if (muteBlurBtn) {
      muteBlurBtn.onclick = () => {
        const next = !this.settings.get('muteOnBlur', true);
        this.settings.set('muteOnBlur', next);
        muteBlurBtn.textContent = next ? 'ENABLED' : 'DISABLED';
      };
    }

    // Display Mode Toggle
    const displayModeBtn = el.querySelector('#toggleDisplayModeBtn');
    if (displayModeBtn) {
      displayModeBtn.onclick = () => {
        if (typeof window !== 'undefined' && window.electronDesktop?.toggleFullscreen) {
          window.electronDesktop.toggleFullscreen();
        } else {
          toggleFullScreen();
        }
        const nextMode = isFullScreen() ? 'windowed' : 'fullscreen';
        this.settings.set('displayMode', nextMode);
        displayModeBtn.textContent = nextMode.toUpperCase();
      };
    }

    // FPS Buttons
    const fpsButtons = el.querySelectorAll('.fps-btn');
    fpsButtons.forEach((btn) => {
      btn.onclick = () => {
        fpsButtons.forEach((b) => b.classList.remove('hot'));
        btn.classList.add('hot');
        const fps = Number(btn.getAttribute('data-fps'));
        this.settings.set('fpsCap', fps);
      };
    });

    // Graphics Toggles
    const bloomBtn = el.querySelector('#toggleBloomBtn');
    if (bloomBtn) {
      bloomBtn.onclick = () => {
        const next = !this.settings.get('bloom', true);
        this.settings.set('bloom', next);
        bloomBtn.textContent = next ? 'ACTIVE' : 'OFF';
      };
    }

    const particlesBtn = el.querySelector('#toggleParticlesBtn');
    if (particlesBtn) {
      particlesBtn.onclick = () => {
        const next = !this.settings.get('particles', true);
        this.settings.set('particles', next);
        particlesBtn.textContent = next ? 'HIGH' : 'LOW';
      };
    }
  }
}

export const settingsModal = new SettingsModal();
