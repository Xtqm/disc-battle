# Spec Delta

## Purpose

Governs Identity Disc flight mechanics, trajectory calculation, lateral curve forces, surface ricochets, rear-strike critical damage, and return recall.

## ADDED Requirements

### Requirement: Trajectory Prediction Parity
The system SHALL compute aim trajectory predictions using the exact same discrete physical integration steps, collision surfaces, and curve forces as live thrown projectiles.

#### Scenario: Aim line matches actual throw
- **WHEN** the player aims and throws an identity disc along a predicted trajectory
- **THEN** the disc follows the simulated path through flight, curves, and ricochets without spatial divergence.

### Requirement: Magnus Effect Curving
The system SHALL apply lateral horizontal acceleration perpendicular to disc velocity when curve controls are engaged, strictly decoupled from character strafe inputs.

#### Scenario: Dedicated curve throw
- **WHEN** the player activates hook left (Q) or hook right (E) during a throw
- **THEN** the disc accelerates laterally in flight according to the curve input while character movement keys do not impart curve bias.

### Requirement: Surface Ricochets and Restitution
The system SHALL reflect discs specularly off vertical boundaries and pillars, and reflect vertical velocity with restitution dampening upon floor impact.

#### Scenario: Specular wall reflection
- **WHEN** a disc collides with an intact wall or pillar
- **THEN** the disc reflects specularly across the surface normal.

#### Scenario: Floor bounce dampening
- **WHEN** a disc contacts the arena floor surface
- **THEN** vertical velocity is inverted with damping restitution while horizontal velocity is preserved with surface friction.

### Requirement: Rear-Strike Multiplier
The system SHALL inflict double damage (2x critical multiplier) when an identity disc strikes an opponent's rear hemisphere after completing at least one ricochet.

#### Scenario: Banked strike from behind
- **WHEN** a disc ricochets off an arena obstacle and hits an opponent from behind their facing orientation
- **THEN** the target suffers double damage and a critical impact burst is displayed.

### Requirement: Disc Return to Thrower
The system SHALL return a thrown disc back to its owner after flight duration expires, after bouncing off an opponent, or upon command.

#### Scenario: Automatic flight recall
- **WHEN** a thrown disc reaches its flight limit or rebounds elastically from a target strike
- **THEN** the disc changes state to returning and travels back toward its owner until caught and reloaded.
