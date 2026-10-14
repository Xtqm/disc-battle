# core-storage Specification Delta

## ADDED Requirements

### Requirement: Swarm Survival High Watermark Record Persistence
The system SHALL persist the player's peak Swarm survival performance in `stats.swarmHighestWave` within StorageManager, updating the value monotonically whenever a new wave record is achieved.

#### Scenario: Advancing survival wave record
- **WHEN** a player completes a Swarm wave that exceeds their previous `stats.swarmHighestWave` value
- **THEN** the system updates `stats.swarmHighestWave` to match the new wave number and commits the updated record to persistent storage.

#### Scenario: Completing wave lower than established record
- **WHEN** a player completes a Swarm wave that is less than or equal to their recorded `stats.swarmHighestWave`
- **THEN** the system leaves `stats.swarmHighestWave` intact without reducing or overwriting the player's personal best record.
