import { state } from '../core/state.js';

export function getAudioCtx() {
  if (!state.audioCtx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
    try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }
  return state.audioCtx;
}
