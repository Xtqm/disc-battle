# Tasks

## 1. Procedural Audio Synthesis & Visual Fanfare Foundation

- [x] 1.1 Implement `playFabricateSound()` and `playEquipSound()` procedural synthesis routines in `src/audio/sfx.js` and export them via `SFX`, verifying Web Audio oscillator ramps and graceful fallback in test/mock environments.
- [x] 1.2 Define diegetic neon styling and `@keyframes neon-fabricate-pulse` in `index.html` for the split-pane layout, item cards, rarity glows, and preview bay border ripples, verifying classes apply expected box-shadow and animation attributes.

## 2. Main Menu Armory Entrypoint & DOM Scaffold

- [x] 2.1 Add `<div id="armoryModal" class="armory-modal modal-overlay" style="display:none;"></div>` container to `index.html` and wire the `ARMORY` launch button in `src/ui/menus.js`, verifying modal toggle events and main menu navigation transitions.
- [x] 2.2 Wire escape key handling and pointer lock release in `src/ui/menus.js` / `src/input/InputManager.js` when `armoryModal` is active, verifying keyboard and mouse navigation without game camera drift.

## 3. Armory Modal Core & Split-Pane Layout (`ArmoryModal.js`)

- [x] 3.1 Implement `src/ui/modals/ArmoryModal.js` component structure with category tab switching (`IDENTITY DISCS`, `PROGRAM CHASSIS`, `EXOTIC ARENAS`), top navigation bar, and live Bit counter (`$B XXXX`), verifying tab state transitions and reactive balance updates.
- [x] 3.2 Implement the left catalog pane item grid rendering in `ArmoryModal.js` with responsive card layouts, rarity highlights, unlock state badges, and equipped indicators, verifying catalog item population across all categories.
- [x] 3.3 Implement the right inspection pane dossier in `ArmoryModal.js` displaying item name, category tag, lore description, and technical shader parameters, verifying dossier updates upon card selection.

## 4. 3D Turntable Preview Bay Integration & Lifecycle

- [x] 4.1 Mount and integrate `ArmoryPreviewScene` into the right inspection pane of `ArmoryModal.js`, automatically staging selected discs and chassis models with auto-spin and manual drag rotation, verifying 3D preview staging.
- [x] 4.2 Implement safe teardown and disposal hooks in `ArmoryModal.hide()` and `ArmoryModal.dispose()` ensuring `ArmoryPreviewScene.dispose()` is executed to prevent WebGL context leaks, verifying lifecycle disposal.

## 5. Contextual Action Bar State Machine & Fabrication Transactions

- [x] 5.1 Implement contextual action button state evaluator in `ArmoryModal.js` rendering `[ ACTIVE PROTOCOL ]`, `[ EQUIP TO LOADOUT ]`, `[ FABRICATE // {cost} BITS ]`, disabled insufficient Bits warning, or `[ LOCKED // REQUIRES: {milestone} ]`, verifying all 5 action states.
- [x] 5.2 Implement atomic fabrication purchase handler connecting action clicks to `ArmoryManager.purchaseItem()`, triggering `playFabricateSound()`, triggering `@keyframes neon-fabricate-pulse`, and updating button state to `EQUIP TO LOADOUT`, verifying transaction flow and UI reactivity.
- [x] 5.3 Implement equipment action handler connecting action clicks to `ArmoryManager.equipItem()`, triggering `playEquipSound()`, and updating action bar to `[ ACTIVE PROTOCOL ]`, verifying loadout state persistence.

## 6. Automated Test Suite & Full System Verification

- [x] 6.1 Create comprehensive test suite `test/armory/armory_modal.test.js` covering category navigation, item card rendering, contextual action button state evaluations, fabrication transactions, equipment transitions, and preview disposal, verifying `node test/armory/armory_modal.test.js` passes with 100% success.
- [x] 6.2 Integrate `armory_modal.test.js` into `test/runner.js` under the armory test group and verify `node test/runner.js armory` executes and passes all test suites.
