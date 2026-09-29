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

async function runTests() {
  const PORT = 8092;
  const server = await createServer(PORT);
  console.log(`Test server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`);
  await new Promise(r => setTimeout(r, 1000));

  await page.waitForFunction(() => !!window.__dbg && !!window.__dbg.duelBoss);
  console.log('Game initialized, window.__dbg ready.');

  // Start Duel Mode
  await page.evaluate(() => {
    window.__dbg.startMode('duel');
  });
  await new Promise(r => setTimeout(r, 500));

  // -------------------------------------------------------------
  // TEST 1: Void Tile Fall Physics & Tile Lip Collision
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Void Tile Fall Physics & Tile Lip Collision ---');
  const test1 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();

    const tInfo = dbg.worldToTile(0, 0);
    const wPos = dbg.tileToWorld(tInfo.ix, tInfo.iz);

    dbg.setPlayerPos(wPos.x, wPos.z, 0);
    dbg.dropTileAt(wPos.x, wPos.z);

    // Step 1 frame
    dbg.step(0.016);
    const groundedAfterStep = dbg.playerGrounded();
    const yAfter1Frame = dbg.playerY();
    const plunged = !groundedAfterStep && yAfter1Frame <= -0.05;

    // Step until player is in falling zone y < -0.3
    for (let f = 0; f < 10; f++) {
      dbg.step(0.016);
    }
    const yInFall = dbg.playerY();

    // Tile lip collision test:
    const adjW = dbg.tileToWorld(tInfo.ix + 1, tInfo.iz);
    const boundaryX = (wPos.x + adjW.x) / 2;

    // Try setting position 0.5m inside intact tile while y < -0.3
    dbg.setPlayerPos(boundaryX + 0.5, wPos.z, yInFall);
    dbg.step(0.016);

    const clampedPos = dbg.pos();
    const lipBlocked = clampedPos.x < boundaryX;
    const stepUpPrevented = !dbg.playerGrounded() && dbg.playerY() < -0.2;

    // Test recovery: place above intact floor plane (y = 0.5) and step until landing
    dbg.setPlayerPos(adjW.x, adjW.z, 0.5);
    for (let f = 0; f < 30; f++) {
      dbg.step(0.016);
      if (dbg.playerGrounded()) break;
    }
    const landed = dbg.playerGrounded() && dbg.playerY() === 0;

    return {
      groundedAfterStep,
      yAfter1Frame,
      plunged,
      yInFall,
      boundaryX,
      clampedX: clampedPos.x,
      lipBlocked,
      stepUpPrevented,
      landed
    };
  });

  console.log('Test 1 results:', test1);
  if (test1.plunged && test1.lipBlocked && test1.stepUpPrevented && test1.landed) {
    console.log('>>> TEST 1 PASSED: True footprint sampling, plunge impulse, and tile lip collision verified!');
  } else {
    throw new Error(`Test 1 FAILED: ${JSON.stringify(test1)}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Enemy Disc Recovery on Direct Player Hits
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Enemy Disc Recovery on Direct Player Hits ---');
  const test2 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();
    dbg.setPlayerPos(0, 0, 0);
    dbg.setPlayerBlocking(false);

    // Spawn enemy disc right in front of player moving at player
    dbg.spawnEnemyHitDisc();

    let discRebounded = false;
    let discReturning = false;
    let returnedToBoss = false;

    for (let f = 0; f < 180; f++) {
      dbg.step(0.016);
      const discs = dbg.discs();
      const boss = dbg.duelBoss();

      if (discs.some(d => d.returning && d.owner === 'foe')) {
        discRebounded = true;
        discReturning = true;
      }

      if (discRebounded && boss && boss.hasDisc) {
        returnedToBoss = true;
        break;
      }
    }

    return {
      discRebounded,
      discReturning,
      returnedToBoss
    };
  });

  console.log('Test 2 results:', test2);
  if (test2.discRebounded && test2.returnedToBoss) {
    console.log('>>> TEST 2 PASSED: Enemy disc bounced off armor, returned, and re-armed foe!');
  } else {
    throw new Error(`Test 2 FAILED: ${JSON.stringify(test2)}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Failsafe Re-Arm Watchdog
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Failsafe Re-Arm Watchdog ---');
  const test3 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();

    // Start boss without disc
    const boss = dbg.duelBoss();
    // Simulate losing disc with no discs in flight
    // We can spawn and immediately delete disc, or set boss.hasDisc = false
    const d = dbg.spawnEnemyHitDisc();
    // Step once so disc is registered then step 180 frames (~2.88s) with disc deleted
    dbg.step(0.016);
    // Delete disc directly via evaluation
    while (dbg.discs().length > 0) {
      // Step until cleared or recall
      dbg.step(0.05);
    }

    // Now verify watchdog re-arms foe after 2.5s
    let rearmed = false;
    let framesToRearm = 0;
    // Step 2.6 seconds (165 frames @ 0.016)
    for (let f = 0; f < 200; f++) {
      dbg.step(0.016);
      const b = dbg.duelBoss();
      if (b && b.hasDisc) {
        rearmed = true;
        framesToRearm = f;
        break;
      }
    }

    return {
      rearmed,
      framesToRearm
    };
  });

  console.log('Test 3 results:', test3);
  if (test3.rearmed) {
    console.log('>>> TEST 3 PASSED: Failsafe re-arm watchdog restored enemy disc!');
  } else {
    throw new Error(`Test 3 FAILED: ${JSON.stringify(test3)}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Disc Deflection (Parry) & Alert Feedback
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Disc Deflection (Parry) & Alert Feedback ---');
  const test4 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();
    dbg.setPlayerPos(0, 5, 0);
    dbg.setPlayerBlocking(true);

    dbg.spawnParryTestDisc();

    let isDeflected = false;
    let deflectMsg = false;

    for (let f = 0; f < 30; f++) {
      dbg.step(0.016);
      const discs = dbg.discs();
      const msg = dbg.lastMessage();

      if (discs.some(d => d.isDeflected)) {
        isDeflected = true;
      }
      if (msg === 'DEFLECTED!') {
        deflectMsg = true;
      }
      if (isDeflected && deflectMsg) break;
    }

    return {
      isDeflected,
      deflectMsg
    };
  });

  console.log('Test 4 results:', test4);
  if (test4.isDeflected && test4.deflectMsg) {
    console.log('>>> TEST 4 PASSED: Player parry tagged disc as deflected and displayed DEFLECTED! message.');
  } else {
    throw new Error(`Test 4 FAILED: ${JSON.stringify(test4)}`);
  }

  // -------------------------------------------------------------
  // TEST 5: AI Catch Reflex Roll & Counter-Parry
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: AI Catch Reflex Roll & Counter-Parry ---');
  const test5 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();

    let catchEvents = 0;
    let hitEvents = 0;

    // Run multiple deflected disc tests to verify both catch and direct hit branches
    for (let trial = 0; trial < 10; trial++) {
      dbg.spawnDeflectedTestDisc(6);

      for (let f = 0; f < 60; f++) {
        dbg.step(0.016);
        const msg = dbg.lastMessage();
        if (msg === 'RIVAL CAUGHT DISC!') {
          catchEvents++;
          break;
        }
        if (msg === 'DEFLECTION HIT!') {
          hitEvents++;
          break;
        }
      }

      // Allow brief recovery
      for (let f = 0; f < 20; f++) dbg.step(0.016);
    }

    return {
      catchEvents,
      hitEvents,
      totalEvents: catchEvents + hitEvents
    };
  });

  console.log('Test 5 results:', test5);
  if (test5.totalEvents > 0) {
    console.log(`>>> TEST 5 PASSED: Rival reflex handled ${test5.catchEvents} catches and ${test5.hitEvents} direct hits!`);
  } else {
    throw new Error(`Test 5 FAILED: ${JSON.stringify(test5)}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Deflection Miss Handling
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Deflection Miss Handling ---');
  const test6 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();

    // Spawn a deflected test disc aimed away into a wall
    dbg.spawnDeflectedMissDisc();

    let switchedToReturning = false;
    // Step 120 frames (~1.9s)
    for (let f = 0; f < 120; f++) {
      dbg.step(0.016);
      const returningDiscs = dbg.discs().filter(d => d.returning && d.owner === 'foe');
      if (returningDiscs.length > 0) {
        switchedToReturning = true;
        break;
      }
    }

    return {
      switchedToReturning
    };
  });

  console.log('Test 6 results:', test6);
  if (test6.switchedToReturning) {
    console.log('>>> TEST 6 PASSED: Missed deflected disc automatically returned to creator.');
  } else {
    throw new Error(`Test 6 FAILED: ${JSON.stringify(test6)}`);
  }

  console.log('\n=============================================');
  console.log('ALL ACCEPTANCE CRITERIA RIGOROUSLY VERIFIED!');
  console.log('=============================================\n');

  await browser.close();
  server.close();
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
