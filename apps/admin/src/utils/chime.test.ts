import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * The chime never sounded in the pilot, and it failed silently — the sort of
 * bug that gets blamed on FCM when the audio never involved FCM at all.
 *
 * Browsers refuse to start an `AudioContext` outside a user gesture. The first
 * chime arrives from an SSE handler, so the context was created there, born
 * `suspended`, and `resume()` was refused. These tests pin the unlocking that
 * fixes it.
 */

class FakeAudioContext {
  state: "suspended" | "running" = "suspended";
  currentTime = 0;
  resumed = 0;
  started = 0;
  resume() {
    this.resumed++;
    this.state = "running";
    return Promise.resolve();
  }
  createGain() {
    return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n: unknown) => n };
  }
  createOscillator() {
    return {
      type: "sine",
      frequency: { value: 0 },
      connect: (n: unknown) => n,
      start: () => { this.started++; },
      stop: () => {},
    };
  }
}

let ctx: FakeAudioContext;

beforeEach(async () => {
  vi.resetModules();
  ctx = new FakeAudioContext();
  vi.stubGlobal("AudioContext", function () { return ctx; } as unknown);
});

describe("the audio has to be unlocked by a gesture", () => {
  it("is not ready before anyone has touched the page", async () => {
    const { chimeReady } = await import("./chime");
    expect(chimeReady()).toBe(false);
  });

  it("unlocks on the first gesture and stays unlocked", async () => {
    const { listenForFirstGesture, chimeReady } = await import("./chime");
    listenForFirstGesture();

    window.dispatchEvent(new Event("pointerdown"));

    expect(chimeReady()).toBe(true);
    expect(ctx.resumed).toBe(1);
  });

  it("plays a silent blip during the gesture", async () => {
    // Resuming alone is not enough on iOS — it wants a real playback inside
    // the gesture before it will allow the next one.
    const { unlockChime } = await import("./chime");
    unlockChime();
    expect(ctx.started).toBe(1);
  });

  it("only unlocks once, however many gestures follow", async () => {
    const { listenForFirstGesture, unlockChime } = await import("./chime");
    listenForFirstGesture();
    window.dispatchEvent(new Event("pointerdown"));
    unlockChime();
    unlockChime();
    expect(ctx.resumed).toBe(1);
  });

  it("a keypress counts — staff on a till may never touch the screen", async () => {
    const { listenForFirstGesture, chimeReady } = await import("./chime");
    listenForFirstGesture();
    window.dispatchEvent(new Event("keydown"));
    expect(chimeReady()).toBe(true);
  });
});

describe("playChime", () => {
  it("sounds two tones once unlocked", async () => {
    const { listenForFirstGesture, playChime } = await import("./chime");
    listenForFirstGesture();
    window.dispatchEvent(new Event("pointerdown"));

    const before = ctx.started;
    playChime();
    // Ding and dong.
    expect(ctx.started - before).toBe(2);
  });

  it("does not throw where there is no Web Audio at all", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { playChime } = await import("./chime");
    expect(() => playChime()).not.toThrow();
  });
});
