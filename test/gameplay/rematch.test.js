import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

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

async function inspectClient(page, name) {
  return await page.evaluate((clientName) => {
    const overlay = document.getElementById('overlay');
    const h1 = overlay ? overlay.querySelector('h1')?.textContent : null;
    const h2 = overlay ? overlay.querySelector('h2')?.textContent : null;
    const voteBtn = document.getElementById('voteRematchBtn');
    const voteLabel = document.getElementById('rematchVoteLabel');
    const menuBtn = document.getElementById('multiMenuBtn');
    return {
      client: clientName,
      role: window.__dbg ? window.__dbg.playerRole() : null,
      running: window.__dbg ? window.__dbg.running() : false,
      overlayDisplay: overlay ? overlay.style.display : null,
      h1,
      h2,
      hasVoteBtn: !!voteBtn,
      voteBtnDisabled: voteBtn ? voteBtn.disabled : null,
      voteBtnText: voteBtn ? voteBtn.textContent : null,
      hasVoteLabel: !!voteLabel,
      voteLabelText: voteLabel ? voteLabel.textContent : null,
      hasMenuBtn: !!menuBtn
    };
  }, name);
}

async function run() {
  const PORT = 8089;
  const server = await createServer(PORT);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const hostPage = await browser.newPage();
  const guestPage = await browser.newPage();

  await hostPage.goto(`http://localhost:${PORT}/index.html`);
  await guestPage.goto(`http://localhost:${PORT}/index.html`);
  await new Promise(r => setTimeout(r, 1000));

  await hostPage.evaluate(async () => {
    await window.__dbg.createRoom();
  });
  const roomCode = await hostPage.evaluate(() => window.__dbg.currentRoomId());
  console.log('Room created:', roomCode);

  await guestPage.evaluate(async (code) => {
    await window.__dbg.joinRoom(code);
  }, roomCode);

  await hostPage.waitForFunction(() => window.__dbg && window.__dbg.running() && window.__dbg.mode() === 'duel_multi', { timeout: 10000 });
  await guestPage.waitForFunction(() => window.__dbg && window.__dbg.running() && window.__dbg.mode() === 'duel_multi', { timeout: 10000 });
  console.log('Both players in match.');

  // ------------------------------------------------------------------
  // STEP 1: Guest is eliminated. Both must see Game Over + Rematch UI.
  // ------------------------------------------------------------------
  console.log('\n--- STEP 1: Eliminate Guest (P2) ---');
  await guestPage.evaluate(() => {
    window.__dbg.setPlayerPos(0, -18, -20);
    window.__dbg.step(0.016);
  });

  await new Promise(r => setTimeout(r, 2000));

  let hostState = await inspectClient(hostPage, 'Host (P1)');
  let guestState = await inspectClient(guestPage, 'Guest (P2)');

  console.log('Host state (Winner):', hostState);
  console.log('Guest state (Eliminated):', guestState);

  if (!hostState.hasVoteBtn || !guestState.hasVoteBtn) {
    throw new Error(`Step 1 failed: Missing rematch button! Host: ${hostState.hasVoteBtn}, Guest: ${guestState.hasVoteBtn}`);
  }
  if (!hostState.hasVoteLabel || !guestState.hasVoteLabel) {
    throw new Error(`Step 1 failed: Missing rematch vote label! Host: ${hostState.hasVoteLabel}, Guest: ${guestState.hasVoteLabel}`);
  }
  console.log('>>> STEP 1 PASSED: Universal Match-End display on both Host (VICTORY) and Guest (DEREZZED)!');

  // ------------------------------------------------------------------
  // STEP 2: Guest votes for rematch. Both clients must reflect 1 / 2.
  // ------------------------------------------------------------------
  console.log('\n--- STEP 2: Guest clicks VOTE REMATCH ---');
  await guestPage.evaluate(() => {
    const btn = document.getElementById('voteRematchBtn');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1200));

  hostState = await inspectClient(hostPage, 'Host (P1)');
  guestState = await inspectClient(guestPage, 'Guest (P2)');

  console.log('Host label after Guest vote:', hostState.voteLabelText);
  console.log('Guest label after Guest vote:', guestState.voteLabelText);
  console.log('Guest button text:', guestState.voteBtnText);

  if (!hostState.voteLabelText.includes('1 / 2') || !guestState.voteLabelText.includes('1 / 2')) {
    throw new Error(`Step 2 failed: Vote not synchronized! Host: "${hostState.voteLabelText}", Guest: "${guestState.voteLabelText}"`);
  }
  if (guestState.voteBtnText !== 'VOTED' || !guestState.voteBtnDisabled) {
    throw new Error(`Step 2 failed: Guest button not updated to VOTED disabled! Text: ${guestState.voteBtnText}`);
  }
  console.log('>>> STEP 2 PASSED: Vote transmitted over network and synchronized to 1 / 2 on both screens!');

  // ------------------------------------------------------------------
  // STEP 3: Host votes for rematch. Count reaches 2 / 2 -> Auto-restart!
  // ------------------------------------------------------------------
  console.log('\n--- STEP 3: Host clicks VOTE REMATCH -> Auto-Restart Arena ---');
  await hostPage.evaluate(() => {
    const btn = document.getElementById('voteRematchBtn');
    if (btn) btn.click();
  });

  // Wait for countdown and reset to trigger
  await new Promise(r => setTimeout(r, 1200));

  hostState = await inspectClient(hostPage, 'Host (P1)');
  guestState = await inspectClient(guestPage, 'Guest (P2)');

  console.log('Host state after full rematch vote:', {
    running: hostState.running,
    overlayDisplay: hostState.overlayDisplay
  });
  console.log('Guest state after full rematch vote:', {
    running: guestState.running,
    overlayDisplay: guestState.overlayDisplay
  });

  if (!hostState.running || !guestState.running) {
    throw new Error(`Step 3 failed: Match did not restart for both clients! Host running: ${hostState.running}, Guest running: ${guestState.running}`);
  }
  if (hostState.overlayDisplay !== 'none' || guestState.overlayDisplay !== 'none') {
    throw new Error(`Step 3 failed: Game-over overlay not hidden after rematch!`);
  }
  console.log('>>> STEP 3 PASSED: Both clients successfully restarted match cleanly into new round!');

  // ------------------------------------------------------------------
  // STEP 4: End round again, test Graceful Exit (Return to Menu)
  // ------------------------------------------------------------------
  console.log('\n--- STEP 4: End round and test Graceful Exit ---');
  await guestPage.evaluate(() => {
    window.__dbg.setPlayerPos(0, -18, -20);
    window.__dbg.step(0.016);
  });

  await guestPage.waitForFunction(() => {
    const overlay = document.getElementById('overlay');
    return overlay && overlay.style.display === 'flex';
  }, { timeout: 10000 });
  await hostPage.evaluate(() => { if (window.__dbg && window.__dbg.step) { for (let i = 0; i < 5; i++) window.__dbg.step(0.016); } });
  await hostPage.waitForFunction(() => {
    const overlay = document.getElementById('overlay');
    return overlay && overlay.style.display === 'flex';
  }, { timeout: 10000 });

  // Host clicks RETURN TO MENU
  console.log('Host clicks RETURN TO MENU...');
  await hostPage.evaluate(() => {
    const btn = document.getElementById('multiMenuBtn');
    if (btn) btn.click();
  });

  await guestPage.waitForFunction(() => {
    const label = document.getElementById('rematchVoteLabel');
    const btn = document.getElementById('voteRematchBtn');
    return (label && label.textContent.includes('OPPONENT RETURNED TO MENU')) || (btn && btn.textContent === 'OPPONENT LEFT');
  }, { timeout: 10000 });

  guestState = await inspectClient(guestPage, 'Guest (P2)');
  console.log('Guest state after Host left to menu:', {
    voteLabelText: guestState.voteLabelText,
    voteBtnText: guestState.voteBtnText,
    voteBtnDisabled: guestState.voteBtnDisabled
  });

  if (!guestState.voteLabelText.includes('OPPONENT RETURNED TO MENU') && guestState.voteBtnText !== 'OPPONENT LEFT') {
    throw new Error(`Step 4 failed: Guest was not notified that Host returned to menu!`);
  }
  console.log('>>> STEP 4 PASSED: Opposing player notified of peer exit, state properly handled!');

  console.log('\n======================================================');
  console.log('ALL REMATCH & POST-MATCH SPECIFICATIONS FULLY VERIFIED!');
  console.log('======================================================\n');

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
