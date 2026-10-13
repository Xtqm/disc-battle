# Design: Phase 2 EconomyManager & Progression Engine (SPEC-ECON-001)

## Context

Phase 1 established `StorageManager` (`src/core/storage/StorageManager.js`) and the `TronSaveState` v1.0.0 schema (`src/core/storage/schema.js`). The baseline schema already provisions player state fields:
- `player.level` (defaults to `1`)
- `player.xp` (defaults to `0`)
- `player.currency.bits` (defaults to `0`)

Phase 2 builds on this foundational state by introducing `EconomyManager`, an event-driven singleton domain manager responsible for atomic currency transactions, strict validation guards, the exponential XP progression curve, level milestones, session transaction telemetry, and developer console hooks.

See [proposal.md](proposal.md) for motivation and [specs/core-economy/spec.md](specs/core-economy/spec.md) for requirements.

## Goals / Non-Goals

**Goals:**
- Implement `EconomyManager` in `src/core/economy/EconomyManager.js` backed by `StorageManager`.
- Provide atomic Bits operations: `awardBits(amount, source)`, `canAfford(cost)`, `spendBits(cost, category, itemId)`.
- Implement rigorous input guards rejecting non-numbers, NaN, null/undefined, negative costs, and fractional Bits.
- Implement the progression model: `awardXP(amount, source)`, `getLevel()`, `getXP()`, `getXPForNextLevel(level)`, `getProgressToNextLevel()`.
- Implement the exponential threshold formula: $\text{XP\_threshold}(L) = \lfloor 250 \cdot L^{1.4} \rfloor$.
- Handle multi-level progression increments cleanly with milestone reward granting on `LEVEL_UP`.
- Dispatch lifecycle events: `BITS_EARNED`, `BITS_SPENT`, `XP_GAINED`, and `LEVEL_UP`.
- Maintain a bounded in-memory audit log of the last 100 transactions for telemetry and UI toasts.
- Expose developer debug methods on `window.gameDebug` (`addBits`, `setXP`, `setLevel`, `resetEconomy`).
- Mirror modules and author unit tests validating 100% of economy features.

**Non-Goals:**
- UI rendering of cosmetic stores, modals, or toasts (handled by UI modules in Phase 3).
- Remote cloud synchronization or anti-cheat validation with Supabase (handled in cloud sync phases).
- Managing inventory equip logic or disc stat multipliers.

## Decisions

### 1. StorageManager Integration & Dependency Injection
- **Decision:** `EconomyManager` will import and default to the singleton `storageManager` from `src/core/storage/StorageManager.js`, while accepting an optional `storageManager` parameter in its constructor for isolated unit testing.
- **Rationale:** Ensures unified state management across the application while remaining 100% testable in Node.js test runners without environment collisions.
- **Alternatives Considered:** Managing currency in separate module variables or localStorage keys (rejected: violates single source of truth established in Phase 1).

### 2. Currency Validation and Mutation Semantics
- **Decision:**
  - `amount` must satisfy: `typeof amount === 'number' && Number.isFinite(amount) && !Number.isNaN(amount) && amount > 0`.
  - Amounts are coerced to whole integers using `Math.floor(amount)`.
  - `spendBits(cost, category, itemId)` verifies `cost > 0`, checks `canAfford(cost)`, and atomically writes `storageManager.set('player.currency.bits', current - cost)`.
  - Negative expenditures, NaN injections, and zero costs are rejected immediately, returning `false` without state modification.
- **Rationale:** Prevents economy exploits, negative wallet balances, and silent data corruption.

### 3. Progression Mathematical Model & Tier-Based XP
- **Decision:**
  - XP is tracked as current-tier XP in `player.xp`, and current level in `player.level`.
  - Level-up threshold for level $L$:
    $$\text{XP\_threshold}(L) = \lfloor 250 \cdot L^{1.4} \rfloor$$
  - Normalized progress:
    $$\text{Progress} = \min\left(1.0, \max\left(0.0, \frac{\text{player.xp}}{\text{XP\_threshold}(\text{player.level})}\right)\right)$$
  - When `awardXP(amount, source)` is called, accumulated XP can trigger single or multiple consecutive level-ups:
    ```javascript
    let level = this.getLevel();
    let xp = this.getXP() + flooredAmount;
    let oldLevel = level;
    while (xp >= this.getXPForNextLevel(level)) {
      xp -= this.getXPForNextLevel(level);
      level++;
    }
    ```
