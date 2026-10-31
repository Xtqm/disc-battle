# Spec Delta

## MODIFIED Requirements

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
