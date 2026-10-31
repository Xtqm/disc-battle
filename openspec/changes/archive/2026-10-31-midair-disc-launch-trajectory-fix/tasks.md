# Tasks

## 1. Projectile Altitude Cruise Stabilization

- [x] 1.1 In `src/entities/Disc.js` (`spawnDisc`), record `launchY: pos.y` on projectile instances, and verify property is present on spawned discs.
- [x] 1.2 In `src/entities/Disc.js` (`updateDiscs`), update vertical hover dampening to target `D.launchY !== undefined ? D.launchY : 1.7` instead of fixed `1.7`, and verify midair projectiles maintain launch altitude without dropping to ground level.
- [x] 1.3 In `src/physics/trajectory.js` (`simulatePath`), update trajectory hover dampening to target `origin.y` instead of fixed `1.7`, and verify simulated points preserve elevation for midair throw origins.

## 2. Near-Parallax Floor Raycast Protection

- [x] 2.1 In `src/entities/Player.js` (`aimTarget`), enforce a minimum forward distance check (`forwardDist >= 8.0m`) along the player forward vector for floor plane intersections, and verify near floor intersections (< 8.0m) do not snap aim downward into the thrower's feet.

## 3. Automated Midair Combat Tests and Verification

- [x] 3.1 In `test/gameplay/physics_and_combat.test.js`, add automated unit tests verifying midair throw elevation hold, near-ground aim stability, and zero premature floor ricochets across downward pitch angles (-0.15 to -0.25 rad), and verify tests pass with `npm test`.
- [x] 3.2 Run the full test suite via `npm test` across all 40 test suites to verify zero regressions across gameplay, physics, and bot systems.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
