# Design

## Context

Aiming in Tron Disc Arena is driven from an over-the-shoulder third-person camera in `src/graphics/scene.js` (`updateCamera`), where `camera.position` sits offset by `DIST = 9.0m` behind, `SHOULDER = 1.7m` to the right, and `HEIGHT = 4.3m` above the player pivot (`1.8 + player.y * 0.85`).

Aim targeting is computed in `src/entities/Player.js` (`aimTarget`), while trajectory preview simulation and live projectile integration are executed in `src/physics/trajectory.js` (`simulatePath`) and `src/entities/Disc.js` (`updateDiscs`).

See `proposal.md` for background context and problem analysis.

## Goals / Non-Goals

**Goals:**
- Ensure thrown identity discs maintain their launch elevation during midair flight without artificial downward gravitational drag.
- Eliminate the third-person near-parallax floor convergence bug where camera rays intersecting the floor near or under the player produce an extreme downward launch angle into the floor surface.
- Preserve intentional floor bank shots when the player aims down at the arena floor at medium to long range (>= 8.0m in front).
- Maintain 100% mathematical and topological parity between `simulatePath` and `updateDiscs`.

**Non-Goals:**
- Switching the game to a first-person camera perspective.
- Altering the fundamental 38 m/s throw speed, restitution dampening coefficient (0.65), or Magnus curve acceleration (38 m/s²).

## Decisions

### Decision 1: Cruise Altitude Relative to `launchY`
- **Choice**: Store `launchY: pos.y` on projectile instances in `spawnDisc`. In both `src/entities/Disc.js` (`updateDiscs`) and `src/physics/trajectory.js` (`simulatePath`), update the hover dampening calculation to stabilize `p.y` relative to `launchY` (or `origin.y` in simulation) rather than hardcoded `1.7`:
  ```javascript
  const cruiseY = D.launchY !== undefined ? D.launchY : 1.7;
  D.pos.y += (cruiseY - D.pos.y) * Math.min(1, dt * 2.2);
  ```
- **Rationale**: For ground throws, `launchY` is `1.7m`, preserving 100% backwards compatibility with existing ground physics. For midair throws (e.g. `launchY = 5.2m`), `(launchY - p.y) === 0` at launch, eliminating the artificial downward drag that caused midair throws to curve into the floor. After an intentional floor bounce, vertical elevation smoothly recovers toward `launchY` instead of floating away.
- **Alternatives Considered**: Completely deleting hover dampening. Rejected because post-ricochet vertical velocity (`v.y = -v.y * 0.65`) would cause bounced discs to ascend indefinitely into the sky without an altitude restoration force.

### Decision 2: Near-Parallax Floor Raycast Guard (`forwardDist >= 8.0m`)
- **Choice**: In `src/entities/Player.js` (`aimTarget`), evaluate the world hit point of any floor plane intersection (`t = -_ro.y / _rd.y`) against the player's forward vector:
  ```javascript
  if (_rd.y < -0.001) {
    const t = -_ro.y / _rd.y;
    const hitP = _ro.clone().addScaledVector(_rd, t);
    const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
    const forwardDist = hitP.sub(state.player.pos).dot(fwd);
    if (forwardDist >= 8.0 && t > 0.5 && t < best) {
      best = t;
      hitFoe = null;
    }
  }
  ```
- **Rationale**: Because the camera sits 9m behind the player, small `t` values (e.g. 10–12m from camera) land 1–3m in front of the player's feet. Calculating `dir = (aimPoint - chest).normalize()` from a 5.2m high chest to a 0m floor point only 2m away creates an artificial -75° to -85° downward dive. By requiring `forwardDist >= 8.0m`, floor hits within the player's personal collision bubble are rejected, allowing the crosshair ray to continue forward into the arena along the player's true look direction.
- **Alternatives Considered**: Clamping ray origin to `player.pos`. Rejected because it breaks third-person crosshair alignment with targets.

## Risks / Trade-offs

- **[Risk] Intentionally aiming at the floor within 8 meters**: A player aiming directly down at their own feet will have their shot project forward along camera pitch rather than converging sharply onto their toes.
  - *Mitigation*: 8.0m is approximately two grid tiles. Aiming at the floor 2+ tiles ahead still triggers floor bank shots, while preventing the degenerate toe-shot bug.
