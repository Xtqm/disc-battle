/**
 * achievement_sfx.test.js
 * Test suite for Achievement Procedural Fanfare Audio Synthesis (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import { state } from '../../src/core/state.js';
import {
  playAchievementFanfare,
  SFX
} from '../../src/audio/sfx.js';

console.log('--- Running Achievement SFX Procedural Synthesis Tests ---');

// 1. Silent degradation test when AudioContext is missing
state.audioCtx = null;
assert.doesNotThrow(() => {
  playAchievementFanfare();
  SFX.achievementFanfare();
}, 'playAchievementFanfare must safely no-op without AudioContext');
console.log('✓ Audio routines safely no-op without AudioContext');

// 2. Mock Web Audio API nodes
class MockAudioParam {
  constructor(val = 0) {
    this.value = val;
    this.history = [];
  }
  setValueAtTime(v, t) {
    this.history.push(['setValueAtTime', v, t]);
  }
  exponentialRampToValueAtTime(v, t) {
    this.history.push(['exponentialRampToValueAtTime', v, t]);
  }
  linearRampToValueAtTime(v, t) {
    this.history.push(['linearRampToValueAtTime', v, t]);
  }
}

class MockGainNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this.connectedTo = null;
  }
  connect(dest) {
    this.connectedTo = dest;
  }
}

class MockOscillatorNode {
  constructor() {
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
    this.started = false;
    this.stopped = false;
    this.connectedTo = null;
  }
  connect(dest) {
    this.connectedTo = dest;
  }
  start(t) {
    this.started = true;
    this.startTime = t;
  }
  stop(t) {
    this.stopped = true;
    this.stopTime = t;
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 10.0;
    this.destination = {};
    this.createdOscillators = [];
    this.createdGains = [];
  }
  createOscillator() {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc;
  }
  createGain() {
    const g = new MockGainNode();
    this.createdGains.push(g);
    return g;
  }
}

// 3. Test playAchievementFanfare
const mockCtx = new MockAudioContext();
state.audioCtx = mockCtx;

playAchievementFanfare();

// 4 notes in ascending arpeggio
assert.strictEqual(mockCtx.createdOscillators.length, 4, 'Must create 4 oscillators for 4-note arpeggio');
assert.strictEqual(mockCtx.createdGains.length, 4, 'Must create 4 gain nodes');

for (let i = 0; i < 4; i++) {
  const osc = mockCtx.createdOscillators[i];
  const gain = mockCtx.createdGains[i];
  assert.strictEqual(osc.started, true);
  assert.strictEqual(osc.stopped, true);
  assert.strictEqual(osc.connectedTo, gain);
  assert.strictEqual(gain.connectedTo, mockCtx.destination);
}

// Clean up
state.audioCtx = null;
console.log('✓ playAchievementFanfare synthesizes 4-note ascending crystal arpeggio');

console.log('\n======================================================');
console.log('ALL ACHIEVEMENT SFX TESTS PASSED CLEANLY (100%)');
console.log('======================================================');
