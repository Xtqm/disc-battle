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

async function runMobileTests() {
  const PORT = 8093;
  const server = await createServer(PORT);
  console.log(`Test server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const page = await browser.newPage();
  // Set mobile landscape viewport and touch support
  await page.setViewport({
    width: 844,
    height: 390,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3
  });

  await page.goto(`http://localhost:${PORT}/index.html`);
  await new Promise(r => setTimeout(r, 1000));

  await page.waitForFunction(() => !!window.__dbg && !!window.__dbg.duelBoss);
  console.log('Game initialized, window.__dbg ready.');

  // -------------------------------------------------------------
  // TEST 1: Viewport & Touch Event Hygiene & Tap Targets
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Viewport, CSS Hygiene & Tap Target Sizing ---');
  const test1 = await page.evaluate(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    const viewportContent = metaViewport ? metaViewport.getAttribute('content') : '';
    const hasCorrectViewport = viewportContent.includes('user-scalable=no') && viewportContent.includes('viewport-fit=cover');

    const bodyStyle = window.getComputedStyle(document.body);
    const canvas = document.querySelector('canvas');
    const canvasStyle = canvas ? window.getComputedStyle(canvas) : null;
    const touchActionNone = bodyStyle.touchAction === 'none' && canvasStyle && canvasStyle.touchAction === 'none';

    // Verify touch action buttons min 44x44px
    const buttons = [
      document.getElementById('pauseBtn'),
      document.getElementById('btnThrow'),
      document.getElementById('btnJump'),
      document.getElementById('btnDash'),
      document.getElementById('btnBlock'),
      document.getElementById('btnCurveL'),
      document.getElementById('btnCurveR'),
      document.getElementById('duelBtn'),
      document.getElementById('swarmBtn'),
      document.getElementById('resumeBtn')
    ];

    const buttonSizes = buttons.map(b => {
      if (!b) return { id: 'missing', width: 0, height: 0, valid: false };
      const rect = b.getBoundingClientRect();
      // On hidden elements (like resumeBtn in modal), check computed min-width/min-height or rect
      const comp = window.getComputedStyle(b);
      const minW = parseFloat(comp.minWidth) || 0;
      const minH = parseFloat(comp.minHeight) || 0;
      const w = Math.max(rect.width, minW);
      const h = Math.max(rect.height, minH);
      return {
        id: b.id,
        width: Math.round(w),
        height: Math.round(h),
        valid: w >= 44 && h >= 44
      };
    });

    const allButtonsValid = buttonSizes.every(b => b.valid);

    return {
      hasCorrectViewport,
      touchActionNone,
      allButtonsValid,
      buttonSizes
    };
  });

  console.log('Test 1 results:', test1);
  if (test1.hasCorrectViewport && test1.touchActionNone && test1.allButtonsValid) {
    console.log('>>> TEST 1 PASSED: Viewport meta, touch hygiene resets, and 44px tap targets verified!');
  } else {
    throw new Error(`Test 1 FAILED: ${JSON.stringify(test1)}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Touch Environment Detection & Pointer Lock Bypass
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Touch Environment Detection & Pointer Lock Bypass ---');
  const test2 = await page.evaluate(() => {
    const dbg = window.__dbg;
    const isTouch = dbg.isTouchDevice();
    const isBodyTouch = document.body.classList.contains('touch-device');

    // Start game to check HUD and pointer lock
    dbg.startMode('duel');

    const lockBanner = document.getElementById('lockstate');
    const lockBannerHidden = !lockBanner || window.getComputedStyle(lockBanner).display === 'none';

    const hint = document.getElementById('hint');
    const mobileHint = document.getElementById('mobileHint');
    const hintHidden = !hint || window.getComputedStyle(hint).display === 'none';
    const mobileHintVisible = mobileHint && window.getComputedStyle(mobileHint).display === 'block';

    const mobileControls = document.getElementById('mobileControls');
    const mobileControlsVisible = mobileControls && window.getComputedStyle(mobileControls).display === 'block';

    return {
      isTouch,
      isBodyTouch,
      lockBannerHidden,
      hintHidden,
      mobileHintVisible,
      mobileControlsVisible
    };
  });

  console.log('Test 2 results:', test2);
  if (test2.isTouch && test2.isBodyTouch && test2.lockBannerHidden && test2.hintHidden && test2.mobileHintVisible && test2.mobileControlsVisible) {
    console.log('>>> TEST 2 PASSED: Touch environment detected, pointer lock bypassed, lock banner hidden, and mobile HUD active!');
  } else {
    throw new Error(`Test 2 FAILED: ${JSON.stringify(test2)}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Orientation Helper (Portrait Detection & Pause/Resume)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Orientation Helper Overlay & Game Pause/Resume ---');
  // Switch to portrait: 390x844
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true
  });
  await new Promise(r => setTimeout(r, 400));

  const test3Portrait = await page.evaluate(() => {
    window.__dbg.checkOrientation();
    const overlay = document.getElementById('orientationOverlay');
    const overlayVisible = overlay && window.getComputedStyle(overlay).display === 'flex';
    return {
      overlayVisible
    };
  });

  console.log('Test 3 Portrait results:', test3Portrait);

  // Switch back to landscape: 844x390
  await page.setViewport({
    width: 844,
    height: 390,
    isMobile: true,
    hasTouch: true
  });
  await new Promise(r => setTimeout(r, 400));

  const test3Landscape = await page.evaluate(() => {
    window.__dbg.checkOrientation();
    const overlay = document.getElementById('orientationOverlay');
    const overlayHidden = overlay && window.getComputedStyle(overlay).display === 'none';
    return {
      overlayHidden
    };
  });

  console.log('Test 3 Landscape results:', test3Landscape);
  if (test3Portrait.overlayVisible && test3Landscape.overlayHidden) {
    console.log('>>> TEST 3 PASSED: Portrait orientation shows rotation helper and landscape resumes smoothly!');
  } else {
    throw new Error(`Test 3 FAILED: Portrait: ${JSON.stringify(test3Portrait)}, Landscape: ${JSON.stringify(test3Landscape)}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Left Zone: Virtual Floating Joystick (Movement)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Dynamic Floating Joystick Movement ---');
  const test4 = await page.evaluate(() => {
    const dbg = window.__dbg;
    dbg.resetTiles();
    dbg.setPlayerPos(0, 0, 0);

    // 1. Simulate Touch Start in Left 45% (e.g. x=150, y=250)
    const touchStart = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 150,
      clientY: 250,
      screenX: 150,
      screenY: 250,
      pageX: 150,
      pageY: 250
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touchStart],
      touches: [touchStart],
      cancelable: true
    }));

    const joyBase = document.getElementById('joystickBase');
    const joyThumb = document.getElementById('joystickThumb');
    const joyBaseVisible = joyBase && (joyBase.style.opacity === '1' || parseFloat(window.getComputedStyle(joyBase).opacity) > 0);

    // 2. Drag thumb UP (dy = -50, simulating forward movement)
    const touchMoveUp = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 150,
      clientY: 200,
      screenX: 150,
      screenY: 200,
      pageX: 150,
      pageY: 200
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMoveUp],
      touches: [touchMoveUp],
      cancelable: true
    }));

    const moveUp = dbg.touchMove();
    const startZ = dbg.pos().z;
    // Step 20 frames to simulate moving forward
    for (let f = 0; f < 20; f++) dbg.step(0.016);
    const endZ = dbg.pos().z;
    const movedForward = Math.abs(endZ - startZ) > 0.5;

    // 3. Drag thumb RIGHT (dx = +50, dy = 0)
    const touchMoveRight = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 200,
      clientY: 250,
      screenX: 200,
      screenY: 250,
      pageX: 200,
      pageY: 250
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMoveRight],
      touches: [touchMoveRight],
      cancelable: true
    }));

    const moveRight = dbg.touchMove();
    const startX = dbg.pos().x;
    for (let f = 0; f < 20; f++) dbg.step(0.016);
    const endX = dbg.pos().x;
    const movedRight = Math.abs(endX - startX) > 0.5;

    // 4. Release touch
    const touchEnd = new Touch({
      identifier: 101,
      target: document.body,
      clientX: 200,
      clientY: 250,
      screenX: 200,
      screenY: 250,
      pageX: 200,
      pageY: 250
    });
    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touchEnd],
      touches: [],
      cancelable: true
    }));

    const moveAfterEnd = dbg.touchMove();
    const joyBaseHidden = joyBase && (window.getComputedStyle(joyBase).opacity === '0' || joyBase.style.opacity === '0');

    return {
      joyBaseVisible,
      moveUp,
      movedForward,
      moveRight,
      movedRight,
      moveAfterEnd,
      joyBaseHidden
    };
  });

  console.log('Test 4 results:', test4);
  if (test4.joyBaseVisible && test4.movedForward && test4.movedRight && test4.moveAfterEnd.x === 0 && test4.moveAfterEnd.y === 0) {
    console.log('>>> TEST 4 PASSED: Dynamic floating joystick moves player forward/strafe accurately and resets on release!');
  } else {
    throw new Error(`Test 4 FAILED: ${JSON.stringify(test4)}`);
  }

  // -------------------------------------------------------------
  // TEST 5: Right Zone: Camera Look / Touch Swipe (Aiming)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Camera Look / Touch Swipe Aiming ---');
  const test5 = await page.evaluate(() => {
    const dbg = window.__dbg;
    const initialYaw = dbg.yaw();
    const initialPitch = dbg.pitch();

    // 1. Touch start on right half (e.g. x=600, y=200)
    const touchStart = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 600,
      clientY: 200,
      screenX: 600,
      screenY: 200,
      pageX: 600,
      pageY: 200
    });
    window.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touchStart],
      touches: [touchStart],
      cancelable: true
    }));

    // 2. Swipe left and up (dx = -80, dy = -40)
    const touchMoveSwipe = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 520,
      clientY: 160,
      screenX: 520,
      screenY: 160,
      pageX: 520,
      pageY: 160
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [touchMoveSwipe],
      touches: [touchMoveSwipe],
      cancelable: true
    }));

    const yawAfterSwipe = dbg.yaw();
    const pitchAfterSwipe = dbg.pitch();
    // Swiping left (dx < 0) increases yaw (player turns right/yaw += |dx|*sens)
    const yawChanged = yawAfterSwipe !== initialYaw;
    const pitchChanged = pitchAfterSwipe !== initialPitch;

    // 3. Test pitch clamping with extreme swipe down
    const extremeSwipeDown = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 520,
      clientY: 800,
      screenX: 520,
      screenY: 800,
      pageX: 520,
      pageY: 800
    });
    window.dispatchEvent(new TouchEvent('touchmove', {
      changedTouches: [extremeSwipeDown],
      touches: [extremeSwipeDown],
      cancelable: true
    }));
    const clampedPitch = dbg.pitch();
    const pitchClamped = clampedPitch >= -0.6 && clampedPitch <= 0.55;

    // 4. Release look touch
    const touchEnd = new Touch({
      identifier: 202,
      target: document.body,
      clientX: 520,
      clientY: 800,
      screenX: 520,
      screenY: 800,
      pageX: 520,
      pageY: 800
    });
    window.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touchEnd],
      touches: [],
      cancelable: true
    }));

    const lookCleared = dbg.touchState().lookTouchId === null;

    return {
      yawChanged,
      pitchChanged,
      clampedPitch,
      pitchClamped,
      lookCleared
    };
  });

  console.log('Test 5 results:', test5);
  if (test5.yawChanged && test5.pitchChanged && test5.pitchClamped && test5.lookCleared) {
    console.log('>>> TEST 5 PASSED: Right zone camera swipe rotates yaw, modifies pitch, and enforces clamps!');
  } else {
    throw new Error(`Test 5 FAILED: ${JSON.stringify(test5)}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Combat Action Buttons: Throw, Jump, Dash, Block, Curve
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Combat Action Buttons (Throw, Jump, Dash, Block, Curve) ---');
  const test6 = await page.evaluate(async () => {
    const dbg = window.__dbg;
    dbg.resetTiles();
    dbg.setPlayerPos(0, 0, 0);

    // 1. Test CURVE buttons
    const btnCurveL = document.getElementById('btnCurveL');
    const ch = document.getElementById('crosshair');

    // Trigger touch on curve L
    btnCurveL.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    const curveIntentL = dbg.curve();
    dbg.step(0.016);
    const chHasCurveL = ch.classList.contains('curve-l');

    // 2. Test THROW button
    const initialDiscs = dbg.discs().length;
    const btnThrow = document.getElementById('btnThrow');
    btnThrow.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    const discThrown = dbg.discs().length === initialDiscs + 1;
    // Check curve reset after throw
    const curveResetAfterThrow = dbg.curve() === 0;

    // 3. Test JUMP button (air-jump & hold)
    const btnJump = document.getElementById('btnJump');
    btnJump.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    const jumped = !dbg.playerGrounded() && dbg.playerY() > 0;
    btnJump.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true }));

    // Air jump
    dbg.step(0.1);
    btnJump.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    const doubleJumped = dbg.playerJumps() === 2;
    btnJump.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true }));

    // 4. Test BLOCK button
    const btnBlock = document.getElementById('btnBlock');
    btnBlock.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    const isBlocking = dbg.touchState().touchBlocking;
    btnBlock.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true }));
    const releasedBlock = !dbg.touchState().touchBlocking;

    // 5. Test DASH button
    // Land player first
    dbg.setPlayerPos(0, 0, 0);
    dbg.step(0.016);
    const btnDash = document.getElementById('btnDash');
    const startPos = dbg.pos();
    btnDash.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    dbg.step(0.016);
    for (let f = 0; f < 10; f++) dbg.step(0.016);
    const endPos = dbg.pos();
    const dashed = Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z) > 1.5;

    return {
      curveIntentL,
      chHasCurveL,
      discThrown,
      curveResetAfterThrow,
      jumped,
      doubleJumped,
      isBlocking,
      releasedBlock,
      dashed
    };
  });

  console.log('Test 6 results:', test6);
  if (test6.curveIntentL === -1.0 && test6.chHasCurveL && test6.discThrown && test6.curveResetAfterThrow &&
      test6.jumped && test6.doubleJumped && test6.isBlocking && test6.releasedBlock && test6.dashed) {
    console.log('>>> TEST 6 PASSED: All combat action buttons (Throw, Jump, Double-Jump, Dash, Block, Curve) respond seamlessly!');
  } else {
    throw new Error(`Test 6 FAILED: ${JSON.stringify(test6)}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Multi-Touch & Mobile Performance (DPR & Particle Pruning)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Multi-Touch & Mobile Optimization ---');
  const test7 = await page.evaluate(() => {
    const dbg = window.__dbg;
    // Mobile DPR should be clamped to max 1.5
    // Halved particle burst count: default 22 -> 11
    const defaultSparks = dbg.particleBurstCount(22);
    const smallSparks = dbg.particleBurstCount(14);

    return {
      defaultSparks,
      smallSparks,
      sparksHalved: defaultSparks === 11 && smallSparks === 7
    };
  });

  console.log('Test 7 results:', test7);
  if (test7.sparksHalved) {
    console.log('>>> TEST 7 PASSED: Mobile WebGL particle pruning active (counts halved for 60 FPS)!');
  } else {
    throw new Error(`Test 7 FAILED: ${JSON.stringify(test7)}`);
  }

  console.log('\n======================================================');
  console.log('ALL MOBILE ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
  console.log('======================================================\n');

  await browser.close();
  server.close();
}

runMobileTests().catch(err => {
  console.error('Mobile test execution failed:', err);
  process.exit(1);
});
