# Tasks

## 1. HTML & CSS Structure (Main Menu Declutter & Hub View Containers)

- [x] 1.1 In `index.html`, declutter the main menu button stack by hiding `#armoryBtn` and `#achievementsBtn` with compatibility attributes, and add `#hubLoadoutView` and `#hubDirectivesView` sub-view containers inside `#authModal`. Verify markup renders cleanly.
- [x] 1.2 In `index.html`, update CSS for `#terminalHubNav` (remove disabled styling and `[SOON]` pills from `#tabHubLoadout` and `#tabHubDirectives`) and add responsive sizing rules (`.hub-view-loadout`, `.hub-view-directives`) to `.auth-terminal-card`. Verify visual appearance and layout scaling.

## 2. Hub Tab Controller & Component Integration

- [x] 2.1 In `src/ui/authTerminal.js`, implement hub tab navigation controller (`setTerminalHubTab`), binding `#tabHubIdent`, `#tabHubLoadout`, and `#tabHubDirectives` to switch between Dossier, Armory, and Trophy Matrix views, ensuring safe WebGL preview scene lifecycle disposal when leaving Loadout or closing the terminal. Verify with unit test execution.
- [x] 2.2 In `src/ui/menus.js` and modal controllers (`ArmoryModal.js`, `AchievementsModal.js`), ensure menu bindings and dismiss triggers route through the unified Hub state seamlessly while preserving standalone modal compatibility. Verify with unit test execution.

## 3. Full Verification & Integration Test Suites

- [x] 3.1 Run and verify all unit and headless browser integration test suites (`test/armory/armory_modal.test.js`, `test/ui/achievements_modal.test.js`, `test/auth/auth_header.test.js`, and `test/auth/auth_terminal_integration.test.js`) with zero regressions.
