# Spec Delta: Disc Combat

## MODIFIED Requirements

### Requirement: Trajectory Prediction Parity
The system SHALL compute aim trajectory predictions using the exact same discrete physical integration steps, launch-relative altitude cruise stabilization, downward floor pitch aiming beyond clearance distance, near-parallax floor raycast protection, maximum ricochet limits, and collision surfaces as live thrown projectiles.

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
- **WHEN** the third-person camera ray intersects the arena floor plane within the near-parallax avoidance zone (< 2.5m in front of the thrower)
- **THEN** the floor intersection is ignored for aim targeting, projecting the aim vector forward into the arena rather than aiming down into the thrower's feet.

#### Scenario: Launch pitch clamp against floor dive
- **WHEN** the third-person camera ray intersects the floor plane inside the near-clearance threshold (< 2.5m)
- **THEN** the vertical component of the throw direction vector is clamped so the projectile launches horizontally at chest elevation rather than angling sharply down into the ground.

#### Scenario: Downward floor aim trajectory parity
- **WHEN** the player aims at the arena floor beyond the near-parallax clearance distance (>= 2.5m)
- **THEN** the projectile launches with a downward velocity vector directed toward the targeted floor point, hover easing is suspended during downward ballistic travel, and the predicted trajectory traces to the contact tile without artificial horizontal glide.

### Requirement: Magnus Effect Curving
The system SHALL apply lateral horizontal acceleration perpendicular to disc velocity when curve controls are engaged, conserve kinetic speed strictly within the horizontal plane, scale lateral acceleration inversely with throw charge due to gyroscopic rigidity, and provide active curve bracket feedback.

#### Scenario: Dedicated curve throw
- **WHEN** the player activates hook left (Q, gamepad L1, or touch) or hook right (E, gamepad R1, or touch) during a throw
- **THEN** the disc accelerates laterally in flight according to the curve input while character movement keys do not impart curve bias.

#### Scenario: Crosshair curve indicator parity
- **WHEN** curve intent is engaged on keyboard, touch, or gamepad controller
- **THEN** the crosshair displays the active curve bracket indicator corresponding to the engaged hook direction.

#### Scenario: Horizontal speed conservation
- **WHEN** lateral Magnus acceleration curves a disc in flight
- **THEN** speed conservation scaling is computed strictly over horizontal velocity components, preserving vertical pitch velocity and ensuring uniform hook radius regardless of vertical motion.

#### Scenario: Gyroscopic curvature dampening under charge
- **WHEN** a disc is thrown with a charge level greater than zero
- **THEN** lateral Magnus acceleration is scaled down proportionally to the charge ratio, producing a flatter, more linear trajectory than an uncharged throw with the same curve input.

### Requirement: Surface Ricochets and Restitution
The system SHALL reflect discs specularly off vertical boundaries and pillars, trigger destructible floor tile degradation on a single contact tile upon floor collision, retain partial curve spin across floor impacts, and rebound the projectile upward away from the floor into stabilized combat cruise elevation.

#### Scenario: Specular wall reflection
- **WHEN** a disc collides with an intact wall or pillar
- **THEN** the disc reflects specularly across the surface normal and reverses lateral curve direction with 50% energy retention.

#### Scenario: Floor bounce dampening
- **WHEN** a disc contacts the arena floor surface
- **THEN** the disc retains 65% of its lateral curve spin in the same rotational direction, pops upward away from the floor with positive vertical velocity (3.5 m/s), and clears the floor plane to avoid striking subsequent tiles.

#### Scenario: Launch-relative altitude stabilization
- **WHEN** an airborne or bouncing disc stabilizes its vertical elevation in flight
- **THEN** altitude dampening smoothly restores position toward standard chest cruising elevation (`1.7m`).

#### Scenario: Floor impact triggers tile degradation
- **WHEN** an identity disc contacts an intact arena floor tile
- **THEN** the disc triggers tile degradation solely on that single contact tile, transitioning it into the warning state without affecting consecutive tiles along the flight path.

## ADDED Requirements

### Requirement: Charged Throws and Shield Penetration
The system SHALL permit players to charge disc throws by holding the throw input, scaling launch speed and base damage proportionally while bypassing defensive blocks and shields when charged past the guard crush threshold.

#### Scenario: Continuous charge velocity and damage scaling
- **WHEN** the player holds the throw input for up to 1.0 second before releasing
- **THEN** disc launch velocity scales continuously from 38 m/s up to 55 m/s, and base damage scales proportionally from 55 HP up to 95 HP.

#### Scenario: Guard crush against blocking defenders
- **WHEN** a disc thrown with at least 85% charge collides with an opponent who is actively blocking or shielding
- **THEN** the block is broken, deflection fails, full charged damage is inflicted, and the target is staggered with a guard crush alert.

#### Scenario: Diegetic HUD charge indicator
- **WHEN** the throw input is held while the player possesses an identity disc
- **THEN** a circular charge meter illuminates around the crosshair, transitioning from cyan to white/amber upon reaching guard crush threshold with escalating haptic feedback.
