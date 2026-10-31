# Disc Combat Specification

## Purpose

Governs Identity Disc flight mechanics, trajectory calculation, lateral curve forces, surface ricochets, rear-strike critical damage, and return recall.

## Requirements

### Requirement: Trajectory Prediction Parity
The system SHALL compute aim trajectory predictions using the exact same discrete physical integration steps, launch-relative altitude cruise stabilization, near-parallax floor raycast protection, maximum ricochet limits, and collision surfaces as live thrown projectiles.

#### Scenario: Aim line matches actual throw
- **WHEN** the player aims and throws an identity disc along a predicted trajectory
- **THEN** the disc follows the simulated path through flight, curves, and ricochets without spatial divergence.

#### Scenario: Ricochet limit termination
- **WHEN** simulated trajectory calculation evaluates ricochets
- **THEN** simulation halts upon reaching the maximum bounce limit (3 ricochets), matching the live projectile recall trigger without projecting phantom post-limit bounces.

#### Scenario: Hazard collision parity
- **WHEN** dynamic sector hazards are active in the arena
- **THEN** the simulated trajectory checks and reflects across hazard boundaries identically to live projectiles.

#### Scenario: Midair throw altitude preservation
- **WHEN** a disc is aimed and thrown while the player is jumping or airborne
- **THEN** the predicted trajectory and live projectile maintain their launch elevation without artificial downward gravitational curvature toward floor level.

#### Scenario: Near-parallax floor aim avoidance
- **WHEN** the third-person camera ray intersects the arena floor plane within the near-parallax avoidance zone (< 8.0m in front of the thrower)
- **THEN** the floor intersection is ignored for aim targeting, projecting the aim vector forward into the arena rather than aiming down into the thrower's feet.

### Requirement: Magnus Effect Curving
The system SHALL apply lateral horizontal acceleration perpendicular to disc velocity when curve controls are engaged across keyboard, touch, and gamepad, strictly decoupled from character strafe inputs, and provide active curve bracket feedback.

#### Scenario: Dedicated curve throw
- **WHEN** the player activates hook left (Q, gamepad L1, or touch) or hook right (E, gamepad R1, or touch) during a throw
- **THEN** the disc accelerates laterally in flight according to the curve input while character movement keys do not impart curve bias.

#### Scenario: Crosshair curve indicator parity
- **WHEN** curve intent is engaged on keyboard, touch, or gamepad controller
- **THEN** the crosshair displays the active curve bracket indicator corresponding to the engaged hook direction.

### Requirement: Surface Ricochets and Restitution
The system SHALL reflect discs specularly off vertical boundaries and pillars, invert vertical velocity with restitution dampening upon floor impact, and stabilize cruising altitude relative to the initial launch elevation rather than a fixed floor height.

#### Scenario: Specular wall reflection
- **WHEN** a disc collides with an intact wall or pillar
- **THEN** the disc reflects specularly across the surface normal.

#### Scenario: Floor bounce dampening
- **WHEN** a disc contacts the arena floor surface
- **THEN** vertical velocity is inverted with damping restitution while horizontal velocity is preserved with surface friction.

#### Scenario: Launch-relative altitude stabilization
- **WHEN** an airborne or bouncing disc stabilizes its vertical elevation in flight
- **THEN** altitude dampening smoothly restores position toward the projectile's initial launch elevation (`launchY`).

### Requirement: Rear-Strike Multiplier
The system SHALL inflict double damage (2x critical multiplier) when an identity disc strikes an opponent's rear hemisphere after completing at least one ricochet.

#### Scenario: Banked strike from behind
- **WHEN** a disc ricochets off an arena obstacle and hits an opponent from behind their facing orientation
- **THEN** the target suffers double damage and a critical impact burst is displayed.

### Requirement: Disc Return to Thrower
The system SHALL return a thrown disc back to its owner after flight duration expires, after rebounding elastically from an opponent strike, or via a safety reload watchdog, navigating unconstrained to the owner's true 3D position.

#### Scenario: Automatic flight recall
- **WHEN** a thrown disc reaches its flight limit or rebounds elastically from a target strike
- **THEN** the disc changes state to returning and travels back toward its owner until caught and reloaded.

#### Scenario: Elastic opponent impact rebound
- **WHEN** a thrown player disc collides with an opponent
- **THEN** damage is inflicted, the disc's velocity is inverted elastically with upward bounce, the disc is expelled outside the target's hitbox, and flight switches to returning without penetrating through the target.

#### Scenario: Unconstrained return homing
- **WHEN** a disc is returning to its owner who is jumping, airborne, or in void recovery
- **THEN** the disc smoothly homes in 3D directly toward the owner's current chest position without artificial ground hover dampening.

#### Scenario: Thrower re-arm failsafe watchdog
- **WHEN** a thrower's disc in flight is obstructed, lost, or fails to catch within the watchdog timeout (3.0s)
- **THEN** the thrower is automatically re-armed with an identity disc.
