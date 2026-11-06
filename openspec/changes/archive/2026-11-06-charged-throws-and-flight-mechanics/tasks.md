# Tasks: Charged Throws, Floor Aim Parity, and Curved Skip Ricochets

## 1. Downward Floor Aim & Ballistic Flight Parity

- [x] 1.1 Update `aimTarget()` in `src/entities/Player.js` to reduce floor raycast clearance distance from 8.0m to 2.5m, allowing valid floor targeting points across the arena.
- [x] 1.2 Remove the artificial `dir.y = Math.max(-0.04, _rd.y)` pitch clamp in `throwDisc()` (`src/entities/Player.js`) and `updateTrajectory()` (`src/physics/trajectory.js`) for targets beyond 2.5m.
- [x] 1.3 Suspend upward hover easing in `updateDiscs()` (`src/entities/Disc.js`) and `simulatePath()` (`src/physics/trajectory.js`) during active downward ballistic flight ($v_y < -0.2\text{ m/s}$) prior to first impact.
- [x] 1.4 Add automated test in `test/gameplay/physics_and_combat.test.js` verifying downward-aimed throws hit targeted floor tiles and match trajectory simulation.

## 2. Floor Ricochet Curve Retention

- [x] 2.1 Update floor impact logic in `src/entities/Disc.js` to retain 65% lateral curve spin (`D.curve = D.curve * 0.65`) while applying upward rebound pop.
- [x] 2.2 Update `simulatePath()` in `src/physics/trajectory.js` to preserve 65% curve spin upon floor tile contact, ensuring trajectory preview parity.
- [x] 2.3 Add test coverage in `test/gameplay/physics_and_combat.test.js` confirming skip-shot curve retention and trajectory prediction parity.

## 3. Charged Throws & Gyroscopic Curvature

- [x] 3.1 Implement press-to-charge and release-to-throw input handling in `src/entities/Player.js` supporting keyboard/mouse, gamepad, and touch controls.
- [x] 3.2 Update `spawnDisc()` and `updateDiscs()` in `src/entities/Disc.js` to accept `charge` ($0.0$ to $1.0$), scaling launch velocity ($38 \to 55\text{ m/s}$), base damage ($55 \to 95\text{ HP}$), and applying gyroscopic curve dampening ($a_{\text{curve}} \propto 1.0 - 0.65 \times \text{charge}$).
- [x] 3.3 Update `simulatePath()` and `updateTrajectory()` in `src/physics/trajectory.js` to simulate charged velocity and gyroscopic curve dampening during aim preview.
- [x] 3.4 Serialize `charge` scalar into `DISC_THROW` network packets in `src/network/sync.js` and unpack in remote peer throw instantiation.
- [x] 3.5 Add tests verifying charge velocity scaling, damage calculations, and gyroscopic curve reduction.

## 4. Guard Crush & Diegetic HUD Feedback

- [x] 4.1 Implement Guard Crush resolution in `src/entities/Disc.js` for throws with $\ge 85\%$ charge, bypassing block/shield deflection, applying full damage, and triggering stagger.
- [x] 4.2 Update `applyDamageToTarget()` in `src/entities/Disc.js` to allow charged throws ($\ge 85\%$) to pierce Arbiter boss shield plates and damage the core.
- [x] 4.3 Add dynamic circular charge arc HUD element around crosshair in `src/ui/hud.js`, transitioning color and thickness up to guard crush threshold.
- [x] 4.4 Add charge windup SFX and launch blast triggers in `src/audio/sfx.js` and gamepad controller haptics in `src/input/gamepad.js`.
- [x] 4.5 Run full test suite (`npm test`) and verify physics, combat, and integration flows pass without regressions.
