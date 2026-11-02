# Disc Combat Specification

## Purpose

Governs Identity Disc flight mechanics, trajectory calculation, lateral curve forces, surface ricochets, rear-strike critical damage, and return recall.

## Requirements

### Requirement: Trajectory Prediction Parity
The system SHALL compute aim trajectory predictions using the exact same discrete physical integration steps, launch-relative altitude cruise stabilization, launch pitch clamping, near-parallax floor raycast protection, maximum ricochet limits, and collision surfaces as live thrown projectiles.

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

#### Scenario: Launch pitch clamp against floor dive
- **WHEN** the third-person camera ray intersects the floor plane or targets close-range surfaces
- **THEN** the vertical component of the throw direction vector is clamped so the projectile launches horizontally at chest elevation rather than angling sharply down into the ground.

### Requirement: Magnus Effect Curving
The system SHALL apply lateral horizontal acceleration perpendicular to disc velocity when curve controls are engaged, conserve kinetic speed strictly within the horizontal plane, decouple curve calculations from vertical velocity, and provide active curve bracket feedback.

#### Scenario: Dedicated curve throw
- **WHEN** the player activates hook left (Q, gamepad L1, or touch) or hook right (E, gamepad R1, or touch) during a throw
- **THEN** the disc accelerates laterally in flight according to the curve input while character movement keys do not impart curve bias.

#### Scenario: Crosshair curve indicator parity
- **WHEN** curve intent is engaged on keyboard, touch, or gamepad controller
- **THEN** the crosshair displays the active curve bracket indicator corresponding to the engaged hook direction.

#### Scenario: Horizontal speed conservation
- **WHEN** lateral Magnus acceleration curves a disc in flight
- **THEN** speed conservation scaling is computed strictly over horizontal velocity components, preserving vertical pitch velocity and ensuring uniform hook radius regardless of vertical motion.

### Requirement: Surface Ricochets and Restitution
The system SHALL reflect discs specularly off vertical boundaries and pillars, trigger destructible floor tile degradation on a single contact tile upon floor collision, dissipate curve spin on the floor, and rebound the projectile upward away from the floor into stabilized combat cruise elevation.

#### Scenario: Specular wall reflection
- **WHEN** a disc collides with an intact wall or pillar
- **THEN** the disc reflects specularly across the surface normal.

#### Scenario: Floor bounce dampening
- **WHEN** a disc contacts the arena floor surface
- **THEN** lateral curve spin is dissipated and the disc rebounds upward away from the floor with controlled vertical velocity, clearing the floor plane to avoid striking subsequent tiles.

#### Scenario: Launch-relative altitude stabilization
- **WHEN** an airborne or bouncing disc stabilizes its vertical elevation in flight
- **THEN** altitude dampening smoothly restores position toward standard chest cruising elevation (`1.7m`).

#### Scenario: Floor impact triggers tile degradation
- **WHEN** an identity disc contacts an intact arena floor tile
- **THEN** the disc triggers tile degradation solely on that single contact tile, transitioning it into the warning state without affecting consecutive tiles along the flight path.

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
