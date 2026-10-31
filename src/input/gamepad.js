import { state } from '../core/state.js';

export const DEFAULT_DEADZONE = 0.12;
export const TRIGGER_THRESHOLD = 0.25;

export const GAMEPAD_BUTTONS = {
  SOUTH: 0,   // A / Cross (Jump)
  EAST: 1,    // B / Circle (Dash)
  WEST: 2,    // X / Square (Dash)
  NORTH: 3,   // Y / Triangle
  L1: 4,      // Left Bumper (Curve Left)
  R1: 5,      // Right Bumper (Curve Right)
  L2: 6,      // Left Trigger (Block)
  R2: 7,      // Right Trigger (Throw)
  SELECT: 8,  // Share / Back / Select
  START: 9,   // Options / Menu / Start (Pause)
  L3: 10,     // Left Stick Click
  R3: 11,     // Right Stick Click
  UP: 12,     // D-Pad Up
  DOWN: 13,   // D-Pad Down
  LEFT: 14,   // D-Pad Left
  RIGHT: 15   // D-Pad Right
};

let activeGamepadIndex = null;
let targetWindowRef = null;
const previousButtons = new Map();
const currentButtons = new Map();
const justPressedButtons = new Set();
const justReleasedButtons = new Set();

let cachedLeftStick = { x: 0, y: 0, mag: 0 };
let cachedRightStick = { x: 0, y: 0, mag: 0 };

/**
 * Apply radial deadzone filtering with normalized slope remap.
 * Preserves 360-degree analog fidelity and prevents axis snapping or resting drift.
 */
export function applyRadialDeadzone(rawX, rawY, deadzone = DEFAULT_DEADZONE) {
  const x = Number(rawX) || 0;
  const y = Number(rawY) || 0;
  const mag = Math.hypot(x, y);

  if (mag <= deadzone || mag === 0) {
    return { x: 0, y: 0, mag: 0 };
  }

  // Remap [deadzone, 1.0] -> [0.0, 1.0]
  const clampedMag = Math.min(1.0, mag);
  const normalizedMag = (clampedMag - deadzone) / (1.0 - deadzone);
  const scale = normalizedMag / mag;

  return {
    x: x * scale,
    y: y * scale,
    mag: normalizedMag
  };
}

/**
 * Retrieve raw gamepads array from environment (navigator.getGamepads).
 */
