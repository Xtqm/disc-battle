import assert from 'assert';
import { matchmakingQueue, QUEUE_STATES } from '../../src/network/matchmakingQueue.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Warm-up Sparring & Match Handoff Tests ---');

// Test 1: Warm-up Queue Initialization
let queueStateNotified = null;
matchmakingQueue.startQueue({
  onStatusChange: (status) => {
    queueStateNotified = status;
  }
});

assert.strictEqual(matchmakingQueue.status, QUEUE_STATES.SEARCHING, 'Queue must be in SEARCHING state');
assert.strictEqual(state.matchmakingQueueState, QUEUE_STATES.SEARCHING, 'State tracking must match SEARCHING');
console.log('✓ Warm-up queue start state verified');

// Test 2: Matchmaking Peer Candidate Discovery & Connecting State
const mockPeerHost = 'player_alpha';
const mockPeerGuest = 'player_omega';

matchmakingQueue.peerId = mockPeerHost;
await matchmakingQueue._handleDiscoveredPeer(mockPeerGuest);

assert.strictEqual(matchmakingQueue.status, QUEUE_STATES.CONNECTING, 'Queue must transition to CONNECTING');
assert.strictEqual(matchmakingQueue.assignedRole, 'p1', 'Alpha must be assigned host (p1)');
console.log('✓ Peer candidate discovery and connection initialization verified');

// Test 3: Seamless Handoff to Live Match
let matchSuccessTriggered = false;
let matchDetails = null;

matchmakingQueue.onMatchSuccess = (details) => {
  matchSuccessTriggered = true;
  matchDetails = details;
};

matchmakingQueue._handleConnectionSuccess();

assert.strictEqual(matchSuccessTriggered, true, 'onMatchSuccess callback must be triggered on DataChannel open');
assert.strictEqual(matchmakingQueue.status, QUEUE_STATES.MATCHED, 'Status must transition to MATCHED');
assert.strictEqual(matchDetails.role, 'p1', 'Handoff must pass correct player role');
assert.strictEqual(matchDetails.opponentId, mockPeerGuest, 'Handoff must identify correct remote peer');
console.log('✓ Seamless handoff to live peer duel verified');

// Cleanup
matchmakingQueue.cancelQueue();
assert.strictEqual(matchmakingQueue.status, QUEUE_STATES.IDLE, 'Teardown must return queue to IDLE');
console.log('✓ Teardown verified');

console.log('======================================================');
console.log('ALL WARM-UP SPARRING & HANDOFF TESTS PASSED (100%)');
console.log('======================================================');
