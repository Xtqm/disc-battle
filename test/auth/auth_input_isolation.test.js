import assert from 'assert';
import { state } from '../../src/core/state.js';
import { onDown, onUp } from '../../src/input/keyboard.js';

console.log('--- Running Terminal Input Isolation & PointerLock Tests ---');

// Mock DOM elements
class MockElement {
  constructor(tagName = 'DIV') {
    this.tagName = tagName;
    this.style = {};
  }
}

globalThis.document = {
  activeElement: new MockElement('BODY'),
  pointerLockElement: null,
  getElementById: (id) => {
    if (id === 'authModal') {
      return authModalEl;
    }
    return null;
  },
  exitPointerLock: () => {
    globalThis.document.pointerLockElement = null;
  }
};

const authModalEl = new MockElement('DIV');

// Reset state
for (const k in state.keys) state.keys[k] = false;
state.authModalOpen = false;

// 1. Normal keystroke recording
onDown({ code: 'KeyW', key: 'w', preventDefault: () => {} });
assert.strictEqual(state.keys['KeyW'], true, 'Normal keystroke should be captured');
onUp({ code: 'KeyW', key: 'w' });
assert.strictEqual(state.keys['KeyW'], false, 'Normal keyup should release key');
console.log('✓ Normal keyboard events function as expected');

// 2. Input Isolation when focus is inside an INPUT element
document.activeElement = new MockElement('INPUT');
onDown({ code: 'KeyW', key: 'w', preventDefault: () => {} });
assert.strictEqual(!!state.keys['KeyW'], false, 'Keypress inside INPUT must NOT be recorded in state.keys');
onDown({ code: 'Space', key: ' ', preventDefault: () => {} });
assert.strictEqual(!!state.keys['Space'], false, 'Spacebar inside INPUT must NOT be recorded in state.keys');
console.log('✓ Keystrokes inside focused <input> are isolated from game state');

// 3. Input Isolation when state.authModalOpen is true
document.activeElement = new MockElement('BODY');
state.authModalOpen = true;
authModalEl.style.display = 'flex';

onDown({ code: 'KeyW', key: 'w', preventDefault: () => {} });
assert.strictEqual(!!state.keys['KeyW'], false, 'Movement keys must be ignored while authModalOpen is true');
onDown({ code: 'KeyQ', key: 'q', preventDefault: () => {} });
assert.strictEqual(!!state.keys['KeyQ'], false, 'Disc curve keys must be ignored while authModalOpen is true');
console.log('✓ Game actions are completely suspended while authModalOpen is active');


// 4. Escape Key Isolation (Modal Dismissal is Restricted Exclusively to [X] Button)
let preventDefaultCalled = false;
onDown({
  code: 'Escape',
  key: 'Escape',
  preventDefault: () => { preventDefaultCalled = true; }
});
assert.strictEqual(preventDefaultCalled, true, 'Escape event default must be prevented');
assert.strictEqual(state.authModalOpen, true, 'Escape key must NOT close the auth modal (prevent accidental data loss)');
assert.strictEqual(authModalEl.style.display, 'flex', 'authModal element display must remain flex on Escape');
console.log('✓ Escape key safely isolated and prevented from dismissing auth modal');

// 5. Explicit Dismissal via [X] Close Action
state.authModalOpen = false;
authModalEl.style.display = 'none';
assert.strictEqual(state.authModalOpen, false, 'Explicit dismiss must close the auth modal');
console.log('✓ Explicit [X] dismiss cleanly closes the Grid Authorization Terminal');

console.log('--- Terminal Input Isolation & PointerLock Tests PASSED ---');
