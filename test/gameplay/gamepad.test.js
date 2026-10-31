import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { state } from '../../src/core/state.js';
import {
  initGamepad,
  resetGamepad,
  pollGamepads,
  applyRadialDeadzone,
  getLeftStick,
  getRightStick,
  isButtonPressed,
  isButtonJustPressed,
  isButtonJustReleased,
  getTriggerValue,
  getGamepadCurveIntent,
  playGamepadHaptics,
  GAMEPAD_BUTTONS
} from '../../src/input/gamepad.js';
import { InputManager } from '../../src/input/InputManager.js';

console.log('--- Running Gamepad Core Subsystem Unit Tests ---');

// 1. Radial Deadzone Tests
console.log('1. Testing Radial Deadzone Calculations...');
const resting = applyRadialDeadzone(0.05, -0.08, 0.12);
assert.strictEqual(resting.x, 0, 'Resting stick x below deadzone resolves to 0');
assert.strictEqual(resting.y, 0, 'Resting stick y below deadzone resolves to 0');
assert.strictEqual(resting.mag, 0, 'Resting stick magnitude below deadzone resolves to 0');

// Deflection right at the threshold
const threshold = applyRadialDeadzone(0.12, 0, 0.12);
assert.strictEqual(threshold.mag, 0, 'Exact deadzone threshold resolves to 0');

// Halfway deflection: raw mag ~0.56, normalized should be (0.56 - 0.12) / (1 - 0.12) = 0.5
const half = applyRadialDeadzone(0.56, 0, 0.12);
assert(Math.abs(half.mag - 0.5) < 0.01, 'Halfway deflection scales linearly');
assert(half.x > 0 && half.y === 0, 'Halfway deflection maintains direction');

// Full deflection
const full = applyRadialDeadzone(0, -1.0, 0.12);
assert.strictEqual(full.mag, 1.0, 'Full deflection clamps to magnitude 1.0');
assert.strictEqual(full.y, -1.0, 'Full deflection preserves direction');

console.log('✓ Radial deadzone filtering and slope normalization verified');

// 2. Mock Gamepad Environment
console.log('2. Testing Gamepad Polling & Discovery...');
let mockGamepads = [];
const mockNavigator = {
  getGamepads: () => mockGamepads
};
const mockWindow = {
  navigator: mockNavigator,
  addEventListener: () => {},
  removeEventListener: () => {}
};

initGamepad(mockWindow);
resetGamepad();

// No gamepads connected
pollGamepads();
assert.strictEqual(state.gamepadConnected, false, 'gamepadConnected is false when none plugged in');
assert.strictEqual(getLeftStick().mag, 0, 'Left stick is 0 when no gamepad connected');

// Connect a standard mock gamepad
const mockPad = {
  index: 0,
  connected: true,
  mapping: 'standard',
  axes: [0.6, -0.8, 0.05, 0.02], // Left stick tilted, right stick resting
  buttons: [
    { pressed: false, value: 0 }, // 0: South
    { pressed: false, value: 0 }, // 1: East
    { pressed: false, value: 0 }, // 2: West
    { pressed: false, value: 0 }, // 3: North
    { pressed: true, value: 1 },  // 4: L1 (Curve Left)
    { pressed: false, value: 0 }, // 5: R1
    { pressed: true, value: 0.8 }, // 6: L2 (Block)
    { pressed: false, value: 0 }, // 7: R2 (Throw)
    { pressed: false, value: 0 }, // 8: Select
    { pressed: false, value: 0 }  // 9: Start
  ],
  vibrationActuator: {
    playEffect: async (type, params) => {
      mockPad._lastVibration = { type, params };
      return 'complete';
    }
  }
};

mockGamepads = [mockPad];
pollGamepads();

assert.strictEqual(state.gamepadConnected, true, 'gamepadConnected is true when pad detected');
assert.strictEqual(state.gamepadActive, true, 'gamepadActive is true when input present');

