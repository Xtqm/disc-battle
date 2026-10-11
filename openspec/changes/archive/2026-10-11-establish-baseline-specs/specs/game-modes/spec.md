# Spec Delta

## Purpose

Defines game mode rules, round progression, win and loss conditions, and match termination lifecycles.

## ADDED Requirements

### Requirement: Swarm Survival Wave Progression
The system SHALL provide an infinite wave survival mode where eliminating all active foes increments the cycle index and spawns an expanded enemy cohort.

#### Scenario: All foes eliminated in Swarm mode
- **WHEN** the last remaining hostile bot in a wave is destroyed in Swarm mode
- **THEN** the cycle counter increments, a wave completion banner appears, and the next wave spawns with scaled foe count.

### Requirement: Duel AI Match Flow
The system SHALL operate a 1v1 duel mode against an elite AI bot with 280 HP, terminating directly into victory upon the bot's destruction.

#### Scenario: Elite bot eliminated in Duel AI
- **WHEN** the elite AI opponent's health reaches zero in Duel AI mode
- **THEN** the match terminates immediately, wave progression is bypassed, and the victory modal is presented.

### Requirement: Player Defeat Lifecycle
The system SHALL conclude active gameplay and display the defeat overlay whenever the local player is de-rezzed.

#### Scenario: Player de-rez by combat or void
- **WHEN** the player's health drops to zero or the player plunges past the terminal void threshold
- **THEN** gameplay simulation suspends player control and the Game Over modal is displayed with retry and menu options.
