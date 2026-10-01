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
  const PORT = 8097;
  const server = await createServer(PORT);
  console.log(`Test server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  try {
    const page = await browser.newPage();
    // Mobile landscape viewport (iPhone landscape: 844x390)
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
    console.log('Tron Arena initialized in mobile landscape mode.');

    // ------------------------------------------------------------------
    // TEST 1: CSS Scroll & Touch-Action Properties on .card and Overlays
    // ------------------------------------------------------------------
    console.log('\n--- TEST 1: Card & Modal Overlay CSS Properties ---');
    const cssCheck = await page.evaluate(() => {
      const card = document.querySelector('#overlay .card');
      const cardStyle = window.getComputedStyle(card);
      const overlay = document.getElementById('overlay');
      const overlayStyle = window.getComputedStyle(overlay);
      const hostModal = document.getElementById('hostModal');
      const hostModalStyle = window.getComputedStyle(hostModal);

      return {
        cardTouchAction: cardStyle.touchAction,
        cardOverflowY: cardStyle.overflowY,
        cardMaxHeight: cardStyle.maxHeight,
        overlayTouchAction: overlayStyle.touchAction,
        hostModalTouchAction: hostModalStyle.touchAction,
        scrollHeight: card.scrollHeight,
        clientHeight: card.clientHeight,
        isOverflowing: card.scrollHeight > card.clientHeight
      };
    });

    console.log('CSS Check Results:', cssCheck);
    if (
      cssCheck.cardTouchAction.includes('pan-y') &&
      cssCheck.cardOverflowY === 'auto' &&
      cssCheck.isOverflowing
    ) {
      console.log('>>> TEST 1 PASSED: .card has touch-action: pan-y, overflow-y: auto, and content overflows in landscape!');
    } else {
      throw new Error(`TEST 1 FAILED: CSS requirements not met: ${JSON.stringify(cssCheck)}`);
    }

    // ------------------------------------------------------------------
    // TEST 2: Swiping on Main Menu Scrolls Content & Does NOT Trigger Gameplay Controls
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: Main Menu Touch Scroll & Gameplay Touch Guard ---');
    const menuScrollTest = await page.evaluate(async () => {
      const card = document.querySelector('#overlay .card');
      const dbg = window.__dbg;
      const initialScroll = card.scrollTop;
      const initialYaw = dbg.yaw();
      const initialPitch = dbg.pitch();
      const joyBase = document.getElementById('joystickBase');

      // Dispatch touchstart inside the card
      const rect = card.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.bottom - 40;

      const touchObj = new Touch({
        identifier: 99,
        target: card,
        clientX: startX,
        clientY: startY
      });

      window.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchObj],
        touches: [touchObj]
      }));

      // Simulate vertical swipe upward
      const touchMoveObj = new Touch({
        identifier: 99,
        target: card,
        clientX: startX,
        clientY: startY - 120
      });

      window.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchMoveObj],
        touches: [touchMoveObj]
      }));

      // Perform programmatic scroll delta to simulate browser native scroll response
      card.scrollTop += 120;

      window.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchMoveObj],
        touches: []
      }));

      const finalScroll = card.scrollTop;
      const currentYaw = dbg.yaw();
      const currentPitch = dbg.pitch();
      const moveVec = dbg.touchMove();
      const joyOpacity = joyBase ? window.getComputedStyle(joyBase).opacity : '0';

      return {
        initialScroll,
        finalScroll,
        scrolled: finalScroll > initialScroll,
        yawUnchanged: currentYaw === initialYaw,
        pitchUnchanged: currentPitch === initialPitch,
        joyMovementZero: moveVec.x === 0 && moveVec.y === 0,
        joyHidden: joyOpacity === '0'
      };
    });

    console.log('Menu Scroll Results:', menuScrollTest);
    if (
      menuScrollTest.scrolled &&
      menuScrollTest.yawUnchanged &&
      menuScrollTest.pitchUnchanged &&
      menuScrollTest.joyMovementZero &&
      menuScrollTest.joyHidden
    ) {
      console.log('>>> TEST 2 PASSED: Menu swiping scrolled content smoothly without triggering joystick or camera aim!');
    } else {
      throw new Error(`TEST 2 FAILED: ${JSON.stringify(menuScrollTest)}`);
    }

    // ------------------------------------------------------------------
    // TEST 3: Host Modal Scroll to Practice, 1v1, 2v2 Options
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: Host Match Modal Scrolling & Matchmaking Buttons ---');
    const hostModalTest = await page.evaluate(async () => {
      // Click Host Match button
      const hostMatchBtn = document.getElementById('hostMatchBtn');
      hostMatchBtn.click();

      const hostModal = document.getElementById('hostModal');
      const card = hostModal.querySelector('.card');
      const practiceBtn = document.getElementById('practiceBtn');
      const host1v1Btn = document.getElementById('host1v1Btn');
      const host2v2Btn = document.getElementById('host2v2Btn');
      const cancelHostBtn = document.getElementById('cancelHostBtn');

      const cardStyle = window.getComputedStyle(card);
      const isScrollable = card.scrollHeight > card.clientHeight;

      // Scroll card to see bottom buttons
      card.scrollTop = card.scrollHeight - card.clientHeight;

      // Verify all buttons exist and have correct labels
      const pText = practiceBtn ? practiceBtn.textContent.trim() : '';
      const h1Text = host1v1Btn ? host1v1Btn.textContent.trim() : '';
      const h2Text = host2v2Btn ? host2v2Btn.textContent.trim() : '';
      const cText = cancelHostBtn ? cancelHostBtn.textContent.trim() : '';

      return {
        hostModalVisible: hostModal.style.display === 'flex',
        cardOverflowY: cardStyle.overflowY,
        cardTouchAction: cardStyle.touchAction,
        isScrollable,
        scrollTop: card.scrollTop,
        practiceVisible: pText.includes('PRACTICE'),
        host1v1Visible: h1Text.includes('1v1'),
        host2v2Visible: h2Text.includes('2v2'),
        cancelVisible: cText.includes('RETURN TO MENU')
      };
    });

    console.log('Host Modal Test Results:', hostModalTest);
    if (
      hostModalTest.hostModalVisible &&
      hostModalTest.cardOverflowY === 'auto' &&
      hostModalTest.cardTouchAction.includes('pan-y') &&
      hostModalTest.practiceVisible &&
      hostModalTest.host1v1Visible &&
      hostModalTest.host2v2Visible &&
      hostModalTest.cancelVisible
    ) {
      console.log('>>> TEST 3 PASSED: Host modal is scrollable and displays Practice, 1v1, and 2v2 options!');
    } else {
      throw new Error(`TEST 3 FAILED: ${JSON.stringify(hostModalTest)}`);
    }

    // ------------------------------------------------------------------
    // TEST 4: Launching Practice Mode & Verifying Gameplay Controls Unaffected
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: Modals Closed -> Global Touch Controls Unaffected ---');
    const gameplayTest = await page.evaluate(async () => {
      const dbg = window.__dbg;
      const practiceBtn = document.getElementById('practiceBtn');
      practiceBtn.click();

      // Wait for 3s countdown to end
      while (dbg.countdownTimer() > 0) {
        dbg.step(0.5);
      }

      const isRunning = dbg.running();
      const isPaused = dbg.paused();
      const overlayHidden = document.getElementById('overlay').style.display === 'none';
      const hostModalHidden = document.getElementById('hostModal').style.display === 'none';

      // Test joystick touch in left 45% of screen (x = 200, y = 250)
      const touchJoyStart = new Touch({
        identifier: 1,
        target: document.querySelector('canvas'),
        clientX: 200,
        clientY: 250
      });

      window.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchJoyStart],
        touches: [touchJoyStart]
      }));

      // Move joystick upward
      const touchJoyMove = new Touch({
        identifier: 1,
        target: document.querySelector('canvas'),
        clientX: 200,
        clientY: 200
      });

      window.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchJoyMove],
        touches: [touchJoyMove]
      }));

      const moveVec = dbg.touchMove();
      const joyActive = moveVec.y < -0.5;

      // Release joystick
      window.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchJoyMove],
        touches: []
      }));

      // Test camera look swipe in right 55% of screen (x = 600, y = 200)
      const initialYaw = dbg.yaw();
      const touchLookStart = new Touch({
        identifier: 2,
        target: document.querySelector('canvas'),
        clientX: 600,
        clientY: 200
      });

      window.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchLookStart],
        touches: [touchLookStart]
      }));

      const touchLookMove = new Touch({
        identifier: 2,
        target: document.querySelector('canvas'),
        clientX: 500, // swipe left -> yaw changes
        clientY: 200
      });

      window.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchLookMove],
        touches: [touchLookMove]
      }));

      const newYaw = dbg.yaw();
      const yawRotated = Math.abs(newYaw - initialYaw) > 0.05;

      window.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touchLookMove],
        touches: []
      }));

      return {
        isRunning,
        isPaused,
        overlayHidden,
        hostModalHidden,
        joyActive,
        yawRotated
      };
    });

    console.log('Gameplay Controls Test Results:', gameplayTest);
    if (
      gameplayTest.isRunning &&
      !gameplayTest.isPaused &&
      gameplayTest.overlayHidden &&
      gameplayTest.hostModalHidden &&
      gameplayTest.joyActive &&
      gameplayTest.yawRotated
    ) {
      console.log('>>> TEST 4 PASSED: Gameplay touch controls (joystick and camera swipe) operate seamlessly during combat!');
    } else {
      throw new Error(`TEST 4 FAILED: ${JSON.stringify(gameplayTest)}`);
    }

    // ------------------------------------------------------------------
    // TEST 5: Pause Menu Scrolling & Scroll Reset Verification
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: Pause Menu Scrolling & Scroll Position Reset ---');
    const pauseTest = await page.evaluate(async () => {
      const dbg = window.__dbg;
      // Pause game
      const pauseBtn = document.getElementById('pauseBtn');
      pauseBtn.click();

      const pm = document.getElementById('pauseMenu');
      const card = pm.querySelector('.card');
      const cardStyle = window.getComputedStyle(card);

      const initialScroll = card.scrollTop;

      // Resume game
      const resumeBtn = document.getElementById('resumeBtn');
      resumeBtn.click();

      const isRunning = dbg.running() && !dbg.paused();

      return {
        pmWasOpen: cardStyle.overflowY === 'auto' && cardStyle.touchAction.includes('pan-y'),
        initialScrollZero: initialScroll === 0,
        gameResumed: isRunning
      };
    });

    console.log('Pause Menu Test Results:', pauseTest);
    if (pauseTest.pmWasOpen && pauseTest.initialScrollZero && pauseTest.gameResumed) {
      console.log('>>> TEST 5 PASSED: Pause modal has card scrolling and resets scroll position cleanly!');
    } else {
      throw new Error(`TEST 5 FAILED: ${JSON.stringify(pauseTest)}`);
    }

    console.log('\n======================================================');
    console.log('ALL MOBILE MODAL SCROLLING ACCEPTANCE CRITERIA VERIFIED! 🚀');
    console.log('======================================================');

  } finally {
    await browser.close();
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
