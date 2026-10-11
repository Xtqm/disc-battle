import assert from 'assert';
import { MockAuthProvider, generateUUID, generateGuestHandle } from './src/auth/MockAuthProvider.js';

console.log('--- Running MockAuthProvider Test Suite ---');

// Test 1: UUID format
const uuid = generateUUID();
console.log('Generated UUID:', uuid);
assert.strictEqual(typeof uuid, 'string');
assert.strictEqual(uuid.length, 36);
assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
console.log('✓ UUID generation complies with RFC4122 v4');

// Test 2: Guest handle format
const handle = generateGuestHandle(uuid);
console.log('Generated Guest Handle:', handle);
assert.match(handle, /^GUEST_SUBROUTINE_[A-Z0-9]{4}$/);
console.log('✓ Guest handle adheres to Tron subroutine format');

// Test 3: MockAuthProvider initialization & provisioning
const provider1 = new MockAuthProvider();
assert.strictEqual(provider1.providerId, 'mock');
assert.strictEqual(provider1.getCurrentUser(), null);

let stateChangedUser = null;
const unsub = provider1.onAuthStateChanged((user) => {
  stateChangedUser = user;
});

await provider1.init();
const user1 = provider1.getCurrentUser();
assert.notStrictEqual(user1, null);
assert.strictEqual(typeof user1.uid, 'string');
assert.strictEqual(user1.isAnonymous, true);
assert.strictEqual(user1.providerId, 'mock');
assert.strictEqual(typeof user1.token, 'string');
assert.strictEqual(user1.handle, generateGuestHandle(user1.uid));
console.log('✓ Initial zero-barrier provisioning succeeded for user:', user1.handle);

// Wait for microtask / callback
await new Promise(r => setTimeout(r, 10));
assert.strictEqual(stateChangedUser.uid, user1.uid);
console.log('✓ onAuthStateChanged listener triggered with authenticated identity');

// Test 4: Re-hydration in a second provider instance
const provider2 = new MockAuthProvider();
await provider2.init();
const user2 = provider2.getCurrentUser();
assert.strictEqual(user2.uid, user1.uid, 'Re-hydrated UID must match persisted UID');
assert.strictEqual(user2.handle, user1.handle, 'Re-hydrated handle must match persisted handle');
console.log('✓ Session re-hydration preserved guest identity across instances');

// Test 5: Force new guest creation
const forcedUser = await provider1.signInGuest(true);
assert.notStrictEqual(forcedUser.uid, user1.uid, 'Forced new guest should generate distinct UID');
console.log('✓ Forced guest creation yielded fresh identity:', forcedUser.handle);

// Test 6: Sign out
await provider1.signOut();
assert.strictEqual(provider1.getCurrentUser(), null);
console.log('✓ Sign out successfully cleared current user session');

unsub();
console.log('--- MockAuthProvider Test Suite PASSED ---\n');
