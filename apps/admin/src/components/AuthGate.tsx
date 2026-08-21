import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router";
import {
  adminApi,
  getAdminRestaurantId,
  getAdminRestaurantName,
  useAdminBranches,
} from "@oshap/shared";
import { PrimaryButton, Select, ThemeToggle } from "@oshap/shared/ui";
import { initFCM } from "../utils/fcm";
import AlertCenter from "./AlertCenter";
import { useAuth } from "../context/AuthContext";

export default function AuthGate() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, login, logout, activeBranchId, setActiveBranch } = useAuth();
  const branchesQuery = useAdminBranches();

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
    setIsLoggingIn(true);

    try {
      const res = await adminApi.adminLoginEmail({ identifier: email, password });
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
        <div className="oshap-spinner" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface p-md">
        <form onSubmit={handleLogin} className="w-full max-w-[384px] bg-surface-container-low rounded-xl p-xl flex flex-col items-center gap-md">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-2xl text-on-primary-container">
            <i className="mgc_lock_fill" />
          </div>
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Staff Login
          </h1>
          <p className="text-p2 text-secondary-text text-center mb-s">
            Enter your phone number or email and password to continue.
          </p>

          <input
            className={`w-full px-md py-md rounded-lg bg-surface-container-low border-2 text-p text-primary-text placeholder:text-outline outline-none transition-colors ${error ? "border-error" : "border-outline-variant focus:border-primary"}`}
            // Not type="email": most staff sign in with a phone number, and
            // the browser would reject one as malformed before we ever ask.
            type="text"
            inputMode="email"
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
              className={`w-full px-md py-md rounded-lg bg-surface-container-low border-2 text-p text-primary-text placeholder:text-outline outline-none transition-colors pr-12 ${error ? "border-error" : "border-outline-variant focus:border-primary"}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-s top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-outline hover:text-primary-text transition-colors rounded-full"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={showPassword ? "mgc_eye_close_line text-xl" : "mgc_eye_line text-xl"} />
            </button>
          </div>
          {error && <p className="text-caption-md text-error">{error}</p>}

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
            <p className="text-caption-md text-secondary-text text-center">
              If that account exists, a reset link is on its way.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleForgot}
              disabled={isResetting}
              className="text-caption-md font-semibold text-primary hover:underline disabled:opacity-50 bg-transparent border-0 cursor-pointer"
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
  // One venue is the normal case, and a switcher offering a single choice is
  // furniture. It appears when there is actually something to switch between.
  const showBranchSelector = user?.role === "OWNER" && branches.length > 1;

  // Role-based tabs
  const tabs = [];
  if (["OWNER", "MANAGER", "WAITER", "CASHIER"].includes(user.role)) {
    tabs.push({ to: "/", label: "Tables", end: true });
  }
  if (["OWNER", "MANAGER"].includes(user.role)) {
    tabs.push({ to: "/menu", label: "Menu" });
    tabs.push({ to: "/inventory", label: "Inventory" });
  }
  if (["OWNER", "MANAGER", "KITCHEN", "BARTENDER"].includes(user.role)) {
    tabs.push({ to: "/kitchen", label: "Orders" });
  }
  if (["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    tabs.push({ to: "/z-report", label: "Close" });
  }
  if (["OWNER", "MANAGER"].includes(user.role)) {
    tabs.push({ to: "/history", label: "History" });
    tabs.push({ to: "/settings", label: "Settings" });
  }
  if (user.role === "OWNER") {
    tabs.push({ to: "/analytics", label: "Analytics" });
    // Group analytics compares venues, so it only means anything above one.
    if (branches.length > 1) {
      tabs.push({ to: "/analytics/group", label: "Group Analytics" });
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface border-b border-outline-variant">
        <nav className="flex items-center justify-between gap-s px-s sm:px-md py-s">
          {/* Hamburger — mobile & tablet only */}
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-secondary-text hover:bg-surface-container-high transition-colors shrink-0"
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
                  `px-md py-s rounded-lg text-label-l4 font-semibold font-display whitespace-nowrap transition-colors no-underline shrink-0 ${isActive
                    ? "bg-primary text-on-primary"
                    : "text-secondary-text hover:bg-surface-container-high"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>

          {/* Right controls — always visible */}
          <div className="flex items-center gap-s shrink-0 ml-auto lg:ml-0">
            {showBranchSelector && (
              <Select
                aria-label="Active branch"
                density="sm"
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
            <ThemeToggle />
            <div className="hidden md:flex flex-col items-end mr-s">
              <span className="text-label-l4 font-semibold text-primary-text">{user.name}</span>
              <span className="text-caption-md text-secondary-text">{user.role}</span>
            </div>
            {restaurantName && (
              <span
                className="hidden lg:inline text-caption-md font-semibold text-secondary-text truncate max-w-[200px]"
                title={restaurantName}
              >
                {restaurantName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface-variant border border-transparent hover:bg-error-container hover:text-on-error-container transition-colors"
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
                  `px-md py-s rounded-lg text-label-l4 font-semibold font-display transition-colors no-underline ${isActive
                    ? "bg-primary text-on-primary"
                    : "text-secondary-text hover:bg-surface-container-high"
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
