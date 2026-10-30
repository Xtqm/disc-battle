# Proposal: Integrate Loadout & Directives into Program Hub & Clean Up Main Menu

## Why

The Main Menu currently features a cluttered stack of mode and system buttons, with `ARMORY` and `ACHIEVEMENTS` sitting alongside primary combat modes (`CAMPAIGN SECTORS`, `ENTER SWARM`, `HOST MATCH`, `JOIN ONLINE MATCH`). In Phase 1 of the Program Dossier redesign, we established an in-universe Terminal Hub with tab navigation headers for `[ IDENT MATRIX ]`, `[ LOADOUT ]`, and `[ DIRECTIVES ]`, temporarily placing `[SOON]` placeholders on Loadout and Directives.

Phase 2 brings Armory and Achievements to their permanent home within the Terminal Hub, elevating the top-right Identity Header into a complete unified Player Center and stripping unnecessary clutter from the Main Menu so players can focus directly on game modes.

## What Changes

- **Active Hub Tab Navigation**: Remove the disabled `[SOON]` status on `[ LOADOUT ]` and `[ DIRECTIVES ]` in the Terminal Hub navigation bar, turning all three tabs (`[ IDENT MATRIX ]`, `[ LOADOUT ]`, `[ DIRECTIVES ]`) into fully interactive sub-views.
- **Integrated Loadout (Armory) Sub-view**: When the player activates `[ LOADOUT ]`, the Terminal Hub transitions to the diegetic 3D Armory preview bay and catalog grid, allowing skin inspection, equipment swaps, and Bit fabrications directly within the hub.
- **Integrated Directives (Achievements) Sub-view**: When the player activates `[ DIRECTIVES ]`, the Terminal Hub transitions to the diegetic Trophy Matrix displaying progression progress, unlocked milestones, and reward claims.
- **Main Menu Decluttering**: Clean up the Main Menu button stack by visually removing `ARMORY` and `ACHIEVEMENTS` so the menu focuses strictly on game launch modes (`CAMPAIGN SECTORS`, `ENTER SWARM`, `HOST MATCH`, `JOIN ONLINE MATCH`). Preserve hidden `#armoryBtn` and `#achievementsBtn` DOM compatibility elements so existing automated test suites and programmatic triggers continue functioning with zero regressions.
- **Unified Escape & Exit Handling**: Retain strict modal exit controls (`[ X ]` and `ESC`), ensuring seamless return to the Main Menu and safe PointerLock isolation regardless of which hub tab is currently active.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-identity`: Update `Grid Authorization Terminal Modal` to activate `[ LOADOUT ]` and `[ DIRECTIVES ]` tabs in the Terminal Hub, allowing real-time switching between identity dossier, cosmetic loadout, and progression directives.
- `armory-catalog`: Update `Diegetic Main Menu Armory Navigation and Live Balance Counter` to define the Program Hub `[ LOADOUT ]` tab as the primary entrypoint for the Armory and 3D preview bay, removing visible buttons from the main menu while preserving DOM hooks for compatibility.
- `achievement-engine`: Update `Diegetic Main Menu Trophy Matrix UI Modal` to define the Program Hub `[ DIRECTIVES ]` tab as the primary entrypoint for the Trophy Matrix, removing visible buttons from the main menu while preserving DOM hooks for compatibility.

## Impact

- **UI Structure**: `index.html` (update `#mainMenuButtons` to hide visible `ARMORY` and `ACHIEVEMENTS` buttons; update `#terminalHubNav` buttons to remove disabled classes and `[SOON]` pills; house or mount Armory and Achievements containers under the unified Hub).
- **Controllers & Modals**:
  - `src/ui/authTerminal.js`: Wire hub tab clicks (`tabHubLoadout`, `tabHubDirectives`, `tabHubIdent`) to switch active hub views, mounting and updating Armory and Achievements components.
  - `src/ui/modals/ArmoryModal.js` & `src/ui/modals/AchievementsModal.js`: Align container mounting, top navigation, and dismiss logic so they operate harmoniously within the Terminal Hub.
  - `src/ui/menus.js`: Ensure main menu bindings route to the unified hub tabs.
- **Tests**: Verify `test/armory/armory_modal.test.js`, `test/ui/achievements_modal.test.js`, `test/auth/auth_header.test.js`, and `test/auth/auth_terminal_integration.test.js` continue passing.
