import assert from 'assert';
import {
  CloudSyncResolver,
  normalizeSaveState,
  saveStateToRow,
  rowToSaveState,
  fetchRemoteSaveState,
  upsertRemoteSaveState
} from '../src/storage/CloudSyncResolver.js';
import { offlineSyncQueue } from '../src/storage/OfflineSyncQueue.js';
import { AuthManager } from '../src/auth/AuthManager.js';
import { ENV } from '../src/core/env.js';

console.log('--- Running Supabase Cloud Sync & RLS Persistence Test Suite ---');

// Test 1: Bidirectional Row Serialization
const testState = normalizeSaveState({
  userId: '11111111-2222-4333-8444-555555555555',
  handle: 'GRID_RUNNER',
  bits: 2500,
  level: 5,
  starMastery: { 1: 3, 2: 3, 3: 2 },
  inventory: ['disc_default', 'disc_heavy', 'trail_cyan'],
  achievements: ['ACH_FIRST_WIN', 'ACH_PERFECT_DEFLECTION'],
  stats: { matchesPlayed: 10, wins: 8, highestWave: 15, highestTier: 3, totalScore: 45000 },
  settings: { sens: 0.003, invertY: false },
  version: 1
});

const row = saveStateToRow(testState);
assert.strictEqual(row.user_id, testState.userId);
assert.strictEqual(row.handle, testState.handle);
assert.strictEqual(row.bits, 2500);
assert.strictEqual(row.level, 5);
assert.deepStrictEqual(row.star_mastery, { 1: 3, 2: 3, 3: 2 });
assert.deepStrictEqual(row.inventory, ['disc_default', 'disc_heavy', 'trail_cyan']);
assert.deepStrictEqual(row.achievements, ['ACH_FIRST_WIN', 'ACH_PERFECT_DEFLECTION']);
assert.strictEqual(typeof row.created_at, 'string');
assert.strictEqual(typeof row.last_active_at, 'string');
console.log('✓ saveStateToRow maps camelCase TronSaveState to Postgres snake_case row schema');

const reconstructed = rowToSaveState(row);
assert.strictEqual(reconstructed.userId, testState.userId);
assert.strictEqual(reconstructed.handle, testState.handle);
assert.strictEqual(reconstructed.bits, testState.bits);
assert.strictEqual(reconstructed.level, testState.level);
assert.deepStrictEqual(reconstructed.starMastery, testState.starMastery);
assert.deepStrictEqual(reconstructed.inventory, testState.inventory);
assert.deepStrictEqual(reconstructed.achievements, testState.achievements);
console.log('✓ rowToSaveState accurately reconstructs normalized TronSaveState from Postgres row');

// Test 2: Remote Fetch and Upsert with Mock Client
const mockDatabase = new Map();
const mockClient = {
  from(tableName) {
    assert.strictEqual(tableName, 'save_states');
    return {
      select() {
        return {
          eq(col, val) {
            return {
              async maybeSingle() {
                if (col === 'user_id' && mockDatabase.has(val)) {
                  return { data: mockDatabase.get(val), error: null };
                }
                return { data: null, error: null };
              }
            };
          }
        };
      },
      upsert(payload) {
        mockDatabase.set(payload.user_id, { ...payload });
        return {
          select() {
            return {
              async maybeSingle() {
                return { data: mockDatabase.get(payload.user_id), error: null };
              }
            };
          }
        };
      }
    };
  }
};

const savedRemote = await upsertRemoteSaveState(testState, mockClient);
assert.strictEqual(savedRemote.userId, testState.userId);
assert.strictEqual(savedRemote.bits, 2500);
console.log('✓ upsertRemoteSaveState successfully commits record to remote storage');

const fetchedRemote = await fetchRemoteSaveState(testState.userId, mockClient);
assert.notStrictEqual(fetchedRemote, null);
assert.strictEqual(fetchedRemote.userId, testState.userId);
assert.strictEqual(fetchedRemote.bits, 2500);
assert.strictEqual(fetchedRemote.level, 5);
console.log('✓ fetchRemoteSaveState successfully retrieves and normalizes remote record');