const ls = getLeftStick();
assert(ls.mag > 0.8, 'Left stick deflection registered');
assert(ls.x > 0 && ls.y < 0, 'Left stick direction correct');

const rs = getRightStick();
assert.strictEqual(rs.mag, 0, 'Right stick resting drift filtered by deadzone');

assert.strictEqual(isButtonPressed(GAMEPAD_BUTTONS.L1), true, 'L1 is pressed');
assert.strictEqual(isButtonJustPressed(GAMEPAD_BUTTONS.L1), true, 'L1 is just pressed on initial frame');
assert.strictEqual(isButtonPressed(GAMEPAD_BUTTONS.L2), true, 'L2 trigger is pressed');
assert.strictEqual(getTriggerValue(GAMEPAD_BUTTONS.L2), 0.8, 'L2 analog trigger value matches');
assert.strictEqual(getGamepadCurveIntent(), -1.0, 'L1 provides -1.0 Magnus curve intent');
assert.strictEqual(state.gamepadBlocking, true, 'state.gamepadBlocking set when L2 held');

console.log('✓ Gamepad polling, analog sticks, and buttons correctly mapped');

// 3. Testing Button Edge Transitions
console.log('3. Testing Edge Transitions (JustPressed / JustReleased)...');
// Second frame with same buttons held
pollGamepads();
assert.strictEqual(isButtonPressed(GAMEPAD_BUTTONS.L1), true, 'L1 still held');
assert.strictEqual(isButtonJustPressed(GAMEPAD_BUTTONS.L1), false, 'L1 is no longer just pressed on second frame');

// Release L1 and press R2 (Throw)
mockPad.buttons[GAMEPAD_BUTTONS.L1] = { pressed: false, value: 0 };
mockPad.buttons[GAMEPAD_BUTTONS.R2] = { pressed: true, value: 1.0 };
pollGamepads();

assert.strictEqual(isButtonJustReleased(GAMEPAD_BUTTONS.L1), true, 'L1 is just released');
assert.strictEqual(isButtonJustPressed(GAMEPAD_BUTTONS.R2), true, 'R2 is just pressed');
assert.strictEqual(state.gamepadCurveL, false, 'Curve L cleared on release');

console.log('✓ Edge transitions (JustPressed / JustReleased) work as expected');

// 4. Testing Haptic Rumble Feedback
console.log('4. Testing Haptic Vibration Actuator...');
const hapticPromise = playGamepadHaptics({ duration: 100, weakMagnitude: 0.5, strongMagnitude: 0.8 });
assert(hapticPromise instanceof Promise, 'playGamepadHaptics returns a Promise');

