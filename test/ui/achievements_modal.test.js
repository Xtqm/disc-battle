/**
 * achievements_modal.test.js
 * Unit and integration test suite for AchievementsModal (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import fs from 'fs';
import { AchievementsModal } from '../../src/ui/modals/AchievementsModal.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Achievements Modal Test Suite (SPEC-ACHIEVE-001) ---');

// Mock DOM classes
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.style = { display: 'none' };
    this.children = [];
    this.parentNode = null;
    this.id = '';
    this.className = '';
    this.innerHTML = '';
    this._listeners = new Map();
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
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (this.id === id) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    }
    return null;
  }
  addEventListener(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
  }
}

// Mock AchievementManager
function createMockAchievementManager() {
  const achievements = [
    {
      id: 'ach_first_blood',
      title: 'Initial Execution',
      description: 'De-rez first hostile program',
      category: 'combat',
      icon: '⚡',
      target: 1,
      unlocked: true,
      progress: { current: 1, target: 1, ratio: 1.0, satisfied: true },
      reward: { bits: 100, cosmetic: null }
    },
    {
      id: 'ach_curve_god',
      title: 'Geometric Curved Path',
      description: 'Eliminate 25 hostiles with curving disc shots',
      category: 'combat',
      icon: '🌀',
      target: 25,
      unlocked: false,
      progress: { current: 10, target: 25, ratio: 0.4, satisfied: false },
      reward: { bits: 300, cosmetic: null }
    },
    {
      id: 'ach_parry_king',
      title: 'Deflective Protocol',
      description: 'Parry 50 incoming enemy discs',
      category: 'combat',
      icon: '🛡️',
      target: 50,
      unlocked: false,
      progress: { current: 35, target: 50, ratio: 0.7, satisfied: false },
      reward: { bits: 250, cosmetic: null }
    },
    {
      id: 'ach_untouchable',
      title: 'Flawless Subroutine',
      description: 'Complete any Grid trial with 100% integrity',
      category: 'campaign',
      icon: '💎',
      target: 1,
      unlocked: false,
      progress: { current: 0, target: 1, ratio: 0, satisfied: false },
      reward: { bits: 500, cosmetic: null }
    },
    {
      id: 'ach_swarm_survivor',
      title: 'Endless Firewall',
      description: 'Survive 15 consecutive waves in Swarm Defense',
      category: 'survival',
      icon: '🔥',
      target: 15,
      unlocked: true,
      progress: { current: 15, target: 15, ratio: 1.0, satisfied: true },
      reward: {
        bits: 750,
        cosmetic: { category: 'discSkins', itemId: 'disc_corrupted_void', displayName: 'Corrupted Void' }
      }
    },
    {
      id: 'ach_grid_one_master',
      title: 'Outlands Conqueror',
      description: 'Earn all 18 stars across Grid 01',
      category: 'campaign',
      icon: '👑',
      target: 18,
      unlocked: false,
      progress: { current: 12, target: 18, ratio: 0.67, satisfied: false },
      reward: {
        bits: 1000,
        cosmetic: { category: 'chassisSkins', itemId: 'chassis_arbiter', displayName: 'Sovereign Arbiter' }
      }
    }
  ];

  return {
    getMatrixStatus: () => achievements,
    getCompletionStats: () => ({ total: 6, unlocked: 2, percentage: 33 })
  };
}

// Setup environment
const mockMgr = createMockAchievementManager();
const modal = new AchievementsModal({
  achievements: mockMgr
});

// =========================================================================
// Test Group 1: Modal Initialization & Initial State
// =========================================================================
console.log('\n[Group 1] Testing Modal Initialization & State...');

assert.strictEqual(modal.isOpen(), false, 'Modal should initially be closed');

let backFired = false;
modal.setOnBackToMenu(() => { backFired = true; });

console.log('✓ Group 1: Initialization verified.');

// =========================================================================
// Test Group 2: Render Markup & Content Verification
// =========================================================================
console.log('\n[Group 2] Testing Trophy Matrix Markup Generation...');

const markup = modal.render();

// Header & Summary
assert.ok(markup.includes('TROPHY MATRIX // ACHIEVEMENTS'), 'Must contain modal title');
assert.ok(markup.includes('OVERALL SYNCHRONIZATION: 2 / 6 PROTOCOLS'), 'Must render overall synchronized count');
assert.ok(markup.includes('33% COMPLETED'), 'Must render percentage complete');

// All 6 Launch Achievements present
assert.ok(markup.includes('Initial Execution'));
assert.ok(markup.includes('Geometric Curved Path'));
assert.ok(markup.includes('Deflective Protocol'));
assert.ok(markup.includes('Flawless Subroutine'));
assert.ok(markup.includes('Endless Firewall'));
assert.ok(markup.includes('Outlands Conqueror'));

// Unlocked vs Locked Badges
assert.ok(markup.includes('[ UNLOCKED ]'), 'Must render unlocked status badges');
assert.ok(markup.includes('[ LOCKED ]'), 'Must render locked status badges');

// Progress numbers
assert.ok(markup.includes('10 / 25'), 'Must render curve kills progress (10 / 25)');
assert.ok(markup.includes('35 / 50'), 'Must render parries progress (35 / 50)');
assert.ok(markup.includes('12 / 18'), 'Must render grid stars progress (12 / 18)');

// Reward Badges
assert.ok(markup.includes('+100 BITS'));
assert.ok(markup.includes('+300 BITS'));
assert.ok(markup.includes('SKIN: CORRUPTED VOID'));
assert.ok(markup.includes('SKIN: SOVEREIGN ARBITER'));

console.log('✓ Group 2: Trophy Matrix HTML structure and metrics verified.');

// =========================================================================
// Test Group 3: Show & Hide Lifecycle
// =========================================================================
console.log('\n[Group 3] Testing Show/Hide Lifecycle and Navigation...');

const mockContainer = new MockElement('div');
mockContainer.id = 'achievementsModal';

// Attach mock container to modal instance
Object.defineProperty(modal, 'container', {
  get: () => mockContainer,
  configurable: true
});

modal.show();
assert.strictEqual(mockContainer.style.display, 'flex');
assert.strictEqual(modal.isOpen(), true);
assert.strictEqual(state.achievementsModalOpen, true);

// Hide modal
modal.hide();
assert.strictEqual(mockContainer.style.display, 'none');
assert.strictEqual(modal.isOpen(), false);
assert.strictEqual(state.achievementsModalOpen, false);
assert.strictEqual(backFired, true, 'Back to menu callback should have fired');

console.log('✓ Group 3: Lifecycle and navigation transitions verified.');

// =========================================================================
// Test Group 4: Button & Keyboard Event Listeners
// =========================================================================
console.log('\n[Group 4] Testing UI Button Bindings & ESC Handling...');

modal.show();

const closeBtn = new MockElement('button');
closeBtn.id = 'achievementsCloseBtn';
const returnBtn = new MockElement('button');
returnBtn.id = 'achievementsReturnBtn';

const mockRoot = new MockElement('div');
mockRoot.appendChild(closeBtn);
mockRoot.appendChild(returnBtn);

modal.bindEvents(mockRoot);

// Click close button
assert.ok(typeof closeBtn.onclick === 'function');
closeBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(modal.isOpen(), false);

// Show again and click return button
modal.show();
assert.ok(typeof returnBtn.onclick === 'function');
returnBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(modal.isOpen(), false);

console.log('✓ Group 4: Close and return button events verified.');

// =========================================================================
// Test Group 5: Main Menu Static DOM & CSS Integration
// =========================================================================
console.log('\n[Group 5] Testing Main Menu Static DOM & CSS Integration...');
const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
assert(indexHtml.includes('id="achievementsBtn"'), 'index.html must declare #achievementsBtn in mainMenuButtons');
assert(indexHtml.includes('.achievements-btn {'), 'index.html must define .achievements-btn stylesheet rule');
assert(indexHtml.includes('.achievements-btn:hover'), 'index.html must define .achievements-btn:hover stylesheet rule');
console.log('✓ Main menu static HTML and CSS rules for Achievements verified.');

console.log('\n======================================================');
console.log('ALL ACHIEVEMENTS MODAL TESTS PASSED CLEANLY (100%)');
console.log('======================================================');
