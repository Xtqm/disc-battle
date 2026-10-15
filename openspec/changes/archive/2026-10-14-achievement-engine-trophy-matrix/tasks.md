# Tasks

## 1. Storage Schema & Telemetry Foundation

- [x] 1.1 Update `src/core/storage/schema.js` and `StorageManager.js` to incorporate `totalDerezzes`, `parriesExecuted`, and `curveEliminations` into `DEFAULT_SAVE_STATE.stats`, and verify schema validation with `node test/storage/storage_manager.test.js`.
- [x] 1.2 Implement `ArmoryManager.unlockRewardItem(category, itemId)` in `src/armory/ArmoryManager.js`, update cosmetic achievement IDs in `src/armory/ArmoryCatalog.js` with backwards-compatible aliases, and verify with `node test/armory/armory_manager.test.js`.

## 2. Achievement Registry & Launch Matrix

- [x] 2.1 Implement `src/achievements/AchievementRegistry.js` defining the 6 launch achievements (`ach_first_blood`, `ach_curve_god`, `ach_parry_king`, `ach_untouchable`, `ach_swarm_survivor`, `ach_grid_one_master`), criteria evaluation functions, and progress computation helpers.
- [x] 2.2 Create unit tests in `test/achievements/achievement_registry.test.js` validating all metadata fields, progress ratio formulas, and criteria evaluators across sample save state records.

## 3. Achievement Manager & Telemetry Mutation Bus

- [x] 3.1 Implement `src/achievements/AchievementManager.js` with telemetry subscriptions, criteria evaluation, boot-time retroactive reconciliation, atomic reward distribution via `EconomyManager.awardBits()` and `ArmoryManager.unlockRewardItem()`, and `ACHIEVEMENT_UNLOCKED` event broadcasting.
- [x] 3.2 Wire combat telemetry tracking into `src/entities/Bot.js` (total derezzes), `src/entities/Disc.js` (parries executed and curve eliminations), and `src/campaign/CampaignManager.js` (flawless integrity trial completions).
- [x] 3.3 Create test suite in `test/achievements/achievement_manager.test.js` verifying retroactive reconciliation on boot, runtime event-triggered unlocks, duplicate reward prevention, and event emissions.

## 4. Audio Fanfare & Mid-Combat Neon Toast Notification

- [x] 4.1 Implement procedural synth fanfare `playAchievementFanfare()` in `src/audio/sfx.js` and wire into `SFX.achievementFanfare()`, verifying Web Audio node graph construction in `test/audio/achievement_sfx.test.js`.
- [x] 4.2 Implement `src/ui/components/AchievementToast.js` to render non-intrusive neon HUD toast banners with queuing, slide animations, auto-dismiss timers, and audio fanfare triggers.
- [x] 4.3 Create unit tests in `test/ui/achievement_toast.test.js` validating toast DOM construction, badge/reward pill formatting, and queue drainage.

## 5. Main Menu Trophy Matrix UI & System Integration

- [x] 5.1 Implement `src/ui/modals/AchievementsModal.js` rendering the Trophy Matrix screen with overall completion metrics, incremental progress bars, unlock timestamp badges, and cosmetic reward previews.
- [x] 5.2 Integrate the Achievements modal into `src/ui/menus.js` (adding the `achievementsBtn` action to the Main Menu) and `src/ui/UIManager.js` (`showAchievements()`), with keyboard ESC and overlay dismiss bindings.
- [x] 5.3 Create automated UI tests in `test/ui/achievements_modal.test.js` verifying modal render output, locked vs unlocked styling, progress bar representations, and event listener bindings.
- [x] 5.4 Register all new test suites in `test/runner.js` and verify clean execution across the entire test suite.
