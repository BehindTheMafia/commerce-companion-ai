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

/**
 * A short, elegant two-note chime (Shopify-style "ding").
 * Plays at most once per MIN_INTERVAL_MS regardless of how many orders arrive.
 */
export function playOrderSound(): void {
  if (!unlocked || !ctx || ctx.state !== "running") return;
  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  const t = ctx.currentTime;
  try {
    // Bell: two harmonics of a soft A5.
    tone(880, 0, 0.5, 0.12);
    tone(1320, 0, 0.4, 0.05);
    // Gentle "cha-ching" tail: a quick high pluck a beat later.
    tone(1760, 0.12, 0.35, 0.04);
    tone(1174.66, 0.12, 0.3, 0.03);
  } catch {
    // Ignore sound failures — they must never break the order flow.
  }
}
