# Tasks

## 1. Input Filtering & Pointer Lock Hardening

- [x] 1.1 Add delta clamping in `src/input/mouse.js:look(dx, dy)` to cap single-event mouse deltas (e.g. `±180px`), filtering browser synthetic pointer lock warp spikes, and verify with unit tests.
- [x] 1.2 Harden pointer lock state transitions in `src/input/mouse.js` to prevent pitch/steer overwrites during asynchronous lock negotiation.

## 2. Camera Boom & Orientation Architecture

- [x] 2.1 Refactor `src/graphics/scene.js:updateCamera(dt)` to drive camera orientation directly from player pitch and yaw, eliminating the short-distance `lookAt` gimbal-lock singularity.
- [x] 2.2 Implement boom distance compression near arena perimeter walls in `src/graphics/scene.js` to smoothly pull the camera inward rather than hard-clamping coordinates into player collision.
- [x] 2.3 Correct shoulder offset alignment in `src/graphics/scene.js` and `src/network/roomManager.js` to ensure consistent right-shoulder perspective without diagonal cross-eyed aim parallax.

## 3. Aim System Integration & Verification

- [x] 3.1 Verify `aimTarget()` in `src/entities/Player.js` and trajectory calculation in `src/physics/trajectory.js` maintain 1:1 crosshair alignment across 360-degree rotation and backwards dashing.
- [x] 3.2 Run the full test suite to confirm zero regressions in player movement, disc aiming, and combat interactions.
