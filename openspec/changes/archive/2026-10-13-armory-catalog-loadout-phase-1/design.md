# Design: Phase 1 Armory Catalog Registry, Purchase Pipeline & Loadout Controller (SPEC-ARMORY-001)

## Context

Tron Disc Arena features an authoritative persistence layer (`StorageManager` in `src/core/storage/StorageManager.js`) and economy engine (`EconomyManager` in `src/core/economy/EconomyManager.js`). `StorageManager` already models `inventory` and `loadout` branches in `TronSaveState`, while `EconomyManager` exposes atomic currency transactions (`spendBits(cost, category, itemId)` and `canAfford(cost)`).

However, the game lacks a centralized cosmetics and loadout registry (`ArmoryCatalog`), an inventory entitlement resolver, and an authoritative equipment controller (`ArmoryManager`). Phase 1 introduces these core systems in `src/armory/`, establishing the data structures, transaction pipeline, and event lifecycle for player customization.

See [proposal.md](proposal.md) for motivation and [specs/armory-catalog/spec.md](specs/armory-catalog/spec.md) for requirements.

## Goals / Non-Goals

**Goals:**
- Implement `ArmoryCatalog` (`src/armory/ArmoryCatalog.js`) with structured metadata and Three.js-ready shader parameters for four categories: `discSkins`, `chassisSkins`, `unlockedMaps`, and `discTypes`.
- Provide visual parameters: `primaryHex`, `secondaryEmissiveHex`, `trailOpacity`, and `wireframeToggle`.
- Support multiple unlock models: Free baseline defaults, Bits currency purchases, and achievement milestones.
- Implement `ArmoryManager` (`src/armory/ArmoryManager.js`) backed by `EconomyManager` and `StorageManager` via dependency injection.
- Implement public methods:
  - `getCatalogByCategory(category)`
  - `isUnlocked(category, itemId)`
  - `canPurchase(itemId)`
  - `purchaseItem(itemId)`
  - `equipItem(category, itemId)`
  - `getEquippedLoadout()`
- Execute atomic currency deductions using `EconomyManager.spendBits(cost, category, itemId)` and persist unlocked IDs in `StorageManager` under `inventory.*`.
- Broadcast lifecycle events: `ARMORY_ITEM_UNLOCKED` and `LOADOUT_CHANGED`.
- Implement developer debug console helpers under `window.gameDebug.armory` for testing.
- Deliver automated tests validating catalog consistency, purchase atomic transactions, loadout state changes, and error handling.

**Non-Goals:**
- 3D armory inspection stage / camera orbiting scene (Phase 2 UI / Stage).
- Visual Armory UI modals, grid layout DOM cards, or equip button components (Phase 2 UI).
- Real-time material shader uniform swapping on live Three.js meshes during active gameplay matches (Phase 3 Mesh Integration).
- Monetized real-money microtransactions (Bits are strictly earned via gameplay and campaign progression).

## Decisions

### 1. Catalog Data Architecture & Category Schemas

- **Decision:** The catalog registry in `ArmoryCatalog.js` will organize items under four rigid category keys:
  - `discSkins`:
    - `disc_default` (Free, 0 Bits) — Baseline cyan glowing Identity Disc (`#00f3ff`).
    - `disc_neon_amber` (400 Bits) — High-contrast golden/orange disc (`#ffaa00`).
    - `disc_retro_green` (600 Bits) — Vintage terminal phosphor green (`#00ff66`).
    - `disc_plasma_violet` (850 Bits) — Deep synthwave neon violet (`#bd00ff`).
    - `disc_corrupted_void` (Achievement-gated: `corrupted_void_mastery`) — Pulsing dark crimson and obsidian (`#ff0033`).
  - `chassisSkins`:
    - `chassis_default` (Free, 0 Bits) — Standard combat program armor.
    - `chassis_infiltrator` (500 Bits) — Sleek stealth scout chassis with muted trim (`#00d4ff`).
    - `chassis_iso_guardian` (750 Bits) — High-density luminescent guardian armor (`#ffea00`).
    - `chassis_black_guard` (1200 Bits) — Heavy security enforcer chassis (`#ff2200`).
    - `chassis_arbiter` (Achievement-gated: `grid_01_mastery`) — Sovereign champion plating (`#ffffff`).
  - `unlockedMaps`:
    - `arena_grid_01` (Free baseline) — Standard 92m x 92m combat arena.
    - `arena_zero_g_nexus` (1000 Bits) — Low-gravity elevated floating platforms.
    - `arena_derez_chasm` (1500 Bits) — Perilous narrow causeways over void chasms.
  - `discTypes`:
    - `disc_standard` (Free baseline) — Standard balanced mass and aerodynamics disc variant.
- **Shader Metadata Structure:** Each item will export a standardized `shader` object:
  ```javascript
  shader: {
    primaryHex: '#00f3ff',
    secondaryEmissiveHex: '#0066ff',
    trailOpacity: 0.85,
    wireframeToggle: false,
    glowIntensity: 1.5 // Extensible for Three.js bloom materials
  }
  ```
- **Rationale:** Standardizing shader parameters across categories ensures that future Three.js material bindings (disc shaders, avatar materials, arena boundaries) consume a uniform configuration object without category-specific branching.

### 2. Dependency Injection and Storage Inventory Mapping

- **Decision:** `ArmoryManager` will accept optional dependencies in its constructor:
  ```javascript
  constructor({ catalog = defaultArmoryCatalog, economy = economyManager, storage = storageManager } = {})
  ```
