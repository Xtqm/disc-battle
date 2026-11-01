# Proposal: WebRTC Peer-to-Peer Networking & Warm-up Matchmaking

## Why

The current multiplayer implementation synchronizes combat at 18 Hz by writing JSON state documents to Firebase Firestore (`sync.js`), which introduces 150-400ms HTTP polling latency, risks exhausting database free-tier write quotas in fewer than 10 matches, and relies exclusively on manual 4-character room codes. To prepare Arc League for public distribution on itch.io and beyond without recurring server hosting bills, the game requires upgrading to zero-cost, low-latency WebRTC DataChannels for direct peer-to-peer transport and solving the indie "empty queue" problem with an engaging warm-up bot sparring queue.

## What Changes

- **WebRTC DataChannel Transport**: Replace Firestore document updates (`roomUpdateDoc`) with direct peer-to-peer UDP-like DataChannels for entity state, kinetic disc throws, and parry telemetry at 30-60 Hz with sub-50ms regional latency.
- **Lightweight Zero-Cost Signaling**: Implement zero-cost peer signaling (SDP offer/answer and ICE candidate exchange) utilizing Supabase Realtime broadcast channels and public STUN servers (Google STUN) with graceful fallback to room codes.
- **Online Matchmaking Queue**: Introduce an automated matchmaking queue allowing players to find random opponents across regional pools without sharing out-of-band codes.
- **Warm-up Sparring Arena ("Practice While You Wait")**: When entering the matchmaking queue, instead of waiting on a static loading screen, the player immediately drops into a practice arena against an AI training bot. The game seamlessly hot-swaps to the human opponent as soon as the WebRTC connection handshake completes.
- **Legacy Room Code Retention**: Preserve 4-character direct invite room codes for private duels between friends.

## Capabilities

### New Capabilities
- `online-matchmaking`: Manages the matchmaking queue lifecycle, peer candidate pairing, and the interactive warm-up sparring arena state machine that drops players into bot combat during queue times and transitions seamlessly when an opponent connects.

### Modified Capabilities
- `multiplayer-networking`: Upgrades room lifecycle and real-time state synchronization requirements from cloud document polling to direct peer-to-peer WebRTC DataChannels with low-latency frame transport.

## Impact

- **Networking**: `src/network/` refactored to introduce `webrtcPeer.js` and `signalingBridge.js`, eliminating continuous Firestore writes.
- **Matchmaking UI**: New menu entry point `[ FIND MATCH ]` and an active queue status banner displayed during warm-up sparring.
- **Dependencies**: Uses native browser WebRTC APIs (`RTCPeerConnection`, `RTCDataChannel`) and existing Supabase Realtime client—zero new runtime npm dependencies.
- **Cost**: $0.00 continuous server costs; operates completely on client-to-client peer bandwidth.
