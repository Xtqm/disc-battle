import assert from 'assert';
import { state } from './src/core/state.js';
import {
  playTerminalOpenSound,
  playTerminalKeySound,
  playAccessGrantedSound,
  playErrorBuzzSound,
  SFX
} from './src/audio/sfx.js';

console.log('--- Running Terminal SFX Procedural Synthesis Tests ---');

// 1. Test when audio context is null (silent graceful degradation)
state.audioCtx = null;
assert.doesNotThrow(() => {
  playTerminalOpenSound();
  playTerminalKeySound();
  playAccessGrantedSound();
  playErrorBuzzSound();
  SFX.terminalOpen();
  SFX.terminalKey();
  SFX.accessGranted();
  SFX.errorBuzz();
}, 'Audio routines should safely no-op when AudioContext is null');
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
  }
  stop(t) {
    this.stopped = true;
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 10.0;
    this.destination = {};
    this.createdNodes = [];
  }
  createOscillator() {
    const osc = new MockOscillatorNode();
    this.createdNodes.push(osc);
    return osc;
  }
  createGain() {
    const gain = new MockGainNode();
    this.createdNodes.push(gain);
    return gain;
  }
}

// 3. Test active audio synthesis
state.audioCtx = new MockAudioContext();

// Test playTerminalOpenSound
state.audioCtx.createdNodes = [];
playTerminalOpenSound();
assert.strictEqual(state.audioCtx.createdNodes.length, 2, 'playTerminalOpenSound should create 1 oscillator and 1 gain');
const [openOsc, openGain] = state.audioCtx.createdNodes;
assert.strictEqual(openOsc.type, 'sawtooth');
assert.strictEqual(openOsc.started, true);
assert.strictEqual(openOsc.stopped, true);
console.log('✓ playTerminalOpenSound synthesizes rising CRT power-up sweep');

// Test playTerminalKeySound
state.audioCtx.createdNodes = [];
playTerminalKeySound();
assert.strictEqual(state.audioCtx.createdNodes.length, 2, 'playTerminalKeySound should create 1 oscillator and 1 gain');
const [keyOsc, keyGain] = state.audioCtx.createdNodes;
assert.strictEqual(keyOsc.type, 'square');
assert.strictEqual(keyOsc.started, true);
assert.strictEqual(keyOsc.stopped, true);
console.log('✓ playTerminalKeySound synthesizes mechanical transient click');

// Test playAccessGrantedSound
state.audioCtx.createdNodes = [];
playAccessGrantedSound();
assert.strictEqual(state.audioCtx.createdNodes.length, 4, 'playAccessGrantedSound should create 2 oscillators and 2 gains (dual tone)');
console.log('✓ playAccessGrantedSound synthesizes dual-tone ascending chime');

// Test playErrorBuzzSound
state.audioCtx.createdNodes = [];
playErrorBuzzSound();
assert.strictEqual(state.audioCtx.createdNodes.length, 3, 'playErrorBuzzSound should create 2 oscillators and 1 shared gain');
console.log('✓ playErrorBuzzSound synthesizes discordant error buzz');

// Test SFX object mappings
assert.strictEqual(typeof SFX.terminalOpen, 'function');
assert.strictEqual(typeof SFX.terminalKey, 'function');
assert.strictEqual(typeof SFX.accessGranted, 'function');
assert.strictEqual(typeof SFX.errorBuzz, 'function');
console.log('✓ SFX namespace exports all terminal audio functions');

console.log('--- Terminal SFX Procedural Synthesis Tests PASSED ---');
