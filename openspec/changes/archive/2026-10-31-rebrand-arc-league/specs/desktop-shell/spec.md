# Spec Delta: desktop-shell

## MODIFIED Requirements

### Requirement: Native Desktop Window Initialization
The system SHALL launch the game within a dedicated Electron native desktop window with hardware acceleration enabled, default application menus hidden, and window title set to "ARC LEAGUE".

#### Scenario: Application startup
- **WHEN** the desktop application executable is launched
- **THEN** an Electron window opens, loads the local game client, and renders the 3D canvas with window title "ARC LEAGUE" without browser navigation bars or dev tools.
