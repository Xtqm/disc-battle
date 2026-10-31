# Proposal: Rebrand to Arc League

## Why

To avoid intellectual property and trademark conflicts with Disney's *TRON* franchise while preserving the high-velocity neon kinetic gameplay, *Tron Disc Arena* must be systematically rebranded as **Arc League**. Establishing an original universe—centered around digitized athletic beings competing in premier high-stakes sporting tournaments across dynamic magnetic stadiums (the *Arcfield*)—legally safeguards the game for public distribution on itch.io and Steam, reinforces a consistent competitive identity, and aligns UI terminology, cosmetics, and the economy.

## What Changes

- **Game Identity & Metadata**:
  - Rebrand project title across `package.json`, `desktop/main.cjs`, `electron-builder.json`, and `index.html` from `TRON :: DISC ARENA` to `ARC LEAGUE`.
  - Update application ID to `com.arcleague.game`.
  - Replace title logos and header typography with *Arc League* branding.
- **In-Game Economy Rebrand**:
  - Rename core in-game currency from `Bits` to `Arc Credits`.
  - Update kinetic HUD popups from `+Bits` to `+Credits`.
  - Migrate internal and persistent storage keys while ensuring backward compatibility with existing save states.
- **Lore & In-Universe Terminology**:
  - Replace "Identity Disc" with "Kinetic Disc" / "Arc Disc".
  - Replace "De-rez" / "Derezzed" with "De-allocated" / "Purged" / "Shattered".
  - Replace "The Grid" with "The Arcfield" or "Sub-Strata".
  - Establish "Vectorfall" as the official tournament hazard name for arena tile collapses.
- **Armory & Cosmetic Alignment**:
  - Rebrand cosmetic skins, chassis, and disc variants to reflect athletic league kits, sponsor rigs, and tournament discs.
  - Update item flavor text, lore dossiers, and preview bay metadata.
- **Main Menu & UI Thematic Overhaul**:
  - Re-label navigation buttons and modal headers into athletic tournament terminology (e.g., `[ ENTER ARCFIELD ]`, `[ LEAGUE CIRCUIT ]`, `[ LOCKER ROOM / OUTFITTING ]`, `[ ATHLETE TELEMETRY ]`).
- **Achievement & Metric Rebrand**:
  - Update metric paths (`stats.totalDerezzes` -> `stats.totalDeallocations`) and reward payloads to dispense `Arc Credits`.
  - Re-theme achievement names and descriptions to fit the pro-league athletic circuit.

## Capabilities

### Modified Capabilities
- `desktop-shell`: Rebrands application identity, package configuration, window titles, and branding parameters to Arc League.
- `core-economy`: Renames currency from Bits to Arc Credits, updating atomic currency transactions, milestone rewards, and HUD kinetic popups.
- `armory-catalog`: Rebrands cosmetic catalog items, visual themes, lore dossiers, and unlock categories to align with Arc League athletic lore.
- `achievement-engine`: Updates achievement descriptions, metric tracking keys, and currency reward grants to Arc Credits and Arc League terminology.

## Impact

- **Desktop Shell (`desktop/`)**: Window title in `desktop/main.cjs` updated; packaging metadata in `electron-builder.json` updated.
- **UI (`index.html`, `src/ui/`)**: Title headers, navigation buttons, HUD indicators, and auth/modal text updated to Arc League aesthetics.
- **Economy (`src/economy/`)**: `EconomyManager.js` updated to manage Arc Credits with backward-compatible save state migration.
- **Armory (`src/armory/`)**: `ArmoryCatalog.js` updated with refreshed item IDs, titles, descriptions, and lore dossiers.
- **Achievements (`src/achievements/`)**: `AchievementRegistry.js` updated with re-themed achievement titles, descriptions, and metric keys.
- **Storage & State (`src/storage/`)**: Schema migration handles transitioning legacy `bits` and `totalDerezzes` properties to `credits` and `totalDeallocations`.
