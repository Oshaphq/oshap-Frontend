import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router";
import {
  adminApi,
  getAdminRestaurantId,
  getAdminRestaurantName,
  isMalformedPhone,
  useAdminBranches,
  useAdminKitchen,
} from "@oshap/shared";
import {
  PrimaryButton,
  Select,
  Spinner,
  ThemeToggle,
} from "@oshap/shared/ui";
import { initFCM } from "../utils/fcm";
import AlertCenter from "./AlertCenter";
import NotificationBell from "./NotificationBell";
import { tabsForRole } from "../permissions";
import { useAuth } from "../context/AuthContext";

export default function AuthGate() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, login, logout, activeBranchId, setActiveBranch } = useAuth();
  const branchesQuery = useAdminBranches();
  /**
   * Tickets the kitchen has not finished. `useAdminKitchen` already polls and
   * already invalidates on the realtime events, so this costs nothing extra —
   * the board and the badge read the same cache.
   */
  const kitchenQuery = useAdminKitchen();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const restaurantId = getAdminRestaurantId();
    if (!restaurantId) return;

    initFCM(restaurantId, navigator.userAgent).catch((err) => {
      console.error("[FCM] initFCM failed:", err);
    });
  }, [isAuthenticated]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    /**
     * Shape, not identity.
     *
     * A malformed number and a wrong password both come back as one 401, so
     * without this a manager retypes the password when the number was the
     * problem. An email is never caught by this — see `isMalformedPhone`.
     *
     * Not normalized before sending: /auth/login canonicalizes the identifier
     * itself, so the raw string is what the contract expects.
     */
    const identifier = email.trim();
    if (isMalformedPhone(identifier)) {
      setError("Enter a valid Nigerian phone number, or use your email.");
      return;
    }

    setIsLoggingIn(true);

    try {
      const res = await adminApi.adminLoginEmail({ identifier, password });
      login(res);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err && err.status === 401) {
        setError("Invalid credentials. Check the number or email and try again.");
      } else {
        setError("Connection failed. Check your network.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * Asks for a fresh setup link. The response is deliberately the same whether
   * or not the identifier matched — anything else would let a stranger check
   * which merchants are on the platform — so the UI says the same thing too.
   */
  const handleForgot = async () => {
    if (!email.trim()) {
      setError("Enter your phone number or email first.");
      return;
    }
    setIsResetting(true);
    setError("");
    try {
      await adminApi.forgotPassword({ identifier: email.trim() });
      setResetSent(true);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface p-md">
        <form onSubmit={handleLogin} className="w-full max-w-[384px] bg-surface-container-low rounded-2xl p-xl flex flex-col items-center gap-md">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-2xl text-on-primary-container">
            <i className="mgc_lock_fill" />
          </div>
          <h1 className="font-display text-title-large font-semibold text-on-surface">
            Staff Login
          </h1>
          <p className="text-body-medium text-on-surface-variant text-center mb-s">
            Enter your phone number or email and password to continue.
          </p>

          <input
            className={`w-full px-md py-md rounded-sm bg-surface-container-low border-2 text-body-large text-on-surface placeholder:text-on-surface-placeholder outline-none transition-colors ${error ? "border-error" : "border-outline-variant focus:border-primary"}`}
            // Not type="email": most staff sign in with a phone number, and
            // the browser would reject one as malformed before we ever ask.
            // No inputMode either — "email" opened a keyboard with no number
            // row for the majority case, and "tel" would strip the letters the
            // minority needs. The default keyboard is the only one that serves
            // a field taking either.
            type="text"
            aria-label="Phone number or email"
            placeholder="Phone number or email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            required
            autoFocus
          />

          <div className="w-full relative">
            <input
              type={showPassword ? "text" : "password"}
              aria-label="Password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={`w-full px-md py-md rounded-sm bg-surface-container-low border-2 text-body-large text-on-surface placeholder:text-on-surface-placeholder outline-none transition-colors pr-12 ${error ? "border-error" : "border-outline-variant focus:border-primary"}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-s top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors rounded-full"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={showPassword ? "mgc_eye_close_line text-xl" : "mgc_eye_line text-xl"} />
            </button>
          </div>
          {error && <p className="text-body-medium text-error">{error}</p>}

          <PrimaryButton
            type="submit"
            disabled={isLoggingIn || !email || !password}
            className="w-full mt-s"
          >
            {isLoggingIn ? "Verifying..." : "Login"}
          </PrimaryButton>

          {/* Without this, a spent or lost setup link is unrecoverable — the
              only remaining route into the account is someone editing the
              database. The setup screen already tells people to come here. */}
          {resetSent ? (
            <p className="text-body-medium text-on-surface-variant text-center">
              If that account exists, a reset link is on its way.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleForgot}
              disabled={isResetting}
              className="text-body-medium font-semibold text-primary-label hover:underline disabled:opacity-50 bg-transparent border-0 cursor-pointer"
            >
              {isResetting ? "Sending…" : "Forgot password?"}
            </button>
          )}
        </form>
      </div>
    );
  }

  const restaurantName = getAdminRestaurantName();
  // A closed venue must not be selectable — switching to one would show a
  // manager an empty board and no way to tell why. Reopening it in Settings
  // brings it back.
  const branches = (branchesQuery.data ?? []).filter((b) => b.is_active);
  // READY is deliberately excluded: the food is made, and the job left is
  // carrying it out, which is a waiter's task rather than a kitchen backlog.
  const waitingTickets = (kitchenQuery.data ?? []).filter(
    (o) => o.status === "CREATED" || o.status === "PREPARING",
  ).length;
  // One venue is the normal case, and a switcher offering a single choice is
  // furniture. It appears when there is actually something to switch between.
  const showBranchSelector = user?.role === "OWNER" && branches.length > 1;

  const tabs = tabsForRole(user.role, {
    branchCount: branches.length,
    waitingTickets,
  });

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface border-b border-outline-variant">
        <nav className="flex items-center justify-between gap-s px-s sm:px-md py-s">
          {/* Hamburger — mobile & tablet only */}
          <button
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <i className={menuOpen ? "mgc_close_line text-xl" : "mgc_menu_line text-xl"} aria-hidden />
          </button>

          {/* Desktop tab bar — hidden below lg */}
          <div className="hidden lg:flex items-center gap-0.5 shrink min-w-0">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `px-md py-s rounded-sm text-label-large font-semibold font-display whitespace-nowrap transition-colors no-underline shrink-0 ${isActive
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                  }`
                }
              >
                {tab.label}
                {tab.count ? (
                  <span
                    // Inherits the tab's own colours so it reads as part of the
                    // label rather than an alert pinned to it — this counts
                    // work in hand, it is not a warning.
                    className="ml-xs inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-current/15 text-label-small font-bold tabular-nums"
                  >
                    {tab.count}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>

          {/* Right controls — always visible */}
          <div className="flex items-center gap-s shrink-0 ml-auto lg:ml-0">
            {showBranchSelector && (
              <Select
                aria-label="Active branch"
                value={activeBranchId}
                onChange={(e) => setActiveBranch(e.target.value)}
                className="font-semibold"
                wrapperClassName="max-w-[160px]"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <NotificationBell />
            <ThemeToggle />
            <div className="hidden md:flex flex-col items-end mr-s">
              <span className="text-label-large font-semibold text-on-surface">{user.name}</span>
              <span className="text-body-medium text-on-surface-variant">{user.role}</span>
            </div>
            {restaurantName && (
              <span
                className="hidden lg:inline text-body-medium font-semibold text-on-surface-variant truncate max-w-[200px]"
                title={restaurantName}
              >
                {restaurantName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant border border-transparent hover:bg-error-container hover:text-on-error-container transition-colors"
              title="Logout"
            >
              <i className="mgc_exit_line text-lg" />
            </button>
          </div>
        </nav>

        {/* Mobile / tablet drawer */}
        {menuOpen && (
          <div className="lg:hidden px-s pb-s flex flex-col gap-xs">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-md py-s rounded-sm text-label-large font-semibold font-display transition-colors no-underline ${isActive
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <AlertCenter />
    </div>
  );
}
