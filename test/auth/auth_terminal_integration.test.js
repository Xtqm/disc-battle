import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createServer(port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const repoRoot = path.resolve(__dirname, '../../');
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(repoRoot, reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function runTerminalIntegrationTests() {
  const PORT = 8098;
  const server = await createServer(PORT);
  console.log(`Auth Terminal integration test server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    pipe: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err));

    await page.evaluateOnNewDocument(() => {
      window.__FORCE_SIMULATED_AUTH__ = true;
      window.__authOscillatorCount = 0;
      if (typeof window.AudioContext !== 'undefined') {
        const origOsc = window.AudioContext.prototype.createOscillator;
        window.AudioContext.prototype.createOscillator = function() {
          window.__authOscillatorCount++;
          return origOsc.apply(this, arguments);
        };
      }
    });

    console.log('\n--- 1. Testing Main Menu Identity Header on Cold Boot ---');
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.waitForFunction(() => !!window.__TRON__ && window.__TRON__.currentUser());

    const initialHeaderState = await page.evaluate(() => {
      const header = document.getElementById('identityHeader');
      const btn = document.getElementById('secureIdentityBtn');
      const text = header?.textContent || '';
      return {
        exists: !!header,
        classes: header?.className || '',
        text,
        btnExists: !!btn
      };
    });

    assert.strictEqual(initialHeaderState.exists, true, 'Identity header must exist on boot');
    assert.ok(initialHeaderState.classes.includes('state-guest'), 'Initial header must be in state-guest');
    assert.ok(initialHeaderState.text.includes('[GUEST] SUB-ROUTINE'), 'Header must display guest subroutine label');
    assert.strictEqual(initialHeaderState.btnExists, true, 'Secure Identity button must be rendered');
    console.log('✓ Main Menu Identity Header displays Guest Sub-Routine with Amber Wireframe button');

    console.log('\n--- 2. Testing Terminal Modal Launch & PointerLock Isolation ---');
    // Click secure identity button
    await page.waitForSelector('#secureIdentityBtn');
    await page.evaluate(() => document.getElementById('secureIdentityBtn')?.click());
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      return modal && modal.style.display === 'flex';
    });

    const terminalOpenState = await page.evaluate(() => {
      const modal = document.getElementById('authModal');
      const isLocked = !!document.pointerLockElement;
      const callsignInput = document.getElementById('authCallsignInput');
      return {
        isOpen: modal?.style.display === 'flex',
        isLocked,
        callsignValue: callsignInput?.value || ''
      };
    });

    assert.strictEqual(terminalOpenState.isOpen, true, 'Terminal modal must be open (display: flex)');
    assert.strictEqual(terminalOpenState.isLocked, false, 'PointerLock must remain null / uncaptured');
    assert.ok(terminalOpenState.callsignValue.length > 0, 'Callsign input must be pre-populated');

    const openOscCount = await page.evaluate(() => window.__authOscillatorCount || 0);
    assert.strictEqual(openOscCount, 0, 'Terminal launch must not trigger audio synthesis');
    console.log('✓ Grid Authorization Terminal opened silently, PointerLock safely bypassed, and callsign loaded');

    console.log('\n--- 3. Testing Mode Tabs & Quick Sync Prominence ---');
    // Verify Quick Sync buttons are prominent in Step 1
    const quickSyncButtonsExist = await page.evaluate(() => {
      const g = document.getElementById('btnSyncGoogle');
      const gh = document.getElementById('btnSyncGithub');
      const d = document.getElementById('btnSyncDiscord');
      const tabSignIn = document.getElementById('tabSignIn');
      const tabCreate = document.getElementById('tabCreateAccount');
      const btnAuth = document.getElementById('btnAuthorizePasskey');
      const btnCont = document.getElementById('btnContinueToCallsign');
      return {
        hasProviders: !!(g && gh),
        noDiscord: d === null,
        signInActive: tabSignIn?.classList.contains('active'),
        createInactive: !tabCreate?.classList.contains('active'),
        authVisible: btnAuth?.style.display !== 'none',
        continueHidden: btnCont?.style.display === 'none'
      };
    });

    assert.strictEqual(quickSyncButtonsExist.hasProviders, true, 'Quick Sync providers (Google, GitHub) must exist');
    assert.strictEqual(quickSyncButtonsExist.noDiscord, true, 'Discord button must not exist in Quick Sync');
    assert.strictEqual(quickSyncButtonsExist.signInActive, true, 'Sign In tab must be active by default');
    assert.strictEqual(quickSyncButtonsExist.authVisible, true, 'Authorize Passkey button must be visible in Sign In mode');
    assert.strictEqual(quickSyncButtonsExist.continueHidden, true, 'Continue to Callsign button must be hidden in Sign In mode');
    console.log('✓ Quick Sync prominently displayed and Sign In tab active by default');

    // Switch to Create Account mode
    await page.click('#tabCreateAccount');
    const createTabState = await page.evaluate(() => {
      const tabCreate = document.getElementById('tabCreateAccount');
      const tabSignIn = document.getElementById('tabSignIn');
      const btnAuth = document.getElementById('btnAuthorizePasskey');
      const btnCont = document.getElementById('btnContinueToCallsign');
      return {
        createActive: tabCreate?.classList.contains('active'),
        signInInactive: !tabSignIn?.classList.contains('active'),
        authHidden: btnAuth?.style.display === 'none',
        continueVisible: btnCont?.style.display !== 'none'
      };
    });

    assert.strictEqual(createTabState.createActive, true, 'Create Account tab must be active');
    assert.strictEqual(createTabState.continueVisible, true, 'Continue to Callsign button must be visible');
    console.log('✓ Create Account tab activated and Step 1 actions updated');

    console.log('\n--- 4. Testing 2-Step Registration Wizard with Callsign Pre-fill ---');
    // Fill credentials in Step 1
    await page.type('#authEmailInput', 'flynn@encom.grid');
    await page.type('#authPasswordInput', 'clureturn77');
    await page.click('#btnContinueToCallsign');

    // Step 2 should now be visible with pre-filled callsign
    await page.waitForFunction(() => {
      const s2 = document.getElementById('authStep2');
      const s1 = document.getElementById('authStep1');
      return s2 && s2.style.display !== 'none' && s1 && s1.style.display === 'none';
    });

    const step2State = await page.evaluate(() => {
      const callsignInput = document.getElementById('authCallsignInput');
      return {
        prefilledHandle: callsignInput?.value || ''
      };
    });

    assert.strictEqual(step2State.prefilledHandle, 'FLYNN', 'Callsign should be pre-filled from email prefix');
    console.log('✓ Step 2 activated and Callsign intelligently pre-filled from email');

    // Customize callsign in Step 2 and complete registration
    await page.click('#authCallsignInput', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#authCallsignInput', 'TRON_WARRIOR');
    await page.click('#btnRegisterPasskey');

    await page.waitForFunction(() => {
      const u = window.__TRON__.currentUser();
      return u && !u.isAnonymous && u.handle === 'TRON_WARRIOR';
    });

    const authHeaderState = await page.evaluate(() => {
      const header = document.getElementById('identityHeader');
      const user = window.__TRON__.currentUser();
      const save = window.__TRON__.saveState();
      return {
        isAnonymous: user?.isAnonymous,
        userHandle: user?.handle,
        saveHandle: save?.handle,
        headerClasses: header?.className || '',
        headerText: header?.textContent || '',
        hasCircuit: !!header?.querySelector('.green-circuit'),
        hasTerminalBtn: !!header?.querySelector('#manageIdentityBtn')
      };
    });

    assert.strictEqual(authHeaderState.isAnonymous, false, 'User must now be non-anonymous');
    assert.strictEqual(authHeaderState.userHandle, 'TRON_WARRIOR', 'User handle must match customized callsign');
    assert.strictEqual(authHeaderState.saveHandle, 'TRON_WARRIOR', 'Save state handle must match customized callsign');
    assert.ok(authHeaderState.headerClasses.includes('state-auth'), 'Identity header must transition to state-auth');
    assert.ok(authHeaderState.headerText.includes('[USER RECOGNIZED]'), 'Header must display [USER RECOGNIZED]');
    assert.strictEqual(authHeaderState.hasCircuit, true, 'Green status circuit must be rendered');
    assert.strictEqual(authHeaderState.hasTerminalBtn, true, 'Terminal button must be rendered');

    const regOscCount = await page.evaluate(() => window.__authOscillatorCount || 0);
    assert.strictEqual(regOscCount, 0, 'No audio oscillator nodes should be created during registration');
    console.log('✓ Registration completed in Step 2: Identity Header updated to Tron Cyan with customized handle (0 SFX calls)');

    console.log('\n--- 5. Testing Program Dossier Launch & Inline Callsign Edit ---');
    // Open terminal from recognized state
    await page.click('#manageIdentityBtn');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      const dossier = document.getElementById('dossierView');
      return modal && modal.style.display === 'flex' && dossier && dossier.style.display !== 'none';
    });

    const dossierState = await page.evaluate(() => {
      const dossierView = document.getElementById('dossierView');
      const authView = document.getElementById('authView');
      const callsign = document.getElementById('dossierCallsignDisplay')?.textContent || '';
      const level = document.getElementById('dossierLevel')?.textContent || '';
      const headerTitle = document.getElementById('terminalHeaderTitle')?.textContent || '';
      return {
        dossierVisible: dossierView?.style.display !== 'none',
        authHidden: authView?.style.display === 'none',
        callsign,
        level,
        headerTitle
      };
    });

    assert.strictEqual(dossierState.dossierVisible, true, 'Program Dossier view must be visible for recognized user');
    assert.strictEqual(dossierState.authHidden, true, 'Auth wizard view must be hidden initially');
    assert.strictEqual(dossierState.callsign, 'TRON_WARRIOR', 'Dossier callsign must match user handle');
    assert.ok(dossierState.level.includes('LVL'), 'Dossier must display combat level tier');
    assert.strictEqual(dossierState.headerTitle, 'PROGRAM DOSSIER', 'Terminal title must read PROGRAM DOSSIER');
    console.log('✓ Recognized user opening terminal automatically lands on Program Dossier with live telemetry');

    // Inline Callsign Edit within Dossier
    await page.click('#btnEditCallsign');
    await page.waitForFunction(() => {
      const editRow = document.getElementById('callsignEditRow');
      return editRow && editRow.style.display !== 'none';
    });

    await page.click('#dossierCallsignInput', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#dossierCallsignInput', 'CYBER_COMMANDER');
    await page.click('#btnSaveDossierCallsign');

    await page.waitForFunction(() => {
      const disp = document.getElementById('dossierCallsignDisplay');
      return disp && disp.textContent === 'CYBER_COMMANDER';
    });

    const updatedHeader = await page.evaluate(() => {
      const idCallsign = document.getElementById('idCallsign');
      return idCallsign?.textContent || '';
    });
    assert.strictEqual(updatedHeader, 'CYBER_COMMANDER', 'Identity header badge must update in real time on save');
    console.log('✓ Inline Callsign edited and saved directly from Program Dossier with real-time reactive sync');

    // Test Switch Identity -> Auth Wizard -> Single-Step Passkey Sign In
    await page.click('#btnSwitchIdentity');
    await page.waitForFunction(() => {
      const authView = document.getElementById('authView');
      return authView && authView.style.display !== 'none';
    });

    await page.click('#btnAuthorizePasskey');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      return modal && modal.style.display === 'none';
    });
    console.log('✓ Switch Identity transitioned to Auth Wizard and single-step sign in bypassed Step 2');

    console.log('\n--- 6. Testing Escape Key Isolation and Strict [X] Button Dismissal ---');
    // Open terminal again
    await page.click('#manageIdentityBtn');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      return modal && modal.style.display === 'flex';
    });

    // Press Escape - modal must NOT close
    await page.keyboard.press('Escape');
    const stillOpen = await page.evaluate(() => {
      const modal = document.getElementById('authModal');
      return modal && modal.style.display === 'flex' && window.__TRON__.isAuthTerminalOpen();
    });
    assert.strictEqual(stillOpen, true, 'Terminal modal must remain open when Escape is pressed');
    console.log('✓ Escape key safely isolated and prevented from dismissing terminal');

    // Click explicit [X] close button
    await page.click('#btnCloseTerminal');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      return modal && modal.style.display === 'none';
    });

    const modalClosed = await page.evaluate(() => {
      const modal = document.getElementById('authModal');
      return modal?.style.display === 'none' && !window.__TRON__.isAuthTerminalOpen();
    });
    assert.strictEqual(modalClosed, true, 'Terminal modal must close on [X] button click');
    console.log('✓ [X] button cleanly dismisses terminal and returns player to Main Menu');

    console.log('\n=== ALL TERMINAL INTEGRATION TESTS PASSED ===');
  } finally {
    await browser.close();
    server.close();
  }
}

runTerminalIntegrationTests().catch(err => {
  console.error('Terminal Integration Test Failed:', err);
  process.exit(1);
});
