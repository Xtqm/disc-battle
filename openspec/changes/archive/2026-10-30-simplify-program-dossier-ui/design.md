# Design: Sleeker & Simplified Program Dossier UI

## Context

The current `#dossierView` renders 12 separate bordered boxes in a single modal view:
1. Three chunky tab buttons (`.hub-nav-tab`) that wrap text awkwardly (`[ LOADOUT \n SOON ]`) and crowd the close `[ X ]` button.
2. A status banner (`#terminalStatusBanner`) that duplicates information shown directly below it (`CALEBELIVS`, `LVL 1`).
3. A large callsign card (`.callsign-card`).
4. A 6-box telemetry grid (`.dossier-telemetry-grid`) where each metric has its own heavy border and background.
5. A heavy sign-out button.
6. A persistent console readout box.

This design document outlines the layout refactor to create a clean, elegant, unified Tron dashboard.

## Goals / Non-Goals

**Goals:**
- Eliminate redundant status readouts by integrating callsign, active connection dot, and clearance into a single Hero Identity section.
- Replace the 6 separate telemetry boxes with 1 unified, streamlined telemetry strip (`.dossier-stats-strip`) featuring 4 key progression columns (Level, Bits, Best Wave, Score) with hairline dividers.
- Replace chunky boxed tab buttons with a sleek, minimalist horizontal sub-nav (`border-bottom` indicator) that leaves ample clearance for the `[ X ]` close button.
- Style `[ SWITCH IDENTITY / SIGN OUT ]` as a sleek ghost action.
- Retain all existing DOM IDs (`#dossierCallsignDisplay`, `#dossierLevel`, `#dossierBits`, `#dossierHighestWave`, `#dossierTotalScore`, `#btnEditCallsign`, `#btnSwitchIdentity`, etc.) to guarantee 100% test and logic compatibility.

**Non-Goals:**
- Changing underlying auth logic, save state, or event subscriptions in `authTerminal.js`.
- Implementing Loadout (Armory) or Directives (Achievements) content tabs (Phase 2 scope).

## Decisions

### 1. Hero Identity Header (Eliminating Duplicate Banners)
- **Decision**: In `setTerminalView('dossier')`, hide the redundant `#terminalStatusBanner`. In `#dossierView`, present a clean hero identity block:
  - Top line: Callsign in large glowing monospace with a compact `[ EDIT ]` link.
  - Subtitle line: Green circuit dot `●` + `AUTHENTICATED PROGRAM // <PROVIDER>`.
- **Rationale**: Cuts out an entire unnecessary box and eliminates duplicate text (`CALEBELIVS` and `LVL 1` were shown twice).

### 2. Unified Telemetry Strip (`.dossier-stats-strip`)
- **Decision**: Replace the 6-cell `.dossier-telemetry-grid` with a single horizontal strip containing 4 balanced columns:
  - Column 1: `LEVEL` (`#dossierLevel`)
  - Column 2: `BITS` (`#dossierBits`)
  - Column 3: `BEST WAVE` (`#dossierHighestWave`)
  - Column 4: `TOTAL SCORE` (`#dossierTotalScore`)
  Separated by clean, subtle vertical lines (`1px solid rgba(79, 242, 255, 0.15)`).
- **Rationale**: Transforms a spreadsheet-like grid of boxes into a unified sci-fi HUD telemetry readout. MatchesPlayed and Clearance are integrated into secondary metadata.

### 3. Sleek Tab Bar
- **Decision**: Refactor `.terminal-hub-nav`:
  - Transparent backgrounds with no individual button borders.
  - Active tab indicated by a cyan glow bottom border (`border-bottom: 2px solid var(--cyan)`).
  - Inline badges: `LOADOUT` *(soon)*, `DIRECTIVES` *(soon)* in a single compact line.
  - Dedicated right margin ensuring the `[ X ]` dismiss button has dedicated breathing space.
- **Rationale**: Removes visual heaviness and prevents awkward multiline wrapping.

### 4. Minimalist Action Controls
- **Decision**: Convert `#btnSwitchIdentity` to a clean ghost action button (`border: 1px solid rgba(79, 242, 255, 0.25); background: transparent`) with subtle hover transitions.
- **Rationale**: Keeps the focus on the player's stats rather than heavy administrative buttons.

## Risks / Trade-offs

- **[Risk] Test compatibility with element selectors**: Tests in `test/auth/auth_header.test.js` and `test/auth/auth_terminal_integration.test.js` check specific IDs.
  → *Mitigation*: Retain all existing IDs (`#dossierCallsignDisplay`, `#dossierLevel`, `#dossierBits`, `#dossierHighestWave`, `#dossierTotalScore`, `#dossierMatches`, `#dossierAuthType`, `#btnEditCallsign`, `#btnSaveDossierCallsign`, etc.) in the markup.
