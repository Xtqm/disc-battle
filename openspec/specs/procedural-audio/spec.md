# Procedural Audio Specification

## Purpose

Provides procedural sound effects synthesized directly via the Web Audio API without requiring external audio assets.

## Requirements

### Requirement: Zero-Asset Procedural Audio Engine
The system SHALL synthesize all audio effects programmatically using the browser Web Audio API without loading external media files.

#### Scenario: Audio engine startup
- **WHEN** user interaction initiates audio playback
- **THEN** an audio context is primed and procedural sound generators become active without issuing remote file requests.

### Requirement: Combat Sound Effect Synthesis
The system SHALL provide programmatic synth presets for throws, surface ricochets, shield parries, tile collapses, and disc catches.

#### Scenario: Disc launch sweep
- **WHEN** a combatant throws an identity disc
- **THEN** the audio engine plays a high-to-low sawtooth frequency sweep.

#### Scenario: Shield parry resonance
- **WHEN** an incoming disc is deflected by a holographic shield
- **THEN** the audio engine plays a rising triangle frequency pulse.

#### Scenario: Tile collapse rumble
- **WHEN** an arena tile plunges into the void
- **THEN** the audio engine plays a low square-wave bass rumble.

#### Scenario: Disc catch chime
- **WHEN** an entity catches a returning or intercepted disc
- **THEN** the audio engine plays a dual-frequency confirmation chime.

