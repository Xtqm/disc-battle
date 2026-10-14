# Technical Design: Diegetic Armory UI, 3D Preview Bay & Purchase Fanfare (SPEC-ARMORY-001 Phase 3)

## Context

Phase 1 established the authoritative catalog (`ArmoryCatalog.js`), currency transactions, persistent unlocks (`StorageManager`), and loadout equipment tracking (`ArmoryManager.js`). Phase 2 introduced runtime cosmetic material application (`CosmeticMaterialEngine.js`) and the isolated Three.js turntable preview bay (`ArmoryPreviewScene.js`). 

Currently, players cannot access the Armory from the main menu, inspect cosmetics in an in-game interface, purchase unowned skins with Bits, or equip their unlocked items without manual debug console commands. Phase 3 delivers the diegetic player-facing interface (`ArmoryModal.js`), integrates the interactive 3D turntable preview bay, implements the dynamic contextual action bar state machine, and adds procedural audio-visual fabrication fanfare.

## Goals / Non-Goals

**Goals:**
- Implement `ArmoryModal` with a responsive, diegetic Tron split-pane layout:
  - Top navigation bar featuring category tabs (`IDENTITY DISCS`, `PROGRAM CHASSIS`, `EXOTIC ARENAS`) and a live reactive Bit counter (`$B XXXX`).
  - Left pane: scrollable catalog grid showing item cards with rarity accents, unlock states, and equipped indicators.
  - Right pane: integrated 3D turntable preview bay hosting `ArmoryPreviewScene`, complemented by an item lore and technical specifications dossier.
- Implement an interactive contextual action bar that dynamically reacts to the selected item's state:
  - Unowned & Purchasable: `[ FABRICATE // {cost} BITS ]`.
  - Unowned & Insufficient Bits: Disabled button with an amber warning message.
  - Unowned & Milestone Locked: Disabled banner displaying the required achievement or campaign milestone.
  - Owned & Unequipped: Active `[ EQUIP TO LOADOUT ]` button.
  - Owned & Equipped: Glowing cyan `[ ACTIVE PROTOCOL ]` badge.
- Implement procedural audio synthesis and neon visual fanfare:
  - `playFabricateSound()`: Dual-stage laser compilation sweep and resonant crystalline lock-in chime via the Web Audio API.
  - `playEquipSound()`: Tactical digital click and harmonic confirmation pulse.
  - CSS keyframe animations for pulsing neon borders (`@keyframes neon-fabricate-pulse`) and animated Bit counter updates.
- Wire modal launch and navigation into `src/ui/menus.js` and `index.html`.
- Build an automated test suite (`test/armory/armory_modal.test.js`) verifying all navigation, selection, transactional, equipment, and disposal lifecycles.

**Non-Goals:**
- Real-money in-app transactions or external payment gateways (all transactions strictly use in-game Bits).
- Multiplayer cosmetic synchronization across the network (handled by multiplayer room sync).
- Custom 3D map geometry previews for arenas in the turntable (exotic arenas render high-resolution grid schematics and ambient holographic viewports).

## Decisions

### 1. Component Architecture & Modal Lifecycle (`src/ui/modals/ArmoryModal.js`)
- **Decision**: Implement `ArmoryModal` as an encapsulated UI class adhering to the project's modal conventions (analogous to `GridSelectorModal` and `AuthTerminal`). The modal mounts into `<div id="armoryModal" class="armory-modal modal-overlay" style="display:none;"></div>` in `index.html`.
- **State Properties**:
  - `activeCategory`: Category key (`discSkins`, `chassisSkins`, `unlockedMaps`), defaulting to `discSkins`.
  - `selectedItemId`: Identifier of the currently staged item.
  - `previewScene`: Instance of `ArmoryPreviewScene`, created upon modal display and cleanly disposed or paused upon close.
- **Rationale**: Isolates UI state, event bindings, and DOM manipulation from game loop logic while providing clear hooks for testing.
- **Alternatives Considered**:
  - *Monolithic functions inside `menus.js`*: Rejected because the Armory modal requires complex state (active category, selected item, live preview scene instance, pointer drag listeners) that would clutter menu routing.

### 2. Split-Pane Layout & Reactive Item Dossier
- **Decision**: Divide the modal viewport into two distinct diegetic panels:
  - `.armory-catalog-pane` (40% width on desktop, full-width on mobile): houses the scrollable grid of `.armory-item-card` elements.
  - `.armory-inspection-pane` (60% width on desktop): embeds the 3D turntable canvas (`.armory-turntable-container`), followed by the item title, description, shader specs (glow intensity, wireframe status, emissive hexes), and the contextual action bar.
- **Rationale**: Mirrors modern sci-fi game armories and provides simultaneous visibility of collection progress and real-time 3D item inspection.

