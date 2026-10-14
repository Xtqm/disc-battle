# Spec Delta

## ADDED Requirements

### Requirement: Rival Arbiter Boss AI Controller
The system SHALL provide a specialized autonomous AI controller for Rival Arbiter boss encounters managing offensive volleys, tactical positioning, and defense routines.

#### Scenario: Arbiter boss initialization
- **WHEN** an Arbiter boss encounter starts
- **THEN** the Arbiter AI initializes with sector-scaled core health, multi-layer shields, and elevated projectile speed.

### Requirement: Multi-Layer Rival Shields
The system SHALL equip Rival Arbiter bosses with multi-layer defensive shields that absorb projectile impacts before core integrity can be damaged.

#### Scenario: Disc impacts active Rival Shield
- **WHEN** a player disc strikes an Arbiter boss possessing an active shield layer
- **THEN** the impact depletes one shield layer, triggers a defensive harmonic particle shockwave, and prevents core damage.

#### Scenario: Core vulnerability upon shield depletion
- **WHEN** all shield layers of an Arbiter boss have been depleted
- **THEN** subsequent projectile impacts apply direct damage to the Arbiter's core health.

#### Scenario: Shield regeneration interval
- **WHEN** an Arbiter's shields remain depleted for an extended recovery window without sustaining core damage
- **THEN** the boss primes and re-energizes one shield layer with an audio-visual recharge cue.

### Requirement: Aggressive Curve-Disc Volleys
The system SHALL enable Rival Arbiter bosses to execute multi-disc curve volleys curving around cover obstacles toward player positions.

#### Scenario: Boss unleashing a curve volley
- **WHEN** an Arbiter triggers a curve volley attack routine
- **THEN** the boss launches rapid sequential discs infused with lateral spin that arc around obstacles toward the player.

### Requirement: Reactive Dash-Evasion Routines
The system SHALL empower Rival Arbiter bosses to execute rapid kinetic dash maneuvers to evade incoming high-velocity throws.

#### Scenario: Evading direct incoming projectile
- **WHEN** an incoming player disc approaches within 6 meters along the Arbiter's direct line of sight
- **THEN** the Arbiter executes a rapid lateral dash with particle trail emission and a temporary invulnerability frame window.
