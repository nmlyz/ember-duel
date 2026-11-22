// Tiny synthesised sounds for Ember Duel: no audio files, just WebAudio
// oscillators. Created lazily on the first user gesture; silent in headless
// runs and in screenshot mode.

let audio = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureAudio() {
  if (audio || typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  } catch {
    audio = null;
  }
  return audio;
}

function tone(freq, dur, type, gain, when = 0) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur);
  } catch {
    // Sound never breaks the game.
  }
}

export const sfx = {
  draw() { tone(520, 0.08, 'sine', 0.08); },
  play() { tone(330, 0.12, 'triangle', 0.12); tone(495, 0.1, 'triangle', 0.1, 0.05); },
  attack() { tone(180, 0.14, 'sawtooth', 0.1); },
  hit() { tone(140, 0.18, 'square', 0.1); tone(90, 0.2, 'square', 0.08, 0.05); },
  heal() { tone(660, 0.15, 'sine', 0.09); tone(880, 0.18, 'sine', 0.07, 0.08); },
  turn() { tone(440, 0.1, 'sine', 0.07); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, i * 0.14)); },
  error() { tone(160, 0.1, 'square', 0.06); },
};
