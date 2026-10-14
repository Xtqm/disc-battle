# Tasks

## 1. Armory Catalog Implementation

- [x] 1.1 Implement `src/armory/ArmoryCatalog.js` defining metadata, visual shader parameters, and unlock requirements across `discSkins`, `chassisSkins`, `unlockedMaps`, and `discTypes`, and verify item schema integrity with a unit test.
- [x] 1.2 Implement catalog query helper functions (`getCatalogByCategory`, `getCatalogItem`, `getAllCatalogItems`, `isValidCategory`) and verify that querying nonexistent items or categories returns null/empty arrays safely.
- [x] 1.3 Create module re-export mirror at `tron/src/armory/ArmoryCatalog.js` and verify isomorphic import parity in Node.js.

## 2. Armory Manager Core Pipeline

- [x] 2.1 Implement `src/armory/ArmoryManager.js` class scaffolding with event emitter (`on`, `off`, `emit`), `ArmoryEvents` definitions, and dependency injection (`catalog`, `economy`, `storage`), verifying initialization state.
- [x] 2.2 Implement `isUnlocked(category, itemId)` verifying ownership across free baseline defaults, stored inventory arrays, and achievement unlocks, and verify test assertions for free, owned, and locked items.
- [x] 2.3 Implement `canPurchase(itemId)` checking validity, existing ownership, achievement gating, and `EconomyManager.canAfford(cost)` balance checks, verifying validation responses.
- [x] 2.4 Implement `purchaseItem(itemId)` executing atomic deduction via `EconomyManager.spendBits(cost, category, itemId)`, appending unlocked IDs to `StorageManager` inventory, and emitting `ARMORY_ITEM_UNLOCKED`, verifying atomic balance debit and event dispatch.
- [x] 2.5 Implement `equipItem(category, itemId)` and `getEquippedLoadout()` validating ownership before setting loadout slots, persisting to `StorageManager`, and emitting `LOADOUT_CHANGED`, verifying loadout transitions.
- [x] 2.6 Expose developer debug suite hooks under `window.gameDebug.armory` (`unlockAll`, `getLoadout`, `equip`) and verify hooks do not throw when window is undefined.
- [x] 2.7 Create module re-export mirror at `tron/src/armory/ArmoryManager.js` and verify isomorphic import parity.

## 3. Test Suite & Verification

- [x] 3.1 Create test runner `tron/test_armory_manager.js` and runner wrapper `test/armory_manager.test.js` validating catalog metadata, affordability checks, atomic purchase flows, inventory persistence, loadout management, and event emissions.
- [x] 3.2 Add `"test:armory"` script to `package.json` and execute `npm run test:armory`, verifying that 100% of armory tests pass.

## Workflow follow-up

- Review proposal, specs, design, and tasks with user before starting implementation.
- Proceed to apply workflow when user requests implementation.
