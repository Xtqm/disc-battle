# Multiplayer Networking Specification

## Purpose

Coordinates real-time multiplayer room matchmaking, throttled state synchronization, interpolation, persistent rematching, and unpaused pointer management.

## Requirements

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

### Requirement: In-Place Rematch Voting
The system SHALL provide persistent post-match rematch voting that resets health and arena tiles without generating a new room code when all participants vote affirmatively.

#### Scenario: Unanimous rematch acceptance
- **WHEN** all connected players vote for a rematch on the post-match screen
- **THEN** the host resets fallen tiles, restores player health to 100%, and re-arms players within the current room session.

### Requirement: Unpaused Cursor Overlay in Multiplayer
The system SHALL unlock the mouse pointer and present an interactive overlay when Escape or pause is pressed during multiplayer, without pausing the simulation.

#### Scenario: Escape pressed in multiplayer match
- **WHEN** a player presses Escape or P during an active online match
- **THEN** the pointer is unlocked and an interactive overlay is shown with options to click-to-resume or leave, while match simulation continues uninterrupted.
