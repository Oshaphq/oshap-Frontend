import { useState } from "react";
import { NavLink, Outlet, Route, Routes, Navigate } from "react-router";
import {
  IconButton,
  PrimaryButton,
  ThemeToggle,
} from "@oshap/shared/ui";
import { platformApi, setPlatformToken } from "@oshap/shared";
import DashboardPage from "./routes/dashboard";
import RestaurantsPage from "./routes/restaurants";
import RestaurantDetailPage from "./routes/restaurant-detail";
import RestaurantNewPage from "./routes/restaurant-new";
import SubscriptionsPage from "./routes/subscriptions";
import HealthPage from "./routes/health";

const AUTH_KEY = "oshap-platform-auth";

function readAuth(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The operator gate.
 *
 * The access code is NOT compiled into this bundle, and must never be. A
 * `VITE_`-prefixed variable is inlined as a literal at build time, so a
 * deployed platform app built with the token would publish — to anyone who
 * opens devtools — the one secret that grants create, list and update over
 * every tenant on the production API.
 *
 * So there is nothing to compare against locally. The typed code is stored,
 * sent as `x-platform-token`, and validated by the server on a real request.
 * That was always the only boundary that counted; the old client-side
 * equality check just made it look like there were two.
 */
function PlatformLogin({ onLogin }: { onLogin: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || checking) return;

    setChecking(true);
    setError("");
    // Attach it first: the verification request has to carry the header it
    // is verifying.
    setPlatformToken(token);
    try {
      await platformApi.getHealth();
      try {
        sessionStorage.setItem(AUTH_KEY, "1");
      } catch {
        /* sessionStorage unavailable — auth stays in memory for this load */
      }
      onLogin();
    } catch (err: unknown) {
      setPlatformToken(null);
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : 0;
      setError(
        status === 401 || status === 422
          ? "Invalid access code."
          : "Could not reach the server. Check your connection.",
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-md">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[360px] bg-surface-container-low rounded-2xl p-xl flex flex-col items-center gap-md"
      >
        <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-2xl text-on-primary-container">
          <i className="mgc_shield_line" />
        </div>
        <h1 className="font-display text-title-medium font-semibold text-on-surface">
          Oshap Platform
        </h1>
        <p className="text-body-medium text-on-surface-variant text-center">
          Internal operator portal. Enter your platform access code to continue.
        </p>
        <input
          type="password"
          aria-label="Platform access code"
          placeholder="Platform access code"
          value={token}
          autoFocus
          onChange={(e) => {
            setToken(e.target.value);
            setError("");
          }}
          className={`w-full px-md py-md rounded-sm bg-surface-container-low border-2 text-body-large text-on-surface placeholder:text-on-surface-placeholder outline-none transition-colors ${
            error ? "border-error" : "border-outline-variant focus:border-primary"
          }`}
        />
        {error && <p className="text-body-medium text-error self-start">{error}</p>}
        <PrimaryButton
          type="submit"
          disabled={!token || checking}
          className="w-full"
        >
          {checking ? "Checking…" : "Access Platform"}
        </PrimaryButton>
      </form>
    </div>
  );
}

function PlatformLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* sessionStorage unavailable — nothing to clear */
    }
    setPlatformToken(null);
    window.location.reload();
  };

  const navLinks = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/restaurants", label: "Restaurants" },
    { to: "/subscriptions", label: "Subscriptions" },
    { to: "/health", label: "Health" },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface border-b border-outline-variant">
        <nav className="flex items-center justify-between gap-s px-s sm:px-md py-s">
          {/* Hamburger — mobile & tablet only */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <i className={menuOpen ? "mgc_close_line text-xl" : "mgc_menu_line text-xl"} aria-hidden />
          </button>

          {/* Logo */}
          <span className="font-display font-bold text-primary-label mr-s shrink-0">
            Oshap Platform
          </span>

          {/* Desktop tab bar — hidden below md */}
          <div className="hidden md:flex items-center gap-0.5 shrink min-w-0">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `px-md py-s rounded-sm text-label-large font-semibold font-display whitespace-nowrap transition-colors no-underline shrink-0 ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right controls — always visible */}
          <div className="flex items-center gap-s shrink-0 ml-auto md:ml-0">
            <ThemeToggle />
            <IconButton
              variant="surface"
              size="dense"
              icon="mgc_exit_line"
              onClick={handleLogout}
              className="hover:bg-error-container hover:text-on-error-container"
              title="Logout"
              aria-label="Log out"
            />
          </div>
        </nav>

        {/* Mobile / tablet drawer */}
        {menuOpen && (
          <div className="md:hidden px-s pb-s flex flex-col gap-xs">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-md py-s rounded-sm text-label-large font-semibold font-display transition-colors no-underline ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthed, setIsAuthed] = useState(readAuth);

  if (!isAuthed) {
    return <PlatformLogin onLogin={() => setIsAuthed(true)} />;
  }

  return (
    <Routes>
      <Route element={<PlatformLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/restaurants/new" element={<RestaurantNewPage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/health" element={<HealthPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