- **Storage Category Path Mapping:**
  - `discSkins` -> `inventory.discSkins` (with fallback check against legacy `inventory.discs` and `'disc_identity_default'`)
  - `chassisSkins` -> `inventory.chassisSkins` (with fallback check against legacy `inventory.cosmetics`)
  - `unlockedMaps` -> `inventory.unlockedMaps`
  - `discTypes` -> `inventory.discTypes`
- **Loadout Slot Key Mapping:**
  - `discSkins` -> `loadout.activeDisc`
  - `chassisSkins` -> `loadout.activeChassis` (with fallback/sync to `loadout.activeVisor`)
  - `unlockedMaps` -> `loadout.activeArenaSkin`
  - `discTypes` -> `loadout.activeDiscType`
- **Free Baseline Auto-Resolution:**
  - Items with `unlockType === 'free'` are always reported as `isUnlocked = true`, ensuring players never encounter locked defaults if local storage was reset or initialized empty.
- **Achievement Auto-Resolution:**
  - Items with `unlockType === 'achievement'` query `storage.get('achievements', [])` for `item.achievementId`. If present, the item is considered unlocked.

### 3. Atomic Purchase Pipeline

- **Decision:** The purchase pipeline in `purchaseItem(itemId)` enforces the following sequence:
  1. Retrieve item definition from `ArmoryCatalog`. If missing, return `false`.
  2. Verify unlock status: If `isUnlocked(item.category, item.id)`, return `false` (cannot purchase owned items).
  3. Validate unlock type:
     - If `unlockType === 'free'`, return `false` (already unlocked).
     - If `unlockType === 'achievement'`, return `false` (cannot purchase achievement rewards with Bits).
     - If `unlockType === 'bits'`, verify `item.cost > 0` and `economy.canAfford(item.cost)`.
  4. Call `economy.spendBits(item.cost, item.category, item.id)`.
     - If spending returns `false`, abort and return `false`.
  5. Fetch existing inventory array for `item.category` from `StorageManager`.
  6. Append `item.id` (preventing duplicates) and write back via `storage.set('inventory.' + key, updatedList, { immediate: true })`.
  7. Emit `ARMORY_ITEM_UNLOCKED` event: `{ category, itemId, item, cost, timestamp }`.
  8. Return `true`.
- **Rationale:** Delegates balance checking and audit logging to `EconomyManager`, guaranteeing that currency deductions and inventory grants occur atomically without race conditions or partial writes.

### 4. Loadout Controller Semantics

- **Decision:**
  - `equipItem(category, itemId)`:
    1. Validates that `itemId` exists in `ArmoryCatalog` for `category`.
    2. Validates `isUnlocked(category, itemId) === true`. Rejects with `false` if locked.
    3. Reads current equipped item from `loadout.<slotKey>`.
    4. Writes new equipped ID via `storage.set('loadout.' + slotKey, itemId, { immediate: true })`.
    5. Dispatches `LOADOUT_CHANGED` event: `{ category, itemId, previousItemId, loadout: this.getEquippedLoadout(), timestamp }`.
    6. Returns `true`.
  - `getEquippedLoadout()`: Returns an object containing the resolved active items:
    ```javascript
    {
      discSkin: storage.get('loadout.activeDisc', 'disc_default'),
      chassisSkin: storage.get('loadout.activeChassis', 'chassis_default'),
      unlockedMap: storage.get('loadout.activeArenaSkin', 'arena_grid_01'),
      discType: storage.get('loadout.activeDiscType', 'disc_standard')
    }
    ```
- **Rationale:** Centralizing loadout management in `ArmoryManager` prevents disjointed loadout mutations across the codebase and guarantees that only verified, unlocked items can be equipped.

### 5. Event Emitter & Debug Suite

- **Decision:**
  - Implement a lightweight subscription registry (`on`, `off`, `emit`) on `ArmoryManager` following the pattern in `EconomyManager`.
  - Event Constants:
    ```javascript
    export const ArmoryEvents = Object.freeze({
      ITEM_UNLOCKED: 'ARMORY_ITEM_UNLOCKED',
      LOADOUT_CHANGED: 'LOADOUT_CHANGED'
    });
    ```
  - Bind developer inspection methods to `window.gameDebug.armory`:
    - `window.gameDebug.armory.unlockAll()`: Appends all catalog items to inventory for testing.
    - `window.gameDebug.armory.getLoadout()`: Dumps current equipped loadout.
    - `window.gameDebug.armory.equip(category, itemId)`: Quick equip shortcut.

## Risks / Trade-offs

- **[Risk] Legacy Save State Incompatibility:** Existing save states in localStorage may have `inventory.discs = ['disc_identity_default']` instead of `'disc_default'`.
  - **Mitigation:** In `isUnlocked`, map `'disc_identity_default'` and `'disc_default'` interchangeably as free baseline discs, and ensure both aliases resolve correctly without breaking legacy player saves.
- **[Risk] Currency Deduction without Inventory Persist:** If browser crashes between `spendBits` and inventory write.
  - **Mitigation:** Use `{ immediate: true }` in `storage.set` to flush state synchronously right after spending.
- **[Risk] Storage Array Mutation Non-Idempotency:** Re-purchasing or adding items multiple times could bloat inventory arrays.
  - **Mitigation:** Wrap inventory arrays in `new Set(existing).add(itemId)` to enforce uniqueness before storing.
