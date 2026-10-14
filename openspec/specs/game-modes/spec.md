# Game Modes Specification

## Purpose

Defines game mode rules, round progression, win and loss conditions, and match termination lifecycles.

## Requirements

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

### Requirement: Swarm Defense Wave Economy and Streak Payouts
The system SHALL award Bits and XP upon the completion of each Swarm wave, scaling the baseline 15 Bits yield by a compound survival streak bonus, and granting milestone wave bonus chests every 5 waves (Wave 5, 10, 15, 20+).

#### Scenario: Standard wave completion payout
- **WHEN** a player eliminates the final foe of a Swarm wave
- **THEN** the system awards a base yield of 15 Bits scaled by the active compound survival streak multiplier, credits corresponding XP to progression, and emits an economy payout event.

#### Scenario: Milestone wave bonus chest award
- **WHEN** a player completes wave 5, 10, 15, or any multiple of 5 in Swarm mode
- **THEN** the system dispenses a milestone bonus chest with substantial supplementary Bits and XP rewards alongside standard wave earnings.

### Requirement: Duel Match Outcome Payouts and Defeat Participation
The system SHALL award 50 Bits and XP for 1v1 or 2v2 victories against AI opponents, 100 Bits and XP for multiplayer duel victories, and grant participation XP upon match defeat.

#### Scenario: Solo or practice AI duel victory
- **WHEN** the player destroys the opponent bot and achieves victory in an AI duel
- **THEN** the system credits 50 Bits plus victory XP to the player profile and persists the update.

#### Scenario: Multiplayer duel match victory
- **WHEN** a player or team secures victory in a multiplayer duel or duos room
- **THEN** the system credits 100 Bits plus multiplayer victory XP to the victor's profile and persists the update.

#### Scenario: Match defeat participation credit
- **WHEN** a player suffers de-rez or defeat in an AI or multiplayer duel match
- **THEN** the system awards a bounded participation XP payout without Bits to honor player investment while preventing defeat-farming exploits.

### Requirement: Dynamic Duel Arena Map Selection Lobby
The system SHALL render an interactive map selector in Duel, Practice, and Host lobbies displaying unlocked Campaign Sector and Armory Exotic arenas from storage, while marking locked arenas with explicit unlock directives.

#### Scenario: Populating map selector with unlocked arenas
- **WHEN** a player opens the Host Match or Practice configuration lobby
- **THEN** the selector renders interactive cards for all arenas present in `inventory.unlockedMaps`.

#### Scenario: Displaying locked arena unlock directives
- **WHEN** an arena in the catalog is not present in `inventory.unlockedMaps`
- **THEN** the card renders in a locked state displaying the required unlock directive such as `DEFEAT GRID 02 ARBITER` or `UNLOCK IN ARMORY`.

#### Scenario: Selecting an unlocked arena map
- **WHEN** the player clicks an unlocked arena card in the selector
- **THEN** the lobby updates the active arena selection, synchronizing the chosen map ID for subsequent match instantiation.
