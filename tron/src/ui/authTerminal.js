import { state } from '../core/state.js';
import { authManager } from '../auth/AuthManager.js';
import { AuthEvents } from '../auth/events.js';
import { SFX } from '../audio/sfx.js';
import { setCursor } from '../input/InputManager.js';

/**
 * Calculates current level tier from player save state.
 * @param {object|null} saveState 
 * @returns {number}
 */
export function calculateLevel(saveState) {
  if (!saveState || !saveState.stats) return 1;
  const score = saveState.stats.totalScore || 0;
  const wave = saveState.stats.highestWave || 1;
  return Math.max(1, Math.floor(score / 500) + wave);
}

/**
 * Generates the HTML string for the Main Menu Identity Header badge.
 * @param {object|null} user 
 * @param {object|null} saveState 
 * @returns {string}
 */
export function getIdentityHeaderHtml(user, saveState) {
  const isAuth = user && !user.isAnonymous;
  const level = calculateLevel(saveState);
  const levelStr = String(level).padStart(2, '0');

  if (isAuth) {
    const callsign = (user.handle || 'PROGRAM').toUpperCase();
    return `
      <div class="id-badge cyan-glow">
        <span class="status-circuit green-circuit" title="Active Grid Connection"></span>
        <span class="id-text">[USER RECOGNIZED] <b id="idCallsign">${callsign}</b> // LVL <span id="idLevel">${levelStr}</span></span>
      </div>
      <button id="manageIdentityBtn" class="id-btn cyan-btn" title="Open Grid Authorization Terminal">[ TERMINAL ]</button>
    `;
  }

  const shortId = (user?.uid || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'GRID';
  return `
    <div class="id-badge amber-wireframe">
      <span class="id-icon">◈</span>
      <span class="id-text">[GUEST] SUB-ROUTINE // ID: <b id="idShortCode">${shortId}</b></span>
    </div>
    <button id="secureIdentityBtn" class="id-btn pulse-amber" title="Secure Identity & Sync Profile">[ SECURE IDENTITY ]</button>
  `;
}

/**
 * Updates or re-renders the identity header badge in the main menu.
 */
export function updateIdentityHeader() {
  if (typeof document === 'undefined') return;
  const headerEl = document.getElementById('identityHeader');
  if (!headerEl) return;

  const user = authManager.currentUser;
  const saveState = authManager.saveState;
  const isAuth = user && !user.isAnonymous;

  headerEl.className = `identity-header ${isAuth ? 'state-auth' : 'state-guest'}`;
  headerEl.innerHTML = getIdentityHeaderHtml(user, saveState);

  const btn = headerEl.querySelector('#secureIdentityBtn') || headerEl.querySelector('#manageIdentityBtn');
  if (btn) {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      showAuthTerminal();
    };
  }
}

/**
 * Shows the Grid Authorization Terminal modal.
 */
export function showAuthTerminal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('authModal');
  if (!modal) return;

  // Release pointer lock and update state
  if (document.pointerLockElement) {
    try { document.exitPointerLock(); } catch (_) {}
  }
  state.authModalOpen = true;
  setCursor();

  // Play terminal boot sound
  SFX.terminalOpen();

  // Populate identity state
  populateTerminalData();

  modal.style.display = 'flex';
  const card = modal.querySelector('.card');
  if (card) card.scrollTop = 0;

  // Focus callsign input
  const callsignInput = document.getElementById('authCallsignInput');
  if (callsignInput) {
    setTimeout(() => callsignInput.focus(), 60);
  }
}

/**
 * Hides the Grid Authorization Terminal modal.
 */
export function hideAuthTerminal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';

  state.authModalOpen = false;
  setCursor();
}

/**
 * Returns whether the authorization terminal modal is currently open.
 * @returns {boolean}
 */
export function isAuthTerminalOpen() {
  return !!state.authModalOpen;
}

/**
 * Populates terminal input fields and status readout from AuthManager state.
 */