```
+-------------------------------------------------------------------------------+
| [TAB: IDENTITY DISCS]  [TAB: PROGRAM CHASSIS]  [TAB: ARENAS]    [$B 1,450] [X]|
+------------------------------------+------------------------------------------+
|  CATALOG GRID (Scrollable)         |  3D TURNTABLE PREVIEW BAY                |
|  +--------------+ +--------------+ |  +------------------------------------+  |
|  | [Default]    | | [Neon Amber] | |  |                                    |  |
|  | EQUIPPED     | | 400 BITS     | |  |       (Rotating 3D Model)          |  |
|  +--------------+ +--------------+ |  |       Drag to rotate               |  |
|  +--------------+ +--------------+ |  +------------------------------------+  |
|  | [Retro Green]| | [Corrupted]  | |  ITEM DOSSIER: Neon Amber                 |
|  | 600 BITS     | | LOCKED       | |  High-energy amber photon stream disc... |
|  +--------------+ +--------------+ |  +------------------------------------+  |
|                                    |  ACTION: [ FABRICATE // 400 BITS ]      |
+------------------------------------+------------------------------------------+
```

### 3. Contextual Action Bar State Machine
- **Decision**: Evaluate item status using `ArmoryManager` methods (`isUnlocked`, `canPurchase`, `getEquippedLoadout`) and `EconomyManager.getBalance()` on every selection and after every transaction:
  1. `OWNED_EQUIPPED`: `itemId === equippedLoadout[slot]` → renders glowing cyan non-clickable badge `[ ACTIVE PROTOCOL ]`.
  2. `OWNED_UNEQUIPPED`: `isUnlocked === true` → renders cyan button `[ EQUIP TO LOADOUT ]`.
  3. `UNOWNED_PURCHASABLE`: `unlockType === 'bits' && canPurchase === true` → renders gold/cyan button `[ FABRICATE // {cost} BITS ]`.
  4. `UNOWNED_INSUFFICIENT_BITS`: `unlockType === 'bits' && canPurchase === false` → renders disabled amber-bordered button `[ FABRICATE // {cost} BITS ]` and warning text `INSUFFICIENT BITS // HARVEST MORE ON THE GRID`.
  5. `UNOWNED_MILESTONE_LOCKED`: `unlockType === 'achievement'` → renders disabled red/dim banner `[ LOCKED // REQUIRES: {milestoneTitle} ]`.
- **Rationale**: Prevents illegal transactions, clearly informs the player why an item cannot be acquired, and eliminates redundant modal dialogs.

### 4. Zero-Asset Procedural Audio-Visual Fabrication Feedback
- **Decision**:
  - Extend `src/audio/sfx.js` with `playFabricateSound()` and `playEquipSound()`:
    - `playFabricateSound()`: Synthesizes a frequency-modulated rising laser compile sweep (220 Hz to 1760 Hz with exponential ramp) terminating in an ascending triad chime (F#5, A#5, C#6) symbolizing material crystallization.
    - `playEquipSound()`: Synthesizes a high-frequency square click (1200 Hz transient) paired with a pure sine confirmation chime (1046.5 Hz C6).
  - Add CSS animation `@keyframes neon-fabricate-pulse`: Expanding cyan-gold box-shadow and border-color pulse that triggers on `.fabricate-pulse` DOM elements.
- **Rationale**: Reinforces the diegetic fiction of compiling digital weapons and armor on the Grid without requiring heavyweight external audio or video assets.

### 5. WebGL Preview Scene Lifecycle and Throttling
- **Decision**: In `ArmoryModal`, maintain a reference to `ArmoryPreviewScene`. When the modal opens, mount the preview scene into the right-pane container. When selecting a disc, call `previewScene.previewDisc(item.id)`. When selecting a chassis, call `previewScene.previewChassis(item.id, activeDiscSkin)`. When the modal is closed, call `previewScene.dispose()` to halt the animation loop, remove canvas event listeners, and free GPU VRAM.
- **Rationale**: Prevents memory leaks and background GPU consumption while playing arena matches.

## Risks / Trade-offs

- **[Risk] High-resolution WebGL canvas causes performance dips on low-end mobile devices.**
  → *Mitigation*: Cap preview canvas pixel ratio to `Math.min(window.devicePixelRatio || 1, 1.5)` and set fixed viewport dimensions (340x340 px on desktop, 260x260 px on mobile).
- **[Risk] Rapidly clicking [FABRICATE] could cause double-spend race conditions.**
  → *Mitigation*: Disable action button immediately on click and verify transaction response synchronously before re-rendering button state.
- **[Risk] Running tests in headless Node.js without browser DOM or WebGL context.**
  → *Mitigation*: Inject mock DOM elements and mock `ArmoryPreviewScene` into `ArmoryModal` constructor options for comprehensive unit testing without real GPU dependencies.
