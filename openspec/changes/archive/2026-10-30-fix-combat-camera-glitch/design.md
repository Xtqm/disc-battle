# Design

## Context

The combat camera in `src/graphics/scene.js` currently derives its orientation by invoking `camera.lookAt(look)` on a close-range 14m target point, while `camera.position` smoothly interpolates towards `desired` at ~25% per frame. When players make sudden mouse flicks, dash backwards (34–38 units/sec), or maneuver against arena walls ($Z = \pm 44$), the camera position and the 14m look target can collapse into the same vertical column or cross each other. This triggers Three.js's lookAt gimbal lock workaround (`_z.z += 0.0001`), resulting in sudden 90° or 180° orientation snaps.

Furthermore, Chromium pointer lock events periodically dispatch synthetic delta jumps (500–1920px) on cursor boundary wraps, which `src/input/mouse.js` applies directly without clamping.

## Goals / Non-Goals

**Goals:**
- Guarantee 1:1, glitch-free camera aiming that never flips, snaps, or inverts, regardless of player velocity, dash maneuvers, or camera flicks.
- Decouple rotational aiming from positional smoothing so the camera always points in the exact player aim direction without angular lag.
- Implement soft boom compression near arena perimeter walls to prevent wall clipping without hard-clamping position into singularities.
- Filter synthetic pointer lock delta spikes in `mouse.js`.
- Maintain full parity with disc throwing, trajectory prediction, and HUD crosshair positioning.

**Non-Goals:**
- First-person camera mode.
- Full 3D obstacle occlusion / raycast raymarching against pillars or enemies (arena bounds and player separation are sufficient).

## Decisions

### Decision 1: Direct Euler / Quat Orientation (Decoupled from Position)
- **Choice**: Derive camera orientation directly from `state.player.pitch` and `state.player.yaw` using `YXZ` Euler rotation (`camera.rotation.set(pitch, yaw, 0, 'YXZ')`), or an aligned camera forward vector derived directly from `(yaw, pitch)`.
- **Rationale**: Setting camera rotation directly eliminates the dependency on `camera.position` when calculating view orientation. No matter where the camera is positioned or how fast it moves, the line of sight always aligns with the crosshair and never experiences gimbal lock flips or angular lag.
- **Alternatives Considered**: Keeping `camera.lookAt` but extending target distance to 200m. *Rejected* because positional lag still causes slight parallax drift, and boundary clamping can still invert the vector if the camera gets behind the player.

### Decision 2: Spherical Spring Arm / Boom with Soft Wall Compression
- **Choice**: Position the camera relative to a player pivot:
  ```
  pivot = player.pos + Vector3(0, HEIGHT + player.y * 0.85, 0)
  idealOffset = rotate(Vector3(-SHOULDER, 0, DIST), yaw, pitch)
  ```
  When the ideal camera position exceeds arena boundaries, scale down the effective `DIST` along the boom toward the player pivot rather than clamping X and Z independently.
- **Rationale**: Scaling boom distance keeps the camera inside the arena while ensuring the camera never passes through the player or inverts its offset relative to the character.
- **Alternatives Considered**: Independent clamping of `desired.x` and `desired.z`. *Rejected* because independent coordinate clamping distorts the camera angle and can pin the camera inside the character model.

### Decision 3: Symmetrical Shoulder Offset
- **Choice**: Harmonize the shoulder offset in `scene.js` so `camOff` and the forward aim vector share a consistent right-shoulder baseline.
- **Rationale**: Eliminates the cross-eyed 8.4° diagonal parallax between the left-shoulder camera and right-side target point.

### Decision 4: Pointer Lock Delta Spike Clamping
- **Choice**: In `src/input/mouse.js:look(dx, dy)`, clamp `dx` and `dy` to a maximum magnitude of `±180px` per event.
- **Rationale**: Even the fastest human flick does not exceed 100–140px per `mousemove` tick at standard polling rates. Chromium pointer lock warp spikes typically exceed 500–1920px. Clamping eliminates warp jumps completely without affecting high-speed aiming.

## Risks / Trade-offs

- **[Risk] Wall boom compression feels too rapid** → **Mitigation**: Apply progressive distance compression starting 4 meters before the boundary wall to ensure smooth zooming.
- **[Risk] High-DPI fast flick clipping** → **Mitigation**: A 180px clamp allows up to 23 radians/sec rotation speed at 60Hz (over 1300 degrees/sec), far higher than any realistic human flick.
- **[Risk] Multiplayer spawn camera mismatch** → **Mitigation**: Update `src/network/roomManager.js` to ensure the multiplayer match start initializes the camera using the unified boom geometry.
