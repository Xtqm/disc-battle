# Proposal: Phase 3: Diegetic Armory UI, 3D Preview Bay & Purchase Fanfare (SPEC-ARMORY-001)

## Why

With Phase 1 (authoritative catalog, atomic economy purchasing, persistent loadout management) and Phase 2 (runtime Three.js cosmetic material engine and isolated 3D turntable preview scene) complete, player cosmetics and arena variants currently lack an in-game graphical user interface for browsing, inspecting, purchasing, and equipping. Players currently have no visual mechanism in the main menu to spend accumulated Bits, inspect 3D models before buying, or equip custom Identity Discs, Program Chassis, and Exotic Arenas. Phase 3 introduces the diegetic `ArmoryModal` interface, seamless integration of the 3D `ArmoryPreviewScene` turntable bay, a reactive contextual action bar, and celebratory audio-visual fabrication feedback to complete the core user experience for SPEC-ARMORY-001.

## What Changes

- **Main Menu Armory Entrypoint (`src/ui/menus.js` & `index.html`)**:
  - Add `ARMORY` navigation button to the main menu overlay with Tron neon styling.
  - Add `<div id="armoryModal" class="armory-modal modal-overlay" style="display:none;"></div>` container to `index.html`.
  - Wire seamless transitions between the main menu, campaign selector, and the Armory modal.
- **Diegetic Armory Interface (`src/ui/modals/ArmoryModal.js`)**:
  - Top Navigation Bar:
    - Interactive category tabs: `IDENTITY DISCS` (`discSkins`), `PROGRAM CHASSIS` (`chassisSkins`), and `EXOTIC ARENAS` (`unlockedMaps`).
    - Live Bit balance readout (`$B XXXX`) reacting dynamically to economy transactions.
    - Close / Return to Grid exit button (`[ESC // RETURN]`).
  - Split-Pane Layout:
    - **Left Pane (Catalog Grid)**: Scrollable responsive grid of cosmetic item cards displaying title, rarity accent, unlock state, equipped status, and cost.
    - **Right Pane (3D Turntable Preview Bay & Lore Dossier)**: Embedded `ArmoryPreviewScene` viewport rendering interactive 3D models with manual drag rotation, item lore/description, shader parameters, and stat modifiers.
- **Contextual State-Driven Action Bar**:
  - Dynamically evaluate item state and render corresponding action controls:
    - **Unowned (Bit Purchasable)**: `[ FABRICATE // {cost} BITS ]` button; if player balance < cost, disabled with amber warning (`INSUFFICIENT BITS // HARVEST MORE ON THE GRID`).
    - **Unowned (Milestone Locked)**: `[ LOCKED // REQUIRES: {milestone} ]` disabled banner displaying achievement requirement (e.g. `OUTLANDS CONQUEROR`, `GRID 01 MASTERY`).
    - **Owned & Unequipped**: `[ EQUIP TO LOADOUT ]` primary action button.
    - **Owned & Equipped**: `[ ACTIVE PROTOCOL ]` glowing cyan status badge.
- **Audio-Visual Fabrication Fanfare & Feedback (`src/audio/sfx.js` & CSS)**:
  - Procedural Web Audio API sound synthesis:
    - `playFabricateSound()`: Dual-stage laser compilation sweep ramping from low frequency hum to resonant high-energy lock-in chime.
    - `playEquipSound()`: Crisp tactical digital click with harmonic confirmation pulse.
  - Visual fanfare animations:
    - Neon border energy pulse (`@keyframes neon-fabricate-pulse`) rippling across the preview bay and card upon fabrication or equipment.
    - Live Bit balance deduction flash and smooth counter decrement.
- **Automated Test Suite (`test/armory/armory_modal.test.js`)**:
  - Unit and integration tests covering category navigation, item card rendering, contextual action button state transitions, purchase transactions, equipment updates, and clean WebGL preview disposal.

## Capabilities

### New Capabilities
*(None — Phase 3 delivers the final user-facing interface for the existing `armory-catalog` capability).*

### Modified Capabilities
- `armory-catalog`: Extends the capability with requirements for the diegetic Armory UI modal, top navigation with live Bit counter, split-pane catalog grid and 3D preview turntable bay, reactive contextual action bar, and procedural audio-visual fabrication feedback and purchase fanfare.

## Impact

- **New Files**:
  - `src/ui/modals/ArmoryModal.js`: Main Armory UI controller and split-pane view manager.
  - `test/armory/armory_modal.test.js`: Comprehensive test suite for modal rendering, interactions, transactions, and preview lifecycle.
- **Modified Files**:
  - `src/ui/menus.js`: Bind main menu `ARMORY` launch button and modal navigation handlers.
  - `src/audio/sfx.js`: Add procedural synthesis functions `playFabricateSound` and `playEquipSound`.
  - `index.html`: Mount `#armoryModal` container and define Armory split-pane CSS styling and neon fabrication pulse animations.
  - `test/runner.js`: Include `armory_modal.test.js` in test runs.
- **Dependencies**: Integrates directly with existing `ArmoryManager`, `ArmoryCatalog`, `ArmoryPreviewScene`, `EconomyManager`, and `StorageManager`. Zero additional external libraries.
