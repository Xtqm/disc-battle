import assert from 'assert';
import { getIdentityHeaderHtml, calculateLevel } from '../../src/ui/authTerminal.js';
import { authManager } from '../../src/auth/AuthManager.js';
import { AuthEvents, authEventBus } from '../../src/auth/events.js';

console.log('--- Running Main Menu Identity Header Unit Tests ---');

// 1. Level calculation tests
assert.strictEqual(calculateLevel(null), 1, 'Default level without saveState must be 1');
assert.strictEqual(calculateLevel({ stats: { totalScore: 0, highestWave: 1 } }), 1, 'Score 0, wave 1 is level 1');
assert.strictEqual(calculateLevel({ stats: { totalScore: 1250, highestWave: 3 } }), 5, 'Score 1250 / 500 = 2 + wave 3 = level 5');
console.log('✓ calculateLevel accurately computes player progression tier');

// 2. Guest Identity State HTML
const guestUser = {
  uid: '38148b52-25e6-42f1-bc84-9844ca152432',
  handle: 'GUEST_SUBROUTINE_3814',
  isAnonymous: true
};
const guestHtml = getIdentityHeaderHtml(guestUser, { stats: { totalScore: 0, highestWave: 1 } });
assert.ok(guestHtml.includes('amber-wireframe'), 'Guest badge must use amber wireframe styling');
assert.ok(guestHtml.includes('[GUEST] SUB-ROUTINE // ID:'), 'Guest badge must display guest subroutine label');
assert.ok(guestHtml.includes('3814'), 'Guest badge must display the short ID code');
assert.ok(guestHtml.includes('pulse-amber'), 'Guest button must include pulsating amber animation class');
assert.ok(guestHtml.includes('[ SECURE IDENTITY ]'), 'Guest badge must provide [ SECURE IDENTITY ] action trigger');
console.log('✓ getIdentityHeaderHtml generates valid Guest Amber Wireframe UI');

// 3. Authenticated Identity State HTML
const authUser = {
  uid: 'auth-user-99',
  handle: 'FLYNN',
  isAnonymous: false
};
const authHtml = getIdentityHeaderHtml(authUser, { stats: { totalScore: 2500, highestWave: 4 } });
assert.ok(authHtml.includes('cyan-glow'), 'Authenticated badge must use Tron cyan glow styling');
assert.ok(authHtml.includes('green-circuit'), 'Authenticated badge must include green status circuit');
assert.ok(authHtml.includes('[USER RECOGNIZED]'), 'Authenticated badge must display USER RECOGNIZED');
assert.ok(authHtml.includes('FLYNN'), 'Authenticated badge must display user callsign');
assert.ok(authHtml.includes('LVL <span id="idLevel">09</span>'), 'Authenticated badge must display computed level tier (2500/500 + 4 = 09)');

assert.ok(authHtml.includes('[ TERMINAL ]'), 'Authenticated badge must include [ TERMINAL ] trigger');
console.log('✓ getIdentityHeaderHtml generates valid Authenticated Cyan Glowing UI');

// 4. Reactive Event Bus updates
let receivedEvent = null;
const unsub = authEventBus.on(AuthEvents.PROFILE_UPDATED, (payload) => {
  receivedEvent = payload;
});

await authManager.init();
const initialHandle = authManager.currentUser.handle;
await authManager.updateCallsign('GRID_RUNNER');
assert.strictEqual(authManager.currentUser.handle, 'GRID_RUNNER');
assert.notStrictEqual(receivedEvent, null, 'PROFILE_UPDATED event must be emitted on callsign update');
assert.strictEqual(receivedEvent.user.handle, 'GRID_RUNNER');
unsub();
console.log('✓ AuthManager.updateCallsign emits reactive profile update event');

// 5. Program Dossier view switching and population tests (Mock DOM)
const { setTerminalView, populateDossierData, showAuthTerminal, setTerminalHubTab } = await import('../../src/ui/authTerminal.js');

class MockDomElement {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.textContent = '';
    this.value = '';
    this.className = '';
    this.innerHTML = '';
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          classes.add(c); return true;
        }
        if (force) { classes.add(c); return true; }
        classes.delete(c); return false;
      }
    };
    this.focus = () => {};
    this.select = () => {};
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
}

