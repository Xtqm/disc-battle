# System Settings Specification

## Purpose

Provides user-configurable display modes, frame rate limits, audio volumes, and graphics fidelity options with persistent settings storage for Tron Disc Arena.

## Requirements

### Requirement: In-Game Settings Modal Interface
The system SHALL provide an interactive settings modal accessible from the main menu and the pause menu to configure display, graphics, and audio preferences.

#### Scenario: Opening settings modal
- **WHEN** the player activates the Settings button from the main menu or pause screen
- **THEN** the settings modal opens displaying controls for Display, Graphics, and Audio options.

### Requirement: Display Mode and Resolution Control
The system SHALL allow players to configure display modes between borderless fullscreen and windowed mode with automatic viewport scaling.

#### Scenario: Toggling window mode
- **WHEN** the player toggles display mode between Fullscreen and Windowed
- **THEN** the application window updates its display state and recalculates camera aspect ratio and renderer viewport.

### Requirement: Frame Rate Limiter Configuration
The system SHALL provide frame rate limit options including 60 FPS, 120 FPS, 144 FPS, and Uncapped targets.

#### Scenario: Applying frame rate limit
- **WHEN** the player selects a target frame rate cap
- **THEN** the game render loop throttles frame presentation to respect the selected cap.

### Requirement: Audio Volume Configuration
The system SHALL provide volume sliders for Master Volume and SFX Volume that dynamically adjust procedural synthesizer audio output gains between 0% and 100%.

#### Scenario: Adjusting SFX volume slider
- **WHEN** the player adjusts the SFX volume slider
- **THEN** procedural synthesizer sound effect gain nodes scale their amplitude proportionally.

### Requirement: Persistent Settings Storage
The system SHALL persist user-selected settings across sessions and apply stored preferences automatically upon application startup.

#### Scenario: Settings persistence across relaunch
- **WHEN** settings are modified and the application is restarted
- **THEN** the saved configuration is loaded and applied during engine initialization.
