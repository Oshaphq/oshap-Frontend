/**
 * Time-based dark mode.
 *
 * Light during the day, dark at night — flips on the `data-theme="dark"`
 * attribute on <html>, which the Tailwind v4 @theme block in
 * `packages/shared/src/tokens/tokens.css` already wires up across all
 * semantic color utilities.
 *
 * Apps should ALSO inline a tiny script in index.html that sets the attribute
 * synchronously before React mounts, to avoid a light-flash on dark-time loads.
 * See the <script> block in each app's index.html.
 */

const DARK_START_HOUR = 18; // 6 PM
const DARK_END_HOUR = 7; //    7 AM

function isNight(now = new Date()): boolean {
  const h = now.getHours();
  return h >= DARK_START_HOUR || h < DARK_END_HOUR;
}

function applyTheme(): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (isNight()) {
    el.setAttribute("data-theme", "dark");
  } else {
    el.removeAttribute("data-theme");
  }
}

/**
 * Apply the time-based theme now, then re-check periodically and on tab focus
 * so the UI flips at the right hour without needing a refresh.
 *
 * Returns a teardown function — call it from a useEffect cleanup if you need
 * to stop the watcher (rarely needed; theme runs for app lifetime).
 */
export function initTimeBasedTheme(): () => void {
  if (typeof window === "undefined") return () => { };
  applyTheme();

  const intervalId = window.setInterval(applyTheme, 5 * 60_000);

  const onVisibility = () => {
    if (document.visibilityState === "visible") applyTheme();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
