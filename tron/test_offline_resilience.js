import assert from 'assert';
import { OfflineSyncQueue } from '../src/storage/OfflineSyncQueue.js';
import { updateOfflineBanner } from '../src/ui/hud.js';

console.log('--- Running Offline Resilience & Sync Queue Test Suite ---');

const queue = new OfflineSyncQueue({ storageKey: 'test_offline_queue' });
queue.clear();

// Test 1: Initial state
assert.strictEqual(queue.size, 0);
assert.strictEqual(queue.isOnline, true);
console.log('✓ Initial queue initialized cleanly with 0 pending items');

// Test 2: Network status subscription & offline simulation
let currentStatus = null;
const unsub = queue.onStatusChange((status) => {
  currentStatus = status;
});

assert.strictEqual(currentStatus.isOnline, true);
assert.strictEqual(currentStatus.pendingCount, 0);

queue.setOnline(false);
assert.strictEqual(queue.isOnline, false);
assert.strictEqual(currentStatus.isOnline, false);
console.log('✓ Offline status successfully dispatched to listeners');

// Test 3: Enqueue mutations while offline
const mut1 = queue.enqueue({ bits: 50, level: 2 });
const mut2 = queue.enqueue({ bits: 120, inventory: ['disc_tron'] });

assert.strictEqual(queue.size, 2);
assert.strictEqual(currentStatus.pendingCount, 2);
assert.strictEqual(queue.getQueue()[0].id, mut1);
assert.strictEqual(queue.getQueue()[1].id, mut2);
console.log(`✓ Enqueued 2 mutations offline (size=${queue.size}, IDs: ${mut1}, ${mut2})`);

// Test 4: Flush prevented while offline
let syncCalls = 0;
const mockSyncHandler = async (payload) => {
  syncCalls++;
  return true;
};

const offlineFlushResult = await queue.flush(mockSyncHandler);
assert.strictEqual(offlineFlushResult.processed, 0);
assert.strictEqual(queue.size, 2);
assert.strictEqual(syncCalls, 0);
console.log('✓ Flush safely bypassed while network is marked offline');

// Test 5: Reconnection & queue draining
queue.setOnline(true);
assert.strictEqual(queue.isOnline, true);

const onlineFlushResult = await queue.flush(mockSyncHandler);
assert.strictEqual(onlineFlushResult.processed, 2);
assert.strictEqual(onlineFlushResult.remaining, 0);
assert.strictEqual(queue.size, 0);
assert.strictEqual(syncCalls, 2);
console.log('✓ Reconnection flush processed all pending items cleanly');

// Test 6: Diegetic banner DOM simulation
let bannerDisplay = 'none';
let bannerText = '';
global.document = {
  getElementById: (id) => {
    if (id === 'offlineSyncBanner') {
      return {
        style: {
          get display() { return bannerDisplay; },
          set display(v) { bannerDisplay = v; }
        }
      };
    }
    if (id === 'offlineBannerText') {
      return {
        get textContent() { return bannerText; },
        set textContent(v) { bannerText = v; }
      };
    }
    return null;
  }
};

updateOfflineBanner(false, 3);
assert.strictEqual(bannerDisplay, 'flex');
assert.ok(bannerText.includes('3 MUTATIONS QUEUED'));
console.log('✓ updateOfflineBanner correctly activated when offline:', bannerText);

updateOfflineBanner(true, 0);
assert.strictEqual(bannerDisplay, 'none');
console.log('✓ updateOfflineBanner cleanly hidden when online');

unsub();
queue.clear();
console.log('--- Offline Resilience & Sync Queue Test Suite PASSED ---\n');
