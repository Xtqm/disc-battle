import { state } from '../core/state.js';
import { authManager } from '../auth/AuthManager.js';
import { AuthEvents } from '../auth/events.js';
import { setCursor } from '../input/InputManager.js';

let activeStep = 1;
let activeMode = 'signin'; // 'signin' | 'create'

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
 * Sets the active step and mode in the auth terminal wizard.
 * @param {number} step - 1 or 2
 * @param {'signin'|'create'} [mode]
 */
export function setTerminalStep(step, mode = activeMode) {
  activeStep = step;
  activeMode = mode;

  const step1 = document.getElementById('authStep1');
  const step2 = document.getElementById('authStep2');
  const tabSignIn = document.getElementById('tabSignIn');
  const tabCreate = document.getElementById('tabCreateAccount');
  const btnAuthorize = document.getElementById('btnAuthorizePasskey');
  const btnContinue = document.getElementById('btnContinueToCallsign');

  if (tabSignIn && tabCreate) {
    if (activeMode === 'signin') {
      tabSignIn.classList.add('active');
      tabCreate.classList.remove('active');
    } else {
      tabCreate.classList.add('active');
      tabSignIn.classList.remove('active');
    }
  }

  if (btnAuthorize && btnContinue) {
    if (activeMode === 'signin') {
      btnAuthorize.style.display = 'block';
      btnContinue.style.display = 'none';
    } else {
      btnAuthorize.style.display = 'none';
      btnContinue.style.display = 'block';
    }
  }

  if (step1 && step2) {
    if (activeStep === 1) {
      step1.style.display = 'block';
      step2.style.display = 'none';
    } else {
      step1.style.display = 'none';
      step2.style.display = 'block';
      const callsignInput = document.getElementById('authCallsignInput');
      if (callsignInput) {
        setTimeout(() => callsignInput.focus(), 60);
      }
    }
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

  // Populate identity state and reset to Step 1 Sign In
  populateTerminalData();
  setTerminalStep(1, 'signin');

  modal.style.display = 'flex';
  const card = modal.querySelector('.card');
  if (card) card.scrollTop = 0;

  const emailInput = document.getElementById('authEmailInput');
  if (emailInput) {
    setTimeout(() => emailInput.focus(), 60);
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

  setConsoleMessage('> TERMINAL READY. AWAITING INPUT...', 'info');
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

  // Prevent click-through to Three.js canvas; strict modal dismissal via [X] only
  modal.addEventListener('mousedown', (e) => e.stopPropagation());
  modal.addEventListener('click', (e) => e.stopPropagation());

  // Close Button [X]
  const btnClose = document.getElementById('btnCloseTerminal');
  if (btnClose) {
    btnClose.onclick = (e) => {
      e.stopPropagation();
      hideAuthTerminal();
    };
  }

  // Mode Tabs: Sign In vs Create Account
  const tabSignIn = document.getElementById('tabSignIn');
  const tabCreate = document.getElementById('tabCreateAccount');
  if (tabSignIn && tabCreate) {
    tabSignIn.onclick = (e) => {
      e.stopPropagation();
      setTerminalStep(1, 'signin');
      setConsoleMessage('> SIGN IN MODE ACTIVE.', 'info');
    };
    tabCreate.onclick = (e) => {
      e.stopPropagation();
      setTerminalStep(1, 'create');
      setConsoleMessage('> CREATE ACCOUNT MODE ACTIVE. CONNECT CREDENTIALS.', 'info');
    };
  }

  // Navigation between Step 1 and Step 2
  const btnContinue = document.getElementById('btnContinueToCallsign');
  const btnBack = document.getElementById('btnBackToStep1');
  const emailInput = document.getElementById('authEmailInput');
  const passInput = document.getElementById('authPasswordInput');
  const callsignInput = document.getElementById('authCallsignInput');

  if (btnContinue) {
    btnContinue.onclick = (e) => {
      e.stopPropagation();
      const email = (emailInput?.value || '').trim();
      const password = passInput?.value || '';

      if (!email || !email.includes('@')) {
        setConsoleMessage('> ERROR: VALID EMAIL ADDRESS REQUIRED.', 'error');
        return;
      }
      if (password.length < 6) {
        setConsoleMessage('> ERROR: PASSKEY REQUIRES MINIMUM 6 CHARACTERS.', 'error');
        return;
      }

      // Pre-fill smart callsign if not explicitly set
      if (callsignInput && (!callsignInput.value || callsignInput.value.startsWith('GUEST_'))) {
        const derived = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 16);
        callsignInput.value = derived || (authManager.currentUser?.handle || 'PROGRAM_01');
      }

      setTerminalStep(2, 'create');
      setConsoleMessage('> STEP 2: CHOOSE YOUR COMBAT CALLSIGN.', 'info');
    };
  }

  if (btnBack) {
    btnBack.onclick = (e) => {
      e.stopPropagation();
      setTerminalStep(1, 'create');
      setConsoleMessage('> STEP 1: CREDENTIALS.', 'info');
    };
  }

  // Callsign Commitment / Save handler
  const btnSaveCallsign = document.getElementById('btnSaveCallsign');
  const commitCallsign = async () => {
    if (!callsignInput) return;
    const raw = callsignInput.value.trim();
    try {
      await authManager.updateCallsign(raw);
      setConsoleMessage(`> CALLSIGN UPDATED: "${authManager.currentUser.handle}" HARMONIZED TO LOCAL STORAGE.`, 'success');
    } catch (err) {
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
        if (activeStep === 2) {
          handleRegister();
        } else {
          commitCallsign();
        }
      }
    });
  }

  // Step 1: Direct Passkey Sign In (Single-Step Bypass)
  const btnAuthorize = document.getElementById('btnAuthorizePasskey');
  const handleSignIn = async () => {
    const email = (emailInput?.value || '').trim();
    const password = passInput?.value || '';

    if (!email || !email.includes('@')) {
      setConsoleMessage('> ERROR: VALID EMAIL REQUIRED.', 'error');
      return;
    }
    if (password.length < 6) {
      setConsoleMessage('> ERROR: PASSKEY REQUIRES MINIMUM 6 CHARACTERS.', 'error');
      return;
    }

    try {
      const user = await authManager.signInWithCredentials(email, password);
      setConsoleMessage(`> ACCESS GRANTED // USER AUTHORIZED AS "${user.handle}" [PROV: PASSKEY]`, 'success');
      populateTerminalData();
      setTimeout(() => hideAuthTerminal(), 600);
    } catch (err) {
      setConsoleMessage(`> AUTH ERROR: ${err.message}`, 'error');
    }
  };

  if (btnAuthorize) {
    btnAuthorize.onclick = (e) => { e.stopPropagation(); handleSignIn(); };
  }

  // Step 2: Final Account Creation & Callsign Registration
  const btnRegister = document.getElementById('btnRegisterPasskey');
  const handleRegister = async () => {
    const email = (emailInput?.value || '').trim();
    const password = passInput?.value || '';
    const desiredHandle = (callsignInput?.value || '').trim();

    if (!desiredHandle || desiredHandle.length < 3) {
      setConsoleMessage('> ERROR: CALLSIGN REQUIRES AT LEAST 3 CHARACTERS.', 'error');
      return;
    }

    try {
      const user = await authManager.signInWithCredentials(email, password, desiredHandle);
      setConsoleMessage(`> IDENTITY INITIALIZED // WELCOME TO THE GRID, ${user.handle}`, 'success');
      populateTerminalData();
      setTimeout(() => hideAuthTerminal(), 600);
    } catch (err) {
      setConsoleMessage(`> REGISTRATION ERROR: ${err.message}`, 'error');
    }
  };

  if (btnRegister) {
    btnRegister.onclick = (e) => { e.stopPropagation(); handleRegister(); };
  }

  // Magic Link OTP
  const btnMagicLink = document.getElementById('btnMagicLink');
  if (btnMagicLink) {
    btnMagicLink.onclick = async (e) => {
      e.stopPropagation();
      const email = (emailInput?.value || '').trim();
      if (!email || !email.includes('@')) {
        setConsoleMessage('> ERROR: VALID EMAIL REQUIRED FOR MAGIC LINK.', 'error');
        return;
      }
      try {
        await authManager.signInWithCredentials(email, '');
        setConsoleMessage(`> MAGIC LINK DISPATCHED TO ${email}. CHECK INBOX.`, 'success');
      } catch (err) {
        setConsoleMessage(`> MAGIC LINK ERROR: ${err.message}`, 'error');
      }
    };
  }

  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeMode === 'signin') {
          handleSignIn();
        } else {
          btnContinue?.click();
        }
      }
    });
  }

  // Quick Sync (Google / Discord / GitHub)
  const btnGoogle = document.getElementById('btnSyncGoogle');
  const btnDiscord = document.getElementById('btnSyncDiscord');
  const btnGithub = document.getElementById('btnSyncGithub');

  const handleFederatedSync = async (providerName) => {
    try {
      const user = await authManager.signInWithFederated(providerName);

      if (activeMode === 'signin') {
        // Returning user - bypass Step 2
        setConsoleMessage(`> FEDERATED SYNC SUCCESSFUL // LINKED AS "${user?.handle || 'PROGRAM'}"`, 'success');
        populateTerminalData();
        setTimeout(() => hideAuthTerminal(), 600);
      } else {
        // Creating new account - transition to Step 2 so player can review/customize callsign
        if (callsignInput) {
          callsignInput.value = (user?.handle || `${providerName.toUpperCase()}_PILOT`).slice(0, 16);
        }
        setTerminalStep(2, 'create');
        setConsoleMessage(`> ${providerName.toUpperCase()} LINKED. CONFIRM YOUR COMBAT CALLSIGN.`, 'info');
      }
    } catch (err) {
      setConsoleMessage(`> FEDERATED SYNC FAILED: ${err.message}`, 'error');
    }
  };

  if (btnGoogle) {
    btnGoogle.onclick = (e) => { e.stopPropagation(); handleFederatedSync('google'); };
  }
  if (btnDiscord) {
    btnDiscord.onclick = (e) => { e.stopPropagation(); handleFederatedSync('discord'); };
  }
  if (btnGithub) {
    btnGithub.onclick = (e) => { e.stopPropagation(); handleFederatedSync('github'); };
  }

  // Legacy tab bridging (for tests or backward-compatibility)
  const tabDirect = document.getElementById('tabDirectPasskey');
  const tabQuick = document.getElementById('tabQuickSync');
  if (tabDirect) {
    tabDirect.onclick = (e) => {
      e.stopPropagation();
      setTerminalStep(1, 'signin');
    };
  }
  if (tabQuick) {
    tabQuick.onclick = (e) => {
      e.stopPropagation();
      setTerminalStep(1, 'signin');
    };
  }
}

if (typeof window !== 'undefined') {
  window.__tronShowAuthTerminal = showAuthTerminal;
  window.__tronHideAuthTerminal = hideAuthTerminal;
  window.__tronUpdateIdentityHeader = updateIdentityHeader;
  window.__tronSetTerminalStep = setTerminalStep;
}
