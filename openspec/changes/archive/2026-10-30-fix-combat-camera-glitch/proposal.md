# Proposal

## Why

During intense battle encounters—particularly when dashing backwards, making rapid camera flicks, or navigating near the arena perimeter walls—the third-person combat camera can violently glitch, snap, or flip 180°, pointing the player's aim and view at a completely different spot. This breaks combat flow, disrupts trajectory prediction, and causes disc throws to fire in random directions.

## What Changes

- **Euler / Quat-Driven Camera Orientation**: Eliminate reliance on naive world-space `lookAt(look)` targeting a close-range 14m point from a lagging camera position. Replace it with direct pitch and yaw rotation to guarantee 1:1 instantaneous aim response without gimbal lock or angular lag.
- **Camera Boom & Position Decoupling**: Anchor the camera boom to a stable player pivot (head/chest), smoothly interpolating the camera's following position without distorting its rotational aim vector during fast turns.
- **Inverted Shoulder Alignment Fix**: Align the camera's shoulder offset with the aim ray to eliminate the cross-eyed diagonal parallax angle between the left shoulder and right target point.
- **Pointer Lock Delta Spike Clamping**: Clamp incoming `movementX` and `movementY` in `mouse.js` to filter out browser synthetic pointer-lock warp spikes that cause instantaneous 90°–180° view jumps.
- **Perimeter Boundary Collision Softening**: Prevent the camera position from collapsing through or past the look target when backing up against arena perimeter walls.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `player-character`: Extends player character specifications with third-person combat camera stability, 1:1 rotational responsiveness, and aim ray consistency under rapid maneuvers.

## Impact

- `src/graphics/scene.js`: Refactors `updateCamera(dt)` to eliminate short-distance `lookAt` singularities and decouple rotational tracking from positional smoothing.
- `src/input/mouse.js`: Adds input delta clamping to filter synthetic pointer lock spikes in `look(dx, dy)`.
- `src/entities/Player.js`: Confirms `aimTarget()` and disc launch vectors maintain exact parity with the stabilized camera view.
- `src/network/roomManager.js`: Ensures initial multiplayer camera positioning matches the stabilized camera model.
