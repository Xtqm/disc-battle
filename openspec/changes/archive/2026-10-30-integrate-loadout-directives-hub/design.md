# Design: Integrate Loadout & Directives into Program Hub & Clean Up Main Menu

## Context

In Phase 1, we introduced the Program Dossier modal (`#authModal`) with a sleek top hub navigation bar (`#terminalHubNav`):
- `[ IDENT MATRIX ]` (`#tabHubIdent`): Active view displaying player identity, progression stats, and account settings.
- `[ LOADOUT ]` (`#tabHubLoadout`): Disabled placeholder (`coming-soon-pill`).
- `[ DIRECTIVES ]` (`#tabHubDirectives`): Disabled placeholder (`coming-soon-pill`).

Meanwhile, the Main Menu has `ARMORY` and `ACHIEVEMENTS` buttons crammed between `CAMPAIGN SECTORS` and multiplayer modes.

In Phase 2, we consolidate all player profile, inventory, and achievement progression into the unified Program Hub, and declutter the Main Menu into a focused gameplay launcher.

## Goals / Non-Goals

**Goals:**
- Enable `[ LOADOUT ]` and `[ DIRECTIVES ]` as fully functional interactive tabs in `#terminalHubNav`.
- Provide seamless switching between `IDENT MATRIX`, `LOADOUT`, and `DIRECTIVES` within the Terminal Hub modal without unmounting or jarring layout jumps.
- Dynamically scale the terminal container width (`520px` for Ident Matrix, `1040px` for Loadout split-pane, `960px` for Directives trophy grid).
- Ensure safe lifecycle management for the 3D WebGL preview scene in the Armory (mounting when entering Loadout, disposing when leaving Loadout or closing the modal).
- Declutter the Main Menu by removing visible `ARMORY` and `ACHIEVEMENTS` buttons from the primary button list.
- Retain `#armoryBtn` and `#achievementsBtn` as hidden DOM elements (`display: none; aria-hidden="true"`) to preserve 100% compatibility with existing test suites.

**Non-Goals:**
- Modifying underlying economy (`EconomyManager`), catalog (`ArmoryCatalog`), or achievement logic (`AchievementManager`).
- Redesigning the internal layout of the Armory 3D preview bay or the Trophy Matrix cards (we integrate existing components into the hub view).

## Decisions

### 1. View Architecture in Terminal Hub
- **Decision**: In `#authModal .auth-terminal-card`, introduce view containers for the three hub tabs:
  - `#dossierView` / `#authView`: Sub-views under the `IDENT MATRIX` tab.
  - `#hubLoadoutView`: Sub-view under the `LOADOUT` tab, hosting the Armory split-pane catalog and 3D preview bay.
  - `#hubDirectivesView`: Sub-view under the `DIRECTIVES` tab, hosting the Trophy Matrix and achievement progression list.
- **Alternatives Considered**:
  - *Closing `#authModal` and opening `#armoryModal` separately*: Creates jarring modal closing/re-opening animations and loses the unified "hub" feeling where tabs represent views of the same user terminal.

### 2. Modal Sizing & Layout Modes
- **Decision**: Add contextual classes to `#authModal .auth-terminal-card`:
  - Default / Ident: `max-width: 520px;`
  - Mode Loadout (`.hub-view-loadout`): `max-width: 1040px; width: 95vw;`
  - Mode Directives (`.hub-view-directives`): `max-width: 960px; width: 95vw;`
- **Rationale**: The 3D Preview Bay and Trophy Matrix require substantial horizontal space for split-pane and multi-column presentation, while the Ident Dossier looks best as a sleek compact card.

### 3. WebGL Resource Management on Tab Switching
- **Decision**: When switching away from `[ LOADOUT ]` (to `[ IDENT MATRIX ]`, `[ DIRECTIVES ]`, or modal close), invoke `ArmoryModal.hide()` or `previewScene.dispose()` to release WebGL contexts and stop animation frames immediately. When switching to `[ LOADOUT ]`, reinitialize the preview turntable.
- **Rationale**: Prevents background GPU/memory consumption while inspecting stats or directives.

### 4. Main Menu Button Decluttering & Compatibility
- **Decision**: In `index.html` `#mainMenuButtons`, visually hide `#armoryBtn` and `#achievementsBtn` with `style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"`.
  In `src/ui/menus.js`, keep existing event bindings on `#armoryBtn` and `#achievementsBtn` so calling them programmatically opens the Terminal Hub directly to the `LOADOUT` or `DIRECTIVES` tab.
- **Rationale**: Immediate visual decluttering of the main menu while guaranteeing that tests checking `assert(indexHtml.includes('id="armoryBtn"'))` pass with zero regressions.

## Risks / Trade-offs

- **[Risk] WebGL context loss during rapid tab switching**: If the user rapidly toggles between `IDENT MATRIX` and `LOADOUT`, creating and disposing Three.js scenes could introduce memory leaks or WebGL errors.
  → *Mitigation*: Ensure `previewScene.dispose()` is called synchronously inside try/catch blocks with null checks, reusing the established `ArmoryModal` lifecycle.
- **[Risk] Test suite expectations for standalone modals**: Unit tests in `test/armory/armory_modal.test.js` instantiate `new ArmoryModal()` and mount to `#armoryModal`.
  → *Mitigation*: Support dual mounting: `ArmoryModal` can render inside `#armoryModal` when invoked standalone, or inside `#hubLoadoutView` when opened in the Terminal Hub.
