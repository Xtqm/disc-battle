import assert from 'assert';
import { MatchmakingQueue, QUEUE_STATES } from '../../src/network/matchmakingQueue.js';
import { state } from '../../src/core/state.js';

console.log('--- Running MatchmakingQueue Unit Tests ---');

// Test 1: Initial State
const mmQueue = new MatchmakingQueue();
assert.strictEqual(mmQueue.status, QUEUE_STATES.IDLE, 'Initial queue status must be IDLE');
console.log('✓ Initial queue state verified');

// Test 2: Starting Queue Transitions to SEARCHING
let observedStatus = null;
mmQueue.startQueue({
  onStatusChange: (s) => { observedStatus = s; }
});

assert.strictEqual(mmQueue.status, QUEUE_STATES.SEARCHING, 'Queue status must transition to SEARCHING');
assert.strictEqual(state.matchmakingQueueState, QUEUE_STATES.SEARCHING, 'Global state must reflect SEARCHING');
assert.notStrictEqual(mmQueue.bridge, null, 'Signaling bridge must be initialized');
console.log('✓ Queue start and signaling bridge initialization verified');

// Test 3: Deterministic Peer Handshake (Lexicographical Host Assignment)
const hostId = 'player_1111';
const guestId = 'player_9999';

mmQueue.peerId = hostId;
await mmQueue._handleDiscoveredPeer(guestId);

assert.strictEqual(mmQueue.status, QUEUE_STATES.CONNECTING, 'Queue must transition to CONNECTING on peer discovery');
assert.strictEqual(mmQueue.assignedRole, 'p1', 'Lexicographically smaller peerId must be assigned host (p1)');
assert.strictEqual(mmQueue.matchedPeerId, guestId, 'Matched peer ID must record guestId');
console.log('✓ Deterministic host pairing and role assignment verified');

// Test 4: Cancel Queue Teardown
mmQueue.cancelQueue();
assert.strictEqual(mmQueue.status, QUEUE_STATES.IDLE, 'Status must return to IDLE after cancel');
assert.strictEqual(mmQueue.bridge, null, 'Signaling bridge must be disconnected');
assert.strictEqual(state.matchmakingQueueState, QUEUE_STATES.IDLE, 'Global state must return to IDLE');
console.log('✓ Queue cancellation and resource teardown verified');

console.log('======================================================');
console.log('ALL MATCHMAKING QUEUE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
