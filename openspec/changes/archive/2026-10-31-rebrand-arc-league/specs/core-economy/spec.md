# Spec Delta: core-economy

## MODIFIED Requirements

### Requirement: Atomic Bits Currency Transactions
The system SHALL provide atomic balance queries, balance affordability checks, credits, and debits for Arc Credits currency against the player profile, with backward-compatible migration of legacy Bits balances.

#### Scenario: Awarding Bits to player
- **WHEN** a valid amount of Arc Credits is awarded with an identifiable source
- **THEN** the system increments the player's Arc Credits balance, persists the new total to storage, and dispatches a currency earned event with the amount, source, and new balance.

#### Scenario: Verifying affordability
- **WHEN** a system queries whether the player can afford a specific Arc Credits cost
- **THEN** the system returns true if the player's balance is greater than or equal to the cost, and false otherwise, without mutating state.

#### Scenario: Spending Bits with sufficient balance
- **WHEN** a transaction requests spending Arc Credits for a specific category and item and the player has sufficient balance
- **THEN** the system deducts the cost from the player's balance, persists the update, records the transaction, and returns true.

#### Scenario: Spending Bits with insufficient balance
- **WHEN** a transaction requests spending more Arc Credits than the player currently possesses
- **THEN** the system rejects the transaction, maintains the existing balance, leaves persistent state unchanged, and returns false.

### Requirement: Developer Debug Suite Console Instrumentation
The system SHALL expose debug manipulation hooks on the global developer namespace for manual testing and administrative simulation, supporting Arc Credits manipulation.

#### Scenario: Modifying Bits via debug console
- **WHEN** a developer invokes the debug addCredits (or backward-compatible addBits) method
- **THEN** the system adjusts the player Arc Credits balance by the specified amount and persists the mutation.

#### Scenario: Setting player XP and level via debug console
- **WHEN** a developer invokes debug setXP or setLevel methods
- **THEN** the system directly updates the player level and XP to the requested values, syncing with storage and updating internal calculations.

#### Scenario: Resetting economy state via debug console
- **WHEN** a developer invokes the debug resetEconomy method
- **THEN** the system resets Arc Credits, level, XP, and audit logs to their initial default baseline values.

### Requirement: Combat Skill Maneuver Rewards and Kinetic HUD Telemetry
The system SHALL award immediate Arc Credits currency during active combat for executing verified high-skill maneuvers—including confirmed disc parries, multi-ricochet strikes, and curve eliminations—and trigger kinetic floating neon `+Credits` HUD indicators at the event locus.

#### Scenario: Confirmed disc parry reward
- **WHEN** the player successfully parries an incoming hostile disc with their block shield
- **THEN** the system credits an immediate Arc Credits bonus to the player balance and launches an animated floating neon `+Credits` HUD indicator.

#### Scenario: Multi-ricochet hit reward
- **WHEN** a player's disc impacts a foe after bouncing 2 or more times off arena geometry or obstacles
- **THEN** the system awards bonus Arc Credits scaled by the bounce count and renders a kinetic floating neon `+Credits` indicator.

#### Scenario: Curve shot elimination reward
- **WHEN** a hostile program is de-allocated by a disc possessing active lateral curve deflection
- **THEN** the system grants a high-skill curve elimination Arc Credit bonus and spawns a kinetic floating neon `+Credits` indicator.
