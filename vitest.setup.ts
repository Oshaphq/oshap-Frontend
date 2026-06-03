// The mock API opens an optional cross-tab relay WebSocket on import. Under
// jsdom the bundled WebSocket actually dials localhost and then throws an
// undici/jsdom Event-type mismatch as an uncaught error. Tests don't need the
// relay, so stub WebSocket with an inert no-op before any module imports it.
class NoopWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readyState = NoopWebSocket.CLOSED;
  onmessage: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  send(): void {}
  close(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}

// @ts-expect-error — replacing the global with a minimal test stub.
globalThis.WebSocket = NoopWebSocket;
