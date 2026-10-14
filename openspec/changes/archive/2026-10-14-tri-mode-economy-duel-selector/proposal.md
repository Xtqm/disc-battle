# Proposal

## Why

While Tron Disc Arena features established combat and economy engines (SPEC-ECON-001, SPEC-CAMP-001, SPEC-ARMORY-001), core gameplay modes—specifically Swarm Defense endurance and Duel Arena matches—lack direct integration with the economy progression pipeline, resulting in isolated game loops where players cannot earn Bits or XP outside of Campaign trials. Additionally, duel and practice lobbies cannot dynamically select from the full roster of unlocked Campaign Sector and Armory Exotic arenas, artificially constraining combatant arena variety.

## What Changes

- **Swarm Defense Endurance Payout Pipeline (`src/modes/SwarmEconomyBridge.js`)**:
  - Award Bits and XP at the completion of each Swarm wave based on a baseline yield (15 Bits/wave) multiplied by a compound survival streak bonus.
  - Distribute milestone wave bonus chests every 5 waves (Wave 5, 10, 15, 20+).
  - Persist new survival records monotonically into `stats.swarmHighestWave` in `StorageManager`.
- **Duel Arena Match Payouts (`src/modes/DuelEconomyBridge.js`)**:
  - Award match-end payouts: 50 Bits + XP for 1v1/2v2 victories against AI opponents, and 100 Bits + XP for multiplayer duel victories.
  - Award participation XP on defeat across duel modes to respect player time while preventing exploit farming.
  - Trigger kinetic floating neon `+Bits` HUD indicators in real-time during combat for high-skill maneuvers: confirmed disc parries, multi-ricochet hits, and curve eliminations.
- **Dynamic Duel Map Selection Lobby (`src/ui/duel/DuelMapSelector.js`)**:
  - Integrate an interactive visual arena picker into Host Match, Practice, and Solo Duel configuration flows reading `inventory.unlockedMaps` from `StorageManager`.
  - Render unlocked Campaign Sector arenas (`arena_grid_01`, `arena_solar_sail`, `arena_sea_sim`, `arena_core_pinnacle`) and Armory Exotic arenas (`arena_zero_g_nexus`, `arena_derez_chasm`) as selectable cards.
  - Display locked arenas with clear unlock directives (e.g., `DEFEAT GRID 02 ARBITER` or `UNLOCK IN ARMORY`).
- **Core Integration & Re-exports**:
  - Wire economy bridge hooks into `Bot.js` (wave completion & foe derezzing), `Disc.js` (parries, ricochet strikes, curve eliminations), `roomManager.js` / `modals.js` (duel match conclusions), and `menus.js` / `arenaSelector.js` (lobby map picker).

## Capabilities

### New Capabilities
*(None; existing system capabilities are extended with full backward compatibility)*

### Modified Capabilities
- `game-modes`: Extends Swarm Survival and Duel match lifecycles to award wave/match economy payouts (Bits, XP, streak multipliers, milestone chests, and defeat consolation XP) and dynamic duel arena selection.
- `core-economy`: Introduces in-combat skill maneuver economy rewards (parries, multi-ricochet hits, curve eliminations) paired with kinetic floating neon HUD telemetry.
- `core-storage`: Enforces monotonic recording of `stats.swarmHighestWave` in persistent player statistics when new survival records are established.

## Impact

- **Affected Systems**: `src/modes/SwarmEconomyBridge.js` (new), `src/modes/DuelEconomyBridge.js` (new), `src/ui/duel/DuelMapSelector.js` (new), `src/entities/Bot.js`, `src/entities/Disc.js`, `src/ui/hud.js`, `src/ui/modals.js`, `src/ui/menus.js`, `src/network/roomManager.js`, `src/core/storage/schema.js`, `src/core/storage/StorageManager.js`.
- **APIs & State**: Reads `economyManager`, `storageManager`, `state.wave`, `state.gameMode`, `inventory.unlockedMaps`, `stats.swarmHighestWave`.
- **Backward Compatibility**: Fully backward compatible with existing save states, default values, and legacy matches. Non-breaking.
