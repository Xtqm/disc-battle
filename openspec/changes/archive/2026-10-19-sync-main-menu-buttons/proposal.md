# Proposal

## Why

The Armory and Achievements buttons are currently absent from the initial static DOM (`index.html`) and only appear after the player navigates into a sub-screen or lobby and returns to the menu via `showModeSelectMenu()`. This causes an initial load discrepancy where primary game features are invisible on boot and triggers missing element console warnings during input/menu event binding.

## What Changes

- Add `<button id="armoryBtn" class="mode-btn armory-btn">ARMORY</button>` and `<button id="achievementsBtn" class="mode-btn achievements-btn">ACHIEVEMENTS</button>` to the static `#mainMenuButtons` container in `index.html`.
- Add dedicated `.armory-btn` (Amber `#ffaa00`) and `.achievements-btn` (Cyan `#00f3ff`) CSS class definitions to `index.html` complete with glowing borders, inset/outset drop-shadows, and hover elevation states, aligning them with `.campaign-btn`, `.swarm-btn`, and `.multi-btn`.
- Align `getMainMenuHtml()` in `src/ui/menus.js` to rely on the centralized `.armory-btn` and `.achievements-btn` CSS classes instead of inline style attributes.
- Add test assertions in the test suite verifying `#armoryBtn` and `#achievementsBtn` are present in `index.html` with proper CSS styling rules.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `armory-catalog`: Require `#armoryBtn` to be present on the main menu upon initial page load and styled with the amber cyber-neon theme.
- `achievement-engine`: Require `#achievementsBtn` to be present on the main menu upon initial page load and styled with the cyan cyber-neon theme.

## Impact

- Affected files: `index.html`, `src/ui/menus.js`, `test/ui/armory_modal.test.js`, `test/ui/achievements_modal.test.js`.
- No breaking changes; fixes initial state omission and eliminates boot-time button binding warnings.
