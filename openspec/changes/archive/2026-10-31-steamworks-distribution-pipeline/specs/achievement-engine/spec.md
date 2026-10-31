# Spec Delta: achievement-engine

## ADDED Requirements

### Requirement: Steamworks Platform Achievement Forwarding
The system SHALL dispatch achievement unlock commands to the Steamworks platform API whenever an achievement unlocks during gameplay or retroactive reconciliation, while safely falling back to local-only unlocking if Steam is unavailable.

#### Scenario: Mid-game achievement unlock forward
- **WHEN** an achievement unlock criteria is satisfied during active gameplay
- **THEN** the system triggers local rewards and toasts, and concurrently dispatches an activation request for the corresponding Steam achievement identifier via the desktop bridge.

#### Scenario: Retroactive reconciliation synchronization
- **WHEN** the engine detects previously unlocked achievements on boot that have not yet been synchronized with Steamworks
- **THEN** the system activates the corresponding Steam achievements without re-granting in-game currency or cosmetics.

#### Scenario: Offline or web execution unlock
- **WHEN** an achievement unlocks while the Steamworks connection is inactive, offline, or running in a web browser
- **THEN** the local achievement unlock, rewards, fanfare, and toast execute successfully without errors or delays.
