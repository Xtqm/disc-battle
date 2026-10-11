# Arena Environment Specification

## Purpose

Manages the modular 24x24 destructible arena grid, tile state transitions, void pit physics, survival recovery windows, and void death boundaries.

## Requirements

### Requirement: Destructible Tile Grid Lifecycle
The system SHALL maintain a 24x24 floor tile grid wherein intact tiles transition through warning, falling, and void states upon projectile contact.

#### Scenario: Disc impact triggers tile warning
- **WHEN** an identity disc strikes an intact floor tile
- **THEN** the tile enters a warning state with visual strobing and vertical jitter for 0.75 seconds while maintaining collision.

### Requirement: Tile Collapse and Reconstruction
The system SHALL plunge warning tiles into the void upon warning timeout, disable collision, and restore them after a 12-second regeneration interval.

#### Scenario: Tile collapse into void
- **WHEN** a tile completes its warning duration
- **THEN** it accelerates downward into the void, collision is disabled, and an arena regeneration timer is initiated.

#### Scenario: Tile regeneration
- **WHEN** a fallen tile's 12-second reconstruction timer elapses
- **THEN** the tile rebuilds and returns to its original position in the intact state.

### Requirement: Void Survival Window and Lip Colliders
The system SHALL allow entities in the shallow void pit (between y = 0 and y = -3.5m) to escape via jumping or dashing, while vertical edges of intact tiles act as solid walls when y < -0.2m.

#### Scenario: Emergency jump escape from void
- **WHEN** an entity drops into an open tile void between 0 and -3.5 meters and triggers a jump or dash
- **THEN** the entity executes the maneuver to propel back onto intact floor tiles.

#### Scenario: Intact tile lip blocks horizontal pass-through
- **WHEN** an entity is below y = -0.2m and moves toward an adjacent intact tile
- **THEN** the tile edge acts as a solid vertical wall preventing skating onto the upper surface without jumping.

### Requirement: Terminal Void Elimination
The system SHALL immediately eliminate any combatant falling past the terminal void threshold.

#### Scenario: Deep void fall
- **WHEN** an entity's vertical position falls below y = -18 meters
- **THEN** the system applies lethal de-rez damage and triggers immediate elimination.
