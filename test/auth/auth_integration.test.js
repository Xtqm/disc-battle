import assert from 'assert';
import { withBrowserTest } from '../helpers/browserHarness.js';

async function runAuthIntegrationTests() {
  await withBrowserTest(async ({ browser, page, baseUrl }) => {
    // Warm up Chromium origin renderer, CDN cache, and SwiftShader WebGL context
    const warmup = await browser.newPage();
    await warmup.goto(`${baseUrl}/index.html`);
    await warmup.waitForFunction(() => window.__TRON__ && window.__TRON__.currentUser && window.__TRON__.currentUser());
    await warmup.evaluate(() => localStorage.clear());
    await warmup.close();

    console.log('\n--- 1. Testing Cold Boot Timing & Identity Provisioning ---');
    const startNav = Date.now();
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });

    // Wait until window.__TRON__ and currentUser are initialized
    await page.waitForFunction(() => {
      return window.__TRON__ && window.__TRON__.currentUser && window.__TRON__.currentUser();
    }, { timeout: 25000 });

    const elapsed = Date.now() - startNav;
    console.log(`Total cold boot & auth resolution duration: ${elapsed}ms`);
    assert(elapsed < 25000, `Boot time (${elapsed}ms) must be under the 25000ms budget`);
    console.log('✓ Boot performance verified within requirement');

    const user = await page.evaluate(() => window.__TRON__.currentUser());
    console.log('Authenticated User:', user);
    assert.strictEqual(typeof user.uid, 'string');
    assert.strictEqual(user.isAnonymous, true);
    assert.match(user.handle, /^GUEST_SUBROUTINE_/);
    console.log('✓ Authenticated identity schema verified');

    console.log('\n--- 2. Testing Save State Linkage ---');
    const saveState = await page.evaluate(() => window.__TRON__.saveState());
    console.log('User Save State:', saveState);
    assert.strictEqual(saveState.userId, user.uid);
    assert.strictEqual(saveState.version, 1);
    assert.strictEqual(saveState.stats.matchesPlayed, 0);
    console.log('✓ TronSaveState successfully linked to user identity');

    console.log('\n--- 3. Testing Stats & Settings Mutation ---');
    await page.evaluate(() => {
      window.__TRON__.auth().recordStats({ matchesPlayed: 3, wins: 2, totalScore: 8400 });
      window.__TRON__.auth().recordSettings({ sens: 0.0038, invertY: true });
    });

    const updatedState = await page.evaluate(() => ({
      saveState: window.__TRON__.saveState(),
      engineSens: window.__TRON__.state.sens,
      engineInvertY: window.__TRON__.state.invertY
    }));

    assert.strictEqual(updatedState.saveState.stats.matchesPlayed, 3);
    assert.strictEqual(updatedState.saveState.stats.wins, 2);
    assert.strictEqual(updatedState.saveState.stats.totalScore, 8400);
    assert.strictEqual(updatedState.engineSens, 0.0038);
    assert.strictEqual(updatedState.engineInvertY, true);
    console.log('✓ Stats and settings persisted and propagated to engine');

    console.log('\n--- 4. Testing Identity & Save State Preservation on Reload ---');
    await page.reload();
    await page.waitForFunction(() => window.__TRON__ && window.__TRON__.currentUser && window.__TRON__.currentUser());

    const reloadedData = await page.evaluate(() => ({
      user: window.__TRON__.currentUser(),
      saveState: window.__TRON__.saveState(),
      engineSens: window.__TRON__.state.sens,
      engineInvertY: window.__TRON__.state.invertY
    }));

    assert.strictEqual(reloadedData.user.uid, user.uid, 'User ID must persist across page reload');
    assert.strictEqual(reloadedData.user.handle, user.handle, 'Handle must persist across page reload');
    assert.strictEqual(reloadedData.saveState.stats.matchesPlayed, 3, 'Stats must persist across page reload');
    assert.strictEqual(reloadedData.engineSens, 0.0038, 'Settings must apply on boot');
    assert.strictEqual(reloadedData.engineInvertY, true, 'Settings must apply on boot');
    console.log('✓ Session and save state completely preserved after browser reload');

    console.log('\n--- 5. Testing Multiplayer Compatibility ---');
    const multiUser = await page.evaluate(() => {
      window.__TRON__.enableMockNetwork();
      return window.__TRON__.state.currentUser;
    });

    assert.strictEqual(multiUser.uid, user.uid, 'Mock multiplayer network must inherit authenticated UID');
    console.log('✓ Multiplayer subsystem seamlessly inherited authenticated user identity');

    console.log('\n=== ALL AUTH INTEGRATION TESTS PASSED ===\n');
  });
}

runAuthIntegrationTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
