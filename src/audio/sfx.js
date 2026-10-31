import { getAudioCtx, getSFXDestination } from './synth.js';

export function playDeRezSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.85);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.85);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch (_) {}
}

export function playWarningSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

export function playTileDropSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.55);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch (_) {}
}

export function playCatchDiscSound(pitch = 1.0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 340 * pitch;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (_) {}
}

export function playTerminalOpenSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

export function playTerminalKeySound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  } catch (_) {}
}

export function playAccessGrantedSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(getSFXDestination(ctx));
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(getSFXDestination(ctx));
    osc2.start(now + 0.1);
    osc2.stop(now + 0.38);
  } catch (_) {}
}

export function playErrorBuzzSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, now);
    osc2.frequency.setValueAtTime(138, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.26);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(getSFXDestination(ctx));

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  } catch (_) {}
}

export function playStarIgniteSound(tier = 1) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const clampedTier = Math.max(1, Math.min(3, Math.floor(tier)));
    
    // Tier-specific ascending triad frequencies (F5/A5/C6)
    const baseFreqs = {
      1: [698.46, 1046.50], // F5, C6
      2: [880.00, 1318.51], // A5, E6
      3: [1046.50, 1567.98, 2093.00] // C6, G6, C7
    };
    const freqs = baseFreqs[clampedTier] || baseFreqs[1];
    const duration = 0.35 + (clampedTier * 0.1);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = clampedTier === 3 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + (idx * 0.04));
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18 / freqs.length, now + (idx * 0.04) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(getSFXDestination(ctx));
      osc.start(now + (idx * 0.04));
      osc.stop(now + duration);
    });
  } catch (_) {}
}

export function playBitAccrualSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now); // A6
    osc.frequency.exponentialRampToValueAtTime(2349.32, now + 0.05); // D7

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (_) {}
}

export function playMissionBriefSweepSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (_) {}
}

export function playFabricateSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Stage 1: Laser compilation sweep (sawtooth)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(220, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(1760, now + 0.28);

    sweepGain.gain.setValueAtTime(0.01, now);
    sweepGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    sweepOsc.connect(sweepGain);
    sweepGain.connect(getSFXDestination(ctx));
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.32);

    // Stage 2: Resonant crystalline lock-in chime triad (F#5, A#5, C#6)
    const freqs = [739.99, 932.33, 1108.73];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = now + 0.18 + (idx * 0.03);
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + 0.35);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(getSFXDestination(ctx));
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (_) {}
}

export function playEquipSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Transient mechanical click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1200, now);

    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    clickOsc.connect(clickGain);
    clickGain.connect(getSFXDestination(ctx));
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);

    // Harmonic confirmation tone
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(1046.50, now + 0.02);
    chimeOsc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.18);

    chimeGain.gain.setValueAtTime(0.001, now + 0.02);
    chimeGain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(getSFXDestination(ctx));
    chimeOsc.start(now + 0.02);
    chimeOsc.stop(now + 0.22);
  } catch (_) {}
}

export function playAchievementFanfare() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // 4-note ascending synth arpeggio: F#5 (739.99), A#5 (932.33), C#6 (1108.73), F#6 (1479.98)
    const notes = [739.99, 932.33, 1108.73, 1479.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      const startTime = now + idx * 0.08;
      const duration = 0.55;

      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, startTime + duration);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(getSFXDestination(ctx));
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (_) {}
}

export const SFX = {
  catchDisc: (pitch = 1.0) => playCatchDiscSound(pitch),
  countdownTick: () => playCatchDiscSound(0.65), // pitched down
  fight: () => playCatchDiscSound(1.75), // higher pitch
  terminalOpen: () => playTerminalOpenSound(),
  terminalKey: () => playTerminalKeySound(),
  accessGranted: () => playAccessGrantedSound(),
  errorBuzz: () => playErrorBuzzSound(),
  starIgnite: (tier = 1) => playStarIgniteSound(tier),
  bitAccrual: () => playBitAccrualSound(),
  missionBriefSweep: () => playMissionBriefSweepSound(),
  fabricate: () => playFabricateSound(),
  equip: () => playEquipSound(),
  achievementFanfare: () => playAchievementFanfare()
};

if (typeof window !== 'undefined') {
  window.derezAudioHook = playDeRezSound;
}


