# Tasks: Rebrand to Arc League

## 1. Application Identity & Desktop Shell Manifests

- [x] 1.1 Update `package.json` package name to `"arc-league"` and verify `npm test` locates the package
- [x] 1.2 Update `electron-builder.json` with `"appId": "com.arcleague.game"` and `"productName": "ARC LEAGUE"` and verify configuration syntax
- [x] 1.3 Update `desktop/main.cjs` window title to `"ARC LEAGUE"` and verify the desktop initialization tests pass

## 2. Storage & Economy Engine Migration

- [x] 2.1 Implement automatic save-state migration in `src/storage/StorageManager.js` for `bits` -> `credits` and `totalDerezzes` -> `totalDeallocations`, verifying unit tests pass
- [x] 2.2 Update `src/economy/EconomyManager.js` to manage Arc Credits with backward-compatible method proxies (`addBits` -> `addCredits`), and verify `npm run test:economy`
- [x] 2.3 Update in-match kinetic floating HUD feedback from `+Bits` to `+Credits` in `src/ui/` and combat event handlers, verifying HUD display behavior

## 3. Armory & Cosmetics Catalog Alignment

- [x] 3.1 Update `src/armory/ArmoryCatalog.js` category identifiers (`KINETIC DISCS`, `ATHLETE RIGS`, `STADIUM ARENAS`), item titles, and lore dossiers, verifying `npm run test:armory`
- [x] 3.2 Update Armory modal action buttons from `[ FABRICATE // {cost} BITS ]` to `[ ACQUIRE // {cost} CREDITS ]` and verify loadout equip flow
- [x] 3.3 Update Armory preview references in `src/armory/ArmoryPreviewScene.js` and `src/armory/CosmeticMaterialEngine.js` to reference Kinetic Discs and Athlete Rigs

## 4. Main Menu & UI Thematic Overhaul

- [x] 4.1 Update `index.html` page `<title>`, header titles to `ARC LEAGUE`, and auth placeholders to `@arcleague.net`
- [x] 4.2 Rebrand main menu navigation buttons to `[ ENTER ARCFIELD ]`, `[ LEAGUE CIRCUIT ]`, `[ OUTFITTING ]`, `[ TROPHY MATRIX ]`, and `[ SYSTEM CONFIG ]`
- [x] 4.3 Replace lingering Disney/Tron terminology across UI overlays and modals with Sub-Strata and Arcfield lore

## 5. Achievement Engine & Verification

- [x] 5.1 Update `src/achievements/AchievementRegistry.js` metric keys to observe `stats.totalDeallocations` and reward Arc Credits, verifying `npm run test:auth` and achievement unit tests
- [x] 5.2 Execute the full regression test runner (`npm test`) to ensure all test suites pass with zero failures
