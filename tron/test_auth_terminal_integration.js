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

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(__dirname, reqPath);
    if (!fs.existsSync(filePath)) {
      const rootPath = path.join(__dirname, '..', reqPath);
      if (fs.existsSync(rootPath)) {
        filePath = rootPath;
      }
    }

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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  try {
    const page = await browser.newPage();

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
    await page.click('#secureIdentityBtn');
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
    console.log('✓ Grid Authorization Terminal opened, PointerLock safely bypassed, and callsign loaded');

    console.log('\n--- 3. Testing Terminal Dual-Tab Interface ---');
    // Click Quick Sync tab
    await page.click('#tabQuickSync');
    const quickSyncTabState = await page.evaluate(() => {
      const tabQuick = document.getElementById('tabQuickSync');
      const tabDirect = document.getElementById('tabDirectPasskey');
      const panelQuick = document.getElementById('panelQuickSync');
      const panelDirect = document.getElementById('panelDirectPasskey');
      return {
        tabQuickActive: tabQuick?.classList.contains('active'),
        tabDirectActive: tabDirect?.classList.contains('active'),
        panelQuickVisible: panelQuick?.style.display === 'block',
        panelDirectHidden: panelDirect?.style.display === 'none'
      };
    });

    assert.strictEqual(quickSyncTabState.tabQuickActive, true, 'Quick Sync tab button must be active');
    assert.strictEqual(quickSyncTabState.tabDirectActive, false, 'Direct Passkey tab button must be inactive');
    assert.strictEqual(quickSyncTabState.panelQuickVisible, true, 'Quick Sync panel must be displayed');
    assert.strictEqual(quickSyncTabState.panelDirectHidden, true, 'Direct Passkey panel must be hidden');
    console.log('✓ Quick Sync tab activated and panel displayed');

    // Click Direct Passkey tab back
    await page.click('#tabDirectPasskey');
    const directTabActive = await page.evaluate(() => {
      const panelDirect = document.getElementById('panelDirectPasskey');
      return panelDirect?.style.display === 'block';
    });
    assert.strictEqual(directTabActive, true, 'Direct Passkey panel must be restored');
    console.log('✓ Direct Passkey tab restored');

    console.log('\n--- 4. Testing Callsign Customization & Save State Sync ---');
    // Clear and enter new callsign
    await page.click('#authCallsignInput', { clickCount: 3 });
    await page.type('#authCallsignInput', 'TRON_WARRIOR');
    await page.click('#btnSaveCallsign');

    await page.waitForFunction(() => {
      const u = window.__TRON__.currentUser();
      return u && u.handle === 'TRON_WARRIOR';
    });

    const callsignUpdateResult = await page.evaluate(() => {
      const user = window.__TRON__.currentUser();
      const save = window.__TRON__.saveState();
      const header = document.getElementById('identityHeader');
      return {
        userHandle: user?.handle,
        saveHandle: save?.handle,
        headerHtml: header?.innerHTML || ''
      };
    });

    assert.strictEqual(callsignUpdateResult.userHandle, 'TRON_WARRIOR', 'User handle must be updated');
    assert.strictEqual(callsignUpdateResult.saveHandle, 'TRON_WARRIOR', 'Save state handle must be updated');
    console.log('✓ Callsign customization validated, committed, and synced to persistent save state');

    console.log('\n--- 5. Testing Passkey Authentication & Header Cyan Transition ---');
    await page.type('#authEmailInput', 'flynn@encom.grid');
    await page.type('#authPasswordInput', 'clureturn77');
    await page.click('#btnAuthorizePasskey');

    await page.waitForFunction(() => {
      const u = window.__TRON__.currentUser();
      return u && !u.isAnonymous;
    });

    const authHeaderState = await page.evaluate(() => {
      const header = document.getElementById('identityHeader');
      const user = window.__TRON__.currentUser();
      return {
        isAnonymous: user?.isAnonymous,
        headerClasses: header?.className || '',
        headerText: header?.textContent || '',
        hasCircuit: !!header?.querySelector('.green-circuit'),
        hasTerminalBtn: !!header?.querySelector('#manageIdentityBtn')
      };
    });

    assert.strictEqual(authHeaderState.isAnonymous, false, 'User must now be non-anonymous');
    assert.ok(authHeaderState.headerClasses.includes('state-auth'), 'Identity header must transition to state-auth');
    assert.ok(authHeaderState.headerText.includes('[USER RECOGNIZED]'), 'Header must display [USER RECOGNIZED]');
    assert.strictEqual(authHeaderState.hasCircuit, true, 'Green status circuit must be rendered');
    assert.strictEqual(authHeaderState.hasTerminalBtn, true, 'Terminal button must be rendered');
    console.log('✓ User authenticated: Identity Header transitions to Tron Cyan glowing state with Green Circuit');

    console.log('\n--- 6. Testing Escape Key Terminal Dismissal ---');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      return modal && modal.style.display === 'none';
    });

    const modalClosed = await page.evaluate(() => {
      const modal = document.getElementById('authModal');
      return modal?.style.display === 'none' && !window.__TRON__.isAuthTerminalOpen();
    });
    assert.strictEqual(modalClosed, true, 'Terminal modal must be closed on Escape');
    console.log('✓ Escape key cleanly dismisses terminal and returns player to Main Menu');

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
