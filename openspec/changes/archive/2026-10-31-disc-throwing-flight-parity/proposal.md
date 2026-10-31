# Proposal

## Why

Regressions and behavioral divergences have surfaced across the Identity Disc throwing pipeline, trajectory prediction, and in-flight kinematics:
1. Trajectory prediction simulates past the live projectile's 3-ricochet limit (testing `<= 3` instead of stopping at 3), projecting false 4th-bounce hits that live throws never execute.
2. Live player disc strikes do not rebound elastically upon impacting opponents (unlike enemy and deflected discs), causing player discs to phase through enemies at 38 m/s rather than bouncing crisply.
3. Mid-air hover dampening (`D.pos.y += (1.7 - D.pos.y)`) is applied unconditionally during return recall, pulling returning discs downward and fighting vertical steering when jumping or recovering.
4. Trajectory simulation ignores sector hazards present in live arenas.
5. Third-person shoulder parallax convergence distorts close/floor throws, and gamepad curve triggers (L1/R1) lack HUD bracket feedback.

Resolving these issues restores strict 1:1 parity between predicted aim paths and live disc physics, honors the core Tron disc combat specifications, and ensures consistent, tactile combat feel across input schemes.

## What Changes

- **Trajectory Ricochet Parity**: Align `simulatePath` bounce limits with live disc physics so the simulation terminates immediately upon reaching the maximum bounce limit (3 ricochets), eliminating phantom 4th-bounce prediction trajectories.
- **Elastic Target Rebound**: Apply standard elastic rebound impulse, vertical pop, and hitbox expulsion when a live player disc strikes an opponent, matching the crisp bounce-back behavior of enemy and deflected discs.
- **Unconstrained Return Flight**: Exempt returning discs (`D.returning === true`) from the ground hover clamping dampener so return trajectories smoothly interpolate directly to the thrower's true 3D chest position even while jumping or dashing.
- **Player Re-Arm Watchdog & Catch SFX**: Add a failsafe watchdog timer ensuring the player is re-armed if a thrown disc is lost or caught in geometry for >3.0 seconds, and play `SFX.catchDisc()` upon normal recall completion.
- **Sector Hazard Trajectory Integration**: Include `sectorHazardBuilder` disc collision checks inside `simulatePath` so the aim arc accurately reflects ricochets off dynamic sector hazards.
- **Aim Parity & Gamepad HUD Feedback**: Wire `state.gamepadCurveL` and `state.gamepadCurveR` into the crosshair HUD bracket indicators (`.curve-l` / `.curve-r`), and refine aim target raycast convergence to eliminate close-range shoulder parallax divergence.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `disc-combat`: Update requirements for Trajectory Prediction Parity (ricochet cap alignment and hazard surfaces) and Disc Return to Thrower (elastic opponent rebound, unconstrained return trajectory, and thrower re-arm watchdog).

## Impact

- **Affected Code**:
  - `src/entities/Disc.js`: Player target impact rebound, return flight hover exemption, catch sound trigger.
  - `src/physics/trajectory.js`: Bounce limit parity, sector hazard reflection in simulation.
  - `src/entities/Player.js`: Re-arm watchdog failsafe, aim point parallax convergence handling.
  - `src/ui/hud.js`: Gamepad curve status reflected in crosshair bracket classes.
- **Tests**: Updates and additions to `test/gameplay/physics_and_combat.test.js` and automated headless test suites.
- **Dependencies**: No external dependency changes.
