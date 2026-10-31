# Design: Arc League Rebranding Architecture

## Context

The current codebase uses Disney *TRON* nomenclature across desktop manifests, HTML headers, HUD notifications, storage schema properties (`bits`, `stats.totalDerezzes`), Armory catalog IDs, and audio hooks. See `proposal.md` for motivation. This design specifies how to execute a clean, non-destructive migration across metadata, UI, economy, and persistent state while preserving 100% backward compatibility with existing player profiles.

## Goals / Non-Goals

**Goals:**
- Systematically rebrand the game identity to **Arc League** across all player-facing and packaging layers.
- Seamlessly migrate existing player save states (converting `bits` -> `credits`, `totalDerezzes` -> `totalDeallocations`) without data loss.
- Overhaul main menu navigation and HUD overlays to reflect a high-tier cyber-athletic championship (Arcfield, League Circuit, Outfitting, Athlete Telemetry).
- Update cosmetic catalog terminology to feature Kinetic Discs, Athlete Rigs, and Stadium Arenas.

**Non-Goals:**
- Altering core combat physics, Euler integration, ricochet math, or parry timings.
- Replacing the underlying procedural audio Web Audio synthesis engine (which is already original).
- Breaking existing test suites or headless puppeteer verification runners.

## Decisions

### 1. In-Place Persistent Storage Migration Strategy
* **Decision:** In `StorageManager.js` (and `PlayerProfile.js`), implement an automatic migration step during profile load:
  ```js
  if (profile.bits !== undefined && profile.credits === undefined) {
    profile.credits = Number(profile.bits) || 0;
  }
  if (profile.stats?.totalDerezzes !== undefined && profile.stats?.totalDeallocations === undefined) {
    profile.stats.totalDeallocations = Number(profile.stats.totalDerezzes) || 0;
  }
  ```
* **Rationale:** Ensures that existing players and automated test suites with saved local states do not reset balances or progress.
* **Alternatives considered:** Hard reset of local storage schema. Rejected because it destroys tester progress.

### 2. Main Menu Navigation & Athletic Diegetics
* **Decision:** Re-label primary menu buttons to convey a professional athletic broadcast atmosphere:
  * `#playBtn` / Primary Action: `[ ENTER ARCFIELD ]`
  * `#campaignBtn` / Circuit Mode: `[ LEAGUE CIRCUIT ]`
  * `#armoryBtn` / `#hubLoadoutTab`: `[ OUTFITTING ]` (Sub-tabs: `KINETIC DISCS`, `ATHLETE RIGS`, `STADIUM ARENAS`)
  * `#achievementsBtn` / `#hubDirectivesTab`: `[ TROPHY MATRIX ]`
  * `#settingsBtn`: `[ SYSTEM CONFIG ]`
* **Rationale:** Elevates the experience from a generic action arena to a prestigious competitive league, completely shedding the Tron movie tie-in feel while amplifying the sport fantasy.

### 3. Application Metadata & Electron Packaging
* **Decision:**
  * `package.json`: `"name": "arc-league"`
  * `electron-builder.json`: `"appId": "com.arcleague.game"`, `"productName": "ARC LEAGUE"`
  * `desktop/main.cjs`: `title: "ARC LEAGUE"`
  * `index.html`: `<title>ARC LEAGUE</title>`, header updated to `<h1 class="arc-title">ARC</h1><h2 class="arc-subtitle">L E A G U E</h2>`.

### 4. Economy & HUD Notification Telemetry
* **Decision:**
  * Update `EconomyManager.js` balance getters/setters and dispatch payloads to `credits`. Provide proxy methods for legacy callers (`addBits` aliases to `addCredits`).
  * Update kinetic HUD floating score elements from `+${amount} BITS` to `+${amount} CREDITS`.

## Risks / Trade-offs

* **[Risk: Legacy save state desync between bits and credits]** → Mitigation: `EconomyManager` exposes unified balance resolution reading `credits ?? bits ?? 0` and committing to `credits`.
* **[Risk: Test runner assertions expecting "TRON" or "Bits" strings]** → Mitigation: Update test fixtures in `test/` to assert new Arc League strings and credit balances.
