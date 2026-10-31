# Design

## Context

Tron Disc Arena's input architecture currently aggregates events across `keyboard.js`, `mouse.js`, and `touch.js` into `InputManager.js`. Combat actions and locomotion in `Player.js` query `state.keys`, `touchMove`, and `state.touch*` flags.

The W3C Gamepad API does not dispatch DOM events for analog stick motion or button presses; rather, it requires polling `navigator.getGamepads()` during each frame of the animation loop. This design introduces `src/input/gamepad.js` as an authoritative controller subsystem integrated cleanly into `InputManager.js`, `main.js`, and `Player.js`.

See `proposal.md` for problem motivation and scope.

## Goals / Non-Goals

**Goals:**
- Provide native support for Standard Gamepad layout controllers (including PS5 DualSense, PS4 DualShock, Xbox Wireless, and standard PC gamepads) via the HTML5 Gamepad API.
- Support smooth analog omnidirectional locomotion (Left Stick) and continuous analog camera yaw/pitch aiming (Right Stick).
- Implement radial deadzone filtering with normalized slope scaling to eliminate stick drift.
- Map combat actions 1:1 with existing gameplay mechanics (Throw on R2, Block on L2, Jump on South/Cross, Dash on East/Circle/Square, Curve Spin on L1/R1 bumpers, Pause on Options/Start).
- Provide haptic vibration feedback via `vibrationActuator` on disc impacts, shield parries, and damage events.
- Maintain seamless coexistence with keyboard, mouse, and touch inputs without manual mode switching.

**Non-Goals:**
- Full custom in-game button remapping UI (v1 focuses on standard canonical gamepad mapping).
- Native console platform packaging (PlayStation Network or Xbox Live native SDK integration).
- Gyroscope / motion sensor aiming (can be explored in future updates).

## Decisions

### 1. Frame Polling Loop in `main.js` vs. Event Listeners
- **Decision**: Poll `GamepadManager.update(dt)` once per animation frame at the beginning of the `update()` loop in `src/core/main.js`.
- **Rationale**: The Web Gamepad API requires polling `navigator.getGamepads()`. Updating early in the frame ensures consistent stick vectors and button press edges are available to locomotion, combat, camera, and UI modal systems.
- **Alternatives Considered**: Polling inside `Player.js`. Rejected because camera aiming and UI menu pausing operate outside of `Player.js`.

### 2. Radial Deadzone Filtering vs. Axial Deadzone
- **Decision**: Implement radial deadzone filtering for both analog sticks:
  ```javascript
  const mag = Math.hypot(rawX, rawY);
  if (mag < DEADZONE) return { x: 0, y: 0 };
  const factor = (mag - DEADZONE) / (1 - DEADZONE);
  return { x: (rawX / mag) * factor, y: (rawY / mag) * factor };
  ```
- **Rationale**: Axial deadzones snap motion to 90-degree axes, distorting subtle diagonal inputs. Radial deadzone preserves 360-degree analog precision while completely neutralizing stick drift. Default deadzone is set to `0.12`.
- **Alternatives Considered**: Raw unclamped inputs. Rejected because even brand-new controllers exhibit minor resting drift.

### 3. Continuous Delta Look Scaling vs. Synthetic Pointer Lock Emulation
- **Decision**: Apply right stick deflection directly as an angular velocity vector scaled by `dt`:
  ```javascript
  state.player.yaw -= stick.x * gamepadSensYaw * dt;
  state.player.pitch = clamp(state.player.pitch - stick.y * gamepadSensPitch * dt, -0.6, 0.55);
  ```
- **Rationale**: Mouse pointer lock produces discrete frame pixel deltas (`movementX`, `movementY`). Sticks provide continuous rates of change. Scaling by delta time ensures rotation speeds remain identical across 60Hz, 120Hz, and variable-refresh displays.
- **Alternatives Considered**: Feeding stick values into `look(dx, dy)`. Rejected because it creates framerate-dependent sensitivity.

### 4. Edge-Triggered vs. Continuous Action Dispatch
- **Decision**:
  - Continuous sampling: Shield blocking (L2 hold), movement (Left stick), camera look (Right stick), and curve bias (L1/R1 hold).
  - Edge-triggered sampling: Disc throw (R2 press edge), Jump (South button press edge), Dash (Circle/Square press edge), and Pause (Options button press edge).
- **Rationale**: Prevents accidental repeated throws or rapid-fire pause toggling on a single button press.

### 5. Defensive Haptic Rumble API
- **Decision**: Wrap `gamepad.vibrationActuator.playEffect('dual-rumble', ...)` in capability checks with silent catch blocks.
- **Rationale**: Not all browsers or controllers support dual-rumble haptics. Silent fallbacks prevent unhandled Promise rejections or exceptions during intense combat encounters.

## Risks / Trade-offs

- **[Risk: Browser Security Gesture Requirement]** → Web browsers only expose gamepads once the user has pressed a button on the controller while the tab is focused.
  - *Mitigation*: Register `gamepadconnected` and `gamepaddisconnected` event listeners and listen for user button wakeups on window focus.
- **[Risk: Simultaneous Keyboard and Controller Input Conflict]** → Player uses both keyboard and controller simultaneously.
  - *Mitigation*: `InputManager.getMovementWish` combines keyboard and gamepad vectors and clamps the result to unit length (`normalize()`). Camera rotation from mouse and stick additively combine cleanly.
- **[Risk: Variable Stick Sensitivities across Controller Brands]** → Different controller models have varying analog curve responses.
  - *Mitigation*: Expose configurable sensitivity variables in `state.gamepadSensYaw` and `state.gamepadSensPitch` initialized with tested defaults.
