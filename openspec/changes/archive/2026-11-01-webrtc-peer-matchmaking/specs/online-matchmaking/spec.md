# Spec Delta: online-matchmaking

## Purpose

Coordinates automated online matchmaking queue lifecycles, lightweight peer pairing, and the interactive warm-up sparring arena that eliminates idle waiting times.

## ADDED Requirements

### Requirement: Automated Matchmaking Queue and Regional Pairing
The system SHALL provide an automated matchmaking queue that registers searching players with lightweight signaling, pairs available peers, and initiates WebRTC handshakes without requiring manual room code entry.

#### Scenario: Entering matchmaking queue
- **WHEN** a player activates the `[ FIND MATCH ]` action from the multiplayer menu
- **THEN** the system enters the queue state, opens a presence listener on the signaling channel, and announces player readiness.

#### Scenario: Peer pairing and handshake initiation
- **WHEN** two searching players are matched in the queue
- **THEN** the system designates one peer as host, initiates WebRTC offer/answer negotiation, and transitions both clients into connection establishment.

#### Scenario: Cancelling active queue
- **WHEN** the player clicks `[ CANCEL QUEUE ]` or presses Escape during matchmaking
- **THEN** the system withdraws the search token from the signaling channel and returns the player cleanly to the main menu.

### Requirement: Warm-up Sparring Arena During Queue
The system SHALL spawn the searching player immediately into an interactive warm-up arena against an AI sparring bot while the matchmaking search proceeds in the background.

#### Scenario: Immediate spawn into warm-up arena
- **WHEN** a player enters the matchmaking queue
- **THEN** the system loads the Prime Stadium arena, spawns an AI sparring bot, and displays a non-blocking tactical HUD banner indicating active queue search.

#### Scenario: Combat interactions during warm-up
- **WHEN** the player throws kinetic discs, parries, or eliminates the sparring bot during the queue
- **THEN** the bot respawns upon de-allocation and all combat physics function identically to offline practice mode.

### Requirement: Seamless Matchmaking Handoff
The system SHALL smoothly terminate the warm-up sparring bot, reset arena integrity, and initiate the ranked peer match upon successful completion of the WebRTC peer handshake.

#### Scenario: Peer connection established during warm-up
- **WHEN** the WebRTC DataChannel connection state changes to `open` between matched peers
- **THEN** the system plays an audio-visual challenger alert chime, clears the training bot, resets fallen floor tiles, resets player health, and begins a 3-second match countdown.
