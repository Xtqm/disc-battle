/**
 * achievement_toast.test.js
 * Unit test suite for AchievementToast HUD Banner (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import { AchievementToast } from '../../src/ui/components/AchievementToast.js';

console.log('--- Running Achievement Toast Test Suite (SPEC-ACHIEVE-001) ---');

// Mock DOM container and elements
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.innerHTML = '';
    this.onclick = null;
  }
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
}

// Mock globals if running in headless node
const originalDoc = global.document;
const originalRAF = global.requestAnimationFrame;

global.document = {
  createElement: (tag) => new MockElement(tag),
  getElementById: () => null,
  body: new MockElement('body')
};
global.requestAnimationFrame = (fn) => setTimeout(fn, 1);

try {
  // =========================================================================
  // Test Group 1: Toast Construction & DOM Rendering
  // =========================================================================
  console.log('\n[Group 1] Testing Toast Banner DOM Creation & Formatting...');

  const mockParent = new MockElement('div');
  let fanfarePlayed = 0;

  const toastManager = new AchievementToast({
    container: mockParent,
    displayDuration: 1000,
    playFanfareFn: () => { fanfarePlayed++; }
  });

  const sampleAchievement = {
    id: 'ach_first_blood',
    title: 'Initial Execution',
    description: 'De-rez first hostile program',
    icon: '⚡',
    reward: {
      bits: 100,
      cosmetic: null
    }
  };

  toastManager.show(sampleAchievement);

  assert.strictEqual(mockParent.children.length, 1, 'Toast element must be appended to container');
  assert.strictEqual(fanfarePlayed, 1, 'Audio fanfare must be invoked upon toast presentation');

  const toastEl = mockParent.children[0];
  assert.strictEqual(toastEl.className, 'tron-achievement-toast');
  assert.ok(toastEl.innerHTML.includes('Initial Execution'), 'Toast must display achievement title');
  assert.ok(toastEl.innerHTML.includes('+100 BITS'), 'Toast must render Bits reward badge');
  assert.ok(toastEl.innerHTML.includes('⚡'), 'Toast must display achievement icon');
  assert.ok(typeof toastEl.onclick === 'function', 'Toast must attach click dismiss listener');

  console.log('✓ Group 1: Toast DOM construction and badge formatting verified.');

  // =========================================================================
  // Test Group 2: Cosmetic Reward Badge Rendering
  // =========================================================================
  console.log('\n[Group 2] Testing Cosmetic Skin Reward Presentation...');

  const mockParent2 = new MockElement('div');
  const toastManager2 = new AchievementToast({
    container: mockParent2,
    playFanfareFn: () => {}
  });

  const swarmAchievement = {
    id: 'ach_swarm_survivor',
    title: 'Endless Firewall',
    icon: '🔥',
    reward: {
      bits: 750,
      cosmetic: {
        category: 'discSkins',
        itemId: 'disc_corrupted_void',
        displayName: 'Corrupted Void'
      }
    }
  };

  toastManager2.show(swarmAchievement);
  const toastEl2 = mockParent2.children[0];
  assert.ok(toastEl2.innerHTML.includes('+750 BITS'), 'Must render bits reward badge');
  assert.ok(toastEl2.innerHTML.includes('CORRUPTED VOID'), 'Must render cosmetic reward badge');

  console.log('✓ Group 2: Dual Bits & Cosmetic skin rewards verified.');

  // =========================================================================
  // Test Group 3: Toast Queuing & Drainage
  // =========================================================================
  console.log('\n[Group 3] Testing Sequential Notification Queue...');

  const mockParent3 = new MockElement('div');
  const toastManager3 = new AchievementToast({
    container: mockParent3,
    displayDuration: 50,
    playFanfareFn: () => {}
  });

  const ach1 = { id: 'ach_1', title: 'Achievement 1', reward: { bits: 50 } };
  const ach2 = { id: 'ach_2', title: 'Achievement 2', reward: { bits: 100 } };

  // Queue two achievements simultaneously
  toastManager3.show(ach1);
  toastManager3.show(ach2);

  assert.strictEqual(mockParent3.children.length, 1, 'Only one toast active at a time');
  assert.ok(mockParent3.children[0].innerHTML.includes('Achievement 1'));
  assert.strictEqual(toastManager3.queue.length, 1, 'Second achievement should be queued');

  // Dismiss first toast directly via click
  mockParent3.children[0].onclick();

  setTimeout(() => {
    try {
      // Second toast should now be active
      assert.strictEqual(mockParent3.children.length, 1);
      assert.ok(mockParent3.children[0].innerHTML.includes('Achievement 2'));
      assert.strictEqual(toastManager3.queue.length, 0);

      // Clear toasts
      toastManager3.clear();
      assert.strictEqual(mockParent3.children.length, 0);
      assert.strictEqual(toastManager3.isShowing, false);

      console.log('✓ Group 3: Toast queueing, sequential progression, and clear verified.');

      console.log('\n======================================================');
      console.log('ALL ACHIEVEMENT TOAST TESTS PASSED CLEANLY (100%)');
      console.log('======================================================');
    } finally {
      // Restore globals after async assertions complete
      global.document = originalDoc;
      global.requestAnimationFrame = originalRAF;
    }
  }, 450);

} catch (err) {
  global.document = originalDoc;
  global.requestAnimationFrame = originalRAF;
  throw err;
}
