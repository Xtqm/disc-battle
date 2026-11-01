import assert from 'assert';
import { WebRTCPeer, DEFAULT_RTC_CONFIG } from '../../src/network/webrtcPeer.js';

console.log('--- Running WebRTCPeer Unit Tests ---');

// Test 1: Configuration & Initialization
assert.strictEqual(DEFAULT_RTC_CONFIG.iceServers.length, 2, 'Default STUN servers must include 2 Google STUN endpoints');
const peerA = new WebRTCPeer({ isHost: true, isMock: true });
const peerB = new WebRTCPeer({ isHost: false, isMock: true });

assert.strictEqual(peerA.isHost, true, 'PeerA must be initialized as host');
assert.strictEqual(peerB.isHost, false, 'PeerB must be initialized as guest');
assert.strictEqual(peerA.connectionState, 'connecting', 'Initial mock peer state must be connecting');
console.log('✓ Peer initialization and configuration verified');

// Test 2: Mock Peer Connection Lifecycle
let stateA = null;
let stateB = null;
peerA.onConnectionChange = (s) => { stateA = s; };
peerB.onConnectionChange = (s) => { stateB = s; };

peerA.connectMockPeer(peerB);

assert.strictEqual(stateA, 'connected', 'PeerA must transition to connected');
assert.strictEqual(stateB, 'connected', 'PeerB must transition to connected');
console.log('✓ Mock peer interconnection and state transition verified');

// Test 3: Fast Kinematics DataChannel Transmission
let receivedFastData = null;
peerB.onFastMessage = (data) => {
  receivedFastData = data;
};

const kinematicsPayload = {
  x: 12.5,
  y: 0.0,
  z: -4.2,
  yaw: 1.57,
  pitch: 0.1,
  hp: 100,
  blocking: false
};

const sendFastSuccess = peerA.sendFast(kinematicsPayload);
assert.strictEqual(sendFastSuccess, true, 'sendFast must return true when connected');
assert.deepStrictEqual(receivedFastData, kinematicsPayload, 'PeerB must receive exact kinematics payload');
console.log('✓ Fast kinematics DataChannel transmission verified');

// Test 4: Reliable Combat Event Transmission
let receivedEventData = null;
peerA.onReliableMessage = (data) => {
  receivedEventData = data;
};

const combatEventPayload = {
  type: 'DISC_LAUNCH',
  discId: 'disc_99182',
  origin: { x: 0, y: 1.5, z: 0 },
  vel: { x: 0, y: 0, z: 38 },
  curve: 0.25
};

const sendReliableSuccess = peerB.sendReliable(combatEventPayload);
assert.strictEqual(sendReliableSuccess, true, 'sendReliable must return true when connected');
assert.deepStrictEqual(receivedEventData, combatEventPayload, 'PeerA must receive exact combat event payload');
console.log('✓ Reliable combat event transmission verified');

// Test 5: Teardown and Closure
peerA.close();
assert.strictEqual(peerA.connectionState, 'closed', 'PeerA state must be closed after close()');
const postCloseSend = peerA.sendFast({ x: 0 });
assert.strictEqual(postCloseSend, false, 'Sending after close must fail gracefully');
console.log('✓ Teardown and closure verified cleanly');

console.log('======================================================');
console.log('ALL WEBRTC PEER TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
