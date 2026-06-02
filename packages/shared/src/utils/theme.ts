import { useState, useEffect } from "react";

/**
 * Manual dark mode with persistence.
 *
 * `data-theme="dark"` on <html> is the single source of truth — every
 * semantic Tailwind utility in `tokens.css` keys off that attribute.
 *
 * Persistence: the user's choice is stored in localStorage under
 * `oshap-theme` and re-applied on every page load. Each app's index.html
 * inlines a tiny script that reads this key and sets the attribute BEFORE
 * React mounts, so a dark-mode user never sees a light flash on reload.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "oshap-theme";

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "dark" || raw === "light" ? raw : null;
}

function writeStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function currentDomTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => currentDomTheme());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      setTheme(currentDomTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!readStoredTheme()) {
        applyTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    applyTheme(next);
    writeStoredTheme(next);
  };

  const setThemeExplicit = (next: Theme) => {
    applyTheme(next);
    writeStoredTheme(next);
  };

  return { theme, toggleTheme, setTheme: setThemeExplicit };
}

/**
 * Read the stored theme and apply it synchronously. Safe to call before
 * React mounts. Used by the inline script in index.html and as a hook safety
 * net inside main.tsx.
 */
export function applyStoredTheme(): void {
  const stored = readStoredTheme();
  if (stored) applyTheme(stored);
}
