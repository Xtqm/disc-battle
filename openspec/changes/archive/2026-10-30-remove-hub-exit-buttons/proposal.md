# Proposal: Remove Redundant Exit Buttons from Hub Loadout and Directives Views

## Why

Now that Armory (Loadout) and Achievements (Directives) are embedded directly within the Program Hub modal (`#authModal`), their legacy internal dismiss buttons (`[ESC // RETURN]` in Armory and `[ ESC // CLOSE ]` in Achievements) appear directly beneath the Hub's primary top-right `[ X ]` exit button. This creates confusing dual exit paths, visual clutter, and unnecessary layout tension in the sub-view header bars.

## What Changes

- **Omit Armory Inner Return Button in Hub**: When Armory is mounted inside the Terminal Hub (`#hubLoadoutView`), omit or hide `#armoryCloseBtn` (`[ESC // RETURN]`) so the top-right header area cleanly displays only the live Bit counter (`◆ $B {bits}`).
- **Omit Achievements Inner Close Button in Hub**: When Achievements is mounted inside the Terminal Hub (`#hubDirectivesView`), omit or hide `#achievementsCloseBtn` (`[ ESC // CLOSE ]`) so the Trophy Matrix header title and synchronization progress bar have a clean, uncluttered layout.
- **Unified Exit Authority**: Reaffirm the modal's top-right `[ X ]` dismiss button (`#btnCloseTerminal`) as the single authoritative exit control across all three Hub tabs (`[ IDENT MATRIX ]`, `[ LOADOUT ]`, and `[ DIRECTIVES ]`), while preserving safe Escape key isolation and PointerLock release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `armory-catalog`: Update `Diegetic Main Menu Armory Navigation and Live Balance Counter` to specify that internal dismiss buttons (`[ESC // RETURN]`) are omitted when hosted within the Program Hub, leaving dismissal to the Hub modal's exit control.
- `achievement-engine`: Update `Diegetic Main Menu Trophy Matrix UI Modal` to specify that internal dismiss buttons (`[ ESC // CLOSE ]`) are omitted when hosted within the Program Hub, leaving dismissal to the Hub modal's exit control.

## Impact

- **UI & Components**:
  - `src/ui/modals/ArmoryModal.js`: Condition rendering of `#armoryCloseBtn` based on `this._inHub` and add CSS rules in `index.html` hiding `.auth-terminal-card #armoryCloseBtn`.
  - `src/ui/modals/AchievementsModal.js`: Condition rendering of `#achievementsCloseBtn` based on `this._inHub` and add CSS rules in `index.html` hiding `.auth-terminal-card #achievementsCloseBtn`.
  - `index.html`: Add CSS rules ensuring nested exit buttons never appear in `.auth-terminal-card`.
- **Tests**: Verify `test/armory/armory_modal.test.js`, `test/ui/achievements_modal.test.js`, `test/auth/auth_header.test.js`, and `test/auth/auth_terminal_integration.test.js` continue passing.