export function getRawGamepads() {
  const nav = targetWindowRef?.navigator || (typeof navigator !== 'undefined' ? navigator : null);
  if (!nav || typeof nav.getGamepads !== 'function') return [];
  try {
    const list = nav.getGamepads();
    return list ? Array.from(list).filter(Boolean) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Get active Gamepad object or null.
 */
export function getActiveGamepad() {
  const gamepads = getRawGamepads();
  if (gamepads.length === 0) return null;

  if (activeGamepadIndex !== null) {
    const matched = gamepads.find(g => g && g.index === activeGamepadIndex);
    if (matched && matched.connected) return matched;
  }

  // Default to first connected gamepad
  const first = gamepads.find(g => g && g.connected) || gamepads[0] || null;
  if (first) {
    activeGamepadIndex = first.index;
  }
  return first;
}

/**
 * Check if a button is currently pressed (held or pressed past trigger threshold).
 */
export function isButtonPressed(buttonIndex) {
  return !!currentButtons.get(buttonIndex);
}

/**
 * Check if a button transitioned from unpressed to pressed this frame.
 */
export function isButtonJustPressed(buttonIndex) {
  return justPressedButtons.has(buttonIndex);
}

/**
 * Check if a button transitioned from pressed to unpressed this frame.
 */
export function isButtonJustReleased(buttonIndex) {
  return justReleasedButtons.has(buttonIndex);
}

/**
 * Get analog trigger value (0.0 to 1.0) for L2 / R2 or any analog button.
 */
export function getTriggerValue(buttonIndex) {
  const pad = getActiveGamepad();
  if (!pad || !pad.buttons || !pad.buttons[buttonIndex]) return 0.0;
  const btn = pad.buttons[buttonIndex];
  if (typeof btn === 'number') return Math.max(0, Math.min(1, btn));
  return Math.max(0, Math.min(1, btn.value ?? (btn.pressed ? 1.0 : 0.0)));
}

/**
 * Return cached left stick deflection with deadzone applied.
 */
export function getLeftStick() {
  return cachedLeftStick;
}

/**
 * Return cached right stick deflection with deadzone applied.
 */
export function getRightStick() {
  return cachedRightStick;
}

/**
 * Get Magnus curve intent from bumpers (-1.0 for L1, +1.0 for R1, 0.0 if both or neither).
 */
export function getGamepadCurveIntent() {
  const l1 = isButtonPressed(GAMEPAD_BUTTONS.L1);
  const r1 = isButtonPressed(GAMEPAD_BUTTONS.R1);
  if (l1 && !r1) return -1.0;
  if (r1 && !l1) return 1.0;
  return 0.0;
}

/**
 * Play dual-rumble haptic feedback on the active gamepad if supported.
 */
export async function playGamepadHaptics({
  startDelay = 0,
  duration = 120,
  weakMagnitude = 0.4,
  strongMagnitude = 0.5
} = {}) {
  const pad = getActiveGamepad();
  if (!pad || !pad.vibrationActuator || typeof pad.vibrationActuator.playEffect !== 'function') {
    return false;
  }

  try {
    await pad.vibrationActuator.playEffect('dual-rumble', {
      startDelay,
      duration,
      weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
      strongMagnitude: Math.max(0, Math.min(1, strongMagnitude))
    });
    return true;
  } catch (e) {
    // Unsupported or rejected haptic call - fail silently
    return false;
  }
}

/**
 * Poll gamepads and update stick caches, button edge transitions, and state flags.
 */
export function pollGamepads(deadzone = state.gamepadDeadzone || DEFAULT_DEADZONE) {
  justPressedButtons.clear();
  justReleasedButtons.clear();

  const pad = getActiveGamepad();
  const isConnected = !!(pad && pad.connected);

  state.gamepadConnected = isConnected;

  if (!isConnected || !pad) {
    state.gamepadActive = false;
    cachedLeftStick = { x: 0, y: 0, mag: 0 };
    cachedRightStick = { x: 0, y: 0, mag: 0 };
    state.gamepadCurveL = false;
    state.gamepadCurveR = false;
    state.gamepadBlocking = false;

    // Clear buttons and trigger release transitions if any were held
    for (const [btnIdx, wasDown] of currentButtons.entries()) {
      if (wasDown) {
        justReleasedButtons.add(btnIdx);
      }
    }
    currentButtons.clear();
    previousButtons.clear();
    return;
  }

  // 1. Process Analog Sticks
  const axes = pad.axes || [];
  const rawLx = axes[0] ?? 0;
  const rawLy = axes[1] ?? 0;
  const rawRx = axes[2] ?? 0;
  const rawRy = axes[3] ?? 0;

  cachedLeftStick = applyRadialDeadzone(rawLx, rawLy, deadzone);
  cachedRightStick = applyRadialDeadzone(rawRx, rawRy, deadzone);

  // 2. Process Buttons and Edge Transitions
  previousButtons.clear();
  for (const [k, v] of currentButtons.entries()) {
    previousButtons.set(k, v);
  }
  currentButtons.clear();

  const buttons = pad.buttons || [];
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const isPressed = typeof btn === 'object'
      ? (btn.pressed || btn.value >= TRIGGER_THRESHOLD)
      : (btn >= TRIGGER_THRESHOLD);

    if (isPressed) {
      currentButtons.set(i, true);
    }

    const wasPressed = !!previousButtons.get(i);
    if (isPressed && !wasPressed) {
      justPressedButtons.add(i);
    } else if (!isPressed && wasPressed) {
      justReleasedButtons.add(i);
    }
  }

  // 3. Update active combat flags
  state.gamepadCurveL = isButtonPressed(GAMEPAD_BUTTONS.L1);
  state.gamepadCurveR = isButtonPressed(GAMEPAD_BUTTONS.R1);
  state.gamepadBlocking = isButtonPressed(GAMEPAD_BUTTONS.L2);

  // Mark gamepad active if any stick or button is engaged
  const hasInput = cachedLeftStick.mag > 0 || cachedRightStick.mag > 0 || currentButtons.size > 0;
  if (hasInput) {
    state.gamepadActive = true;
  }
}

/**
 * Handle gamepadconnected lifecycle event.
 */
function onGamepadConnected(e) {
  if (e.gamepad) {
    activeGamepadIndex = e.gamepad.index;
    state.gamepadConnected = true;
  }
}

/**
 * Handle gamepaddisconnected lifecycle event.
 */
function onGamepadDisconnected(e) {
  if (e.gamepad && activeGamepadIndex === e.gamepad.index) {
    activeGamepadIndex = null;
  }
  pollGamepads();
}

/**
 * Initialize gamepad listeners on target window.
 */
export function initGamepad(win = (typeof window !== 'undefined' ? window : null)) {
  targetWindowRef = win;

  // Initialize state properties if absent
  if (typeof state.gamepadConnected === 'undefined') state.gamepadConnected = false;
  if (typeof state.gamepadActive === 'undefined') state.gamepadActive = false;
  if (typeof state.gamepadDeadzone === 'undefined') state.gamepadDeadzone = DEFAULT_DEADZONE;
  if (typeof state.gamepadSensYaw === 'undefined') state.gamepadSensYaw = 2.4;
  if (typeof state.gamepadSensPitch === 'undefined') state.gamepadSensPitch = 1.8;
  if (typeof state.gamepadCurveL === 'undefined') state.gamepadCurveL = false;
  if (typeof state.gamepadCurveR === 'undefined') state.gamepadCurveR = false;
  if (typeof state.gamepadBlocking === 'undefined') state.gamepadBlocking = false;

  if (targetWindowRef) {
    targetWindowRef.addEventListener('gamepadconnected', onGamepadConnected);
    targetWindowRef.addEventListener('gamepaddisconnected', onGamepadDisconnected);
  }
}

/**
 * Reset internal gamepad state (useful for test resets).
 */
export function resetGamepad() {
  activeGamepadIndex = null;
  previousButtons.clear();
  currentButtons.clear();
  justPressedButtons.clear();
  justReleasedButtons.clear();
  cachedLeftStick = { x: 0, y: 0, mag: 0 };
  cachedRightStick = { x: 0, y: 0, mag: 0 };
  if (state) {
    state.gamepadConnected = false;
    state.gamepadActive = false;
    state.gamepadCurveL = false;
    state.gamepadCurveR = false;
    state.gamepadBlocking = false;
  }
}

let lastNavTime = 0;
const NAV_DEBOUNCE_MS = 200;

/**
 * Handle gamepad menu and modal navigation.
 */
export function updateGamepadUINavigation() {
  if (typeof document === 'undefined') return;

  const candidates = [
    document.getElementById('settingsModal'),
    document.getElementById('achievementsModal'),
    document.getElementById('armoryModal'),
    document.getElementById('pauseMenu'),
    document.getElementById('hostModal'),
    document.getElementById('overlay')
  ];

  const activeContainer = candidates.find(el => el && el.style && el.style.display !== 'none');
  if (!activeContainer) return;

  const focusables = Array.from(activeContainer.querySelectorAll('button, .btn, .mode-btn, input'))
    .filter(el => {
      if (el.style && el.style.display === 'none') return false;
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
      return true;
    });

  if (focusables.length === 0) return;

  let focusedIndex = focusables.findIndex(el => el.classList.contains('gamepad-focus'));
  if (focusedIndex === -1) {
    focusedIndex = 0;
    focusables[0].classList.add('gamepad-focus');
  }

  const now = Date.now();
  const upPressed = isButtonJustPressed(GAMEPAD_BUTTONS.UP) || (cachedLeftStick.y < -0.6 && now - lastNavTime > NAV_DEBOUNCE_MS);
  const downPressed = isButtonJustPressed(GAMEPAD_BUTTONS.DOWN) || (cachedLeftStick.y > 0.6 && now - lastNavTime > NAV_DEBOUNCE_MS);

  if (upPressed) {
    lastNavTime = now;
    focusables[focusedIndex].classList.remove('gamepad-focus');
    focusedIndex = (focusedIndex - 1 + focusables.length) % focusables.length;
    focusables[focusedIndex].classList.add('gamepad-focus');
    focusables[focusedIndex].focus();
  } else if (downPressed) {
    lastNavTime = now;
    focusables[focusedIndex].classList.remove('gamepad-focus');
    focusedIndex = (focusedIndex + 1) % focusables.length;
    focusables[focusedIndex].classList.add('gamepad-focus');
    focusables[focusedIndex].focus();
  }

  // Button A / South (Confirm)
  if (isButtonJustPressed(GAMEPAD_BUTTONS.SOUTH)) {
    const el = focusables[focusedIndex];
    if (el) {
      el.click();
    }
  }

  // Button B / East (Cancel / Dismiss)
  if (isButtonJustPressed(GAMEPAD_BUTTONS.EAST)) {
    const closeBtn = activeContainer.querySelector('#closeSettingsBtn, #closeSettingsX, .close-btn, #resumeBtn');
    if (closeBtn) {
      closeBtn.click();
    }
  }
}
