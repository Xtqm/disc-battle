# Design

## Context

The Identity Disc throwing system spans four tightly coupled modules:
- `src/entities/Disc.js`: Live disc kinematic integration, Magnus lateral curve acceleration, floor/wall/pillar/hazard ricochets, character hit detection, and return recall.
- `src/physics/trajectory.js`: Discrete forward simulation (`simulatePath`) used to render the dotted cyan/orange/white trajectory arc and bounce pips.
- `src/entities/Player.js`: Crosshair aiming raycast (`aimTarget`), throw origin computation, throw dispatch, and state tracking.
- `src/ui/hud.js`: Crosshair styling (aim lock, bank shot indicator, curve brackets).

See `proposal.md` for the motivation and behavioral issues observed in flight and aim prediction.

## Goals / Non-Goals

**Goals:**
- Guarantee 100% mathematical and topological parity between `simulatePath` and `updateDiscs`, ensuring the predicted flight path and bounce count never diverge from live execution.
- Implement elastic rebound physics when a player's disc strikes a foe, matching the existing rebound feel of bot and deflected disc collisions.
- Ensure returning discs home directly in 3D to the thrower's true chest elevation without being pulled down by floor-hover dampening.
- Provide a robust failsafe watchdog for the player character to prevent soft-locking in an unarmed state.
- Unify curve HUD indicator states across keyboard, gamepad, and touch.

**Non-Goals:**
- Altering the fundamental 38 m/s throw speed or `CURVE_ACCEL` (38.0 m/s²) values.
- Switching from a third-person camera perspective to a first-person perspective.
- Redesigning AI boss state machines or campaign level hazard configurations.

## Decisions

### Decision 1: Terminate `simulatePath` at Exactly `maxBounces`
- **Choice**: In `simulatePath`, change the loop condition to `while (t < tMax && bounces < maxBounces)` and immediately terminate when `bounces >= maxBounces`.
- **Rationale**: Live projectiles in `Disc.js` transition to `returning = true` as soon as `D.bounces >= 3`. In the existing simulation code, `bounces <= 3` allowed a full 4th trajectory segment to be computed and rendered, displaying phantom target hits that live throws could never reach.
- **Alternatives Considered**: Increasing live disc bounce limit to 4. Rejected because 3 bounces is the established gameplay balance constant across arenas and achievements.

### Decision 2: Standardize Elastic Impact Rebound on Target Hits
- **Choice**: When a player disc hits a foe (`Disc.js#L384`), invert horizontal velocity with damping (`D.vel.multiplyScalar(-0.45)`), add vertical pop (`D.vel.y = Math.random() * 2 + 1`), reset lateral curve (`D.curve = 0`), push the position outside the target's bounding radius, and transition to `returning = true`.
- **Rationale**: This mirrors the exact rebound logic already proven in `Disc.js#L477` (enemy disc hits player) and `Disc.js#L293` (deflected disc hits enemy). It eliminates forward phase-through and prevents clipping into walls behind enemies.
- **Alternatives Considered**: Stopping the disc dead in space on hit (`D.vel.set(0, 0, 0)`). Rejected because it feels static and unnatural compared to a dynamic ricochet.

### Decision 3: Decouple Hover Dampening from Return Recall
- **Choice**: Guard the hover dampener with `if (!D.returning && D.pos.y > config.DISC_R)` in `updateDiscs(dt)`.
- **Rationale**: While in forward flight, maintaining chest height (1.7m) is key to disc aerodynamics. When returning, however, the disc is homing toward `holder.pos.y + 1.7`. Pulling `D.pos.y` down to 1.7 while the thrower is jumping at Y=4.0 creates an artificial gravitational drag that causes the disc to oscillate or miss the player.
- **Alternatives Considered**: Adjusting the dampener target from 1.7 to `holder.pos.y + 1.7`. Rejected because `D.vel.lerp(dir.multiplyScalar(34))` already handles 3D directional steering toward the player; adding an extra position lerp is redundant and causes overshoot.

### Decision 4: Player Re-Arm Failsafe Watchdog & Catch SFX
- **Choice**: In `updatePlayer(dt)`, track `state.player.noDiscTimer` when `!state.player.hasDisc && !state.discs.some(d => d.owner === 'player')`. If this exceeds 3.0 seconds, force `state.player.hasDisc = true` and trigger `SFX.catchDisc()`. Also call `SFX.catchDisc()` in `Disc.js` whenever `L < 1.4` reloads the disc.
- **Rationale**: Matches the existing watchdog on the AI boss (`Bot.js#L305`) and ensures arena geometry glitches or void anomalies never leave the player unarmed. Audio feedback upon reload restores clear sensory confirmation.

### Decision 5: Sector Hazard Reflection in Trajectory Simulation
- **Choice**: Import `sectorHazardBuilder` into `src/physics/trajectory.js` and execute `sectorHazardBuilder.checkDiscCollision({ pos: p, vel: v, bounces, curve: k })` in `simulatePath`.
- **Rationale**: When sector hazards are active, live discs bounce off them. Mirroring this check in `simulatePath` ensures the trajectory line reflects across hazard walls rather than passing straight through.

### Decision 6: Gamepad Curve State in HUD Crosshair
- **Choice**: In `src/ui/hud.js`, update `qHeld` and `eHeld` to check `state.gamepadCurveL` and `state.gamepadCurveR` alongside keyboard and touch flags.
- **Rationale**: Complete visual parity across controller, keyboard, and touch inputs.

## Risks / Trade-offs

- **[Risk] High-speed rebound off moving foes near walls**: An elastic rebound might immediately collide with a nearby boundary wall.
  - *Mitigation*: Reset `D.bounces = 0` on target impact and push `D.pos` outside the target hitbox along the impact normal before reversing velocity, ensuring clean clearance.
- **[Risk] Hazard builder null safety in simulation**: On non-campaign modes, `sectorHazardBuilder` is null.
  - *Mitigation*: Guard with `if (sectorHazardBuilder && typeof sectorHazardBuilder.checkDiscCollision === 'function')`.
