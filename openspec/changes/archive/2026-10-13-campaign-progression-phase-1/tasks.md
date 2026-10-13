# Tasks: Phase 1 Campaign Data Registry, Star Gating & Objective Evaluator (SPEC-CAMP-001)

## 1. Campaign Data Registry & Grid Configurations

- [x] 1.1 Implement `CampaignRegistry.js` in `src/campaign/CampaignRegistry.js` defining full metadata for Grid 01 (Outlands Boot-Sector, 6 levels), Grid 02 (Solar Sail Junction, 7 levels), Grid 03 (Sea of Simulation, 7 levels), and Grid 04 (The Core Pinnacle, 8 levels) with wave compositions, bot AI tiers, star thresholds, and payouts; verify schema completeness and level counts across all 28 levels.
- [x] 1.2 Implement query and gating methods in `CampaignRegistry` (`getGrid`, `getLevel`, `getAllGrids`, `getLevelsForGrid`, `isGridUnlocked`, `getNextLevel`, `calculateMaxPossibleStars`) enforcing cumulative star unlock requirements (0 for Grid 01, 10 for Grid 02, 22 for Grid 03, 36 for Grid 04); verify unlock gating logic and invalid ID error handling.

## 2. Pure Star Objective Evaluator

- [x] 2.1 Implement `StarEvaluator.js` in `src/campaign/StarEvaluator.js` as a pure, deterministic engine calculating 1 to 3 Stars: Star 1 (De-Rez: all hostiles eliminated), Star 2 (Integrity: final HP $\ge 75\%$), and Star 3 (Mastery: elapsed time $\le$ target time OR confirmed curve/ricochet hits $\ge$ target); verify star calculation rules across edge cases and failure telemetry.
- [x] 2.2 Author unit tests for `StarEvaluator` verifying granular condition breakdown flags (`star1`, `star2`, `star3`, `deRez`, `integrity`, `masteryViaTime`, `masteryViaPrecision`) and zero-star failure outcomes.

## 3. CampaignManager Lifecycle, Gating & Persistence

- [x] 3.1 Implement `CampaignManager.js` in `src/campaign/CampaignManager.js` managing active trial lifecycle states (`startTrial(levelId)`, `recordMetric(type, amount)`, `completeTrial()`, `failTrial(reason)`); verify state initialization, telemetry recording, and defeat handling.
- [x] 3.2 Implement monotonic star delta calculations in `CampaignManager` ensuring total stars only increase by the delta when a player beats their previous star rating on a level; verify repeat clears with equal or lower stars yield 0 delta stars.
- [x] 3.3 Implement tiered economy and XP payouts in `CampaignManager` via `EconomyManager` (`awardBits`, `awardXP`), strictly distinguishing first-time clears (100–250 Bits for trials, 500 Bits for Arbiters) from repeat clears (25–50 Bits for trials, 100 Bits for Arbiters); verify payout amounts and transaction source tagging.
- [x] 3.4 Implement persistence synchronization with `StorageManager`, updating `campaign.levelRecords`, `campaign.starsEarned`, `campaign.completedNodes`, and `campaign.unlockedGrids`; verify persistence round-trip and cross-session restoration.

## 4. Test Suite Integration & Verification

- [x] 4.1 Author comprehensive test suite `tron/test_campaign_phase1.js` (and runner `test/campaign_phase1.test.js`) exercising all 28 registry levels, star unlock gating, evaluator edge cases, monotonic upgrades, first vs repeat payouts, and storage persistence.
- [x] 4.2 Register `"test:campaign": "node tron/test_campaign_phase1.js"` in `package.json` and link the suite into `tron/run_tests.js`.
- [x] 4.3 Execute `npm run test:campaign`, `npm run test:storage`, and `npm run test:economy` to verify all campaign, storage, and economy tests pass cleanly with 100% success.
