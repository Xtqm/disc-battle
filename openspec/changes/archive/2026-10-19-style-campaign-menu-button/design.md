# Design

## Context

The main menu in Tron Disc Arena provides navigation to primary game modes via `#mainMenuButtons`. While `.swarm-btn` (cyan), `.duel-btn` (orange), and `.multi-btn` (purple) have dedicated CSS rules in `index.html` providing neon borders, inset/outer box-shadow glows, and hover transformations, `.campaign-btn` has no CSS definition. Consequently, the `#campaignBtn` element renders in an unstyled state with browser-default dark borders and no neon illumination.

See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Define `.campaign-btn` in `index.html` with cyber-neon border, dual inset/outset glowing box-shadows, and smooth interactive hover transitions.
- Establish an authoritative visual theme for Campaign mode using the signature Star Gold palette (`var(--star-gold, #ffd700)`).
- Ensure consistent appearance on initial page load (`index.html`) and upon menu re-renders (`src/ui/menus.js`).
- Preserve cohesive styling across modal action buttons sharing `.campaign-btn` (`#btnLaunchTrial` and `#btnDebriefNext`).

**Non-Goals:**
- Refactoring the event listeners or navigation architecture of `gridSelectorModal`.
- Altering the HTML structure or button ordering of the main menu.
- Modifying unrelated modal styling or in-game gameplay HUD elements.

## Decisions

### 1. Centralized CSS Definition in `index.html`
- **Decision**: Define `.campaign-btn` and `.campaign-btn:hover` within the main stylesheet in `index.html` immediately adjacent to `.swarm-btn` and `.multi-btn`.
- **Rationale**: Keeps all `.mode-btn` variants in a single stylesheet block where CSS variables (`--star-gold`) and pseudo-classes (`:hover`) function without JavaScript injection overhead.
- **Alternatives Considered**:
  - *Inline styling in `menus.js`*: Similar to `armoryBtn`, inline styles could be applied directly to HTML strings. However, inline styles cannot easily declare `:hover` pseudo-classes and would fail to style the static initial markup in `index.html`.

### 2. Gold/Amber Visual Theme Palette
- **Decision**: Use `var(--star-gold, #ffd700)` with `#ffe875` text color, `rgba(255, 215, 0, 0.35)` ambient glow, and `rgba(255, 215, 0, 0.18)` inset glow, transitioning on hover to `rgba(255, 215, 0, 0.24)` fill and `rgba(255, 215, 0, 0.75)` intense bloom.
- **Rationale**: Distinguishes Campaign from Swarm (Cyan), Duel (Orange), and Multiplayer (Purple), and directly mirrors the campaign star currency and progression theme (`--star-gold`).
- **Alternatives Considered**:
  - *Neon Green (`#00ff66`)*: Distinct from other buttons, but disconnected from the game's existing sector star theme.
  - *Outlands Cyan*: Redundant with `.swarm-btn`.

## Risks / Trade-offs

- **[Risk]** Modal buttons sharing `.campaign-btn` (`#btnLaunchTrial` and `#btnDebriefNext`) could experience unintended styling overrides.
  - **Mitigation**: Inspect existing modal layouts; both controls already declare inline dimensions (`min-width`, `font-size`) while relying on `.mode-btn.campaign-btn` for their theme. The gold glow cleanly enhances both modal CTAs.
