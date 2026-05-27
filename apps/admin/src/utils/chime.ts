/**
 * Generates a short two-tone "doorbell" chime via Web Audio API.
 * No asset file needed — works offline and adds zero bundle weight.
 *
 * Must be called from inside (or after) a user gesture so the audio context
 * can start. The first call after login is safe because login is a tap.
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationMs: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;

  // Quick attack, exponential decay — bell-like envelope.
  const duration = durationMs / 1000;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export function playChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  const t = ctx.currentTime;
  // Ding-dong: E6 (1318.5 Hz) then C6 (1046.5 Hz), 180ms each, slight overlap.
  tone(ctx, 1318.5, t, 220);
  tone(ctx, 1046.5, t + 0.18, 320);
}
