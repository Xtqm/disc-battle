# Combat AI Specification

## Purpose

Governs autonomous AI bot behaviors, tactical positioning, predictive evasion, counter-catch interceptions, and failsafe re-arming.

## Requirements

### Requirement: Tactical Positioning and Pillar Cover
The system SHALL direct autonomous AI combatants to track targets, circle at combat distance, and utilize arena pillars for protective cover.

#### Scenario: AI tracks moving opponent
- **WHEN** an opponent shifts position in the arena
- **THEN** the AI reorients toward the target and adjusts movement vectors to maintain combat range while seeking pillar obstruction against incoming lines of fire.

### Requirement: Predictive Evasive Maneuvers
The system SHALL trigger autonomous evasive reactions including jumping over low throws and performing rapid lateral dashes.

#### Scenario: Jump reaction to low projectile
- **WHEN** an incoming hostile disc approaches the AI along a low altitude trajectory
- **THEN** the AI executes a timed jump to let the projectile pass underneath.

### Requirement: Counter-Catch Interception
The system SHALL permit an AI bot facing a deflected incoming projectile within 2.2 meters to catch the disc and queue an immediate counter-attack.

#### Scenario: AI intercepts returning deflected disc
- **WHEN** a player-deflected disc travels back toward the bot within 2.2 meters and the bot is facing the incoming path
- **THEN** the bot executes a counter-catch, displays a particle burst, and primes a rapid counter-throw within 0.35 to 0.75 seconds.

### Requirement: Failsafe Re-Arm Watchdog
The system SHALL ensure AI combatants are re-armed within 2.5 seconds if their disc is lost to a void plunge or boundary clip.

#### Scenario: Disarmed bot recovery
- **WHEN** an AI bot is disarmed and its projectile is eliminated without returning
- **THEN** the re-arm watchdog activates and reloads a disc to the bot within 2.5 seconds.
