# Tasks

## 1. Component Markup & CSS Updates

- [x] 1.1 In `src/ui/modals/ArmoryModal.js` and `src/ui/modals/AchievementsModal.js`, conditionally omit `#armoryCloseBtn` and `#achievementsCloseBtn` when `this._inHub` is true. Verify standalone tests pass.
- [x] 1.2 In `index.html`, add CSS rules suppressing `#armoryCloseBtn` and `#achievementsCloseBtn` inside `.auth-terminal-card` as a defensive guarantee. Verify markup and layout alignment.

## 2. Integration & Regression Verification

- [x] 2.1 Run and verify all unit test suites (`test/armory/armory_modal.test.js`, `test/ui/achievements_modal.test.js`, `test/auth/auth_header.test.js`) and headless browser integration tests (`test/auth/auth_terminal_integration.test.js`) with zero regressions.