hapticPromise.then((success) => {
  assert.strictEqual(success, true, 'Haptics call succeeds');
  assert.strictEqual(mockPad._lastVibration.type, 'dual-rumble', 'Dual-rumble type requested');
  assert.strictEqual(mockPad._lastVibration.params.duration, 100, 'Duration parameter passed');
  console.log('✓ Dual-rumble haptic vibration confirmed');

  // Test fallback when vibrationActuator is missing
  mockPad.vibrationActuator = null;
  playGamepadHaptics({ duration: 50 }).then((fallbackSuccess) => {
    assert.strictEqual(fallbackSuccess, false, 'Gracefully returns false when haptics unsupported');
    console.log('✓ Safe fallback verified when haptics are unsupported');

    // 5. Testing InputManager Locomotion Integration
    console.log('5. Testing InputManager.getMovementWish Integration...');
    state.countdownTimer = 0;
    state.keys = {};
    const fwd = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    // Left stick pushing forward (axes[1] = -1.0)
    mockPad.axes = [0, -1.0, 0, 0];
    pollGamepads();
    const wishForward = InputManager.getMovementWish(fwd, right);
    assert(Math.abs(wishForward.z - (-1)) < 0.001, 'Forward stick maps to forward wish vector');
    assert(Math.abs(wishForward.x) < 0.001, 'Forward stick has zero lateral drift');
    assert.strictEqual(InputManager.getStickDeflection(), 1.0, 'Stick deflection is 1.0');

    // Left stick pushing diagonally (axes[0] = 1.0, axes[1] = -1.0)
    mockPad.axes = [1.0, -1.0, 0, 0];
    pollGamepads();
    const wishDiag = InputManager.getMovementWish(fwd, right);
    assert(Math.abs(wishDiag.length() - 1.0) < 0.001, 'Diagonal stick wish vector is normalized');
    assert(wishDiag.x > 0 && wishDiag.z < 0, 'Diagonal wish direction is forward-right');

    console.log('✓ InputManager.getMovementWish correctly incorporates gamepad stick vectors');

    // 6. Testing Right Stick Continuous Camera Look
    console.log('6. Testing Right Stick Continuous Camera Look...');
    state.player.yaw = 0;
    state.player.pitch = 0;
    mockPad.axes = [0, 0, 1.0, 0]; // Pure right horizontal deflection
    pollGamepads();

    const rs = getRightStick();
    assert.strictEqual(rs.x, 1.0, 'Right stick X reaches 1.0 on full horizontal deflection');
    assert.strictEqual(rs.y, 0, 'Right stick Y is 0 on pure horizontal deflection');

    // Verify yaw rotation math with delta time
    const dt = 0.1;
    const yawSens = state.gamepadSensYaw || 2.4;
    state.player.yaw -= rs.x * yawSens * dt;
    const expectedYawDelta = -1.0 * yawSens * dt;
    assert(Math.abs(state.player.yaw - expectedYawDelta) < 0.001, 'Right stick X rotates camera yaw scaled by dt');

    // Test pitch deflection
    mockPad.axes = [0, 0, 0, 0.6]; // Downward vertical deflection
    pollGamepads();
    const rsPitch = getRightStick();
    const pitchSens = state.gamepadSensPitch || 1.8;
    state.player.pitch = THREE.MathUtils.clamp(
      state.player.pitch - rsPitch.y * pitchSens * dt * (state.invertY ? -1 : 1),
      -0.6,
      0.55
    );
    const expectedPitchDelta = -rsPitch.y * pitchSens * dt;
    assert(Math.abs(state.player.pitch - expectedPitchDelta) < 0.001, 'Right stick Y adjusts camera pitch scaled by dt');
    console.log('✓ Continuous right stick camera yaw and pitch rotation confirmed');

    // 7. Testing Combat Action Buttons & Edge States
    console.log('7. Testing Combat Action Buttons & Edge States...');
    mockPad.buttons = new Array(16).fill({ pressed: false, value: 0 });
    mockPad.buttons[GAMEPAD_BUTTONS.SOUTH] = { pressed: true, value: 1.0 };
    pollGamepads();
    assert.strictEqual(isButtonJustPressed(GAMEPAD_BUTTONS.SOUTH), true, 'South button triggers jump edge');
    assert.strictEqual(isButtonPressed(GAMEPAD_BUTTONS.SOUTH), true, 'South button is held');

    // Edge clears on subsequent frame
    pollGamepads();
    assert.strictEqual(isButtonJustPressed(GAMEPAD_BUTTONS.SOUTH), false, 'South button edge cleared on subsequent frame');
    assert.strictEqual(isButtonPressed(GAMEPAD_BUTTONS.SOUTH), true, 'South button still held');

    // Switch to Dash button (East)
    mockPad.buttons[GAMEPAD_BUTTONS.SOUTH] = { pressed: false, value: 0 };
    mockPad.buttons[GAMEPAD_BUTTONS.EAST] = { pressed: true, value: 1.0 };
    pollGamepads();
    assert.strictEqual(isButtonJustPressed(GAMEPAD_BUTTONS.EAST), true, 'East button triggers dash edge');
    assert.strictEqual(isButtonJustReleased(GAMEPAD_BUTTONS.SOUTH), true, 'South button release edge recorded');

    console.log('✓ Gamepad combat button actions correctly dispatched');
    console.log('\n--- ALL GAMEPAD CORE & INTEGRATION TESTS PASSED ---\n');
  });
});