- **Rationale:** Tier-based XP simplifies HUD progress bar rendering and milestone calculation while preserving mathematical parity with the quadratic/exponential curve specification.

### 4. Milestone Rewards Configuration
- **Decision:**
  - Define `MILESTONE_REWARDS` table for specific milestone levels (e.g., Level 5: 250 Bits, Level 10: 500 Bits, Level 20: 1000 Bits), plus a standard level-up grant (e.g., 50 Bits per level).
  - During `LEVEL_UP`, milestone rewards are aggregated, credited to the player, and broadcast in the `LEVEL_UP` event payload `{ oldLevel, newLevel, rewards }`.
- **Rationale:** Keeps reward definitions configurable, data-driven, and decoupled from gameplay loops.

### 5. Event Emitter & In-Memory Session Audit Log
- **Decision:**
  - `EconomyManager` implements its own lightweight event emitter (`on`, `off`, `emit`) with `EconomyEvents`:
    - `BITS_EARNED`: `{ amount, source, balance, timestamp }`
    - `BITS_SPENT`: `{ cost, category, itemId, balance, timestamp }`
    - `XP_GAINED`: `{ amount, source, xp, level, progress, timestamp }`
    - `LEVEL_UP`: `{ oldLevel, newLevel, rewards, timestamp }`
  - Maintain an internal array `_auditLog = []` capped at `MAX_AUDIT_LOG_SIZE = 100`.
  - Provide `getAuditLog()` to return a shallow copy of recent transactions for UI and telemetry.
- **Rationale:** Decouples UI notification toasts and analytics from core transaction processing, while memory capping prevents unbounded growth during prolonged gameplay.

### 6. Safe Developer Debug Suite (`window.gameDebug`)
- **Decision:**
  - Check for `typeof window !== 'undefined'` before mounting hooks.
  - Expose safe functions on `window.gameDebug`:
    - `window.gameDebug.addBits(amount)`: Calls `awardBits(amount, 'debug_console')`
    - `window.gameDebug.setXP(amount)`: Directly sets `player.xp` within current level
    - `window.gameDebug.setLevel(targetLevel)`: Directly sets `player.level` (minimum 1, resets tier XP to 0)
    - `window.gameDebug.resetEconomy()`: Resets Bits to 0, level to 1, XP to 0, and clears audit log
  - Each debug action flushes to `storageManager.save({ immediate: true })`.
- **Rationale:** Provides rapid testing in browser console while guaranteeing state persistence and protecting server/production environments from crashing if `window` is undefined.

## Risks / Trade-offs

- **[Risk]** Float precision issues with `Math.pow(L, 1.4)`.
  - **Mitigation:** Wrap the curve formula in `Math.floor()` to guarantee clean integer thresholds at every level.
- **[Risk]** Massive XP grant causes runaway loop in `awardXP()`.
  - **Mitigation:** Cap the award amount or implement a loop guard (e.g. maximum level 1000) to protect against pathological values.
- **[Risk]** Storage desynchronization if `StorageManager.load()` has not yet executed.
  - **Mitigation:** `EconomyManager` verifies `storageManager.isInitialized` on access and calls `storageManager.load()` if not yet loaded.

## Migration Plan

1. Implement `src/core/economy/EconomyManager.js`.
2. Mirror/re-export modules at `tron/src/core/economy/EconomyManager.js` and `tron/src/economy/EconomyManager.js`.
3. Create automated test suite `tron/test_economy_manager.js` and `test/economy_manager.test.js`.
4. Register `test:economy` in `package.json` and run the suite to verify 100% passing tests.
