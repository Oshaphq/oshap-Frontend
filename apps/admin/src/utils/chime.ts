/**
 * A short two-tone doorbell, generated rather than loaded — works offline and
 * adds no bundle weight.
 *
 * **Why the unlocking below exists.** Browsers refuse to start an
 * `AudioContext` outside a user gesture. This used to create one lazily on the
 * first chime, which arrives from an SSE handler — no gesture in sight — so the
 * context was born `suspended` and `resume()` was refused. The old comment
 * claimed "the first call after login is safe because login is a tap", but
 * nothing touches the audio during login, and staff mostly arrive at an
 * already-open tab that was reloaded, where there is no login tap at all.
 *
 * So the context is created and unlocked on the **first gesture anywhere in the
 * admin app** — any tap or keypress — and every later chime uses it.
 */

let _ctx: AudioContext | null = null;
let _unlocked = false;

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

/**
 * Starts the audio context during a real gesture, so later chimes can sound.
 *
 * iOS wants an actual sound played inside the gesture, not merely a resumed
 * context — hence the silent tone. Idempotent, and safe to call from anywhere.
 */
export function unlockChime(): void {
  if (_unlocked) return;
  const ctx = getCtx();
  if (!ctx) return;
  _unlocked = true;

  void ctx.resume().catch(() => {});

  // A zero-gain blip. Inaudible, but it is a real playback and that is what
  // some browsers actually want before they will allow the next one.
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  } catch {
    // An older engine that dislikes this is no reason to break the caller.
  }
}

/** Whether a chime would currently be heard. Exported for the tests. */
export function chimeReady(): boolean {
  return _unlocked && _ctx?.state === "running";
}

/**
 * Listens once for any gesture in the app and unlocks on it.
 *
 * `capture` so a handler that stops propagation cannot swallow it, and
 * `once` so the listeners remove themselves.
 */
export function listenForFirstGesture(): void {
  if (typeof window === "undefined") return;
  const on = () => unlockChime();
  for (const type of ["pointerdown", "keydown", "touchstart"] as const) {
    window.addEventListener(type, on, { once: true, capture: true });
  }
}

export function playChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    // Will be refused outside a gesture, which is the case this cannot fix —
    // but a staff member who has touched the screen once is already unlocked.
    void ctx.resume().catch(() => {});
  }
  const t = ctx.currentTime;
  // Ding-dong: E6 (1318.5 Hz) then C6 (1046.5 Hz), 180ms each, slight overlap.
  tone(ctx, 1318.5, t, 220);
  tone(ctx, 1046.5, t + 0.18, 320);
}
