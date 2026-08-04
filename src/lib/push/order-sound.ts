let ctx: AudioContext | null = null;
let unlocked = false;
let lastPlayedAt = 0;
const MIN_INTERVAL_MS = 2500; // never double-play within the grouping window

/**
 * Browsers block AudioContext before a user gesture. Unlock on first
 * interaction so realtime order chimes can play reliably later.
 */
export function unlockAudio(): void {
  if (unlocked || typeof window === "undefined") return;
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  try {
    ctx = new AudioCtor();
    void ctx.resume();
    unlocked = true;
  } catch {
    unlocked = false;
  }
}

function tone(freq: number, start: number, duration: number, volume: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const now = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

/** A bright, rounded note with a soft harmonic — the "ching" body. */
function chime(freq: number, start: number, duration: number, volume: number): void {
  if (!ctx) return;
  const now = ctx.currentTime + start;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2.01;

  const gain = ctx.createGain();
  const gain2 = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain2.gain.setValueAtTime(0.0001, now);
  gain2.gain.exponentialRampToValueAtTime(volume * 0.35, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(ctx.destination);
  gain2.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
  osc2.start(now);
  osc2.stop(now + duration + 0.05);
}

/** A metallic coin clink — short, percussive, slight pitch drop. */
function coinClink(freq: number, start: number, volume: number): void {
  if (!ctx) return;
  const now = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.88, now + 0.09);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/**
 * A cash-register "cha-ching": two metallic coin hits (drawer) followed by a
 * bright rising D5→G5 jingle. Plays at most once per MIN_INTERVAL_MS
 * regardless of how many orders arrive.
 */
export function playOrderSound(): void {
  if (!unlocked || !ctx || ctx.state !== "running") return;
  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  const t = ctx.currentTime;
  try {
    // Metallic coins landing in the drawer.
    coinClink(660, t, 0.09);
    coinClink(880, t + 0.1, 0.08);
    // The "cha-ching": D5 → G5 jingle with sparkle.
    chime(587.33, t + 0.2, 0.3, 0.11);
    chime(783.99, t + 0.34, 0.42, 0.12);
    tone(1567.98, t + 0.34, 0.28, 0.04);
  } catch {
    // Ignore sound failures — they must never break the order flow.
  }
}
