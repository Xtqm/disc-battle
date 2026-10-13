# Spec Delta

## ADDED Requirements

### Requirement: Sector Grid Navigation and Star-Gated Visual Overlays
The system SHALL provide a campaign navigation interface displaying Grids 01 through 04, distinct sector color themes, per-grid and global star progress counters, and lock overlays for star-gated sectors.

#### Scenario: Displaying sector grids with visual themes
- **WHEN** the player accesses the campaign Grid selector interface
- **THEN** the system renders Grids 01 through 04 featuring their respective visual themes (Outlands Cyan, Solar Sail Amber, Simulation Teal, and Core Red).

#### Scenario: Displaying star progress counters
- **WHEN** the Grid selector interface renders
- **THEN** the system displays individual progress counters for each Grid (e.g., `14 / 18 STARS`) and a cumulative campaign total across all sectors.

#### Scenario: Rendering lock overlays on star-gated Grids
- **WHEN** a Grid has an unlock star threshold higher than the player's total earned stars
- **THEN** the system overlays a visual lock banner indicating the required star threshold and the count of stars needed to unlock.

#### Scenario: Navigating to an unlocked Grid
- **WHEN** the player selects an unlocked Grid
- **THEN** the system opens the Level Node Matrix view for that Grid.

### Requirement: Level Node Matrix and Trial Selection View
The system SHALL provide an interactive level node matrix for the active Grid displaying trial nodes (01 through 06-08) terminating in a Rival Arbiter node, with earned stars, high scores, and difficulty tier badges.

#### Scenario: Displaying level nodes and status
- **WHEN** the Level Node Matrix renders for a Grid
- **THEN** the system displays all trial nodes in sequential order leading to the Arbiter boss node, marking each node as Locked, Unlocked, or Cleared.

#### Scenario: Displaying earned star ratings and personal bests
- **WHEN** a level node has previously been cleared
- **THEN** the system displays its earned star rating (1 to 3 stars), best completion time, and best integrity percentage.

#### Scenario: Displaying difficulty tier badges
- **WHEN** a level node is rendered
- **THEN** the system shows its difficulty classification badge (`RECON`, `INTRUDER`, `GUARDIAN`, `ELITE`, or `ARBITER`).

#### Scenario: Selecting an unlocked level node
- **WHEN** a player clicks or taps an unlocked level node
- **THEN** the system opens the Tactical Mission Brief overlay for that level.

#### Scenario: Preventing initiation of locked level nodes
- **WHEN** a player clicks or taps a locked level node
- **THEN** the system inhibits selection and indicates that the preceding trial must be cleared first.

### Requirement: Tactical Pre-Launch Mission Brief Overlay
The system SHALL render a tactical pre-launch mission brief prior to combat detailing trial parameters, hostile wave compositions, and the three-star criteria.

#### Scenario: Displaying mission briefing details
- **WHEN** a player selects an unlocked level node
- **THEN** the system displays the trial title, description, hostile wave count and enemy unit types, and the explicit criteria for Stars 1, 2, and 3.

#### Scenario: Launching trial from mission brief
- **WHEN** the player activates the "LAUNCH TRIAL" control
- **THEN** the system closes the brief overlay, requests pointer lock, initiates the combat countdown, and starts the active trial lifecycle.

#### Scenario: Dismissing mission brief back to node matrix
- **WHEN** the player cancels or closes the mission brief
- **THEN** the system returns to the Level Node Matrix without modifying trial or player state.

### Requirement: Live In-Combat Objective Header and Floating Accrual Indicators
The system SHALL display an in-combat mission objective header tracking remaining hostiles, live integrity status, and mastery criteria, and SHALL render kinetic floating Bit indicators on confirmed eliminations.

#### Scenario: Tracking remaining hostile sub-routines
- **WHEN** hostile units are present or de-rezzed in combat
- **THEN** the header displays the count of remaining active hostiles, updating immediately as bots are eliminated.

#### Scenario: Visualizing live Program Integrity percentage
- **WHEN** the player takes damage or remains at high integrity
- **THEN** the header displays current integrity percentage, rendering in standard cyan while at or above 75% and transitioning to warning amber/red when falling below the Star 2 threshold.

#### Scenario: Monitoring active mastery threshold
- **WHEN** a trial with time or trickshot criteria is active
- **THEN** the header updates the elapsed combat time and displays confirmed curve or ricochet hits against the Star 3 threshold.

#### Scenario: Spawning kinetic floating Bit indicators
- **WHEN** an enemy is de-rezzed via a confirmed curve throw, ricochet bounce, or shield parry
- **THEN** the system spawns an animated floating `+Bits` accrual indicator that ascends and fades out over the combat view.

### Requirement: Post-Trial Victory and Debrief Modal
The system SHALL provide a post-trial debrief modal presenting trial outcome, sequential animated star ignition with audio chimes, itemized Bit and XP reward breakdowns, and direct trial navigation controls.

#### Scenario: Presenting debrief outcome and metrics
- **WHEN** a trial completes successfully
- **THEN** the debrief modal opens, releasing pointer lock and displaying elapsed time, final integrity %, confirmed trickshots, and cleared status.

#### Scenario: Animating sequential star ignition
- **WHEN** the victory debrief renders earned stars (1 to 3)
- **THEN** the system ignites each earned star sequentially with staggered animation delays accompanied by rising procedural audio chimes.

#### Scenario: Itemizing Bit and XP payouts
- **WHEN** trial rewards are presented
- **THEN** the system itemizes the payout breakdown into Base Clear, Integrity Bonus, and Mastery Bonus, displaying total Bits and XP awarded and total campaign stars.

#### Scenario: Advancing via Next Trial control
- **WHEN** the player activates the "NEXT TRIAL" control
- **THEN** the system advances to the next unlocked level, resets arena tiles and Three.js entities, re-captures pointer lock, and starts the next trial countdown.

#### Scenario: Retrying via Retry Trial control
- **WHEN** the player activates the "RETRY TRIAL" control
- **THEN** the system re-initializes the current level, resets arena tiles and combat entities, re-captures pointer lock, and restarts the trial.

#### Scenario: Returning to grid navigation
- **WHEN** the player activates the "RETURN TO GRID" control
- **THEN** the debrief modal dismisses, the simulation remains halted with pointer lock released, and the Level Node Matrix renders.
