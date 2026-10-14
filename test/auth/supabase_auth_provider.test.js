import assert from 'assert';
import { SupabaseAuthProvider, generateGuestHandle, resolveSupabaseConfig } from '../../src/auth/SupabaseAuthProvider.js';

console.log('--- Running SupabaseAuthProvider Test Suite ---');

// Test 1: Config resolution
const config1 = resolveSupabaseConfig({ supabaseUrl: 'https://xyz.supabase.co', supabaseAnonKey: 'test-anon-key' });
assert.strictEqual(config1.url, 'https://xyz.supabase.co');
assert.strictEqual(config1.anonKey, 'test-anon-key');
console.log('✓ Config resolution successfully extracts provided credentials');

// Test 2: Guest handle format
const testUid = '550e8400-e29b-41d4-a716-446655440000';
const handle = generateGuestHandle(testUid);
assert.match(handle, /^GUEST_SUBROUTINE_[A-Z0-9]{4}$/);
console.log('✓ Guest handle generation complies with Tron subroutine spec:', handle);

// Test 3: Initialization & native anonymous sign-in
const provider = new SupabaseAuthProvider();
assert.strictEqual(provider.providerId, 'supabase');
assert.strictEqual(provider.getCurrentUser(), null);

let lastReportedUser = null;
const unsub = provider.onAuthStateChanged((user) => {
  lastReportedUser = user;
});

await provider.init();
const anonUser = provider.getCurrentUser();
assert.notStrictEqual(anonUser, null);
assert.strictEqual(anonUser.isAnonymous, true);
assert.strictEqual(anonUser.providerId, 'supabase');
assert.strictEqual(typeof anonUser.uid, 'string');
assert.ok(anonUser.token.length > 0);
assert.strictEqual(lastReportedUser.uid, anonUser.uid);
console.log('✓ Initialized and provisioned native anonymous guest session:', anonUser.uid);

// Test 4: Identity linking (anonymous to email/password upgrade)
const upgradedUser = await provider.linkIdentity({
  email: 'flynn@encom.grid',
  password: 'MasterPassword123',
  handle: 'CLU_OVERRIDE'
});
assert.strictEqual(upgradedUser.uid, anonUser.uid, 'Linking must preserve existing account UID');
assert.strictEqual(upgradedUser.isAnonymous, false, 'Linked account is no longer anonymous');
assert.strictEqual(upgradedUser.handle, 'CLU_OVERRIDE');
assert.strictEqual(upgradedUser.email, 'flynn@encom.grid');
console.log('✓ Anonymous session upgraded via linkIdentity without losing UID:', upgradedUser.handle);

// Test 5: OAuth Provider dispatch (Google, Discord, GitHub)
for (const oAuthProvider of ['google', 'discord', 'github']) {
  const oAuthUser = await provider.signInWithFederated(oAuthProvider);
  assert.ok(oAuthUser, `OAuth flow for ${oAuthProvider} must return user`);
  console.log(`✓ OAuth provider dispatch succeeded for [${oAuthProvider}]`);
}

// Test 6: Direct Passkey (Password) & Magic Link
const passkeyUser = await provider.signInWithCredentials('alan.bradley@tron.sys', 'TronLives1982', 'TRON_ORIGINAL');
assert.strictEqual(passkeyUser.email, 'alan.bradley@tron.sys');
assert.strictEqual(passkeyUser.isAnonymous, false);
console.log('✓ Direct passkey authentication succeeded for user:', passkeyUser.handle);

const magicLinkResult = await provider.signInWithCredentials('kevin@arcade.io', '');
assert.strictEqual(magicLinkResult.magicLinkSent, true);
console.log('✓ Magic link OTP dispatch handled successfully');

// Test 7: updateHandle
await provider.updateHandle('USER_RECOGNIZED_1');
assert.strictEqual(provider.getCurrentUser().handle, 'USER_RECOGNIZED_1');
console.log('✓ updateHandle successfully persisted to current session');

// Test 8: Sign out
await provider.signOut();
assert.strictEqual(provider.getCurrentUser(), null);
assert.strictEqual(lastReportedUser, null);
console.log('✓ Sign out successfully terminated session and alerted listeners');

unsub();
console.log('--- SupabaseAuthProvider Test Suite PASSED ---\n');
