# Multiplayer Networking Specification

## Purpose

Coordinates real-time multiplayer room matchmaking, throttled state synchronization, interpolation, persistent rematching, and unpaused pointer management.

## Requirements

### Requirement: Room Lifecycle and Matchmaking
The system SHALL facilitate creating and joining peer rooms using 4-character codes with symmetrical spawn locations for 1v1 and 2v2 Duos matches.

#### Scenario: Symmetrical room join
- **WHEN** a guest enters an active 4-character room code
- **THEN** the system links the guest to the room, assigns symmetrical spawn positions, and initiates the combat session.

### Requirement: Throttled State Synchronization and Interpolation
The system SHALL broadcast entity state at an approximately 18 Hz interval and smooth incoming peer positions using linear interpolation on the receiving client.

#### Scenario: Remote entity position interpolation
- **WHEN** incoming state updates arrive from remote peers
- **THEN** remote player models interpolate smoothly toward target positions and orientations without hitching the local 60 FPS render loop.

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
