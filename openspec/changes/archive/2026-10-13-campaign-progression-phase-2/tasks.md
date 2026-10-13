# Tasks

## 1. Procedural Audio & UI Styling Infrastructure

- [x] 1.1 Implement procedural Web Audio synthesizers in `src/audio/sfx.js` for `SFX.starIgnite(tier)`, `SFX.bitAccrual()`, and mission briefing sweeps; verify via isolated Web Audio node inspection.
- [x] 1.2 Define sector visual theme variables, glowing star SVG assets, node connection line styles, and kinetic floating bit keyframe animations in `index.html`; verify visual styles render correctly.

## 2. Sector Carousel & Grid Selection UI

- [x] 2.1 Create `src/ui/campaign/GridSelectorModal.js` rendering Grids 01 through 04 with sector color themes, descriptions, and breadcrumb navigation; verify modal HTML output.
- [x] 2.2 Implement per-grid star counters (`X / Y STARS`), global cumulative star banner, and lock overlays with required/needed stars for star-gated sectors; verify lock states and progress counters against `CampaignRegistry` and `CampaignManager`.
- [x] 2.3 Wire click navigation from Grid selector cards to open `LevelSelectView` for unlocked sectors or display lock feedback for gated sectors; verify click handler transitions.

## 3. Level Node Matrix View

- [x] 3.1 Create `src/ui/campaign/LevelSelectView.js` rendering the sequential trial nodes (01 to 06-08) terminating in the Rival Arbiter boss node for any selected Grid; verify node list rendering.
- [x] 3.2 Display earned star ratings (1 to 3 stars), status (Locked/Unlocked/Cleared), and difficulty tier badges (`RECON`, `INTRUDER`, `GUARDIAN`, `ELITE`, `ARBITER`) on each node; verify badge styling and star icon states.
- [x] 3.3 Display personal best trial records (best time, best integrity %) on completed nodes; verify telemetry formatting from `storageManager`.
- [x] 3.4 Wire node selection to launch `CampaignHUD.showMissionBrief(levelId)` for unlocked nodes or reject locked nodes; verify navigation and return-to-grid controls.

## 4. Tactical Mission Brief & Live Combat HUD

- [x] 4.1 Create `src/ui/campaign/CampaignHUD.js` with the pre-launch Mission Brief overlay displaying trial name, wave composition, and explicit 3-Star criteria; verify brief overlay DOM generation.
- [x] 4.2 Implement the "LAUNCH TRIAL" action button in `CampaignHUD.js` that initiates `campaignManager.startTrial(levelId)`, captures pointer lock, and triggers `startCountdown(3.0)`; verify trial lifecycle ignition.
- [x] 4.3 Implement the top-screen in-combat Mission Objective Header displaying live remaining hostiles count, live Integrity % indicator with 75% warning threshold color changes, and active trickshot/timer progress; verify reactive DOM updates during combat events.
- [x] 4.4 Implement kinetic floating `+Bits` accrual text particles on confirmed curve throws, ricochet hits, and parry eliminations; verify floating indicator creation, CSS animation, and automatic DOM disposal on animation completion.

## 5. Post-Trial Victory & Debrief Modal

- [x] 5.1 Create `src/ui/campaign/TrialDebriefModal.js` presenting the victory/defeat outcome card with final elapsed time, integrity %, and trickshot counts; verify modal layout and dismissal handling.
- [x] 5.2 Implement sequential animated Star ignition (Star 1 -> Star 2 -> Star 3) with 400ms staggered delays and synchronized `SFX.starIgnite(index)` chimes; verify sequential animation timer execution and audio invocation.
- [x] 5.3 Implement itemized Bit & XP payout breakdown (Base Clear + Integrity Bonus + Mastery Bonus) displaying first-time vs repeat rewards and updated campaign total stars; verify mathematical concordance with `CampaignManager.completeTrial()`.
- [x] 5.4 Implement direct navigation action controls (`NEXT TRIAL`, `RETRY TRIAL`, and `RETURN TO GRID`) with clean Three.js scene/arena resets (`rebuildArenaTiles()`, entity purging) and pointer lock state synchronization; verify state transitions and event cleanup.

## 6. Integration, Main Menu Wiring & Verification

- [x] 6.1 Add the "CAMPAIGN SECTORS" entry button to the Main Menu in `src/ui/menus.js` and wire modal opening in `src/ui/UIManager.js`; verify button interaction from main menu.
- [x] 6.2 Implement automated unit and integration test suite `tron/test_campaign_phase2.js` covering modal generation, star ignition, itemized payouts, HUD updates, and scene reset lifecycles; verify suite passes with 100% success.
- [x] 6.3 Add `"test:campaign:phase2"` script to `package.json` and execute all campaign tests; verify entire campaign test pipeline passes without regressions.
