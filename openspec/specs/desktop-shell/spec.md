# Desktop Shell Specification

## Purpose

Provides a standalone desktop application shell using Electron, managing native windowing, display modes, browser quirk suppression, and application lifecycle for Tron Disc Arena.

## Requirements

### Requirement: Native Desktop Window Initialization
The system SHALL launch the game within a dedicated Electron native desktop window with hardware acceleration enabled, default application menus hidden, and window title set to "TRON :: DISC ARENA".

#### Scenario: Application startup
- **WHEN** the desktop application executable is launched
- **THEN** an Electron window opens, loads the local game client, and renders the 3D canvas without browser navigation bars or dev tools.

### Requirement: Window Mode and Fullscreen Toggle
The system SHALL support borderless fullscreen execution by default and provide hotkeys to toggle between fullscreen and windowed display modes.

#### Scenario: Fullscreen hotkey toggle
- **WHEN** the player presses `Alt+Enter` or `F11`
- **THEN** the application window toggles between borderless fullscreen and windowed mode while maintaining viewport scaling.

### Requirement: Browser Quirk and Shortcut Suppression
The system SHALL suppress browser context menus, accidental page reload hotkeys, and HTML asset drag-and-drop interactions to ensure uninterrupted desktop gameplay.

#### Scenario: Context menu suppression
- **WHEN** the player right-clicks inside the game window
- **THEN** the default browser context menu is suppressed and the input is routed exclusively to game combat mechanics (disc parry/shield).

#### Scenario: Reload shortcut suppression
- **WHEN** the player presses `F5`, `Ctrl+R`, or `Ctrl+Shift+R`
- **THEN** the window reload action is ignored and active match state is preserved.

### Requirement: Application Lifecycle and Focus Management
The system SHALL manage native lifecycle events, ensuring clean process termination on close and audio muting when the application window is blurred or minimized.

#### Scenario: Window close event
- **WHEN** the player closes the window via `Alt+F4` or the window close button
- **THEN** the application terminates all client processes gracefully.

#### Scenario: Window blur event
- **WHEN** the game window loses focus or is minimized
- **THEN** procedural synthesizer audio output is suspended until the window regains focus.

### Requirement: Executable Packaging Configuration
The system SHALL provide packaging configurations via electron-builder to generate a standalone Windows desktop executable.

#### Scenario: Distribution packaging build
- **WHEN** the developer executes `npm run desktop:build`
- **THEN** a standalone Windows executable package is generated in the distribution output directory.
