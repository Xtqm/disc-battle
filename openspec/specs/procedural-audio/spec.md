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

### Requirement: Terminal Interface Audio Synthesis
The system SHALL synthesize dedicated procedural audio effects via the Web Audio API for terminal opening, keyboard typing feedback, access authorization, and security error alerts.

#### Scenario: Terminal modal boot sound
- **WHEN** the Grid Authorization Terminal is opened
- **THEN** the audio engine plays a rising resonant high-frequency sweep hum simulating a CRT terminal power-up.

#### Scenario: Terminal keystroke click feedback
- **WHEN** the player enters or edits characters in terminal input fields
- **THEN** the audio engine plays a short high-frequency transient click simulating mechanical terminal input.

#### Scenario: Access granted confirmation chime
- **WHEN** authentication or identity credentials are successfully verified or updated
- **THEN** the audio engine plays an ascending dual-tone harmonic confirmation chime.

#### Scenario: Access denied error buzz
- **WHEN** authentication fails or invalid input is submitted in the terminal
- **THEN** the audio engine plays a low-frequency discordant buzz signaling authorization failure.

