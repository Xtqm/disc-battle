# Proposal

## Why

When throwing an Identity Disc while airborne (such as during an Air Jump or void recovery), the projected trajectory and live projectile curve sharply downward into the arena floor immediately upon launch, bounce off the floor surface, and reflect upward. This regression stems from two compounding issues: (1) an obsolete hover dampener in `Disc.js` and `trajectory.js` that forcibly pulls disc elevation down toward ground chest height (`1.7m`), fighting midair launch altitude; and (2) an over-the-shoulder third-person camera parallax flaw in `aimTarget()` where downward camera rays intersect the floor plane 1–3 meters in front of the player's feet, converting a forward aim angle into an extreme -75° to -85° downward dive.

## What Changes

- **Launch-Elevation Cruise Stabilization**: Store `launchY: pos.y` on each thrown projectile in `src/entities/Disc.js` and reference `origin.y` in `src/physics/trajectory.js`, replacing the hardcoded `1.7m` target with `launchY`. Midair projectiles will glide along their true aim vector without artificial downward gravitational drag.
- **Near-Parallax Floor Raycast Protection**: In `src/entities/Player.js` (`aimTarget`), enforce a minimum forward distance threshold (`forwardDist >= 8.0m`) for floor plane raycast hits. Floor intersections falling within the player's immediate personal radius or behind them will be ignored, allowing the aim ray to project forward into the arena rather than snapping downward into the thrower's feet.
- **Trajectory & Live Simulation Parity**: Ensure `simulatePath` and `updateDiscs` utilize identical launch-height stabilization logic and hit boundaries.
- **Automated Midair Combat Verification**: Add automated test cases in `test/gameplay/physics_and_combat.test.js` validating that midair throws maintain altitude without ground contact across normal pitch ranges (-0.15 to -0.25 rad).

## Capabilities

### Modified Capabilities

- `disc-combat`: Update trajectory prediction and surface restitution requirements to specify launch-relative altitude cruise stabilization and near-parallax floor aim protection.

## Impact

- `src/entities/Disc.js`: `spawnDisc` records `launchY`; `updateDiscs` stabilizes `pos.y` toward `D.launchY`.
- `src/physics/trajectory.js`: `simulatePath` stabilizes `p.y` toward `origin.y`.
- `src/entities/Player.js`: `aimTarget` filters out floor raycast hits within `forwardDist < 8.0m`.
- `test/gameplay/physics_and_combat.test.js`: Adds dedicated test cases for midair throw trajectory and floor clearance.
