# Spec Delta: multiplayer-networking

## MODIFIED Requirements

### Requirement: Room Lifecycle and Matchmaking
The system SHALL facilitate creating and joining peer rooms using 4-character codes or direct signaling, establishing a direct WebRTC DataChannel connection with symmetrical spawn locations for 1v1 and 2v2 Duos matches.

#### Scenario: Symmetrical room join
- **WHEN** a guest enters an active 4-character room code or accepts a direct peer handshake
- **THEN** the system links the guest to the room via WebRTC DataChannel, assigns symmetrical spawn positions, and initiates the combat session.

#### Scenario: Connection fallback and retry
- **WHEN** an initial direct P2P connection attempt fails or times out
- **THEN** the system retries ICE candidate exchange through configured STUN servers and notifies the player if the peer is unreachable.

### Requirement: Throttled State Synchronization and Interpolation
The system SHALL broadcast entity state, disc throws, and combat actions directly across low-latency WebRTC DataChannels at up to 60 Hz and smooth incoming peer positions using linear interpolation on the receiving client without database write overhead.

#### Scenario: Remote entity position interpolation
- **WHEN** incoming state updates arrive across the WebRTC DataChannel from remote peers
- **THEN** remote player models interpolate smoothly toward target positions and orientations without hitching the local 60 FPS render loop.

#### Scenario: Direct kinetic disc synchronization
- **WHEN** a player executes a kinetic disc throw or curve strike
- **THEN** the disc launch parameters (origin, velocity vector, curve spin) are transmitted immediately over the unbuffered DataChannel to the remote peer.
