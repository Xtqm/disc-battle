import assert from 'assert';
import { SignalingBridge } from '../../src/network/signalingBridge.js';

console.log('--- Running SignalingBridge Unit Tests ---');

// Setup two simulated peers communicating over a common mock room
const roomCode = 'ROOM_' + Math.floor(Math.random() * 10000);
const bridgeHost = new SignalingBridge({ peerId: 'host_p1', roomCode });
const bridgeGuest = new SignalingBridge({ peerId: 'guest_p2', roomCode });

let guestReceivedOffer = null;
let guestOfferSender = null;
bridgeGuest.onOffer = (offer, senderId) => {
  guestReceivedOffer = offer;
  guestOfferSender = senderId;
};

let hostReceivedAnswer = null;
let hostAnswerSender = null;
bridgeHost.onAnswer = (answer, senderId) => {
  hostReceivedAnswer = answer;
  hostAnswerSender = senderId;
};

let hostReceivedCandidate = null;
bridgeHost.onCandidate = (candidate, senderId) => {
  hostReceivedCandidate = candidate;
};

// Connect both bridges
await bridgeHost.connect();
await bridgeGuest.connect();

assert.strictEqual(bridgeHost.isSubscribed, true, 'Host bridge must be subscribed');
assert.strictEqual(bridgeGuest.isSubscribed, true, 'Guest bridge must be subscribed');
console.log('✓ Signaling bridge subscription verified');

// Test 1: Offer Dispatch & Direct Target Routing
const sampleOffer = { type: 'offer', sdp: 'v=0\r\no=host 1234 5678...' };
bridgeHost.sendOffer(sampleOffer, 'guest_p2');

// Give microtask tick for BroadcastChannel message processing
await new Promise(r => setTimeout(r, 50));

assert.deepStrictEqual(guestReceivedOffer, sampleOffer, 'Guest must receive exact dispatched offer');
assert.strictEqual(guestOfferSender, 'host_p1', 'Sender ID must match host_p1');
console.log('✓ SDP offer dispatch and target routing verified');

// Test 2: Answer Dispatch
const sampleAnswer = { type: 'answer', sdp: 'v=0\r\no=guest 8765 4321...' };
bridgeGuest.sendAnswer(sampleAnswer, 'host_p1');

await new Promise(r => setTimeout(r, 50));

assert.deepStrictEqual(hostReceivedAnswer, sampleAnswer, 'Host must receive exact dispatched answer');
assert.strictEqual(hostAnswerSender, 'guest_p2', 'Sender ID must match guest_p2');
console.log('✓ SDP answer dispatch verified');

// Test 3: ICE Candidate Dispatch
const sampleCandidate = { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.50 54321 typ host', sdpMid: '0', sdpMLineIndex: 0 };
bridgeGuest.sendCandidate(sampleCandidate, 'host_p1');

await new Promise(r => setTimeout(r, 50));

assert.deepStrictEqual(hostReceivedCandidate, sampleCandidate, 'Host must receive ICE candidate');
console.log('✓ ICE candidate dispatch verified');

// Cleanup
bridgeHost.disconnect();
bridgeGuest.disconnect();
assert.strictEqual(bridgeHost.isSubscribed, false, 'Host must be unsubscribed after disconnect');
assert.strictEqual(bridgeGuest.isSubscribed, false, 'Guest must be unsubscribed after disconnect');
console.log('✓ Teardown and disconnect verified');

console.log('======================================================');
console.log('ALL SIGNALING BRIDGE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
