# Tasks

## 1. CSS & Markup Synchronization

- [x] 1.1 Add `.armory-btn` and `.achievements-btn` CSS class rules with glowing borders, inset/outset drop-shadows, and interactive hover elevation states to `index.html`, and verify stylesheet syntax in `index.html`.
- [x] 1.2 Insert `#armoryBtn` and `#achievementsBtn` into the static `#mainMenuButtons` container in `index.html` and refactor `getMainMenuHtml()` in `src/ui/menus.js` to use the new CSS classes without inline styles.

## 2. Test Verification & Regression Validation

- [x] 2.1 Add automated test assertions to `test/ui/armory_modal.test.js` and `test/ui/achievements_modal.test.js` verifying that `index.html` contains `#armoryBtn` and `#achievementsBtn` with their respective CSS class declarations, and verify with `node test/runner.js armory` and `node test/runner.js achievements`.
- [x] 2.2 Execute all domain test suites (`campaign`, `economy`, `storage`, `armory`, `achievements`) via `node test/runner.js` to ensure zero regressions across all UI components and game modes.
