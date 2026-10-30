import { state } from '../core/state.js';
import { authManager } from '../auth/AuthManager.js';
import { AuthEvents } from '../auth/events.js';
import { setCursor } from '../input/InputManager.js';

let activeStep = 1;
let activeMode = 'signin'; // 'signin' | 'create'
let activeView = 'dossier'; // 'dossier' | 'auth'

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
 * Sets the active terminal view ('dossier' | 'auth').
 * @param {'dossier'|'auth'} view
 */
export function setTerminalView(view) {
  activeView = view;
  if (typeof document === 'undefined') return;

  const dossierView = document.getElementById('dossierView');
  const authView = document.getElementById('authView');
  const headerTitle = document.getElementById('terminalHeaderTitle');
  const headerSub = document.getElementById('terminalHeaderSub');
  const returnToDossierRow = document.getElementById('returnToDossierRow');
  const user = authManager.currentUser;
  const isAuth = user && !user.isAnonymous;

  if (view === 'dossier') {
    if (dossierView) dossierView.style.display = 'block';
    if (authView) authView.style.display = 'none';
    if (headerTitle) headerTitle.textContent = 'PROGRAM DOSSIER';
    if (headerSub) headerSub.textContent = 'GRID TELEMETRY & IDENTITY MATRIX';

    // Reset inline callsign edit row
    const displayRow = document.getElementById('callsignDisplayRow');
    const editRow = document.getElementById('callsignEditRow');
    if (displayRow) displayRow.style.display = 'flex';
    if (editRow) editRow.style.display = 'none';
  } else {
    if (dossierView) dossierView.style.display = 'none';
    if (authView) authView.style.display = 'block';
    if (headerTitle) headerTitle.textContent = 'GRID IDENTITY TERMINAL';
    if (headerSub) headerSub.textContent = 'SYNC PROGRESSION & PROFILE';
    if (returnToDossierRow) {
      returnToDossierRow.style.display = isAuth ? 'block' : 'none';
    }
  }
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

  populateTerminalData();
  populateDossierData();

  const user = authManager.currentUser;
  const isAuth = user && !user.isAnonymous;

  if (isAuth) {
    setTerminalView('dossier');
    setConsoleMessage(`> DOSSIER LOADED FOR PROGRAM "${user.handle}". AWAITING INPUT...`, 'info');
  } else {
    setTerminalView('auth');
    setTerminalStep(1, 'signin');
    setConsoleMessage('> TERMINAL READY. AWAITING INPUT...', 'info');
    const emailInput = document.getElementById('authEmailInput');
    if (emailInput) {
      setTimeout(() => emailInput.focus(), 60);
    }
  }

  modal.style.display = 'flex';
  const card = modal.querySelector('.card');
  if (card) card.scrollTop = 0;
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
 * Populates live telemetry and callsign in the Program Dossier view.
 */
export function populateDossierData() {
  if (typeof document === 'undefined') return;
  const user = authManager.currentUser;
  const saveState = authManager.saveState;
  const level = calculateLevel(saveState);
  const levelStr = String(level).padStart(2, '0');

  const callsignDisplay = document.getElementById('dossierCallsignDisplay');
  const callsignInput = document.getElementById('dossierCallsignInput');
  const levelEl = document.getElementById('dossierLevel');
  const bitsEl = document.getElementById('dossierBits');
  const waveEl = document.getElementById('dossierHighestWave');
  const scoreEl = document.getElementById('dossierTotalScore');
  const matchesEl = document.getElementById('dossierMatches');
  const authTypeEl = document.getElementById('dossierAuthType');

  const handle = (user?.handle || 'PROGRAM').toUpperCase();
  if (callsignDisplay) callsignDisplay.textContent = handle;
  if (callsignInput) callsignInput.value = user?.handle || '';

  if (levelEl) levelEl.textContent = `LVL ${levelStr}`;
  if (bitsEl) bitsEl.textContent = `${(saveState?.bits || 0).toLocaleString()} BITS`;

  const highestWave = saveState?.stats?.highestWave || 1;
  if (waveEl) waveEl.textContent = `WAVE ${String(highestWave).padStart(2, '0')}`;

  const totalScore = saveState?.stats?.totalScore || 0;
  if (scoreEl) scoreEl.textContent = `${totalScore.toLocaleString()} PTS`;

  const matches = saveState?.stats?.matchesPlayed || 0;
  if (matchesEl) matchesEl.textContent = String(matches.toLocaleString());

  if (authTypeEl) {
    if (user && !user.isAnonymous) {
      const provider = (user.provider || 'GRID CLOUD').toUpperCase();
      authTypeEl.textContent = `AUTHORIZED // ${provider}`;
    } else {
      authTypeEl.textContent = 'TRANSIENT GUEST';
    }
  }
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
    if (isAuthTerminalOpen()) {
      populateTerminalData();
      populateDossierData();
    }
  });
  authManager.on(AuthEvents.PROFILE_UPDATED, () => {
    updateIdentityHeader();
    if (isAuthTerminalOpen()) {
      populateTerminalData();
      populateDossierData();
    }
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

  // Quick Sync (Google / GitHub)
  const btnGoogle = document.getElementById('btnSyncGoogle');
  const btnGithub = document.getElementById('btnSyncGithub');

  const handleFederatedSync = async (providerName) => {
    try {
      setConsoleMessage(`> CONNECTING TO ${providerName.toUpperCase()} GRID CLUSTER...`, 'info');
      const result = await authManager.signInWithFederated(providerName);

      if (result && !result.uid && result.url) {
        setConsoleMessage(`> REDIRECTING TO ${providerName.toUpperCase()} AUTH GATEWAY...`, 'info');
        return;
      }

      const user = result;
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
      const msg = err.message || '';
      let cleanMsg = msg;
      if (msg.includes('provider_not_enabled') || msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
        cleanMsg = `PROVIDER "${providerName.toUpperCase()}" NOT ACTIVATED IN CLUSTER DASHBOARD`;
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        cleanMsg = 'GRID CONNECTION INTERRUPTED // RETRYING VIA OFFLINE BUFFER';
      }
      setConsoleMessage(`> FEDERATED SYNC FAILED: ${cleanMsg}`, 'error');
    }
  };

  if (btnGoogle) {
    btnGoogle.onclick = (e) => { e.stopPropagation(); handleFederatedSync('google'); };
  }
  if (btnGithub) {
    btnGithub.onclick = (e) => { e.stopPropagation(); handleFederatedSync('github'); };
  }

  // Inline Callsign Editing in Program Dossier
  const btnEditCallsign = document.getElementById('btnEditCallsign');
  const btnSaveDossierCallsign = document.getElementById('btnSaveDossierCallsign');
  const btnCancelEditCallsign = document.getElementById('btnCancelEditCallsign');
  const displayRow = document.getElementById('callsignDisplayRow');
  const editRow = document.getElementById('callsignEditRow');
  const dossierInput = document.getElementById('dossierCallsignInput');

  if (btnEditCallsign) {
    btnEditCallsign.onclick = (e) => {
      e.stopPropagation();
      if (displayRow) displayRow.style.display = 'none';
      if (editRow) editRow.style.display = 'flex';
      if (dossierInput) {
        dossierInput.value = authManager.currentUser?.handle || '';
        setTimeout(() => {
          dossierInput.focus();
          dossierInput.select();
        }, 50);
      }
      setConsoleMessage('> ENTER NEW CALLSIGN (3-16 CHARACTERS, ALPHANUMERIC OR _).', 'info');
    };
  }

  const cancelDossierEdit = () => {
    if (displayRow) displayRow.style.display = 'flex';
    if (editRow) editRow.style.display = 'none';
    setConsoleMessage('> CALLSIGN EDIT CANCELLED.', 'info');
  };

  if (btnCancelEditCallsign) {
    btnCancelEditCallsign.onclick = (e) => {
      e.stopPropagation();
      cancelDossierEdit();
    };
  }

  const saveDossierCallsign = async () => {
    if (!dossierInput) return;
    const raw = (dossierInput.value || '').trim();
    if (!raw || raw.length < 3 || raw.length > 16 || !/^[a-zA-Z0-9_]+$/.test(raw)) {
      setConsoleMessage('> ERROR: CALLSIGN MUST BE 3-16 ALPHANUMERIC CHARS OR UNDERSCORES.', 'error');
      return;
    }
    try {
      await authManager.updateCallsign(raw);
      if (displayRow) displayRow.style.display = 'flex';
      if (editRow) editRow.style.display = 'none';
      populateDossierData();
      populateTerminalData();
      updateIdentityHeader();
      setConsoleMessage(`> CALLSIGN UPDATED: "${authManager.currentUser.handle}" HARMONIZED TO GRID.`, 'success');
    } catch (err) {
      setConsoleMessage(`> ERROR: ${err.message}`, 'error');
    }
  };

  if (btnSaveDossierCallsign) {
    btnSaveDossierCallsign.onclick = (e) => {
      e.stopPropagation();
      saveDossierCallsign();
    };
  }

  if (dossierInput) {
    dossierInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveDossierCallsign();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelDossierEdit();
      }
    });
  }

  // View Switchers: [ SWITCH IDENTITY / SIGN OUT ] and Return to Dossier
  const btnSwitchIdentity = document.getElementById('btnSwitchIdentity');
  if (btnSwitchIdentity) {
    btnSwitchIdentity.onclick = (e) => {
      e.stopPropagation();
      setTerminalView('auth');
      setTerminalStep(1, 'signin');
      setConsoleMessage('> AUTH WIZARD ACTIVE. CONNECT DIFFERENT CREDENTIALS.', 'info');
    };
  }

  const btnReturnToDossier = document.getElementById('btnReturnToDossier');
  if (btnReturnToDossier) {
    btnReturnToDossier.onclick = (e) => {
      e.stopPropagation();
      setTerminalView('dossier');
      populateDossierData();
      setConsoleMessage('> RETURNED TO PROGRAM DOSSIER.', 'info');
    };
  }

  // Terminal Hub Navigation Tabs
  const tabHubIdent = document.getElementById('tabHubIdent');
  const tabHubLoadout = document.getElementById('tabHubLoadout');
  const tabHubDirectives = document.getElementById('tabHubDirectives');

  if (tabHubIdent) {
    tabHubIdent.onclick = (e) => {
      e.stopPropagation();
      const user = authManager.currentUser;
      if (user && !user.isAnonymous) {
        setTerminalView('dossier');
        populateDossierData();
      } else {
        setTerminalView('auth');
      }
    };
  }
  if (tabHubLoadout) {
    tabHubLoadout.onclick = (e) => {
      e.stopPropagation();
      setConsoleMessage('> LOADOUT / ARMORY INTEGRATION SCHEDULED FOR PHASE 2.', 'info');
    };
  }
  if (tabHubDirectives) {
    tabHubDirectives.onclick = (e) => {
      e.stopPropagation();
      setConsoleMessage('> DIRECTIVES / ACHIEVEMENTS INTEGRATION SCHEDULED FOR PHASE 2.', 'info');
    };
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
  window.__tronSetTerminalView = setTerminalView;
  window.__tronPopulateDossierData = populateDossierData;
}