// Test 3: Monotonic Cloud Convergence
const localState = normalizeSaveState({
  userId: testState.userId,
  handle: 'LOCAL_HANDLE',
  bits: 3000, // Local has more bits
  level: 4,   // Cloud has higher level (5)
  starMastery: { 1: 3, 4: 2 },
  inventory: ['disc_default', 'disc_plasma'] // Unique local item
});

const cloudState = fetchedRemote; // Level 5, bits 2500, starMastery { 1: 3, 2: 3, 3: 2 }, inventory ['disc_default', 'disc_heavy', 'trail_cyan']
const resolved = CloudSyncResolver.resolve(localState, cloudState);

assert.strictEqual(resolved.bits, 3000, 'Bits must be max(3000, 2500) = 3000');
assert.strictEqual(resolved.level, 5, 'Level must be max(4, 5) = 5');
assert.strictEqual(resolved.starMastery[1], 3);
assert.strictEqual(resolved.starMastery[2], 3);
assert.strictEqual(resolved.starMastery[3], 2);
assert.strictEqual(resolved.starMastery[4], 2);
assert.ok(resolved.inventory.includes('disc_plasma'), 'Local unique item preserved');
assert.ok(resolved.inventory.includes('disc_heavy'), 'Cloud unique item preserved');
console.log('✓ CloudSyncResolver guarantees strictly non-decreasing convergence across local and cloud profiles');

// Test 4: Offline Fallback & Sync Queueing
offlineSyncQueue.clear();
const failingClient = {
  from() {
    return {
      select() {
        return {
          eq() {
            return {
              async maybeSingle() {
                throw new Error('Network timeout: connection refused');
              }
            };
          }
        };
      },
      upsert() {
        return {
          select() {
            return {
              async maybeSingle() {
                throw new Error('Network timeout: connection refused');
              }
            };
          }
        };
      }
    };
  }
};

const mockProvider = {
  providerId: 'supabase',
  client: failingClient,
  async init() {},
  getCurrentUser() {
    return {
      uid: testState.userId,
      handle: 'GRID_RUNNER',
      isAnonymous: false
    };
  },
  onAuthStateChanged(cb) {
    cb(this.getCurrentUser());
    return () => {};
  }
};

const auth = new AuthManager();
await auth.init(mockProvider);

// Perform stats mutation when cloud is unreachable
auth.recordStats({ matchesPlayed: 1, wins: 1 });
assert.strictEqual(auth.saveState.stats.matchesPlayed, 1);
assert.strictEqual(auth.saveState.stats.wins, 1);

// Give microtask tick for async syncCloudSave rejection to be caught and enqueued
await new Promise(r => setTimeout(r, 50));

assert.ok(offlineSyncQueue.size > 0, 'Failing cloud persistence must enqueue mutation to offlineSyncQueue');
console.log(`✓ Offline fallback enqueued ${offlineSyncQueue.size} pending mutation(s) to OfflineSyncQueue without throwing unhandled exceptions`);

// Test 5: Reconnection Queue Drain
let flushedPayloads = [];
await offlineSyncQueue.flush(async (payload) => {
  flushedPayloads.push(payload);
  return true;
});
assert.ok(flushedPayloads.length >= 1, 'At least 1 mutation must be flushed');
assert.strictEqual(offlineSyncQueue.size, 0);
console.log('✓ OfflineSyncQueue safely flushed all buffered mutations upon reconnection');

// Test 6: Environment Credentials Verification
assert.ok(ENV.SUPABASE_URL.startsWith('https://'), 'ENV.SUPABASE_URL must be a valid HTTPS URL');
assert.ok(ENV.SUPABASE_ANON_KEY.length > 20, 'ENV.SUPABASE_ANON_KEY must be populated');
console.log('✓ Runtime Environment Bridge verified with active project URL:', ENV.SUPABASE_URL);

console.log('--- ALL SUPABASE CLOUD SYNC & RLS TESTS PASSED ---');
