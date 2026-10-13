import assert from 'assert';
import { getIdentityHeaderHtml, calculateLevel } from '../src/ui/authTerminal.js';
import { authManager } from '../src/auth/AuthManager.js';
import { AuthEvents, authEventBus } from '../src/auth/events.js';

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

console.log('--- Main Menu Identity Header Unit Tests PASSED ---');
