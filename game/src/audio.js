// Tiny WebAudio synth for Lamplight Heist: no audio files, everything is a beep.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone(freq, dur, type, vol, when = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function sfxPickup() { tone(880, 0.12, 'sine', 0.09); tone(1318, 0.16, 'sine', 0.07, 0.07); }
export function sfxAlarm() { tone(220, 0.22, 'square', 0.06); tone(174, 0.22, 'square', 0.06, 0.22); }
export function sfxCaught() { tone(140, 0.4, 'sawtooth', 0.09); tone(90, 0.5, 'sawtooth', 0.09, 0.15); }
export function sfxWin() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.08, i * 0.11)); }
export function sfxStep() { tone(70, 0.05, 'triangle', 0.03); }
