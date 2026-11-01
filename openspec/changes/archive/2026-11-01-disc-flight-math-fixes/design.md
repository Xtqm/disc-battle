# Design: Disc Flight Math and Floor Ricochet Dynamics

## Context

See `proposal.md` for background and problem motivation.

In the current implementation:
1. `aimTarget()` raycasts from the camera center. When the ray intersects the floor at $y = 0$, `throwDisc()` computes the throw vector from the player's chest (`y = 1.7 + player.y`) to that ground point. This assigns a large negative vertical velocity ($v_{y0} \ll 0$), driving the disc downward into the floor immediately in front of the player.
2. In `src/entities/Disc.js` and `src/physics/trajectory.js`, floor contact inverts vertical velocity ($v_y \leftarrow -v_y \cdot 0.65$). Because discs operate in zero gravity ($g = 0$), this positive velocity is never countered by gravity, rocketing the disc upward into high-altitude climbs.
3. The Magnus curving routine computes total speed $\sqrt{nv_x^2 + v_y^2 + nv_z^2}$. Lateral acceleration in the $XZ$ plane increases the denominator and scales down $v_y$ by $s < 1$, while steep vertical velocity suppresses horizontal curving radius.
4. Floor contacts do not reset or reverse lateral spin $k$, causing discs to corkscrew while ascending.

## Goals / Non-Goals

**Goals:**
- Guarantee forward-aimed disc throws launch horizontally ($v_y \approx 0$) at cruising/chest elevation rather than angling into the floor.
- Maintain destructible floor tile degradation: whenever a disc contacts an intact tile, it triggers tile damage (`hitTile`) to preserve arena hazards.
- Replace unbounded gravity-free upward rebound with clean surface gliding ($v_y = 0$, $p_y = R_{\text{disc}}$) and curve spin dissipation ($k = 0$) upon floor impact.
- Restrict Magnus curve speed conservation strictly to the horizontal $XZ$ plane ($hSpeed$), fully decoupling vertical pitch from lateral hook mechanics.
- Ensure 100% mathematical and behavioral parity between `src/physics/trajectory.js` and `src/entities/Disc.js`.

**Non-Goals:**
- Introducing parabolic gravity drops to standard disc flight (discs remain arcade laser/energy discs).
- Altering specular wall or pillar bounce physics ($k \leftarrow -k \cdot 0.5$).
- Modifying enemy rear-strike, parry mechanics, or recall homing physics.

## Decisions

### Decision 1: Launch Vector Pitch Clamping
In `src/entities/Player.js` (`throwDisc`) and `src/physics/trajectory.js` (`updateTrajectory`):
- When computing `dir = aim.point.clone().sub(chest).normalize()`, clamp `dir.y`:
  $$dir.y = \max(-0.04, dir.y)$$
  (or clamp based on player pitch angle).
- *Rationale*: Forward throws from standing or midair positions maintain horizontal flight. Deliberate steep downward targeting is still supported for intentional floor strikes, but the camera raycast geometry can no longer force the disc to clip the floor at the thrower's feet.
- *Alternatives considered*: Disabling floor raycasting completely in `aimTarget()`. Rejected because players need to target enemies standing on floor tiles and intentionally break floor tiles.

### Decision 2: Floor Surface Glide with Tile De-Rez Preservation
In `src/entities/Disc.js` (`updateDiscs`) and `src/physics/trajectory.js` (`simulatePath`):
- When a disc reaches $p_y \le y_{\text{floor}}$:
  1. Detect the tile beneath $(p.x, p.z)$. If intact, trigger `hitTile(tile)` to initiate its warning/collapse lifecycle.
  2. Zero out vertical velocity: $v_y = 0$, clamp $p_y = y_{\text{floor}}$.
  3. Dissipate lateral curve spin: $k = 0$ (or $D.curve = 0$).
  4. If downward velocity was significant prior to impact, record a bounce pip and trigger spark burst/shake, then allow the disc to continue gliding forward across intact tiles.
- *Rationale*: Solves the skyward rocket problem cleanly while fully preserving the destructible arena tile mechanics.
- *Alternatives considered*: Adding gravitational acceleration ($g = -30\text{ m/s}^2$). Rejected because gravity causes discs to drop like lead weights rather than cruising like energy projectiles.

### Decision 3: 2D Horizontal Magnus Normalization
In `src/entities/Disc.js` and `src/physics/trajectory.js`:
- Update lateral acceleration to scale only horizontal velocity components:
  $$nv_x = v_x + n_x \cdot a_{\text{lat}}, \quad nv_z = v_z + n_z \cdot a_{\text{lat}}$$
  $$\text{newHSpeed} = \sqrt{nv_x^2 + nv_z^2}, \quad s_h = \frac{hSpeed}{\text{newHSpeed}}$$
  $$v_x = nv_x \cdot s_h, \quad v_z = nv_z \cdot s_h$$
  ($v_y$ remains untouched by the curve step).
- *Rationale*: Mathematical decoupling prevents lateral hooks from damping pitch velocity and prevents pitch velocity from suppressing horizontal turn radius.

## Risks / Trade-offs

- **[Risk]**: A disc skimming at $y = R_{\text{disc}}$ might clip void tile lips or drop into void pits unexpectedly.
  - **Mitigation**: Existing void lip collision in `Disc.js` handles drops into missing floor tiles. Intact tiles sustain surface glides.
- **[Risk]**: Trajectory preview arc desynchronizing from live flight.
  - **Mitigation**: Mirror the exact mathematical equations and constants across both `simulatePath` and `updateDiscs`.