const mockElements = {
  dossierView: new MockDomElement('dossierView'),
  authView: new MockDomElement('authView'),
  terminalHeaderTitle: new MockDomElement('terminalHeaderTitle'),
  terminalHeaderSub: new MockDomElement('terminalHeaderSub'),
  returnToDossierRow: new MockDomElement('returnToDossierRow'),
  callsignDisplayRow: new MockDomElement('callsignDisplayRow'),
  callsignEditRow: new MockDomElement('callsignEditRow'),
  dossierCallsignDisplay: new MockDomElement('dossierCallsignDisplay'),
  dossierCallsignInput: new MockDomElement('dossierCallsignInput'),
  dossierLevel: new MockDomElement('dossierLevel'),
  dossierBits: new MockDomElement('dossierBits'),
  dossierHighestWave: new MockDomElement('dossierHighestWave'),
  dossierTotalScore: new MockDomElement('dossierTotalScore'),
  dossierMatches: new MockDomElement('dossierMatches'),
  dossierAuthType: new MockDomElement('dossierAuthType'),
  authModal: new MockDomElement('authModal'),
  terminalStatusBanner: new MockDomElement('terminalStatusBanner'),
  terminalIdentityReadout: new MockDomElement('terminalIdentityReadout'),
  terminalConsoleMsg: new MockDomElement('terminalConsoleMsg'),
  authCallsignInput: new MockDomElement('authCallsignInput'),
  authEmailInput: new MockDomElement('authEmailInput'),
  authStep1: new MockDomElement('authStep1'),
  authStep2: new MockDomElement('authStep2'),
  tabSignIn: new MockDomElement('tabSignIn'),
  tabCreateAccount: new MockDomElement('tabCreateAccount'),
  btnAuthorizePasskey: new MockDomElement('btnAuthorizePasskey'),
  btnContinueToCallsign: new MockDomElement('btnContinueToCallsign'),
  tabHubIdent: new MockDomElement('tabHubIdent'),
  tabHubLoadout: new MockDomElement('tabHubLoadout'),
  tabHubDirectives: new MockDomElement('tabHubDirectives'),
  hubLoadoutView: new MockDomElement('hubLoadoutView'),
  hubDirectivesView: new MockDomElement('hubDirectivesView'),
};

globalThis.document = {
  getElementById: (id) => mockElements[id] || null,
  querySelector: () => null,
  activeElement: new MockDomElement('BODY'),
  pointerLockElement: null,
  exitPointerLock: () => {}
};

// Test setTerminalView('dossier')
setTerminalView('dossier');
assert.strictEqual(mockElements.dossierView.style.display, 'block', 'Dossier view must be displayed in dossier mode');
assert.strictEqual(mockElements.authView.style.display, 'none', 'Auth view must be hidden in dossier mode');
assert.strictEqual(mockElements.terminalHeaderTitle.textContent, 'PROGRAM DOSSIER', 'Header title must update to PROGRAM DOSSIER');
assert.strictEqual(mockElements.callsignDisplayRow.style.display, 'flex', 'Callsign display row must be visible');
assert.strictEqual(mockElements.callsignEditRow.style.display, 'none', 'Callsign edit row must be hidden');
console.log('✓ setTerminalView("dossier") accurately configures dossier UI elements');

// Test setTerminalView('auth')
setTerminalView('auth');
assert.strictEqual(mockElements.dossierView.style.display, 'none', 'Dossier view must be hidden in auth mode');
assert.strictEqual(mockElements.authView.style.display, 'block', 'Auth view must be displayed in auth mode');
assert.strictEqual(mockElements.terminalHeaderTitle.textContent, 'GRID IDENTITY TERMINAL', 'Header title must update to GRID IDENTITY TERMINAL');
console.log('✓ setTerminalView("auth") accurately configures auth wizard elements');

