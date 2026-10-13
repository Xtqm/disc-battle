# Tasks: Phase 2 EconomyManager & Progression Engine (SPEC-ECON-001)

## 1. EconomyManager Core & Currency Transactions

- [x] 1.1 Implement `EconomyManager` class and singleton in `src/core/economy/EconomyManager.js` with event emitter capabilities (`on`, `off`, `emit`) and dependency-injected `StorageManager` binding; verify class instantiation and storage connectivity.
- [x] 1.2 Implement atomic currency methods `awardBits(amount, source)`, `canAfford(cost)`, and `spendBits(cost, category, itemId)` with strict input guards rejecting negative, zero, NaN, non-numeric, and fractional values; verify wallet crediting, debiting, and guard rejections.
- [x] 1.3 Mirror and re-export `EconomyManager.js` at `tron/src/core/economy/EconomyManager.js` and `tron/src/economy/EconomyManager.js` for isomorphic runtime and test environment resolution.

## 2. Progression Engine & Mathematical Curve

- [x] 2.1 Implement exponential progression curve `getXPForNextLevel(level) = Math.floor(250 * Math.pow(level, 1.4))` and progression accessors `getLevel()`, `getXP()`, and `getProgressToNextLevel()`; verify curve values and normalized floating-point ratio calculation.
- [x] 2.2 Implement `awardXP(amount, source)` supporting incremental accumulation and multi-level progression jumps across consecutive level tiers; verify level advancement and remaining XP rollover.
- [x] 2.3 Implement level-up milestone rewards calculation and dispatch `LEVEL_UP` event containing old level, new level, and milestone rewards; verify automatic reward distribution and event payload integrity.

## 3. Transaction Telemetry & Developer Debug Suite

- [x] 3.1 Implement lifecycle event dispatch (`BITS_EARNED`, `BITS_SPENT`, `XP_GAINED`, `LEVEL_UP`) and bounded in-memory audit log (capped at 100 entries) with `getAuditLog()` accessor; verify event broadcasting and audit ring buffer capacity enforcement.
- [x] 3.2 Implement safe developer debug suite hooks on `window.gameDebug` (`addBits`, `setXP`, `setLevel`, `resetEconomy`) with immediate persistence flush; verify console method execution and state persistence.

## 4. Test Suite & Verification

- [x] 4.1 Author comprehensive test suite `tron/test_economy_manager.js` exercising currency atomicity, input guards, XP curve math, multi-level jumps, milestone rewards, audit logging, and debug hooks.
- [x] 4.2 Author `test/economy_manager.test.js` runner, register `"test:economy": "node tron/test_economy_manager.js"` in `package.json`, and link the suite into `tron/run_tests.js`.
- [x] 4.3 Execute `npm run test:economy` and `npm test` to verify all economy and storage tests pass cleanly.
