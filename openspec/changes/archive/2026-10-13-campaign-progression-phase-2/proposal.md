# Proposal: Phase 2: Grid Selection UI, Tactical HUD & Post-Trial Debrief (SPEC-CAMP-001)

## Why

Following the completion of the Phase 1 campaign foundation (data registry, pure star evaluation engine, trial lifecycle manager, and persistent storage synchronization), Tron Disc Arena currently lacks visual campaign navigation, in-combat objective feedback, and post-trial debrief experiences for players. Without these interfaces, players cannot select sectors or trial nodes, monitor three-star criteria during battle, receive real-time positive feedback for precision trickshots, or review itemized reward payouts and progress after clearing a trial. Phase 2 introduces the complete presentation and interaction layer for the campaign: the Grid Selector and Level Node Matrix, the Tactical Mission Brief and in-combat HUD, and the animated Post-Trial Victory & Debrief modal with seamless PointerLock and Three.js scene lifecycle management.

## What Changes

- **Main Menu Campaign Navigation (`src/ui/campaign/GridSelectorModal.js`)**:
  - Provide a high-fidelity Sector Carousel/Grid modal presenting Grids 01 through 04 (Outlands Boot-Sector, Solar Sail Junction, Sea of Simulation, and The Core Pinnacle).
  - Implement distinct visual color themes per sector (Cyan `#4ff2ff`, Solar Amber `#ffaa00`, Seafoam Teal `#00ffcc`, and Pinnacle Core Red/Magenta `#ff0055`).
  - Render live Star progress counters per sector (e.g., `14 / 18 STARS`) alongside a global campaign star banner (`52 / 84 STARS`).
  - Implement dynamic lock overlays for Star-gated sectors displaying lock icons, required star thresholds, and missing star requirements.
  - Provide seamless transition controls between the Main Menu and the Grid Selector.

- **Level Node Matrix View (`src/ui/campaign/LevelSelectView.js`)**:
  - Render an interactive node matrix for each selected Grid, displaying trial nodes (01 through 06-08) arranged sequentially towards the final Rival Arbiter boss node.
  - Display earned star indicators (1 to 3 glowing star icons) and personal best telemetry metrics (best completion time, best integrity %) per node.
  - Visualize node status: Locked (dimmed with padlock), Unlocked (interactive glowing border), and Cleared (energized theme accent).
  - Display trial difficulty tier badges (`RECON`, `INTRUDER`, `GUARDIAN`, `ELITE`, `ARBITER`) and level titles.
  - Provide breadcrumb navigation to return to the Grid Selector modal.

- **Tactical Mission Brief & Live Combat HUD (`src/ui/campaign/CampaignHUD.js`)**:
  - Implement a pre-launch Mission Brief overlay displaying trial parameters before combat commences: trial name, enemy sub-routine count and wave composition, and explicit 3-Star criteria (Star 1: De-Rez, Star 2: Integrity $\ge 75\%$, Star 3: Target Time or Precision Curve/Ricochet hits).
  - Provide a "LAUNCH TRIAL" CTA that initiates pointer lock, triggers the 3-2-1 countdown, and begins trial telemetry tracking.
  - Implement a top-screen in-combat Mission Objective Header displaying:
    - Remaining hostile sub-routine counter (`HOSTILES: X REMAINING`).
    - Live Program Integrity percentage with real-time threshold indicator (glowing cyan above 75%, flashing amber warning when falling below Star 2 threshold).
    - Active mastery tracker displaying either the target completion time countdown or live confirmed Curve/Ricochet hits vs. requirement.
  - Create a kinetic floating `+Bits` particle system rendering kinetic floating accrual text (`+25 BITS`, `+50 BITS`) upon confirmed curve throws, ricochet hits, or parry eliminations.

