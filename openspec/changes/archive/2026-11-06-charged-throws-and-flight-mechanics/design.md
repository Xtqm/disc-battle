# Design: Charged Throws, Floor Aim Parity, and Curved Skip Ricochets

## Context

Identity disc flight physics are governed across [`src/entities/Player.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Player.js) (aim raycasting, launch origins, watchdog timers), [`src/entities/Disc.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Disc.js) (flight simulation, Magnus curvature, impact restitution, and hit resolution), and [`src/physics/trajectory.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/physics/trajectory.js) (aim prediction and threat lines).

Currently, three constraints restrict tactical throw variety:
1. An aggressive pitch clamp (`dir.y = Math.max(-0.04, _rd.y)`) and continuous upward hover easing (`p.y += (1.7 - p.y) * dt * 2.2`) prevent discs from hitting targeted floor tiles beyond close range.
2. Ground impacts zero out curve spin (`D.curve = 0`), eliminating skip-shot hook potential.
3. Throws are fixed-velocity, fixed-damage actions with no counterplay against persistent blocking.

See [`proposal.md`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/openspec/changes/charged-throws-and-flight-mechanics/proposal.md) and [`specs/disc-combat/spec.md`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/openspec/changes/charged-throws-and-flight-mechanics/specs/disc-combat/spec.md) for requirements.

## Goals / Non-Goals

**Goals:**
- Provide seamless tap-to-throw vs. hold-to-charge input controls across keyboard/mouse, gamepad, and touch.
- Guarantee 100% mathematical parity between live disc trajectory and predicted aim arcs for charged velocities, downward floor targeting, and curved skip-shots.
- Implement gyroscopic rigidity: scale Magnus lateral hook inversely with throw charge ($a_{\text{curve}} \propto 1.0 - 0.65 \times \text{charge}$).
- Implement Guard Crush at $\ge 85\%$ charge to break enemy blocks and boss shield plates.
- Preserve 65% lateral curve spin on floor impacts without flipping spin direction.

**Non-Goals:**
- Introducing non-disc weapon categories (melee staff, daggers) — reserved for future weapon framework.
- Modifying arena floor tile mesh geometry or destructible grid sizing.
- Altering the 3-bounce maximum ricochet limit.

## Decisions

### 1. Hold-to-Charge Input Cycle
* **Decision**: Charge begins when the primary fire input is pressed down (`pointerdown`, `gamepad.buttons[7]`, or `touch`) while `player.hasDisc` is true. Releasing the input launches the projectile with the accumulated charge ratio ($c \in [0.0, 1.0]$). If released within $< 0.1\text{s}$, the throw executes as an instant tap ($c = 0$).
* **Alternatives Considered**: 
  * Double-click or separate hotkey: Rejected because hold-and-release is the universal gaming standard for charged projectile weapons.

### 2. Velocity, Damage & Gyroscopic Rigidity Scaling
* **Decision**:
  - Velocity: $v(c) = 38.0 + 17.0 \times c$ ($38.0\text{ m/s}$ to $55.0\text{ m/s}$).
  - Base Damage: $D_{\text{base}}(c) = 55.0 + 40.0 \times c$ ($55\text{ HP}$ to $95\text{ HP}$).
  - Gyroscopic Rigidity: $k_{\text{eff}} = \text{curve} \times (1.0 - 0.65 \times c)$.
  - Energy conservation: Lateral acceleration is applied strictly in the horizontal X/Z plane, preserving vertical pitch velocity.
* **Alternatives Considered**:
  - Constant curve regardless of charge: Rejected because high-speed hooks would create disorienting, uncontrollable turn radii; gyroscopic rigidity provides a balanced gameplay trade-off between wide obstacle hooking and direct shield-piercing power.

### 3. Downward Floor Aim & Hover Decoupling
* **Decision**:
  - In `aimTarget()`, reduce the floor raycast exclusion distance from $8.0\text{m}$ to $2.5\text{m}$ (only protecting against floor hits inside the player's immediate footprint).
  - In `throwDisc()` and `updateTrajectory()`, remove the `dir.y = Math.max(-0.04, _rd.y)` clamp for targets beyond $2.5\text{m}$.
  - In `updateDiscs()` and `simulatePath()`, hover easing (`p.y += (cruiseY - p.y) * dt * 2.2`) is suspended whenever $v_y < -0.2\text{ m/s}$ and the disc has not yet hit a surface. This allows the disc to track straight down to its intended floor target.
  - Upon floor contact, the upward bounce pop ($v_y = 3.5\text{ m/s}$) resets `cruiseY = 1.7\text{m}`, re-engaging hover stabilization after the rebound.

### 4. Floor Ricochet Curve Retention
* **Decision**:
  - On solid floor contact, update curve spin:
    $$k_{\text{after}} = k_{\text{before}} \times 0.65$$
  - Unlike wall bounces where the disc strikes edge-on and flips spin sign ($k = -k \times 0.5$), floor contact occurs along the bottom face where spin direction around the Y-axis is conserved.

### 5. Guard Crush & Shield Penetration
* **Decision**:
  - In `updateDiscs()`, when a disc with $c \ge 0.85$ collides with a blocking player or bot:
    1. Parry/deflection check evaluates as `false`.
    2. Inflicts full charged damage.
    3. Displays `GUARD CRUSH // SHIELD BYPASSED` alert.
    4. Applies heavy screen shake ($0.35$) and gamepad haptics ($180\text{ms}$).
  - In `applyDamageToTarget()`, for Arbiter bosses with active shields, charged hits bypass outer rotating shields and damage the core.

### 6. Multiplayer Synchronization
* **Decision**: Include `charge: +charge.toFixed(2)` in `DISC_THROW` packets over WebRTC DataChannels and Firebase. Remote peers instantiate `spawnDisc` with the transmitted charge, applying matching speed, trail intensity, and damage scaling.

## Risks / Trade-offs

- **[Risk] High-speed tunneling through collision hitboxes at 55 m/s**
  $\to$ **Mitigation**: At $55\text{ m/s}$ and $90\text{ Hz}$ tick rate, distance per step is $\approx 0.61\text{m}$, which is significantly smaller than player/foe collision diameters ($1.8\text{m} - 1.9\text{m}$) and pillar diameters ($3.0\text{m}$). Discrete collision checks remain stable.

- **[Risk] Floor aiming clipping through destructible tile edges**
  $\to$ **Mitigation**: Floor threshold enforcement ($y \le \text{DISC\_R}$) clamps position to $y = y_{\text{floor}} + 0.05$ and triggers tile warning before applying upward rebound impulse.

- **[Risk] Input lag perception during tap throws**
  $\to$ **Mitigation**: Taps release immediately on button up. If held for $\le 0.08\text{s}$, throw fires with zero charge latency.
