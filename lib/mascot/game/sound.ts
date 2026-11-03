/**
 * A short two-note ting. No audio file. Plays only from a tap, and only when
 * the saved choice is on. Failures (autoplay, missing API) are ignored.
 */

let shared: AudioContext | null = null;

export function playGameTing(enabled: boolean): void {
  if (!enabled || typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    if (!shared) shared = new Ctx();
    const ctx = shared;
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime + 0.01;
    blip(ctx, 880, start, 0.09);
    blip(ctx, 1320, start + 0.07, 0.12);
  } catch {
    shared = null;
  }
}

function blip(ctx: AudioContext, freq: number, at: number, dur: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.045, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}
