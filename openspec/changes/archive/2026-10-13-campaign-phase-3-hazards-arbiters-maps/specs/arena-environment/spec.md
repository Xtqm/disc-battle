# Spec Delta

## ADDED Requirements

### Requirement: Sector Theming and Material Palettes
The system SHALL apply sector-specific visual themes to arena floor slabs, perimeter walls, and boundary glows based on the active campaign Grid.

#### Scenario: Applying Grid 01 Outlands Boot-Sector theme
- **WHEN** an arena initializes for Grid 01
- **THEN** the arena renders a cyan neon palette (#00e5ff) with reflective slate floor slabs.

#### Scenario: Applying Grid 02 Solar Sail Junction theme
- **WHEN** an arena initializes for Grid 02
- **THEN** the arena renders an amber and warm orange lattice palette (#ffaa00) with solar energy conduits.

#### Scenario: Applying Grid 03 Sea of Simulation theme
- **WHEN** an arena initializes for Grid 03
- **THEN** the arena renders a deep cobalt and violet neon palette (#7b2cbf / #3a0ca3).

#### Scenario: Applying Grid 04 The Core Pinnacle theme
- **WHEN** an arena initializes for Grid 04
- **THEN** the arena renders a crimson and gold high-energy palette (#ff0055 / #ffd700).

### Requirement: Static Ricochet Pillars
The system SHALL support configurable static ricochet pillars in the arena environment that provide physical cover and deflect incoming discs.

#### Scenario: Disc ricochet off pillar surface
- **WHEN** a thrown identity disc impacts a static ricochet pillar
- **THEN** the disc reflects along the normal of incidence without losing velocity and increments ricochet telemetry.

### Requirement: Vertical Jump Pads
The system SHALL provide interactive floor jump pads that propel combatants upward upon contact.

#### Scenario: Combatant triggering a jump pad
- **WHEN** a player or AI bot steps onto an active jump pad trigger volume
- **THEN** the entity is launched vertically with an impulse velocity of at least 14 m/s and a sound effect is triggered.

### Requirement: Elevated Platforms
The system SHALL support elevated structural platforms providing vertical elevation and tactical vantage points.

#### Scenario: Traversing onto an elevated platform
- **WHEN** an entity lands on top of an elevated platform surface
- **THEN** vertical collision resolves at the platform's elevation height and permits regular horizontal traversal.

### Requirement: Oscillating Forcefield Barriers
The system SHALL support dynamic energy forcefield barriers that oscillate between energized solid states and de-energized permeable states.

#### Scenario: Projectile or entity colliding with active forcefield
- **WHEN** a disc or entity contacts an active energized forcefield
- **THEN** collision deflection is enforced, blocking passage and generating impact particle sparks.

#### Scenario: Passage through de-energized forcefield
- **WHEN** an entity moves through a forcefield during its de-energized window
- **THEN** passage is permitted without collision deflection or damage.

### Requirement: Timed Laser Gates
The system SHALL provide timed laser hazard gates cycling between dormant and active lethal states.

#### Scenario: Contact with active laser gate
- **WHEN** an entity contacts an active laser beam
- **THEN** the entity sustains severe energy damage and visual de-rez particle distortion.

#### Scenario: Traversal during dormant laser cycle
- **WHEN** an entity traverses the gate corridor while the laser emitter is dormant
- **THEN** traversal completes without sustaining damage.

### Requirement: Lethal Floor De-Rez Void Zones
The system SHALL support designated floor void zones where intact floor tiles are absent or corrupt, requiring jump or dash traversal to cross.

#### Scenario: Entity falling into floor de-rez void zone
- **WHEN** an entity enters a floor void zone without jumping or dashing across
- **THEN** the entity falls into the void and triggers terminal elimination upon reaching the void death threshold.
