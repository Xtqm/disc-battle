# Tasks

## 1. Disc Physics & Trajectory Parity

- [x] 1.1 Update `src/entities/Disc.js` floor collision to pop the disc upward (`vel.y = 3.5`), clear the floor plane (`pos.y = yFloor + 0.05`), dissipate curve (`curve = 0`), and reset cruise elevation (`launchY = 1.7`), verifying that only the initial contact tile triggers a warning
- [x] 1.2 Update `src/physics/trajectory.js` (`simulatePath`) with matching floor rebound physics (`v.y = 3.5; k = 0; p.y = yFloor + 0.05;`), verifying trajectory arc preview matches live simulation

## 2. Regression Testing & Integration

- [x] 2.1 Update `test/gameplay/physics_and_combat.test.js` TEST 12 to assert that a downward floor throw degrades exactly one tile and rebounds back toward chest height (`y >= 1.5m`), verifying with `npm test`
- [x] 2.2 Run full test suite (`npm test`) to verify all 12 tests pass without regressions across combat and physics systems

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Commit changes and merge branch `fix-floor-tile-rebound` back into `main`.
