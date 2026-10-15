# Proposal

## Why

While Tron Disc Arena features established combat physics, tri-mode economy bridges, and an Armory catalog with achievement-gated cosmetics (`disc_corrupted_void` and `chassis_arbiter`), it lacks a centralized achievement evaluation engine, telemetry mutation bus, and in-game trophy matrix UI. Players currently have no structured feedback, mid-combat toast fanfare, or interface to track combat milestones, trial mastery, or incremental trophy progress.

## What Changes

- **Authoritative Achievement Registry (`src/achievements/AchievementRegistry.js`)**:
  - Define the launch achievement matrix (SPEC-ACHIEVE-001) covering combat maneuvers, trial perfection, swarm endurance, and campaign mastery:
    - `ach_first_blood` ("Initial Execution"): De-rez first hostile program -> 100 Bits.
    - `ach_curve_god` ("Geometric Curved Path"): Eliminate 25 hostiles with curving disc shots -> 300 Bits.
    - `ach_parry_king` ("Deflective Protocol"): Parry 50 incoming enemy discs -> 250 Bits.
    - `ach_untouchable` ("Flawless Subroutine"): Complete any Grid trial with 100% integrity -> 500 Bits.
    - `ach_swarm_survivor` ("Endless Firewall"): Survive 15 consecutive waves in Swarm Defense -> 750 Bits + `disc_corrupted_void` skin.
    - `ach_grid_one_master` ("Outlands Conqueror"): Earn all 18 stars across Grid 01 -> 1000 Bits + `chassis_arbiter` skin.
  - Provide lookup helpers, category tagging, target criteria validation, and progress computation functions.

- **Reactive Achievement Manager & Telemetry Mutation Bus (`src/achievements/AchievementManager.js`)**:
  - Track combat telemetry mutations (`stats.totalDerezzes`, `stats.parriesExecuted`, `stats.curveEliminations`, `stats.swarmHighestWave`, `campaign.levelRecords`).
  - Execute boot-time retroactive reconciliation to unlock any achievements whose conditions are already met in `TronSaveState`.
  - Atomically distribute Bit rewards through `EconomyManager.awardBits()` and grant exclusive cosmetic skins via `ArmoryManager.unlockRewardItem()`.
  - Emit reactive `ACHIEVEMENT_UNLOCKED` lifecycle events across storage and UI subscribers.

- **Persistent Telemetry Schema Extension (`src/core/storage/schema.js` & `StorageManager.js`)**:
  - Extend `stats` with monotonic telemetry counters: `totalDerezzes`, `parriesExecuted`, and `curveEliminations`.
  - Record structured unlock records (ID, timestamp, rewarded bits, rewarded cosmetics) in `achievements` array while preserving set-union cloud sync compatibility.

- **Reward Grant Method in Armory Pipeline (`src/armory/ArmoryManager.js`)**:
  - Implement `ArmoryManager.unlockRewardItem(category, itemId)` to append achievement-earned cosmetics to persistent inventory and broadcast `ARMORY_ITEM_UNLOCKED`.
  - Align `ArmoryCatalog.js` achievement IDs (`ach_swarm_survivor` / `corrupted_void_mastery` and `ach_grid_one_master` / `grid_01_mastery`) with backwards-compatible aliases.

- **In-Game Neon Toast Banner (`src/ui/components/AchievementToast.js`)**:
  - Render a non-intrusive neon HUD toast banner that slides in from top-center/bottom-right upon unlocking mid-match.
  - Synthesize a procedural synth celebration fanfare via `src/audio/sfx.js` (rising arpeggio / crystal chime triad) without external audio asset dependencies.

- **Trophy Matrix UI Modal (`src/ui/modals/AchievementsModal.js`)**:
  - Render an interactive Main Menu Achievements screen displaying overall completion percentage, unlocked timestamp badges, real-time progress bars for incremental goals (e.g., `34 / 50 Parries`), and cosmetic reward previews.
  - Wire an "ACHIEVEMENTS" button into `src/ui/menus.js` and `UIManager.js`.

## Capabilities

### New Capabilities
- `achievement-engine`: Establishes the authoritative achievement registry, combat telemetry listener bus, retroactive save state reconciliation, reward distribution pipeline, procedural audio fanfare, mid-match neon toast notifications, and main menu trophy matrix UI modal.

### Modified Capabilities
- `core-storage`: Extends persistent state schema and validation guards with monotonic combat telemetry metrics (`stats.totalDerezzes`, `stats.parriesExecuted`, `stats.curveEliminations`) and structured unlock entries in `achievements`.
- `armory-catalog`: Extends ArmoryManager with direct entitlement unlocking (`unlockRewardItem`) for achievement milestone cosmetic rewards and ensures catalog backward-compatible achievement aliasing.

## Impact

- **Affected Files**:
  - `src/achievements/AchievementRegistry.js` (new)
  - `src/achievements/AchievementManager.js` (new)
  - `src/ui/components/AchievementToast.js` (new)
  - `src/ui/modals/AchievementsModal.js` (new)
  - `src/core/storage/schema.js` (modified)
  - `src/core/storage/StorageManager.js` (modified)
  - `src/armory/ArmoryManager.js` (modified)
  - `src/armory/ArmoryCatalog.js` (modified)
  - `src/audio/sfx.js` (modified)
  - `src/entities/Bot.js` (modified - record derez telemetry)
  - `src/entities/Disc.js` (modified - record parry & curve telemetry)
  - `src/campaign/CampaignManager.js` (modified - record flawless trial telemetry)
  - `src/ui/menus.js` (modified - Achievements menu button & navigation)
  - `src/ui/UIManager.js` (modified - modal integration)
- **Dependencies**: No external npm or binary dependencies; relies purely on standard DOM, Web Audio API, and existing core modules.
- **Backward Compatibility**: Fully backward compatible with existing v1.0.0 `TronSaveState`, existing storage keys, and cloud sync set-union logic.
