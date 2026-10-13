# Design: Phase 2: Grid Selection UI, Tactical HUD & Post-Trial Debrief (SPEC-CAMP-001)

## Context

Phase 1 established the headless campaign architecture: `CampaignRegistry` (4 Grids, 28 levels), `StarEvaluator` (pure 1-3 star evaluator), and `CampaignManager` (trial lifecycle, monotonic star gating, economy payouts, storage persistence). The current game client boots directly to the mode select menu (`swarm`, `duel_ai`, `multiplayer`) with classic wave HUD elements. 

Phase 2 builds the complete user-facing campaign flow. It bridges the authoritative campaign engine with Tron Disc Arena's DOM-based HUD and modal system, Web Audio synthesizer, and Three.js rendering pipeline.

## Goals / Non-Goals

**Goals:**
- Provide an intuitive, responsive Sector Grid Carousel and Level Node Matrix UI adhering to the neon-vector Tron aesthetic.
- Deliver dynamic lock banners for star-gated sectors displaying required and missing star thresholds.
- Implement a pre-launch tactical mission brief displaying wave parameters and Star criteria before combat begins.
- Render a live in-combat objective header displaying hostiles, live integrity % with color warning states, and trickshot/timer progress.
- Provide kinetic floating `+Bits` accrual animations and SFX on confirmed trickshot eliminations.
- Deliver an animated post-trial victory debrief featuring sequential star ignition chimes, itemized payouts, and direct next/retry/return controls.
- Ensure strict PointerLock and Three.js scene lifecycle management across trial transitions.

**Non-Goals:**
- Multiplayer campaign co-op (campaign trials are strictly single-player PvE).
- 3D spatial node maps on the arena floor (campaign navigation is presented via high-performance DOM/CSS overlay views).
- Introducing external UI component libraries (vanilla ES modules, CSS variables, and HTML templates preserve zero-dependency architecture).

## Decisions

### 1. View Architecture & Component Separation
- **Decision**: Structure campaign UI into distinct modular ES classes in `src/ui/campaign/`:
  - `GridSelectorModal.js`: Top-level sector carousel and star status.
  - `LevelSelectView.js`: Grid-specific level node matrix.
  - `CampaignHUD.js`: Pre-launch brief, in-combat objective header, and floating `+Bits` feedback.
  - `TrialDebriefModal.js`: Post-trial outcome, sequential star ignition, itemized payouts, and navigation controls.
- **Rationale**: Keeps individual components focused, testable in Node.js (via mock DOM / jsdom or string assertion), and decoupled from engine internals.
- **Alternatives Considered**: Monolithic `CampaignUI.js` containing all modals and HUDs (rejected due to size and maintenance complexity).

### 2. Sector Visual Theming via CSS Custom Properties
- **Decision**: Define per-grid color palettes using scoped CSS variables:
  - Grid 01 (Outlands): Cyan (`--sector-color: #4ff2ff;`)
  - Grid 02 (Solar Sail): Solar Amber (`--sector-color: #ffaa00;`)
  - Grid 03 (Simulation): Seafoam Teal (`--sector-color: #00ffcc;`)
  - Grid 04 (Core Pinnacle): Core Crimson (`--sector-color: #ff0055;`)
- **Rationale**: Simplifies styling across sector cards, node borders, star glow effects, and brief headers through unified CSS variables without duplicate class definitions.

### 3. Sequential Star Ignition Timing & Procedural Audio Chimes
- **Decision**: Implement sequential star ignition in `TrialDebriefModal` using scheduled `setTimeout` or CSS animation delays at 400ms intervals (Star 1 at 200ms, Star 2 at 600ms, Star 3 at 1000ms), each paired with ascending procedural Web Audio oscillator sweeps in `SFX.starIgnite(index)`.
- **Rationale**: Staggered reveals build anticipation and dramatic impact, mimicking classic arcade and console victory sequences. Procedural audio avoids asset loading delays.
- **Alternatives Considered**: Simultaneous instant star reveal (rejected as visually flat and unsatisfying).

### 4. PointerLock and Scene Reset Lifecycle Management
- **Decision**: Formalize lifecycle states across `startTrial`, `pauseGame`, and trial completion/restart:
  - Entering any modal (Selector, Node Matrix, Brief, Debrief) strictly calls `document.exitPointerLock()`, clears `state.running = false`, and restores the cursor.
  - Initiating combat ("LAUNCH TRIAL", "NEXT TRIAL", "RETRY") resets Three.js entities (`rebuildArenaTiles()`, clears `state.discs`, `state.foes`), calls `tryLock()`, and triggers `startCountdown(3.0)`.
- **Rationale**: Eliminates common Three.js pointer lock trapping bugs where the cursor remains locked behind a modal or ghost disc entities persist between trial attempts.

### 5. Kinetic Floating `+Bits` Accrual Indicators
- **Decision**: Implement floating text indicators dynamically appended to a lightweight container `#floatingIndicators` in the DOM, animated via pure CSS keyframes (`@keyframes floatAndFade`), and self-removed on `animationend`.
- **Rationale**: Using DOM elements with CSS hardware-accelerated transforms (`translate3d`, `opacity`, `scale`) provides smooth 60fps animations without cluttering the Three.js scene graph with billboard text meshes.

## Risks / Trade-offs

- **[Risk] PointerLock API Denial**: Browsers may reject pointer lock requests if not directly triggered by user activation (click/tap) or if rapid modal transitions occur.
  - *Mitigation*: Ensure pointer lock requests are initiated exclusively from explicit click event listeners on "LAUNCH TRIAL", "NEXT TRIAL", and "RETRY TRIAL" buttons.
- **[Risk] Stale Combat Entities on Retry**: Restarting trials rapidly might leave lingering bots or projectiles if timeouts or wave loops are active.
  - *Mitigation*: Ensure `TrialDebriefModal` and `CampaignManager` leverage `__tronResetGame()` / `resetRound()` to completely purge `state.foes`, `state.discs`, and active countdown timers before spawning new trial waves.
- **[Risk] DOM Clutter on High Trickshot Accrual**: Rapid curve bounces could spawn excessive floating text elements.
  - *Mitigation*: Cap simultaneous active floating indicators to 8 maximum, immediately recycling or evicting the oldest element if the pool overflows.

## Migration Plan

1. Create `src/ui/campaign/GridSelectorModal.js`, `src/ui/campaign/LevelSelectView.js`, `src/ui/campaign/CampaignHUD.js`, and `src/ui/campaign/TrialDebriefModal.js`.
2. Enhance `src/audio/sfx.js` with `SFX.starIgnite`, `SFX.bitAccrual`, and mission start sounds.
3. Wire the "CAMPAIGN SECTORS" button into `src/ui/menus.js` and integrate campaign mode in `src/core/main.js`.
4. Implement automated test suite `tron/test_campaign_phase2.js` and add `npm run test:campaign:phase2`.
5. Verify backward compatibility with existing Swarm, Duel, and Multiplayer modes.
