# Player Character Specification

## Purpose

Defines player locomotion, acrobatic aerial mobility, directional dashing, energy management, and holographic shield parry defense.

## Requirements

### Requirement: Ground Locomotion and Directional Dash
The system SHALL provide responsive ground movement and an instantaneous directional dash that consumes a fixed percentage of the energy meter.

#### Scenario: Directional dash execution
- **WHEN** the player activates the dash input while having at least 25% energy
- **THEN** the character receives an immediate velocity burst in their movement direction and 25% energy is consumed.

#### Scenario: Insufficient dash energy
- **WHEN** the player activates the dash input with less than 25% energy
- **THEN** no dash burst occurs and the energy meter remains unchanged.

### Requirement: Aerial Mobility and Jump Buffering
The system SHALL support variable jump height, in-flight double jumping, coyote time forgiveness, and jump input buffering.

#### Scenario: Mid-air double jump
- **WHEN** the player triggers jump while airborne following an initial jump
- **THEN** a second jump is executed resetting vertical velocity upward.

#### Scenario: Ledge coyote time
- **WHEN** the player steps off a solid edge and triggers jump within the coyote grace period
- **THEN** the jump is accepted and executed as if grounded.

### Requirement: Holographic Shield Deflection
The system SHALL deploy a frontal shield when block is held, deflecting incoming hostile projectiles, accelerating their velocity, and transferring ownership to the defender.

#### Scenario: Frontal parry deflection
- **WHEN** an incoming hostile disc strikes the player while their shield is raised frontally
- **THEN** the disc is deflected back toward the attacker at accelerated velocity (1.25x), projectile ownership transfers to the player, and its color turns white.

### Requirement: Health and Energy Regeneration
The system SHALL maintain player health and energy pools, regenerating energy automatically while health loss past zero causes de-rez elimination.

#### Scenario: Energy auto-regeneration
- **WHEN** player energy is depleted below 100%
- **THEN** energy steadily regenerates toward full capacity over time.

#### Scenario: Lethal damage elimination
- **WHEN** incoming damage reduces player health to zero or below
- **THEN** the player is de-rezzed and the elimination flow is initiated.

### Requirement: Combat Viewport Stability and Aim Alignment
The system SHALL maintain a glitch-free, 1:1 responsive third-person combat camera that eliminates gimbal lock flips, boundary collision inversion, and pointer lock delta spikes.

#### Scenario: Rapid rotational flick
- **WHEN** the player rapidly rotates their view by 90 or 180 degrees
- **THEN** the camera rotational orientation matches player aim instantly without swinging through a distorted arc or flipping 180 degrees.

#### Scenario: Backwards dash and close-range combat maneuvering
- **WHEN** the player dashes backwards or maneuvers rapidly towards the trailing camera
- **THEN** the camera maintains a positive separation distance from the focal aim plane and does not pass through or invert view direction.

#### Scenario: Arena boundary pushback
- **WHEN** the player maneuvers near arena perimeter boundaries with the camera facing toward or away from the boundary wall
- **THEN** the camera smoothly pulls inward without clipping outside bounds, getting stuck between player and aim point, or flipping view direction.

#### Scenario: Pointer lock delta spike rejection
- **WHEN** the browser reports an anomalous synthetic mouse movement delta exceeding safe input thresholds
- **THEN** the system clamps the delta to prevent unnatural instantaneous camera snapping.