// Test populateDossierData() with authenticated user saveState
authManager._currentUser = { uid: 'u-123', handle: 'GRID_RUNNER', isAnonymous: false, provider: 'google' };
authManager._saveState = {
  bits: 2450,
  stats: { totalScore: 3500, highestWave: 5, matchesPlayed: 14 }
};
populateDossierData();
assert.strictEqual(mockElements.dossierCallsignDisplay.textContent, 'GRID_RUNNER', 'Callsign display must show uppercase handle');
assert.strictEqual(mockElements.dossierCallsignInput.value, 'GRID_RUNNER', 'Callsign input must prefill with current handle');
assert.strictEqual(mockElements.dossierLevel.textContent, 'LVL 12', 'Level should be computed: 3500/500 + 5 = 12');
assert.strictEqual(mockElements.dossierBits.textContent, '2,450 BITS', 'Bits must be formatted with commas and BITS suffix');
assert.strictEqual(mockElements.dossierHighestWave.textContent, 'WAVE 05', 'Highest wave must be padded to 2 digits');
assert.strictEqual(mockElements.dossierTotalScore.textContent, '3,500 PTS', 'Total score must be formatted with PTS suffix');
assert.strictEqual(mockElements.dossierMatches.textContent, '14', 'Matches played must be populated');
assert.ok(mockElements.dossierAuthType.textContent.includes('GOOGLE'), 'Auth clearance status must include provider name');
console.log('✓ populateDossierData() properly renders telemetry matrix and clearance indicators');

// Test showAuthTerminal() view routing for authenticated user
showAuthTerminal();
assert.strictEqual(mockElements.dossierView.style.display, 'block', 'showAuthTerminal() must route authenticated user to dossier view');
assert.strictEqual(mockElements.authView.style.display, 'none', 'Auth wizard must remain hidden for authenticated user');
console.log('✓ showAuthTerminal() automatically routes authenticated users to Program Dossier');

// Test showAuthTerminal() view routing for guest user
authManager._currentUser = { uid: 'guest-99', handle: 'GUEST_99', isAnonymous: true };
showAuthTerminal();
assert.strictEqual(mockElements.dossierView.style.display, 'none', 'Dossier view must be hidden for guest user');
assert.strictEqual(mockElements.authView.style.display, 'block', 'showAuthTerminal() must route guest user to auth wizard');
console.log('✓ showAuthTerminal() automatically routes guest users to Auth Wizard Step 1');

// Test setTerminalHubTab('loadout')
setTerminalHubTab('loadout');
assert.ok(mockElements.tabHubLoadout.classList.contains('active'), 'tabHubLoadout must have active class');
assert.strictEqual(mockElements.tabHubIdent.classList.contains('active'), false, 'tabHubIdent must not be active');
assert.strictEqual(mockElements.terminalHeaderTitle.textContent, 'ARMORY & LOADOUT', 'Header title must update to ARMORY & LOADOUT');
assert.notStrictEqual(mockElements.hubLoadoutView.style.display, 'none', 'hubLoadoutView must be displayed');
assert.strictEqual(mockElements.dossierView.style.display, 'none', 'dossierView must be hidden');
console.log('✓ setTerminalHubTab("loadout") activates Loadout view and updates header titles');

// Test setTerminalHubTab('directives')
setTerminalHubTab('directives');
assert.ok(mockElements.tabHubDirectives.classList.contains('active'), 'tabHubDirectives must have active class');
assert.strictEqual(mockElements.tabHubLoadout.classList.contains('active'), false, 'tabHubLoadout must not be active');
assert.strictEqual(mockElements.terminalHeaderTitle.textContent, 'GRID DIRECTIVES', 'Header title must update to GRID DIRECTIVES');
assert.notStrictEqual(mockElements.hubDirectivesView.style.display, 'none', 'hubDirectivesView must be displayed');
assert.strictEqual(mockElements.hubLoadoutView.style.display, 'none', 'hubLoadoutView must be hidden');
console.log('✓ setTerminalHubTab("directives") activates Directives view and updates header titles');

// Test setTerminalHubTab('ident')
authManager._currentUser = { uid: 'u-123', handle: 'GRID_RUNNER', isAnonymous: false };
setTerminalHubTab('ident');
assert.ok(mockElements.tabHubIdent.classList.contains('active'), 'tabHubIdent must have active class');
assert.strictEqual(mockElements.tabHubDirectives.classList.contains('active'), false, 'tabHubDirectives must not be active');
assert.strictEqual(mockElements.hubLoadoutView.style.display, 'none', 'hubLoadoutView must be hidden');
assert.strictEqual(mockElements.hubDirectivesView.style.display, 'none', 'hubDirectivesView must be hidden');
assert.strictEqual(mockElements.dossierView.style.display, 'block', 'dossierView must be displayed for authenticated user');
console.log('✓ setTerminalHubTab("ident") restores Program Dossier view');

console.log('--- Main Menu Identity Header Unit Tests PASSED ---');
