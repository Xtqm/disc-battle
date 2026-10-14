# Proposal: Phase 1: Armory Catalog Registry, Purchase Pipeline & Loadout Controller (SPEC-ARMORY-001)

## Why

Tron Disc Arena currently lacks a centralized cosmetics and customization registry, leaving players without a progression sink for earned Bits or a loadout customization loop. Establishing an authoritative Armory domain layer connects the economy engine (`EconomyManager`) and persistence layer (`StorageManager`) to deliver a robust cosmetic catalog, atomic purchase validation, and persistent loadout equipment.

## What Changes

- **Armory Catalog Registry (`src/armory/ArmoryCatalog.js`)**:
  - Implement a structured catalog schema defining metadata, visual shader parameters, and unlock criteria across four categories:
    - `discSkins`: Identity disc visual modifications (`disc_default`, `disc_neon_amber`, `disc_retro_green`, `disc_plasma_violet`, `disc_corrupted_void`).
    - `chassisSkins`: Player avatar chassis meshes and textures (`chassis_default`, `chassis_infiltrator`, `chassis_iso_guardian`, `chassis_black_guard`, `chassis_arbiter`).
    - `unlockedMaps`: Exotic combat arenas (`arena_zero_g_nexus`, `arena_derez_chasm`, plus baseline `arena_grid_01`).
    - `discTypes`: Extensible slot for combat disc variants (`disc_standard`).
  - Standardize shader parameters for rendering pipelines: `primaryHex`, `secondaryEmissiveHex`, `trailOpacity`, and `wireframeToggle`.
  - Define unlock mechanisms supporting default free items, Bits currency purchases, and achievement-gated unlocks.
  - Provide helper accessors: `getCatalogByCategory(category)`, `getCatalogItem(itemId)`, `getAllCatalogItems()`, and category validators.

- **Armory Manager & Purchase Pipeline (`src/armory/ArmoryManager.js`)**:
  - Implement an event-driven singleton `ArmoryManager` interacting with `EconomyManager` and `StorageManager`.
  - Provide query and validation methods:
    - `getCatalogByCategory(category)`: Retrieve all items belonging to a cosmetic or functional category.
    - `isUnlocked(category, itemId)`: Check whether an item is owned, accounting for default unlocked items and stored inventory.
    - `canPurchase(itemId)`: Non-mutating check verifying that the item is valid, not already owned, meets achievement prerequisites, and the player possesses sufficient Bits.
  - Implement atomic purchase workflow:
    - `purchaseItem(itemId)`: Validates item, verifies affordability, executes atomic currency deduction via `EconomyManager.spendBits(cost, category, itemId)`, appends unlocked ID to `StorageManager` (`inventory.<category>`), and persists state.
  - Implement loadout configuration:
    - `equipItem(category, itemId)`: Verifies item unlock status, updates the active slot in `StorageManager` (`loadout.<slot>`), and persists the change.
    - `getEquippedLoadout()`: Retrieves current equipped items across all loadout slots.
  - Event dispatching:
    - Define and emit `ARMORY_ITEM_UNLOCKED` upon successful purchase.
    - Define and emit `LOADOUT_CHANGED` upon equipping loadout changes.

- **Developer Debug Suite Integration**:
  - Expose armory debug hooks under `window.gameDebug` for unlocking all items, resetting inventory, and querying catalog state during testing.

- **Module Re-exports & Test Suite**:
  - Mirror exports to `tron/src/armory/` for isomorphic browser and test imports.
  - Provide comprehensive test suite verifying catalog integrity, purchase validation, balance checking, inventory persistence, and loadout switching.

## Capabilities

### New Capabilities
- `armory-catalog`: Catalog registry, purchase validation pipeline, inventory tracking, and loadout controller for Tron Disc Arena (SPEC-ARMORY-001 Phase 1).

### Modified Capabilities
*(None - existing capabilities retain their specifications without modifications; `core-economy` and `core-storage` provide underlying transaction and persistence services).*

## Impact

- **New Files**:
  - `src/armory/ArmoryCatalog.js`: Catalog metadata, category definitions, shader configuration, and catalog querying functions.
  - `src/armory/ArmoryManager.js`: Purchase pipeline, inventory unlock verification, loadout equipment, and event emission.
  - `tron/src/armory/ArmoryCatalog.js` & `tron/src/armory/ArmoryManager.js`: Isomorphic module re-exports.
  - `tron/test_armory_manager.js` (and `test/armory_manager.test.js`): Unit and integration tests covering catalog integrity, purchase flows, and loadout changes.
- **APIs & Integration**:
  - Calls `EconomyManager.spendBits(cost, category, itemId)` and `EconomyManager.canAfford(cost)`.
  - Reads and writes to `StorageManager` under `inventory.*` and `loadout.*`.
  - Subscribes to and emits events via internal listener registry.
- **Runtime Dependencies**: Zero external dependencies.
