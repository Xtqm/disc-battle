import assert from 'assert';
import { state } from '../../src/core/state.js';
import { look, MAX_MOUSE_DELTA, sens } from '../../src/input/mouse.js';

console.log('--- Running Mouse Input Delta Clamping Unit Tests ---');

// Reset state
state.player.yaw = 0;
state.player.pitch = 0;
state.invertY = false;

// 1. Normal mouse movements within threshold
look(50, -30);
assert.strictEqual(
  state.player.yaw.toFixed(4),
  (-50 * sens).toFixed(4),
  'Normal horizontal delta applies directly'
);
assert.strictEqual(
  state.player.pitch.toFixed(4),
  (30 * sens).toFixed(4),
  'Normal vertical delta applies directly'
);
console.log('✓ Normal mouse movements apply proportionally without clamping');

// 2. Synthetic pointer lock warp spike (+1500px)
const yawBefore = state.player.yaw;
look(1500, 0);
const expectedDelta = -MAX_MOUSE_DELTA * sens;
const actualDelta = state.player.yaw - yawBefore;
assert.strictEqual(
  actualDelta.toFixed(4),
  expectedDelta.toFixed(4),
  'Synthetic spike is clamped to MAX_MOUSE_DELTA'
);
console.log('✓ Massive positive mouse movement spike is safely clamped to MAX_MOUSE_DELTA');

// 3. Negative synthetic spike (-1200px)
const yawBeforeNeg = state.player.yaw;
look(-1200, 0);
const expectedDeltaNeg = MAX_MOUSE_DELTA * sens;
const actualDeltaNeg = state.player.yaw - yawBeforeNeg;
assert.strictEqual(
  actualDeltaNeg.toFixed(4),
  expectedDeltaNeg.toFixed(4),
  'Negative synthetic spike is clamped to -MAX_MOUSE_DELTA'
);
console.log('✓ Massive negative mouse movement spike is safely clamped to -MAX_MOUSE_DELTA');

// 4. Vertical clamping on synthetic spike
state.player.pitch = 0;
look(0, 1920);
assert(
  state.player.pitch >= -0.6 && state.player.pitch <= 0.55,
  'Pitch remains within safe anatomical pitch limits'
);
console.log('✓ Vertical spike is clamped and pitch stays within safe vertical bounds');

console.log('--- Mouse Input Delta Clamping Unit Tests PASSED ---');
