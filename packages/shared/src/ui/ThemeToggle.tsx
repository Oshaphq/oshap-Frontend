import { useTheme } from "../utils/theme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="w-10 h-10 flex items-center justify-center rounded-4xl bg-surface-container text-on-surface-variant text-xl transition-colors hover:bg-surface-container-high shrink-0"
    >
      <i className={theme === "dark" ? "mgc_sun_line" : "mgc_moon_line"} />
    </button>
  );
}