function populateTerminalData() {
  if (typeof document === 'undefined') return;
  const user = authManager.currentUser;
  const saveState = authManager.saveState;
  const level = calculateLevel(saveState);

  const callsignInput = document.getElementById('authCallsignInput');
  if (callsignInput && user) {
    callsignInput.value = user.handle || '';
  }

  const readout = document.getElementById('terminalIdentityReadout');
  if (readout) {
    if (user && !user.isAnonymous) {
      readout.innerHTML = `STATUS: <b style="color:var(--cyan)">AUTHENTICATED PROGRAM</b> // IDENT: ${user.handle} // LVL ${level}`;
    } else {
      const shortId = (user?.uid || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'GRID';
      readout.innerHTML = `STATUS: <b style="color:var(--orange)">UNSECURED GUEST SUB-ROUTINE</b> // ID: ${shortId}`;
    }
  }

  const banner = document.getElementById('terminalStatusBanner');
  if (banner) {
    banner.className = `terminal-status-banner ${user && !user.isAnonymous ? 'state-auth' : 'state-guest'}`;
  }

  setConsoleMessage('> TERMINAL READY. AWAITING COMMAND INPUT...', 'info');
}

/**
 * Sets message in the terminal console readout.
 * @param {string} msg 
 * @param {'info'|'success'|'error'} type 
 */
function setConsoleMessage(msg, type = 'info') {
  const el = document.getElementById('terminalConsoleMsg');
  if (!el) return;
  el.textContent = msg;
  el.className = `terminal-console msg-${type}`;
}

/**
 * Initializes listeners, tab behaviors, and event subscriptions for the terminal.
 */
export function initAuthTerminal() {
  if (typeof document === 'undefined') return;

  // Update header immediately and subscribe to auth bus
  updateIdentityHeader();
  authManager.on(AuthEvents.STATE_CHANGED, () => {
    updateIdentityHeader();
    if (isAuthTerminalOpen()) populateTerminalData();
  });
  authManager.on(AuthEvents.PROFILE_UPDATED, () => {
    updateIdentityHeader();
    if (isAuthTerminalOpen()) populateTerminalData();
  });

  const modal = document.getElementById('authModal');
  if (!modal) return;

  // Stop click-through to Three.js canvas
  modal.addEventListener('mousedown', (e) => e.stopPropagation());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideAuthTerminal();
    e.stopPropagation();
  });

  // Tab switching
  const tabDirect = document.getElementById('tabDirectPasskey');
  const tabQuick = document.getElementById('tabQuickSync');
  const panelDirect = document.getElementById('panelDirectPasskey');
  const panelQuick = document.getElementById('panelQuickSync');

  if (tabDirect && tabQuick && panelDirect && panelQuick) {
    tabDirect.onclick = (e) => {
      e.stopPropagation();
      tabDirect.classList.add('active');
      tabQuick.classList.remove('active');
      panelDirect.style.display = 'block';
      panelQuick.style.display = 'none';
      SFX.terminalKey();
    };
    tabQuick.onclick = (e) => {
      e.stopPropagation();
      tabQuick.classList.add('active');
      tabDirect.classList.remove('active');
      panelDirect.style.display = 'none';
      panelQuick.style.display = 'block';
      SFX.terminalKey();
    };
  }

  // Keyboard clicks on all terminal inputs
  const inputs = modal.querySelectorAll('.terminal-input');
  inputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') {
        SFX.terminalKey();
      }
    });
  });

  // Callsign Commitment
  const btnSaveCallsign = document.getElementById('btnSaveCallsign');
  const callsignInput = document.getElementById('authCallsignInput');

  const commitCallsign = async () => {
    if (!callsignInput) return;
    const raw = callsignInput.value.trim();
    try {
      await authManager.updateCallsign(raw);
      SFX.accessGranted();
      setConsoleMessage(`> CALLSIGN UPDATED: "${authManager.currentUser.handle}" HARMONIZED TO LOCAL STORAGE.`, 'success');
    } catch (err) {
      SFX.errorBuzz();
      setConsoleMessage(`> ERROR: ${err.message}`, 'error');
    }
  };

  if (btnSaveCallsign) {
    btnSaveCallsign.onclick = (e) => {
      e.stopPropagation();
      commitCallsign();
    };
  }
  if (callsignInput) {
    callsignInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCallsign();
      }
    });
  }

  // Direct Passkey (Email / Password)
  const btnAuthorize = document.getElementById('btnAuthorizePasskey');
  const btnRegister = document.getElementById('btnRegisterPasskey');
  const emailInput = document.getElementById('authEmailInput');
  const passInput = document.getElementById('authPasswordInput');

  const handlePasskeyAuth = async (isNew = false) => {
    const email = (emailInput?.value || '').trim();
    const password = passInput?.value || '';
    const desiredHandle = (callsignInput?.value || '').trim();

    if (!email || !email.includes('@')) {
      SFX.errorBuzz();
      setConsoleMessage('> ERROR: INVALID COMM IDENT FORMAT (EMAIL REQUIRED).', 'error');
      return;
    }
    if (password.length < 6) {
      SFX.errorBuzz();
      setConsoleMessage('> ERROR: PASSKEY REQUIRES MINIMUM 6 CHARACTERS.', 'error');
      return;
    }

    try {
      const user = await authManager.signInWithCredentials(email, password, desiredHandle);
      SFX.accessGranted();
      setConsoleMessage(`> ACCESS GRANTED // USER AUTHORIZED AS "${user.handle}" [PROV: PASSKEY]`, 'success');
      populateTerminalData();
    } catch (err) {
      SFX.errorBuzz();
      setConsoleMessage(`> AUTH ERROR: ${err.message}`, 'error');
    }
  };

  if (btnAuthorize) {
    btnAuthorize.onclick = (e) => { e.stopPropagation(); handlePasskeyAuth(false); };
  }
  if (btnRegister) {
    btnRegister.onclick = (e) => { e.stopPropagation(); handlePasskeyAuth(true); };
  }
  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePasskeyAuth(false);
      }
    });
  }

  // Quick Sync (Google / Discord)
  const btnGoogle = document.getElementById('btnSyncGoogle');
  const btnDiscord = document.getElementById('btnSyncDiscord');

  const handleFederatedSync = async (providerName) => {
    try {
      const user = await authManager.signInWithFederated(providerName);
      SFX.accessGranted();
      setConsoleMessage(`> FEDERATED SYNC SUCCESSFUL // ${providerName.toUpperCase()} PROTOCOL LINKED AS "${user.handle}"`, 'success');
      populateTerminalData();
    } catch (err) {
      SFX.errorBuzz();
      setConsoleMessage(`> FEDERATED SYNC FAILED: ${err.message}`, 'error');
    }
  };

  if (btnGoogle) {
    btnGoogle.onclick = (e) => { e.stopPropagation(); handleFederatedSync('google'); };
  }
  if (btnDiscord) {
    btnDiscord.onclick = (e) => { e.stopPropagation(); handleFederatedSync('discord'); };
  }

  // Dismiss / Close Button
  const btnClose = document.getElementById('btnCloseTerminal');
  if (btnClose) {
    btnClose.onclick = (e) => {
      e.stopPropagation();
      hideAuthTerminal();
    };
  }
}

if (typeof window !== 'undefined') {
  window.__tronShowAuthTerminal = showAuthTerminal;
  window.__tronHideAuthTerminal = hideAuthTerminal;
  window.__tronUpdateIdentityHeader = updateIdentityHeader;
}
