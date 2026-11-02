# Spec Delta

## MODIFIED Requirements

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