- **Post-Trial Victory & Debrief Modal (`src/ui/campaign/TrialDebriefModal.js`)**:
  - Create a post-trial debrief modal presenting trial outcome (Victory / Defeat), elapsed time, final integrity %, and precision trickshot counts.
  - Implement sequential animated Star ignition (Star 1 -> Star 2 -> Star 3) with a 400ms staggered spring animation and synchronized Web Audio synth chimes (`SFX.starIgnite(index)`).
  - Present an itemized Bit and XP payout breakdown separating Base Clear reward, Integrity Bonus (Star 2), and Mastery Bonus (Star 3), highlighting first-time clear bonuses versus repeat clears.
  - Provide direct action controls: `NEXT TRIAL` (advances directly to next unlocked node), `RETRY TRIAL` (re-runs current level), and `RETURN TO GRID` (returns to level node matrix).
  - Ensure robust PointerLock and Three.js scene lifecycle management: correctly releasing cursor, resetting arena geometry/tiles, clearing active discs and bots, and synchronizing player state without dangling event listeners or duplicate animation frames.

- **Audio & SFX Enhancements (`src/audio/sfx.js`)**:
  - Add procedural Web Audio synthesis for star ignition (`SFX.starIgnite(tier)`), bit accrual chimes (`SFX.bitAccrual()`), and mission launch sweeps.

- **Integration & Main Menu Wiring (`src/ui/menus.js`, `src/ui/UIManager.js`)**:
  - Integrate "CAMPAIGN SECTORS" button into the main menu layout and wire event bindings.
  - Coordinate modal visibility and state transitions across `CampaignHUD`, `GridSelectorModal`, and `TrialDebriefModal`.

- **Comprehensive Automated Test Suite (`tron/test_campaign_phase2.js`)**:
  - Validate DOM generation and visual state formatting for GridSelectorModal, LevelSelectView, CampaignHUD, and TrialDebriefModal.
  - Verify sequential star ignition timing and event emission.
  - Verify itemized payout calculations matching `CampaignManager` outcomes.
  - Test pointer lock transitions and Three.js scene reset orchestration across `NEXT TRIAL`, `RETRY`, and `RETURN TO GRID`.

## Capabilities

### New Capabilities
*(None — Phase 2 builds directly upon the existing `campaign-progression` capability specification established in Phase 1).*

### Modified Capabilities
- `campaign-progression`: Adds requirements for Sector Grid Navigation UI, Level Node Matrix selection, Tactical Pre-Launch Mission Brief, In-Combat Objective HUD Header with kinetic floating `+Bits` feedback, and Post-Trial Victory & Debrief Modal with sequential star ignition, itemized payouts, and scene reset orchestration.

## Impact

- **New Files**:
  - `src/ui/campaign/GridSelectorModal.js`: Sector carousel, star progress counters, lock overlays.
  - `src/ui/campaign/LevelSelectView.js`: Level node matrix, star indicators, personal best scores.
  - `src/ui/campaign/CampaignHUD.js`: Pre-launch brief, mission objective header, kinetic floating bits.
  - `src/ui/campaign/TrialDebriefModal.js`: Victory/defeat debrief, animated star ignition, itemized payouts, navigation.
  - `tron/test_campaign_phase2.js`: Automated test suite for Phase 2 UI and lifecycle components.
- **Modified Files**:
  - `src/ui/menus.js`: Add "CAMPAIGN SECTORS" menu button and navigation bindings.
  - `src/ui/UIManager.js`: Export campaign UI views and modal management functions.
  - `src/audio/sfx.js`: Add star ignition, bit accrual, and mission launch procedural audio chimes.
  - `package.json`: Add `test:campaign:phase2` script.
- **APIs & Dependencies**:
  - Consumes `CampaignRegistry` (`getAllGrids`, `getGrid`, `getLevel`, `getNextLevel`, `isGridUnlocked`, `isLevelUnlocked`).
  - Consumes `CampaignManager` (`startTrial`, `completeTrial`, `failTrial`, `recordMetric`, `getTotalStars`, `getLevelRecord`).
  - Consumes `EconomyManager` for live balance readouts.
  - Zero external npm runtime dependencies; fully vanilla ES modules and standard DOM/CSS with Web Audio API.
