# Design

## Context

Tron Disc Arena possesses well-defined storage architecture (`StorageManager` / `TronSaveState`), atomic currency management (`EconomyManager`), catalog-driven cosmetics (`ArmoryManager`), and active combat bridges (`DuelEconomyBridge`, `SwarmEconomyBridge`, `CampaignManager`). However, there is no centralized achievement evaluation subsystem or telemetry mutation bus. 

See `proposal.md` for the motivation and `specs/` for normative behavior contracts.

## Goals / Non-Goals

**Goals:**
- Implement a pure registry (`AchievementRegistry.js`) defining the 6 launch achievements with deterministic progress calculation functions.
- Implement an event-driven `AchievementManager.js` that evaluates telemetry mutations, performs boot-time retroactive reconciliation, and dispenses Bits and cosmetic entitlements atomically.
- Support direct cosmetic unlocking via `ArmoryManager.unlockRewardItem()`.
- Create a non-intrusive in-game neon toast component (`AchievementToast.js`) with procedural synth fanfare audio (`sfx.js`).
- Build a diegetic, accessible Trophy Matrix screen (`AchievementsModal.js`) integrated into the main menu.
- Maintain 100% backward compatibility with existing save states, cloud sync set-union invariants, and existing test suites.

**Non-Goals:**
- Platform-native achievements (e.g., Steamworks, Xbox Live, Game Center) integration.
- Timed or seasonal limited-time event badges (deferred to future live-ops specs).
- Multiplayer-exclusive trophy wagering or trading.

## Decisions

### 1. Pure Registry with Decoupled Evaluation Functions
- **Choice**: Structure `AchievementRegistry.js` as an immutable catalog of achievement definitions, each with an explicit evaluation lambda or criteria descriptor: `evaluator: (saveState) => { current, target, satisfied }`.
- **Rationale**: Isolates achievement evaluation rules from state mutation mechanics. Makes every achievement 100% unit-testable against mock save states without requiring running Three.js loops or instantiated DOM nodes.
- **Alternatives Considered**: 
  - *Hardcoding if/else blocks inside event listeners*: Rejected due to high cyclomatic complexity and difficulty verifying all criteria combinations.

### 2. Event-Driven Telemetry Bus via StorageManager Mutation Hooks
- **Choice**: `AchievementManager` subscribes to `StorageEvents.MUTATED` and monitors relevant keypaths (`stats.totalDerezzes`, `stats.parriesExecuted`, `stats.curveEliminations`, `stats.swarmHighestWave`, `campaign.levelRecords`). In addition, expose an explicit `recordMetric(key, delta)` helper to atomically increment telemetry in storage and evaluate achievements immediately.
- **Rationale**: Reuses the tested reactive storage architecture without introducing a second redundant global state bus. Any game system (combat, campaign, swarm) that mutates storage automatically notifies the achievement engine.
- **Alternatives Considered**:
  - *Polling loop via requestAnimationFrame*: Rejected because polling introduces unnecessary CPU overhead and can miss short-lived state transitions.

### 3. Boot-Time Retroactive Reconciliation with Notification Suppression
- **Choice**: During `AchievementManager.init()`, evaluate all locked achievements against current save state metrics. If satisfied, immediately mark as unlocked and credit rewards, but pass `{ silent: true }` so that toast banners and audio fanfare do not spam the player when opening the game.
- **Rationale**: Existing players who have already cleared Grid 01 or survived wave 15 in Swarm Defense must be credited their rightful accolades without experiencing jarring UX on startup.
- **Alternatives Considered**:
  - *Requiring players to re-trigger milestones*: Rejected as frustrating to veteran players.

### 4. Reward Grant Pipeline: Atomic Economy & Armory Interop
- **Choice**: When an achievement unlocks:
  1. Add record to `achievements` array in `TronSaveState`: `{ id, unlockedAt, title, reward }`.
  2. If `reward.bits > 0`, call `EconomyManager.awardBits(bits, 'achievement_' + id)`.
  3. If `reward.cosmetic`, call `ArmoryManager.unlockRewardItem(category, itemId)`.
  4. Ensure `ArmoryCatalog.js` references either the achievement ID directly (`ach_swarm_survivor`, `ach_grid_one_master`) or maintains alias mapping with legacy IDs (`corrupted_void_mastery`, `grid_01_mastery`).
- **Rationale**: Guarantees players receive both Bits and inventory ownership, making the items immediately selectable and equipped in the Armory.
- **Alternatives Considered**:
  - *Separate claim button in UI*: Rejected for launch matrix; direct automatic grant provides immediate positive feedback upon completing hard challenges.

### 5. Procedural Audio Fanfare via Web Audio API
- **Choice**: Add `playAchievementFanfare()` to `src/audio/sfx.js` using synthesized dual-oscillator arpeggiated chords (sawtooth/sine mix with linear decay) matching Tron retro-futuristic sound design.
- **Rationale**: Tron Disc Arena uses procedural synthesis for all UI and combat audio (no `.mp3` or `.wav` dependencies), ensuring instant playback and zero asset loading latency.
- **Alternatives Considered**:
  - *Loading an external audio file*: Rejected to avoid asset loading delays, network failures, and CORS issues.

### 6. Main Menu Navigation Integration
- **Choice**: Insert an "ACHIEVEMENTS" button in `src/ui/menus.js` alongside "CAMPAIGN SECTORS", "ARMORY", and "ENTER SWARM". Wire modal display through `UIManager.showAchievements()`.
- **Rationale**: Consistent with existing modal entry points (`armoryBtn`, `campaignBtn`).

## Risks / Trade-offs

- **[Risk] State Mutation Loops**: Awarding Bits triggers `EconomyManager`, which mutates `player.currency.bits` in `StorageManager`, potentially re-triggering storage mutation listeners.
  → *Mitigation*: The telemetry listener strictly filters by path prefix (`stats.` or `campaign.levelRecords`) and ignores `player.currency` mutations. Furthermore, achievements are checked against `isUnlocked(id)` before running criteria checks.

- **[Risk] Cloud Sync Desynchronization**: Cloud sync merges `achievements` as a set union. If entries are stored as objects, set equality can produce duplicate records if timestamps differ across tabs.
  → *Mitigation*: Key achievement arrays by string ID internally or normalize objects by `id` during set union merge, matching the logic already validated in `CloudSyncResolver.js`.

- **[Risk] Toast Collision with Existing Combat HUD**: In-game toasts could obscure the crosshair or boss health bars.
  → *Mitigation*: Position the toast banner at the top-center above the crosshair or at the bottom-right viewport corner with a sleek, low-profile height (max 64px) and semi-transparency.
