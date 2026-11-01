# Tasks: WebRTC Peer-to-Peer Networking & Warm-up Matchmaking

## 1. WebRTC Peer Connection & Signaling Infrastructure

- [x] 1.1 Implement `src/network/webrtcPeer.js` managing `RTCPeerConnection` lifecycle, STUN candidate gathering, and dual DataChannels (unreliable 60Hz channel for kinematics, reliable channel for combat events), and verify peer connection unit tests
- [x] 1.2 Implement `src/network/signalingBridge.js` utilizing Supabase Realtime ephemeral broadcast channels for SDP offer/answer exchange, and verify signaling negotiation tests

## 2. Combat State & Disc Transport Refactoring

- [x] 2.1 Refactor `src/network/sync.js` to transmit 30-60 Hz player kinematics directly over the fast DataChannel instead of Firestore `roomUpdateDoc`, and verify serialization performance
- [x] 2.2 Refactor `src/entities/Disc.js` and `src/entities/Player.js` to transmit kinetic disc throws, deflections, and de-allocations across the reliable DataChannel, and verify event reception
- [x] 2.3 Refactor `src/network/roomManager.js` to establish direct WebRTC connections when joining via 4-character private invite codes, verifying backward compatibility

## 3. Automated Matchmaking & Warm-up Sparring Arena

- [x] 3.1 Implement `src/network/matchmakingQueue.js` managing queue state machine (`IDLE`, `SEARCHING`, `SPARRING`, `CONNECTING`, `MATCHED`), and verify queue transition unit tests
- [x] 3.2 Implement Warm-up Sparring Arena in `src/ui/menus.js` and `src/core/main.js`: immediately spawn AI training bot upon queue entry with an active search HUD widget, verifying player combat interactions
- [x] 3.3 Implement seamless peer handoff: despawn training bot, reset fallen arena tiles, restore health, and initiate match countdown upon WebRTC DataChannel connection open

## 4. Integration & Regression Verification

- [x] 4.1 Update `test/gameplay/multiplayer.test.js` with simulated WebRTC DataChannel fixtures and verify complete peer lifecycle
- [x] 4.2 Execute test runner domain suites (`storage`, `economy`, `armory`, `campaign`, `achievements`) to ensure zero regressions across offline game modes
