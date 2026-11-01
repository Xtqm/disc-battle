# Tasks

## 1. Launch Vector Pitch Clamping & Parallax Protection

- [x] 1.1 Clamp launch pitch in `src/entities/Player.js` (`throwDisc`) to ensure forward throws launch horizontally at chest elevation and verify unit tests pass.
- [x] 1.2 Apply matching launch pitch clamping in `src/physics/trajectory.js` (`updateTrajectory`) and verify predicted trajectory matches live launch angle.

## 2. 2D Horizontal Magnus Speed Conservation

- [x] 2.1 Refactor lateral Magnus acceleration in `src/entities/Disc.js` (`updateDiscs`) to normalize speed strictly in the horizontal $XZ$ plane without damping $v_y$ and verify with curve tests.
- [x] 2.2 Refactor Magnus curve integration in `src/physics/trajectory.js` (`simulatePath`) to maintain 100% mathematical parity with live disc horizontal normalization.

## 3. Floor Surface Glide with Destructible Tile De-Rez Triggering

- [x] 3.1 Update floor collision in `src/entities/Disc.js` (`updateDiscs`) to trigger `hitTile(tile)` on intact floor tiles, dissipate curve spin ($D.curve = 0$), and zero vertical velocity into a surface glide ($v_y = 0$, $p_y = R_{\text{disc}}$), verifying tile degradation triggers.
- [x] 3.2 Update floor collision simulation in `src/physics/trajectory.js` (`simulatePath`) to mirror surface gliding and spin dissipation, verifying preview arc stops upward ricochets.

## 4. Verification & Regression Suite

- [x] 4.1 Extend physics regression tests in `test/gameplay/physics_and_combat.test.js` covering horizontal launch pitch, floor tile degradation triggers, surface glide bounds, and 2D Magnus curve consistency.
- [x] 4.2 Run the complete project test suite (`npm test`) and verify that all gameplay, combat, and visual tests pass cleanly.

## Workflow follow-up

- Archive the change after implementation and test verification are complete.
