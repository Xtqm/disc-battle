# Proposal

## Why

Tron Disc Arena currently only supports keyboard, mouse with pointer lock, and touch inputs, preventing players on PC and desktop browsers from using handheld controllers such as the PlayStation 5 DualSense, DualShock 4, Xbox Wireless Controller, or standard USB/Bluetooth gamepads. Introducing native Gamepad API integration enables fluid twin-stick locomotion and camera control, ergonomic combat action mapping, and tactile haptic feedback.

## What Changes

- **Standard Gamepad API Lifecycle & Polling**: Implement `src/input/gamepad.js` to manage `gamepadconnected` and `gamepaddisconnected` lifecycle events and query `navigator.getGamepads()` in the game loop.
- **Twin-Stick Locomotion & Camera Aim**:
  - Left stick analog input mapped to omnidirectional locomotion (`wish` vector) with radial deadzone thresholding (0.12) to prevent drift.
  - Right stick analog input mapped to continuous camera yaw and pitch rotation with proportional sensitivity and pitch angle clamping.
- **Standard Button & Trigger Action Dispatch**:
  - R2 Trigger (`buttons[7]`): Primary Identity Disc throw (`throwDisc`).
  - L2 Trigger (`buttons[6]`): Holographic Shield block hold (`state.player.blocking`).
  - South Button / Cross (`buttons[0]`): Jump, double-jump, and recovery jump with coyote and buffer integration.
  - East / West Button / Circle / Square (`buttons[1]` / `buttons[2]`): Directional dash impulse consuming energy.
  - L1 / R1 Bumpers (`buttons[4]` / `buttons[5]`): Left and right Magnus disc curve spin intent.
  - Options / Start (`buttons[9]`): Pause and resume combat toggle.
- **Haptic Vibration Feedback**: Trigger dual-rumble vibration effects via `GamepadHapticActuator` (`vibrationActuator.playEffect`) upon disc deflections, successful throws, and incoming damage.
- **Seamless Device Coexistence**: Unify input sampling in `InputManager.js` so players can seamlessly switch between keyboard/mouse, touch, and gamepad without menu toggling.

## Capabilities

### New Capabilities
- `gamepad-input`: Standard HTML5 Gamepad API polling, twin-stick analog movement and camera aim, button mapping, deadzone filtering, and vibration haptics.

### Modified Capabilities
<!-- None -->

## Impact

- `src/input/gamepad.js`: New controller handling module.
- `src/input/InputManager.js`: Exports gamepad initialization, polling, stick movement, and controller state queries.
- `src/core/main.js`: Invokes controller poll step in the main render/animation loop.
- `src/entities/Player.js`: Connects analog gamepad stick deflection to movement velocity and camera look.
- `src/entities/Disc.js`: Dispatches haptic rumble impulses on disc throws, shield deflections, and player damage impacts.
