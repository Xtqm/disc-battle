# Design

## Context

The main menu currently exhibits a presentation divergence: on initial boot (`index.html`), only four buttons (`CAMPAIGN SECTORS`, `ENTER SWARM`, `HOST MATCH`, `JOIN ONLINE MATCH`) are present in `#mainMenuButtons`. Only after opening and returning from a secondary view does `showModeSelectMenu()` invoke `getMainMenuHtml()`, which adds `armoryBtn` and `achievementsBtn` with inline CSS styles.

See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Synchronize `index.html` `#mainMenuButtons` so `armoryBtn` and `achievementsBtn` are rendered in the static HTML on boot.
- Define `.armory-btn` and `.achievements-btn` CSS rules in `index.html` with cyber-neon borders, dual inset/outset glows, and interactive hover transformations matching the design system.
- Update `src/ui/menus.js` to rely on the centralized CSS classes rather than inline styles.
- Eliminate boot-time UI binding warnings for `#armoryBtn` and `#achievementsBtn`.

**Non-Goals:**
- Modifying modal content or internal logic of `ArmoryModal` or `AchievementsModal`.
- Altering the gameplay modes or multiplayer lobby workflows.

## Decisions

### 1. Dedicated CSS Rules in `index.html`
- **Decision**: Define `.armory-btn` and `.achievements-btn` in `index.html`'s `<style>` block alongside `.campaign-btn`, `.duel-btn`, `.swarm-btn`, and `.multi-btn`.
- **Theme Parameters**:
  - `.armory-btn`: Amber theme (`#ffaa00`), text `#ffcc66`, box-shadow `0 0 14px rgba(255,170,0,.35), inset 0 0 10px rgba(255,170,0,.18)`, hover elevation `translateY(-2px)`.
  - `.achievements-btn`: Electric Cyan theme (`#00f3ff`), text `#a5f7ff`, box-shadow `0 0 14px rgba(0,243,255,.35), inset 0 0 10px rgba(0,243,255,.18)`, hover elevation `translateY(-2px)`.
- **Rationale**: Removes hardcoded inline CSS strings from `menus.js` and provides smooth `:hover` state elevation and bloom effects that inline styles cannot achieve cleanly.

### 2. Markup Synchronization
- **Decision**: Update `index.html` `#mainMenuButtons` to contain all six buttons in matching order:
  1. `#campaignBtn` (Campaign Sectors)
  2. `#armoryBtn` (Armory)
  3. `#achievementsBtn` (Achievements)
  4. `#swarmBtn` (Enter Swarm)
  5. `#hostMatchBtn` (Host Match)
  6. `#joinOnlineBtn` (Join Online Match)
- **Rationale**: Guarantees visual and functional parity between the initial static page load and dynamic re-renders.

## Risks / Trade-offs

- **[Risk]** Flex wrapping or overflow on narrow mobile screens.
  - **Mitigation**: `.mode-select` already implements `flex-wrap: wrap` and `.card` enables smooth vertical scrolling with `touch-action: pan-y` and momentum scrolling.
