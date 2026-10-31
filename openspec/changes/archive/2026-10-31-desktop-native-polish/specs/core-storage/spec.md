# Spec Delta

## ADDED Requirements

### Requirement: Native Desktop Filesystem Storage Adapter
The system SHALL provide a desktop persistence adapter that detects desktop runtime execution and reads/writes save state directly to the user OS application data directory, with automatic fallback to localStorage in browser environments.

#### Scenario: Saving state in desktop mode
- **WHEN** the application executes in desktop mode and a state save is triggered
- **THEN** StorageManager writes the serialized state payload to `saves/profile.json` in the operating system user data directory.

#### Scenario: Loading state in desktop mode
- **WHEN** the application initializes in desktop mode
- **THEN** StorageManager reads and restores state from the desktop save file on disk.

#### Scenario: Browser environment fallback
- **WHEN** the application executes within a standard web browser
- **THEN** StorageManager uses browser localStorage without attempting native disk operations.
