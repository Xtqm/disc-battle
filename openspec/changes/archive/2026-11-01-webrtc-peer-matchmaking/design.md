# Design: WebRTC Peer-to-Peer Networking & Warm-up Matchmaking

## Context

The existing multiplayer subsystem (`src/network/firebaseSetup.js`, `roomManager.js`, `sync.js`) operates via Google Firestore document polling (`updateDoc` / `onSnapshot`) and manual 4-character room codes. While effective for initial local tab testing, this architecture incurs significant latency (150-400ms) and creates an unsustainable cost footprint (each 3-minute match consumes ~3,200 writes, rapidly exhausting database free tiers). See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Eliminate database read/write costs for active gameplay packets by routing combat through direct WebRTC DataChannels.
- Achieve sub-50ms peer latency for disc throws, deflections, and character kinematics.
- Provide a zero-friction automated matchmaking queue with instant warm-up bot sparring to eliminate idle wait times.
- Preserve 4-character direct room code joining for private friend duels.
- Zero new runtime npm dependencies (using native WebRTC and existing Supabase Realtime broadcast).

**Non-Goals:**
- Authoritative cloud game servers (costs $$; unnecessary for 1v1 indie sports).
- Deterministic rollback netcode (client prediction with interpolation is sufficient for 2-player kinetic disc combat).
- In-game voice chat or TURN relay hosting (relies on STUN; strict corporate networks can fall back to local bots or friend duels).

## Decisions

### Decision 1: Native WebRTC DataChannels over Dedicated WebSockets
- **Choice**: Native browser `RTCPeerConnection` with unordered/unreliable `RTCDataChannel` for continuous kinematics (~30-60 Hz) and ordered channel for critical match events (disc throws, damage, rematch votes).
- **Rationale**: Direct peer-to-peer UDP delivers minimal latency and eliminates recurring server bandwidth bills.
- **Alternatives Considered**:
  - *Cloud WebSockets (Colyseus / Socket.io)*: Requires running a continuous Node.js server ($10-$60/mo).
  - *Current Firestore document sync*: Billed per read/write; introduces high polling jitter.

### Decision 2: Signaling via Supabase Realtime Broadcast & Google STUN
- **Choice**: Use the project's existing Supabase client (`supabase.channel('matchmaking')`) for presence and SDP offer/answer signaling, paired with Google's public STUN server (`stun:stun.l.google.com:19302`).
- **Rationale**: Supabase Realtime Broadcast channels are included in the free tier and handle ephemeral signaling messages without database persistence.
- **Alternatives Considered**:
  - *Custom Node signaling server*: Another service to deploy, monitor, and maintain.
  - *PeerJS cloud service*: External 3rd party dependency prone to rate limits.

### Decision 3: Warm-up Sparring State Machine ("Practice While You Wait")
- **Choice**: Entering the queue immediately boots the player into a local Practice Arena against an AI training bot with an active search HUD widget (`[ SEARCHING FOR OPPONENT // TIME: 0:12 ]`).
- **State Transition**:
  ```
  [ Idle / Menu ]
        |
        v (Clicks "Find Match")
  [ Queue Active + Local Bot Sparring Arena ] <------- Player practices & warms up
        |
        v (WebRTC Handshake Completes)
  [ Challenger Detected Banner ] (3s Countdown)
        |
        v (Despawn Bot, Reset Tiles, Symmetrical Spawn)
  [ Live 1v1 Peer Match ]
  ```
- **Rationale**: Completely solves the indie "Empty Lobby" frustration. Players are never stuck staring at a spinner; they are actively playing the game.

## Risks / Trade-offs

- **[Risk] Symmetric NAT / Strict Firewall Blocking**: Approximately 5-8% of users on strict corporate/university networks cannot establish direct P2P connections without a TURN relay.
  - *Mitigation*: Configure standard STUN servers. If connection fails to establish within 10 seconds, gracefully inform the player and allow them to invite friends directly via room codes or continue sparring with the bot.
- **[Risk] State Desync on Packet Drops**: Rapid disc throws or fallen arena tiles could desynchronize if packets drop.
  - *Mitigation*: Separate channels: high-frequency positional packets use fast unreliable DataChannel, while discrete game events (disc throws, hits, tile drops) send over an ordered/reliable DataChannel.
