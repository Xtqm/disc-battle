# Spec Delta: steamworks-integration

## Purpose

Enables native Steamworks platform integration for Tron Disc Arena, providing safe client lifecycle initialization, non-blocking offline degradation, live Steam Rich Presence telemetry, and Steam depot distribution packaging.

## ADDED Requirements

### Requirement: Steamworks Client Lifecycle and Safe Degradation
The system SHALL initialize the native Steamworks client when running within the desktop shell with an active Steam client, and SHALL degrade gracefully to a safe no-op state without errors when Steam is offline, uninstalled, or running in a web browser.

#### Scenario: Successful Steam client initialization
- **WHEN** the desktop application launches while the Steam client is running on the host system
- **THEN** the Steamworks subsystem initializes with the configured application ID, confirms player identity, and logs connection status without blocking engine startup.

#### Scenario: Steam client absent or offline
- **WHEN** the desktop application launches without an active Steam client process or when native bindings fail to load
- **THEN** the system logs a diagnostic warning, bypasses Steam API calls, and continues execution with full local game functionality.

#### Scenario: Browser execution environment
- **WHEN** the game executes in a web browser where desktop runtime APIs are unavailable
- **THEN** the system detects the web environment and disables all Steamworks integration hooks without throwing exceptions.

### Requirement: Steam Rich Presence Telemetry Dispatch
The system SHALL broadcast real-time player activity to the Steamworks Rich Presence service during mode transitions, wave completions, and menu navigation.

#### Scenario: Main menu presence broadcast
- **WHEN** the player enters or returns to the main menu or program hub
- **THEN** the system sets the Steam Rich Presence status token to indicate menu navigation.

#### Scenario: Swarm arena presence broadcast
- **WHEN** the player begins or advances through a Swarm mode wave
- **THEN** the system updates the Steam Rich Presence status displaying the current active wave number.

#### Scenario: Campaign sector presence broadcast
- **WHEN** the player engages in a campaign trial
- **THEN** the system updates the Steam Rich Presence status displaying the active sector and mission identifier.

### Requirement: Steam Distribution Package Configuration
The build pipeline SHALL generate an unpacked desktop release directory accompanied by a valid `steam_appid.txt` file suitable for Steam depot ingestion and local Steam testing.

#### Scenario: Local development Steam App ID generation
- **WHEN** running or packaging the game for Steam testing
- **THEN** a `steam_appid.txt` file containing the target App ID is present in the executable working directory.

#### Scenario: Unpacked Steam depot build generation
- **WHEN** executing the Steam distribution packaging script
- **THEN** the build pipeline outputs an unpacked directory structure containing all runtime binaries, assets, and dependencies without installer wrappers.
