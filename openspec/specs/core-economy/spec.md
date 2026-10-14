# core-economy Specification

## Purpose
Establishes the core economy engine, atomic currency transactions, progression mathematical curve, level milestones, transaction audit logging, and developer debug instrumentation for Tron Disc Arena (SPEC-ECON-001 Phase 2).

## Requirements

### Requirement: Atomic Bits Currency Transactions
The system SHALL provide atomic balance queries, balance affordability checks, credits, and debits for Bits currency against the player profile.

#### Scenario: Awarding Bits to player
- **WHEN** a valid amount of Bits is awarded with an identifiable source
- **THEN** the system increments the player's Bits balance, persists the new total to storage, and dispatches a currency earned event with the amount, source, and new balance.

#### Scenario: Verifying affordability
- **WHEN** a system queries whether the player can afford a specific Bits cost
- **THEN** the system returns true if the player's balance is greater than or equal to the cost, and false otherwise, without mutating state.

#### Scenario: Spending Bits with sufficient balance
- **WHEN** a transaction requests spending Bits for a specific category and item and the player has sufficient balance
- **THEN** the system deducts the cost from the player's balance, persists the update, records the transaction, and returns true.

#### Scenario: Spending Bits with insufficient balance
- **WHEN** a transaction requests spending more Bits than the player currently possesses
- **THEN** the system rejects the transaction, maintains the existing balance, leaves persistent state unchanged, and returns false.

### Requirement: Currency Input Validation Guards
The system SHALL enforce strict defensive validation guards on all currency inputs, preventing negative amounts, non-numeric values, and fractional tokens.

#### Scenario: Rejecting non-positive expenditures
- **WHEN** a spend request provides a negative number, zero, or non-finite value as the cost
- **THEN** the system rejects the operation, throws an error or returns false, and does not alter the player balance.

#### Scenario: Guarding against NaN or non-number injection
- **WHEN** a currency award or spend method receives NaN, null, undefined, boolean, or non-numeric string values
- **THEN** the system rejects the transaction without modifying the player currency balance.

#### Scenario: Enforcing integer currency units
- **WHEN** a currency operation provides a fractional amount
- **THEN** the system truncates or rejects the fractional component, ensuring stored currency amounts remain whole integer values.

### Requirement: Exponential Progression Curve and XP Accumulation
The system SHALL govern player leveling and XP accumulation using the exponential mathematical threshold curve floor(250 * L^1.4).

#### Scenario: Calculating XP threshold for a level
- **WHEN** querying the XP required to advance from a given level L to level L + 1
- **THEN** the system calculates and returns the integer floor value of 250 multiplied by L raised to the power of 1.4.

#### Scenario: Progressing toward next level
- **WHEN** querying progression percentage for a player with partial XP toward their next level
- **THEN** the system computes a normalized floating-point ratio between 0.0 and 1.0 representing current progress within the active level tier.

#### Scenario: Accumulating XP without level increase
- **WHEN** a player is awarded XP that does not meet the current level threshold
- **THEN** the system increments the player's current XP, persists the updated total, and dispatches an XP gained event.

#### Scenario: Handling multi-level progression jump
- **WHEN** a substantial XP award exceeds the thresholds of multiple consecutive levels
- **THEN** the system recalculates and updates the player level across all traversed tiers, setting the remaining excess XP in the final level tier.

### Requirement: Level Up Event Emission and Milestone Rewards
The system SHALL broadcast level up lifecycle events and distribute milestone rewards whenever a player advances in level.

#### Scenario: Emitting level up event
- **WHEN** XP accumulation causes a player level increase
- **THEN** the system broadcasts a level up event containing the previous level, new level, and any awarded milestone items or currency.

#### Scenario: Granting milestone rewards on qualifying levels
- **WHEN** a player advances to a level defined in the milestone rewards configuration
- **THEN** the system automatically credits the specified milestone rewards to the player's inventory or currency and records the grant in the event payload.

### Requirement: In-Memory Audit Logging and Telemetry
The system SHALL record an in-memory chronological audit log of recent economy and progression transactions for telemetry and UI alerts.

#### Scenario: Recording transaction audit entries
- **WHEN** a currency transaction or progression milestone executes
- **THEN** the system creates an immutable audit entry with timestamp, transaction type, amount, source or target, and post-transaction balances.

#### Scenario: Bounding audit log capacity
- **WHEN** total recorded transactions exceed the configured in-memory capacity
- **THEN** the oldest transactions are evicted to maintain a fixed-size buffer and prevent memory leaks.

### Requirement: Developer Debug Suite Console Instrumentation
The system SHALL expose debug manipulation hooks on the global developer namespace for manual testing and administrative simulation.

#### Scenario: Modifying Bits via debug console
- **WHEN** a developer invokes the debug addBits method
- **THEN** the system adjusts the player Bits balance by the specified amount and persists the mutation.

#### Scenario: Setting player XP and level via debug console
- **WHEN** a developer invokes debug setXP or setLevel methods
- **THEN** the system directly updates the player level and XP to the requested values, syncing with storage and updating internal calculations.

#### Scenario: Resetting economy state via debug console
- **WHEN** a developer invokes the debug resetEconomy method
- **THEN** the system resets Bits, level, XP, and audit logs to their initial default baseline values.

### Requirement: Combat Skill Maneuver Rewards and Kinetic HUD Telemetry
The system SHALL award immediate Bits currency during active combat for executing verified high-skill maneuvers—including confirmed disc parries, multi-ricochet strikes, and curve eliminations—and trigger kinetic floating neon `+Bits` HUD indicators at the event locus.

#### Scenario: Confirmed disc parry reward
- **WHEN** the player successfully parries an incoming hostile disc with their block shield
- **THEN** the system credits an immediate Bits bonus to the player balance and launches an animated floating neon `+Bits` HUD indicator.

#### Scenario: Multi-ricochet hit reward
- **WHEN** a player's disc impacts a foe after bouncing 2 or more times off arena geometry or obstacles
- **THEN** the system awards bonus Bits scaled by the bounce count and renders a kinetic floating neon `+Bits` indicator.

#### Scenario: Curve shot elimination reward
- **WHEN** a hostile program is de-rezzed by a disc possessing active lateral curve deflection
- **THEN** the system grants a high-skill curve elimination Bit bonus and spawns a kinetic floating neon `+Bits` indicator.
