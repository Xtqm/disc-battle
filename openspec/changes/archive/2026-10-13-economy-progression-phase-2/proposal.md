# Proposal: Phase 2: EconomyManager & Progression Engine (SPEC-ECON-001)

## Why

With Phase 1 establishing the baseline storage engine (`StorageManager`) and `TronSaveState` schema, Tron Disc Arena needs a centralized, authoritative domain layer to govern currency transactions, combat XP progression, leveling thresholds, and economy telemetry. Without this engine, currency spending risks negative balances and NaN corruption, progression math is prone to ad-hoc inconsistencies, and telemetry lacks an audit trail. Phase 2 delivers a robust `EconomyManager` that ensures mathematical integrity, atomic balance updates, event-driven progression, and developer instrumentation across the Grid.

## What Changes

- **Core Economy Engine (`src/core/economy/EconomyManager.js`)**:
  - Implement an event-driven singleton `EconomyManager` backed by `StorageManager`.
  - Provide atomic currency management:
    - `awardBits(amount, source)`: Validates and credits Bits, updating `player.currency.bits`.
    - `canAfford(cost)`: Non-mutating verification of sufficient funds.
    - `spendBits(cost, category, itemId)`: Atomic debit checking balance, category, and target item before deducting.
  - Enforce strict validation guards against negative values, non-numeric inputs (NaN/null/undefined), and fractional amounts (flooring or rejecting non-integers).
- **Progression & Curve Mathematical Model**:
  - Implement XP and leveling mechanics:
    - `awardXP(amount, source)`: Credits combat and campaign XP, calculating level thresholds and handling multi-level jumps.
    - `getLevel()`: Returns current player level (defaults to 1).
    - `getXP()`: Returns current lifetime or current-tier XP.
    - `getXPForNextLevel(level)`: Implements the exponential progression curve $\text{XP\_threshold}(L) = \lfloor 250 \cdot L^{1.4} \rfloor$.
    - `getProgressToNextLevel()`: Computes normalized floating-point progress $[0.0, 1.0]$ towards the next level for HUD progress bars.
  - Implement level-up milestones: Emits `LEVEL_UP` event containing `{ oldLevel, newLevel, rewards }` and automatically awards milestone rewards (e.g. bonus Bits).
- **Event Dispatch & In-Memory Audit Logging**:
  - Standardize lifecycle event definitions: `BITS_EARNED`, `BITS_SPENT`, `XP_GAINED`, and `LEVEL_UP`.
  - Maintain a bounded in-memory session audit log (e.g., last 100 transactions) recording timestamps, event types, amounts, sources/items, and resulting balances for UI toasts, notifications, and telemetry.
- **Developer Debug Suite (`window.gameDebug`)**:
  - Safely bind debug controls to `window.gameDebug`:
    - `window.gameDebug.addBits(amount)`
    - `window.gameDebug.setXP(amount)`
    - `window.gameDebug.setLevel(targetLevel)`
    - `window.gameDebug.resetEconomy()`
- **Module Re-exports & Mirrors**:
  - Provide isomorphic re-exports in `tron/src/core/economy/EconomyManager.js` and `tron/src/economy/EconomyManager.js`.
  - Export constants (`EconomyEvents`, `MILESTONE_REWARDS`, `DEFAULT_XP_CURVE`).

## Capabilities

### New Capabilities
- `core-economy`: Atomic currency transactions, validation guards, exponential progression curve mathematical model, level-up milestones, transaction logging, and developer debug suite for Tron Disc Arena (SPEC-ECON-001 Phase 2).

### Modified Capabilities
*(None - existing capabilities retain their specifications without modifications; `core-storage` provides the persistence backbone without changing its requirement contract).*

## Impact

- **New Files**:
  - `src/core/economy/EconomyManager.js`: Primary singleton, currency transactions, progression math, audit logging, and debug bindings.
  - `tron/src/core/economy/EconomyManager.js` and `tron/src/economy/EconomyManager.js`: Module re-exports for browser runtime and tests.
  - `tron/test_economy_manager.js` (and `test/economy_manager.test.js`): Automated unit and integration test suite validating transaction atomicity, validation guards, XP curves, multi-level jumps, audit logging, and debug hooks.
- **APIs & Integration**:
  - Direct consumption of `StorageManager` (`get`, `set`) from `src/core/storage/StorageManager.js`.
  - Exposes `window.gameDebug` hooks in browser environments without polluting production logic if debug is disabled or restricted.
- **Runtime Dependencies**: Zero external dependencies.
