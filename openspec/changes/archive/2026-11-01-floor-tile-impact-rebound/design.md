# Design

## Context

See `proposal.md` for background and motivation.

Currently in `src/entities/Disc.js` and `src/physics/trajectory.js`, when a thrown disc reaches the floor plane (`D.pos.y <= yFloor`), vertical velocity is clamped to zero (`D.vel.y = 0`) and `D.launchY` is set to `yFloor` ($0.55\text{m}$). Because the hover damping logic does not pull the disc upward from this boundary, the disc glides along the floor surface across consecutive frames. At every frame, `getTileAt(D.pos.x, D.pos.z)` encounters the next tile in sequence, triggering `triggerTileWarning()` across a whole line of tiles (as seen in the user's screenshot).

## Goals / Non-Goals

**Goals:**
- Guarantee that a disc thrown into the floor degrades exactly one floor tile per ground impact.
- Impart a snappy, natural upward rebound ($v_y \approx +3.5\text{ m/s}$) that immediately lifts the disc off the floor plane.
- Reset vertical cruise hover target (`launchY = 1.7`) so the disc smoothly climbs back to chest elevation ($1.7\text{m}$) after bouncing.
- Maintain full simulation parity between `src/entities/Disc.js` and `src/physics/trajectory.js` (`simulatePath`).

**Non-Goals:**
- Modifying wall or pillar collision mechanics (walls remain specular reflections with normal inversion).
- Changing pit or void handling (discs over de-rezzed pits continue falling through).
- Altering the warning duration or de-rezzing timer of floor tiles.

## Decisions

### Decision 1: Discrete Upward Pop Impulse vs Elastic Restitution
- **Choice**: Set an explicit positive upward velocity (`v_y = 3.5 m/s`) and clear the floor threshold (`p_y = yFloor + 0.05`).
- **Rationale**: Downward throws can have varying vertical speeds ($v_y \in [-1, -8]$). A purely elastic bounce (e.g. $-v_y \cdot e$) either bounces too shallowly on soft throws (risking multi-tile grazing) or too high into the ceiling on hard throws. A fixed upward pop of $+3.5\text{ m/s}$ provides a reliable, game-feel-tested hop that clears the floor plane cleanly on the very next frame while staying well below ceiling boundaries.
- **Alternatives Considered**:
  - *Full specular vertical reflection ($-v_y$)*: Causes chaotic, steep vertical bounces that break horizontal disc combat flow.
  - *Keep $v_y = 0$ and disable tile collision after first hit*: Leaves the disc unnaturally skimming along the floor at ankle height ($0.55\text{m}$), which looks visually broken.

### Decision 2: Cruise Target Altitude Restoration
- **Choice**: Reset `D.launchY = 1.7` (and in preview, cruise target) upon floor contact.
- **Rationale**: During flight, discs apply hover acceleration toward `launchY` (`dY = D.launchY - D.pos.y`). Setting `launchY = 1.7` allows hover acceleration to catch the disc after its upward pop, smoothly leveling it out into horizontal flight at standard chest height ($1.7\text{m}$) for catching or banking into enemies.
- **Alternatives Considered**:
  - *Leaving `launchY` unchanged from throw*: If thrown downward from crouch or low aim, `launchY` might remain low, preventing natural altitude recovery.

### Decision 3: Deterministic Trajectory Arc Parity
- **Choice**: Apply identical floor bounce logic (`v.y = 3.5`, `k = 0`, `p.y = yFloor + 0.05`, `bounces++`) within `simulatePath()` in `src/physics/trajectory.js`.
- **Rationale**: The aiming guide must accurately render the post-bounce arc and show the upward hop and subsequent level cruise path, giving the player visual feedback of where the ricochet will travel.

## Risks / Trade-offs

- **[Risk] High speed disc skimming edge case**: At high framerates or shallow throw angles, could two consecutive frames both touch within the same tile or an adjacent tile?
  - *Mitigation*: Setting `pos.y = yFloor + 0.05` places the disc immediately above `yFloor` ($0.55\text{m}$), and $v_y = +3.5\text{ m/s}$ guarantees the disc moves upwards ($y$ strictly increasing) on subsequent frames, making consecutive floor collisions physically impossible on the same bounce.
- **[Risk] Ceiling collision on low ceilings**:
  - *Mitigation*: Arena height is typically $6.0\text{m}$ or higher; a pop of $3.5\text{ m/s}$ with gravity and hover dampening peaks around $y \approx 2.0\text{m} - 2.2\text{m}$, remaining comfortably below any overhead boundaries.
