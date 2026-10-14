# core-economy Specification Delta

## ADDED Requirements

### Requirement: Combat Skill Maneuver Rewards and Kinetic HUD Telemetry
The system SHALL award immediate Bits currency during active combat for executing verified high-skill maneuvers—including confirmed disc parries, multi-ricochet strikes, and curve eliminations—and trigger kinetic floating neon `+Bits` HUD indicators at the event locus.

#### Scenario: Confirmed disc parry reward
- **WHEN** the player successfully parries an incoming hostile disc with their block shield
- **THEN** the system credits an immediate Bits bonus to the player balance and launches an animated floating neon `+Bits` HUD indicator.

#### Scenario: Multi-ricochet hit reward
- **WHEN** a player's disc impacts a foe after bouncing 2 or more times off arena geometry or obstacles
- **THEN** the system awards bonus Bits scaled by the bounce count and renders a kinetic floating neon `+Bits` indicator.

#### Scenario: Curve shot elimination reward
- **WHEN** a hostile program is de-rezzed by a disc possessing active lateral curve deflection
- **THEN** the system grants a high-skill curve elimination Bit bonus and spawns a kinetic floating neon `+Bits` indicator.
