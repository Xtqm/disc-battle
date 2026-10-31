# Tasks

## 1. Trajectory Parity & Hazard Reflection

- [x] 1.1 In `src/physics/trajectory.js`, update `simulatePath` loop condition to `while (t < tMax && bounces < maxBounces)` and break immediately on reaching `maxBounces`, verifying simulated bounce count never exceeds 3 ricochets.
- [x] 1.2 In `src/physics/trajectory.js`, integrate `sectorHazardBuilder` collision checks into `simulatePath` so predicted trajectories reflect specularly off active sector hazard barriers.
- [x] 1.3 Add automated unit verification comparing `simulatePath` bounce caps and endpoint coordinates against live projectile limits.

## 2. Disc Impact Rebound & Return Kinematics

- [x] 2.1 In `src/entities/Disc.js`, update the player disc hit handler to invert horizontal velocity elastically (`multiplyScalar(-0.45)`), add vertical bounce pop, reset curve spin, expel from opponent hitbox, and initiate return recall without penetrating through the target.
- [x] 2.2 In `src/entities/Disc.js`, guard hover clamping with `if (!D.returning && D.pos.y > config.DISC_R)` so returning discs home directly in 3D to the thrower's true chest elevation.
- [x] 2.3 In `src/entities/Disc.js`, invoke `SFX.catchDisc()` when a returned disc reloads the player at `L < 1.4`.
- [x] 2.4 Add automated test cases in `test/gameplay/physics_and_combat.test.js` verifying player disc rebound velocity inversion on enemy hits and clean return while airborne.

## 3. Player Re-Arm Watchdog & Parallax HUD Feedback

- [x] 3.1 In `src/entities/Player.js` (`updatePlayer`), add a 3.0-second failsafe watchdog that restores `state.player.hasDisc = true` and plays `SFX.catchDisc()` if no player discs exist in flight.
- [x] 3.2 In `src/ui/hud.js` (`updateCrosshair`), add `state.gamepadCurveL` and `state.gamepadCurveR` checks to activate `.curve-l` and `.curve-r` crosshair brackets during gamepad play.
- [x] 3.3 In `src/network/sync.js`, update remote player `backDisc` transform offsets to align with hand-mounted hierarchy.
- [x] 3.4 Run the full test suite (`npm test`) and verify all physics, combat, and input regressions are resolved.
