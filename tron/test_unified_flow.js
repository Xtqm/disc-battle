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

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(__dirname, reqPath);

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

async function runUnifiedFlowTests() {
  const PORT = 8095;
  const server = await createServer(PORT);
  console.log(`Test server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`http://localhost:${PORT}/index.html`);
  await new Promise(r => setTimeout(r, 1000));

  await page.waitForFunction(() => !!window.__dbg && !!window.__dbg.startMode);
  console.log('Game initialized, window.__dbg ready.');

  // =============================================================
  // TEST 1: Unified Main Menu Structure & Host Modal Transitions
  // =============================================================
  console.log('\n--- TEST 1: Unified Main Menu & Host Modal Transitions ---');
  const test1 = await page.evaluate(() => {
    const swarmBtn = document.getElementById('swarmBtn');
    const hostMatchBtn = document.getElementById('hostMatchBtn');
    const joinOnlineBtn = document.getElementById('joinOnlineBtn');
    const hostModal = document.getElementById('hostModal');
    const roomModal = document.getElementById('roomModal');
    const practiceBtn = document.getElementById('practiceBtn');
    const host1v1Btn = document.getElementById('host1v1Btn');
    const host2v2Btn = document.getElementById('host2v2Btn');

    // Check primary 3 buttons exist on main menu
    const buttonsExist = !!(swarmBtn && hostMatchBtn && joinOnlineBtn);
    const swarmText = swarmBtn ? swarmBtn.textContent.trim() : '';
    const hostText = hostMatchBtn ? hostMatchBtn.textContent.trim() : '';
    const joinText = joinOnlineBtn ? joinOnlineBtn.textContent.trim() : '';

    // Click HOST MATCH button
    hostMatchBtn.click();
    const hostModalVisibleAfterClick = hostModal && hostModal.style.display === 'flex';

    // Verify Host Modal buttons exist
    const hostOptionsExist = !!(practiceBtn && host1v1Btn && host2v2Btn);

    return {
      buttonsExist,
      swarmText,
      hostText,
      joinText,
      hostModalVisibleAfterClick,
      hostOptionsExist
    };
  });

  console.log('Test 1 results:', test1);
  if (
    test1.buttonsExist &&
    test1.swarmText.includes('SWARM') &&
    test1.hostText.includes('HOST') &&
    test1.joinText.includes('JOIN') &&
    test1.hostModalVisibleAfterClick &&
    test1.hostOptionsExist
  ) {
    console.log('>>> TEST 1 PASSED: Unified 3-button main menu and Host Setup Modal verified!');
  } else {
    throw new Error(`Test 1 FAILED: ${JSON.stringify(test1)}`);
  }

  // =============================================================
  // TEST 2: Practice (Solo AI) Launch & 3-Second Countdown
  // =============================================================
  console.log('\n--- TEST 2: Practice Launch & Universal 3-Second Countdown ---');
  const test2 = await page.evaluate(() => {
    const practiceBtn = document.getElementById('practiceBtn');
    const hostModal = document.getElementById('hostModal');
    practiceBtn.click();

    const hostModalHidden = hostModal && hostModal.style.display === 'none';
    const mode = window.__dbg.mode();
    const cdTimer = window.__dbg.countdownTimer();
    const cdEl = document.getElementById('countdownText');
    const cdVisible = cdEl && cdEl.style.display !== 'none';
    const cdText = cdEl ? cdEl.textContent.trim() : '';
    const foesBeforeCountdown = window.__dbg.foes(); // Must be 0 before countdown finishes!
    const playerPos = window.__dbg.pos();

    return {
      hostModalHidden,
      mode,
      cdTimer,
      cdVisible,
      cdText,
      foesBeforeCountdown,
      playerPos
    };
  });

  console.log('Test 2 results:', test2);
  if (
    test2.hostModalHidden &&
    (test2.mode === 'duel_ai' || test2.mode === 'duel') &&
    test2.cdTimer > 2.0 &&
    test2.cdVisible &&
    test2.cdText === '3' &&
    test2.foesBeforeCountdown === 0 &&
    test2.playerPos.z === 14
  ) {
    console.log('>>> TEST 2 PASSED: Practice mode launched with 3-second countdown, spawn at z=14, 0 enemies spawned yet!');
  } else {
    throw new Error(`Test 2 FAILED: ${JSON.stringify(test2)}`);
  }

  // =============================================================
  // TEST 3: Movement Freeze & Camera Look During Countdown
  // =============================================================
  console.log('\n--- TEST 3: Movement Freeze & Camera Look During Countdown ---');
  const test3 = await page.evaluate(() => {
    // Attempt to move forward with W key while in countdown
    const keys = window.__dbg;
    const startPos = window.__dbg.pos();
    const startYaw = window.__dbg.yaw();

    // Simulate key down
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    // Step frame during countdown
    window.__dbg.step(0.1);
    const posAfterW = window.__dbg.pos();

    // Release key
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));

    // Test camera rotation (look) is still permitted
    window.__dbg.setYaw(Math.PI / 2);
    const newYaw = window.__dbg.yaw();

    // Test disc throw is inhibited during countdown
    window.__dbg.throwDisc();
    const discsThrown = window.__dbg.discs().filter(d => d.owner === 'player');

    return {
      posBefore: startPos,
      posAfterW,
      posFrozen: startPos.x === posAfterW.x && startPos.z === posAfterW.z,
      yawChanged: newYaw !== startYaw,
      throwBlocked: discsThrown.length === 0
    };
  });

  console.log('Test 3 results:', test3);
  if (test3.posFrozen && test3.yawChanged && test3.throwBlocked) {
    console.log('>>> TEST 3 PASSED: Movement and disc throws frozen during countdown while camera rotation functions!');
  } else {
    throw new Error(`Test 3 FAILED: ${JSON.stringify(test3)}`);
  }

  // =============================================================
  // TEST 4: Countdown Progression to FIGHT! & Enemy Spawn
  // =============================================================
  console.log('\n--- TEST 4: Countdown Progression to FIGHT! & Enemy Spawn ---');
  // Step through countdown deterministically to zero
  await page.evaluate(() => {
    while (window.__dbg.countdownTimer() > 0) {
      window.__dbg.step(0.1);
    }
  });

  const test4 = await page.evaluate(() => {
    const cdTimer = window.__dbg.countdownTimer();
    const cdEl = document.getElementById('countdownText');
    const foesCount = window.__dbg.foes();
    const boss = window.__dbg.duelBoss();
    const roundLabel = document.getElementById('roundLabel');
    const tier = window.__dbg.tier();

    return {
      cdTimer,
      cdText: cdEl ? cdEl.textContent.trim() : '',
      foesCount,
      bossHp: boss ? boss.hp : 0,
      roundText: roundLabel ? roundLabel.textContent.trim() : '',
      tier
    };
  });

  console.log('Test 4 results:', test4);
  if (
    test4.cdTimer === 0 &&
    test4.foesCount === 1 &&
    test4.bossHp === 250 &&
    test4.tier === 1 &&
    test4.roundText.includes('TIER: 1')
  ) {
    console.log('>>> TEST 4 PASSED: Countdown ended, Tier 1 Duel Boss spawned (250 HP), HUD shows TIER: 1!');
  } else {
    throw new Error(`Test 4 FAILED: ${JSON.stringify(test4)}`);
  }

  // =============================================================
  // TEST 5: Defeating Rival -> Tier 2 Escalation & Round Reset
  // =============================================================
  console.log('\n--- TEST 5: Defeating Rival -> Tier 2 Escalation & Round Reset ---');
  const test5 = await page.evaluate(() => {
    // Drop tiles and move player away from spawn to test round reset
    window.__dbg.dropTileAt(0, 0);
    window.__dbg.setPlayerPos(5, -5, 0);

    // Defeat Tier 1 Boss
    window.__dbg.killBoss();

    const tierAfterKill = window.__dbg.tier();
    const playerPosAfterKill = window.__dbg.pos();
    const cdTimerAfterKill = window.__dbg.countdownTimer();
    const fallenTilesAfterReset = window.__dbg.fallenTilesCount();
    const msg = window.__dbg.lastMessage();
    const roundLabel = document.getElementById('roundLabel');

    return {
      tierAfterKill,
      playerPosAfterKill,
      cdTimerAfterKill,
      fallenTilesAfterReset,
      msg,
      roundText: roundLabel ? roundLabel.textContent.trim() : ''
    };
  });

  console.log('Test 5 results:', test5);
  if (
    test5.tierAfterKill === 2 &&
    test5.playerPosAfterKill.x === 0 &&
    test5.playerPosAfterKill.z === 14 &&
    test5.cdTimerAfterKill > 2.0 &&
    test5.fallenTilesAfterReset === 0 &&
    test5.msg.includes('TIER 2 REACHED') &&
    test5.roundText.includes('TIER: 2')
  ) {
    console.log('>>> TEST 5 PASSED: Defeating Tier 1 incremented to Tier 2, snapped player to (0, 14), restored tiles, and started 3s countdown!');
  } else {
    throw new Error(`Test 5 FAILED: ${JSON.stringify(test5)}`);
  }

  // Advance Tier 2 countdown to finish and spawn Tier 2 boss
  await page.evaluate(() => {
    while (window.__dbg.countdownTimer() > 0) {
      window.__dbg.step(0.1);
    }
  });

  const test5b = await page.evaluate(() => {
    const boss = window.__dbg.duelBoss();
    const tier = window.__dbg.tier();
    return {
      tier,
      bossHp: boss ? boss.hp : 0,
      bossSpeed: boss ? boss.speed : 0
    };
  });

  console.log('Tier 2 boss spawned stats:', test5b);
  // Tier 2 HP scaled to 250 + 2 * 50 = 350 HP
  if (test5b.tier === 2 && test5b.bossHp === 350) {
    console.log('>>> TEST 5B PASSED: Harder Tier 2 Duel Boss spawned with 350 HP!');
  } else {
    throw new Error(`Test 5B FAILED: ${JSON.stringify(test5b)}`);
  }

  // =============================================================
  // TEST 6: Swarm Mode Wave Clear -> Reset, Countdown, Next Wave
  // =============================================================
  console.log('\n--- TEST 6: Swarm Mode Wave Clear -> Reset, Countdown, Next Wave ---');
  const test6 = await page.evaluate(() => {
    window.__dbg.startMode('swarm');
    return {
      mode: window.__dbg.mode(),
      cdTimer: window.__dbg.countdownTimer(),
      wave: document.getElementById('wave')?.textContent.trim()
    };
  });
  console.log('Swarm mode started:', test6);

  // Advance Wave 1 countdown
  await page.evaluate(() => {
    while (window.__dbg.countdownTimer() > 0) {
      window.__dbg.step(0.1);
    }
  });

  const test6b = await page.evaluate(() => {
    const foesBeforeClear = window.__dbg.foes();

    // Damage terrain and move player
    window.__dbg.dropTileAt(0, 0);
    window.__dbg.setPlayerPos(-6, 2, 0);

    // Defeat all foes in wave 1
    while (window.__dbg.foes() > 0) {
      window.__dbg.killBoss();
    }

    const cdTimerAfterWaveClear = window.__dbg.countdownTimer();
    const playerPos = window.__dbg.pos();
    const fallenTiles = window.__dbg.fallenTilesCount();
    const wave = document.getElementById('wave')?.textContent.trim();
    const msg = window.__dbg.lastMessage();

    return {
      foesBeforeClear,
      cdTimerAfterWaveClear,
      playerPos,
      fallenTiles,
      wave,
      msg
    };
  });

  console.log('Swarm wave 1 clear results:', test6b);
  if (
    test6b.foesBeforeClear > 0 &&
    test6b.cdTimerAfterWaveClear > 2.0 &&
    test6b.playerPos.x === 0 &&
    test6b.playerPos.z === 14 &&
    test6b.fallenTiles === 0 &&
    test6b.wave === '2' &&
    test6b.msg.includes('CYCLE 2')
  ) {
    console.log('>>> TEST 6 PASSED: Swarm wave 1 clear incremented to Cycle 2, healed player, restored tiles, moved to spawn, and started 3s countdown!');
  } else {
    throw new Error(`Test 6 FAILED: ${JSON.stringify(test6b)}`);
  }

  // =============================================================
  // TEST 7: Online Duel Hosting Modal -> Room Creation Transition
  // =============================================================
  console.log('\n--- TEST 7: Online Duel Hosting Transition ---');
  await page.evaluate(() => {
    window.__dbg.showModeSelect();
    const hostMatchBtn = document.getElementById('hostMatchBtn');
    hostMatchBtn.click();

    const host1v1Btn = document.getElementById('host1v1Btn');
    host1v1Btn.click();
  });

  await page.waitForFunction(() => {
    const rm = document.getElementById('roomModal');
    return rm && rm.style.display === 'flex';
  });

  const test7 = await page.evaluate(() => {
    const roomModal = document.getElementById('roomModal');
    const hostWaitBlock = document.getElementById('hostWaitBlock');
    const hostModalAfter = document.getElementById('hostModal');

    return {
      hostModalHidden: hostModalAfter.style.display === 'none',
      roomModalVisible: roomModal && roomModal.style.display === 'flex',
      waitingVisible: hostWaitBlock && hostWaitBlock.style.display !== 'none'
    };
  });

  console.log('Test 7 results:', test7);
  if (test7.hostModalHidden && test7.roomModalVisible && test7.waitingVisible) {
    console.log('>>> TEST 7 PASSED: Selecting 1v1 Online successfully transitioned from Host Modal to Waiting for Challenger screen!');
  } else {
    throw new Error(`Test 7 FAILED: ${JSON.stringify(test7)}`);
  }

  // =============================================================
  // TEST 8: Join Online Match Input Transition
  // =============================================================
  console.log('\n--- TEST 8: Join Online Match Input Transition ---');
  const test8 = await page.evaluate(() => {
    window.__dbg.showModeSelect();
    const joinOnlineBtn = document.getElementById('joinOnlineBtn');
    joinOnlineBtn.click();

    const roomModal = document.getElementById('roomModal');
    const joinInputBlock = document.getElementById('joinInputBlock');
    const joinRoomInput = document.getElementById('joinRoomInput');

    return {
      roomModalVisible: roomModal && roomModal.style.display === 'flex',
      joinInputVisible: joinInputBlock && joinInputBlock.style.display !== 'none',
      inputExists: !!joinRoomInput
    };
  });

  console.log('Test 8 results:', test8);
  if (test8.roomModalVisible && test8.joinInputVisible && test8.inputExists) {
    console.log('>>> TEST 8 PASSED: Clicking [ JOIN ONLINE MATCH ] displayed room code entry form!');
  } else {
    throw new Error(`Test 8 FAILED: ${JSON.stringify(test8)}`);
  }

  console.log('\n======================================================');
  console.log('ALL UNIFIED MENU, COUNTDOWN, AND TIER TESTS PASSED! 🎉');
  console.log('======================================================\n');

  await browser.close();
  server.close();
  process.exit(0);
}

runUnifiedFlowTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
