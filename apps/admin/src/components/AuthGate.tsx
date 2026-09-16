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
  SHELL_WIDTH,
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
    // `h-screen`, not `min-h-screen`: the bar is two rows at `lg` and one
    // below it, so any route that sized itself against a hardcoded bar height
    // was wrong at one breakpoint or the other. The scroll already lives on
    // the element below, so a full-height shell lets a route ask for `h-full`
    // and get the space that is actually left.
    <div className="h-screen bg-surface flex flex-col">
      {/* The bar is fixed chrome that outranks the content scrolling under it,
          so it sits one step up the ladder from the page and carries no bottom
          border — the tone change is the separation. See docs/color-usage.md. */}
      <header className="bg-surface-container-low">
        {/* Both rows sit in the same column as the page content beneath them,
            so the bar does not run edge to edge over centred content. */}
        {/* Top padding is the bar's, bottom padding belongs to whatever ends
            it. At `lg` that is each tab's own `pb-md`, which puts the space
            between the label and its underline and leaves the underline flush
            with the bottom edge it marks. Below `lg` there is no tab row, so
            the bar keeps the padding itself — without it the name would sit
            flush against the bottom edge. */}
        <div className={`w-full ${SHELL_WIDTH} pt-l pb-md lg:pb-0`}>
          {/* Row 1 — who and where on the left, controls on the right. */}
          <nav className="flex items-center justify-between gap-s px-md">
            <div className="flex items-center gap-s sm:gap-l min-w-0">
              {/* Hamburger — mobile & tablet only */}
              <button
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container transition-colors shrink-0"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                <i className={menuOpen ? "mgc_close_line text-xl" : "mgc_menu_line text-xl"} aria-hidden />
              </button>

              <span className="text-title-large font-semibold font-display text-on-surface truncate">
                {user.name}
              </span>
              {restaurantName && (
                <span
                  className="hidden sm:inline text-body-large text-on-surface-variant truncate max-w-[200px]"
                  title={restaurantName}
                >
                  {restaurantName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-s shrink-0">
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
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant border border-transparent hover:bg-error-container hover:text-on-error-container transition-colors"
                title="Logout"
              >
                <i className="mgc_exit_line text-lg" />
              </button>
            </div>
          </nav>

          {/* Row 2 — desktop tab bar, hidden below lg.
              An underline rather than a filled pill: eight filled pills in a
              row would put eight brand fills on one surface, and the rule is
              one filled element per view. `first:pl-0` pulls the leading
              glyph onto the same left edge as the name above it and the page
              column below — a tab bar that starts one padding step in reads
              as a misaligned container. */}
          <div className="hidden lg:flex items-stretch gap-4xl px-md lg:pt-2xl pb-0 min-w-0 overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex items-center gap-xs px-xs first:pl-0 pt-s pb-md border-b-[3px] text-label-large font-semibold font-display whitespace-nowrap transition-colors no-underline shrink-0 ${isActive
                    ? "border-primary text-primary-label"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* `_fill` when active, `_line` at rest. A glyph takes the
                        on-colour of what it sits on, so it needs no colour of
                        its own — the label's colour carries it. */}
                    <i
                      className={`mgc_${tab.icon}_${isActive ? "fill" : "line"} text-lg`}
                      aria-hidden
                    />
                    {tab.label}
                    {tab.count ? (
                      <span
                        // Inactive takes the error container: orders are the one
                        // queue here that goes stale in minutes, and the count has
                        // to pull the eye from across a counter. On the active tab
                        // it inherits instead — you are already looking at the
                        // board.
                        className={`ml-0.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-label-small font-bold tabular-nums ${isActive
                          ? "bg-current/15"
                          : "bg-error-container text-on-error-container"
                          }`}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile / tablet drawer */}
          {menuOpen && (
            <div className="lg:hidden px-md pt-s flex flex-col gap-xs">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  onClick={() => setMenuOpen(false)}
                  // The drawer keeps the filled destination: an underline is a
                  // horizontal device, and a stack of them reads as a list of
                  // rules rather than a set of places.
                  className={({ isActive }) =>
                    `flex items-center gap-s px-md py-s rounded-sm text-label-large font-semibold font-display transition-colors no-underline ${isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <i
                        className={`mgc_${tab.icon}_${isActive ? "fill" : "line"} text-lg`}
                        aria-hidden
                      />
                      {tab.label}
                      {tab.count ? (
                        <span
                          className={`ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-label-small font-bold tabular-nums ${isActive
                            ? "bg-current/15"
                            : "bg-error-container text-on-error-container"
                            }`}
                        >
                          {tab.count}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <AlertCenter />
    </div>
  );
}
