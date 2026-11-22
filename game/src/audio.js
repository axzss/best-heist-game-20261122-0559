// Synthesised WebAudio sounds: no audio files, no network. Every effect is
// a tiny oscillator / filtered-noise burst built on first user gesture, so
// the page stays silent until the player interacts (browser autoplay rule).

let ctx = null;
let droneNodes = null;

/** Create (or reuse) the audio context. Safe to call before any gesture. */
export function ensureAudio() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(freq, seconds, type, gainValue, slideTo) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

function noiseBurst(seconds, gainValue, filterFreq) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
}

/** A soft footstep tick; quieter and lower while sneaking. */
export function playStep(sneaking) {
  noiseBurst(0.06, sneaking ? 0.05 : 0.11, sneaking ? 500 : 900);
}

/** The guard's puzzled "huh?" blip when something looks off. */
export function playSuspicious() {
  tone(620, 0.14, 'sine', 0.12, 880);
}

/** The alarm sting when a guard goes fully alerted. */
export function playAlarmSting() {
  tone(740, 0.22, 'square', 0.09, 520);
  setTimeout(() => tone(740, 0.22, 'square', 0.09, 520), 240);
}

/** The lockdown klaxon: two low saws. */
export function playLockdown() {
  tone(220, 0.5, 'sawtooth', 0.1, 180);
  setTimeout(() => tone(220, 0.5, 'sawtooth', 0.1, 180), 520);
}

/** A bright coin ping that carries across the gallery. */
export function playCoinPing() {
  tone(1568, 0.35, 'sine', 0.14, 1568);
  tone(2093, 0.25, 'sine', 0.06, 2093);
}

/** The EMP zap when a camera goes dark. */
export function playEmpZap() {
  tone(1800, 0.3, 'sawtooth', 0.1, 120);
  noiseBurst(0.2, 0.08, 2400);
}

/** A small pickup chime for loot. */
export function playPickup() {
  tone(880, 0.12, 'sine', 0.12);
  setTimeout(() => tone(1318, 0.18, 'sine', 0.12), 90);
}

/** The diamond fanfare: a rising four-note arpeggio. */
export function playDiamond() {
  [523, 659, 784, 1046].forEach((freq, i) => {
    setTimeout(() => tone(freq, 0.3, 'triangle', 0.14), i * 110);
  });
}

/** The level-complete jingle. */
export function playWin() {
  [523, 659, 784, 1046, 1318].forEach((freq, i) => {
    setTimeout(() => tone(freq, 0.28, 'triangle', 0.12), i * 120);
  });
}

/** A dull thud when a guard catches the thief. */
export function playCaught() {
  tone(160, 0.4, 'sawtooth', 0.14, 70);
  noiseBurst(0.25, 0.12, 300);
}

/** Start the low ambient drone under the whole museum. */
export function startDrone() {
  if (!ctx || droneNodes) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  gain.gain.value = 0.035;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain).connect(gain.gain);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  lfo.start();
  droneNodes = { osc, lfo };
}
