import { state } from '../core/state.js';

let masterVolume = 1.0;
let sfxVolume = 1.0;

export function initAudioBuses(ctx) {
  if (!ctx || typeof ctx.createGain !== 'function') return;
  if (ctx._sfxGain && ctx._masterGain) return;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(masterVolume, ctx.currentTime || 0);
    master.connect(ctx.destination);

    const sfx = ctx.createGain();
    sfx.gain.setValueAtTime(sfxVolume, ctx.currentTime || 0);
    sfx.connect(master);

    ctx._masterGain = master;
    ctx._sfxGain = sfx;
  } catch (_) {}
}

export function getSFXDestination(ctx = null) {
  const context = ctx || getAudioCtx();
  if (!context) return null;
  if (context._sfxGain) return context._sfxGain;
  return context.destination;
}

export function setMasterVolume(vol) {
  masterVolume = Math.max(0, Math.min(1, Number(vol) ?? 1));
  const ctx = getAudioCtx();
  if (ctx?._masterGain?.gain) {
    ctx._masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime || 0);
  }
}

export function getMasterVolume() {
  return masterVolume;
}

export function setSFXVolume(vol) {
  sfxVolume = Math.max(0, Math.min(1, Number(vol) ?? 1));
  const ctx = getAudioCtx();
  if (ctx?._sfxGain?.gain) {
    ctx._sfxGain.gain.setValueAtTime(sfxVolume, ctx.currentTime || 0);
  }
}

export function getSFXVolume() {
  return sfxVolume;
}

export function getAudioCtx() {
  if (!state.audioCtx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
    try {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window.__tronAudioCtx = state.audioCtx;
      initAudioBuses(state.audioCtx);
    } catch (_) {}
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }
  return state.audioCtx;
}
