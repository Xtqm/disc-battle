# Tasks

## 1. Gamepad Core Subsystem

- [x] 1.1 Create `src/input/gamepad.js` implementing controller discovery, lifecycle listeners (`gamepadconnected`, `gamepaddisconnected`), active gamepad selection, and radial deadzone filtering with normalized slope remapping. Verify device polling and deadzone calculations via unit test.
- [x] 1.2 Implement button edge-trigger tracking, analog trigger pressure thresholding, bumper curve intent resolution, and safe dual-rumble haptic actuation (`playGamepadHaptics`). Verify button edge transitions and haptics safety fallbacks via unit test.

## 2. Input Pipeline Integration

- [x] 2.1 Update `src/input/InputManager.js` to expose gamepad polling, state queries, and incorporate left-stick analog deflection into `getMovementWish(fwd, right)` alongside keyboard and touch inputs. Verify combined movement wish outputs via unit tests.
- [x] 2.2 Integrate per-frame controller polling and edge-triggered button dispatch (Jump, Dash, Throw, Block, Pause) into the main loop in `src/core/main.js`. Verify polling execution and action dispatching.

## 3. Locomotion, Aiming & Combat Feedback

- [x] 3.1 Integrate right-stick continuous deflection into camera yaw and pitch rotation in `src/entities/Player.js` / camera updates with sensitivity scaling and pitch clamping. Verify camera orientation updates across varying delta times.
- [x] 3.2 Hook haptic vibration pulses into combat events in `src/entities/Player.js` and `src/entities/Disc.js` for shield parries, disc throws, and damage impacts. Verify rumble triggering during combat interactions.

## 4. Verification & Test Suite

- [x] 4.1 Create `test/gamepad.test.js` validating controller connection, radial deadzones, button action dispatch, and haptics fallbacks, and verify by running `npm test`.
