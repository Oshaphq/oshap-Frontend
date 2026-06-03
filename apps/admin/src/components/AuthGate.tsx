import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router";
import { adminApi, getAdminRestaurantId, getAdminRestaurantName, useAdminGroup } from "@oshap/shared";
import { PrimaryButton, ThemeToggle } from "@oshap/shared/ui";
import { initFCM } from "../utils/fcm";
import AlertCenter from "./AlertCenter";
import { useAuth } from "../context/AuthContext";

const BRANCH_KEY = "oshap-active-branch";

function readStoredBranch(): string | null {
  try {
    return localStorage.getItem(BRANCH_KEY);
  } catch {
    return null;
  }
}

export default function AuthGate() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const groupQuery = useAdminGroup();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string>(() => readStoredBranch() ?? "");
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
      const res = await adminApi.adminLoginEmail({ email, password });
      login(res.user, res.token, res.restaurant);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err && err.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Connection failed. Check your network.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest">
        <div className="oshap-spinner" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest p-md">
        <form onSubmit={handleLogin} className="w-full max-w-[384px] bg-surface-container rounded-xl p-xl flex flex-col items-center gap-md">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-2xl text-on-primary-container">
            <i className="mgc_lock_fill" />
          </div>
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Staff Login
          </h1>
          <p className="text-p2 text-secondary-text text-center mb-s">
            Enter your email and password to access the dashboard.
          </p>

          <input
            className={`w-full px-md py-md rounded-lg bg-surface-container-lowest border-2 text-p text-primary-text placeholder:text-outline outline-none transition-colors ${error ? "border-error" : "border-outline-variant focus:border-primary"}`}
            type="email"
            placeholder="Email address"
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
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={`w-full px-md py-md rounded-lg bg-surface-container-lowest border-2 text-p text-primary-text placeholder:text-outline outline-none transition-colors pr-12 ${error ? "border-error" : "border-outline-variant focus:border-primary"}`}
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
        </form>
      </div>
    );
  }

  const restaurantName = getAdminRestaurantName();
  const group = groupQuery.data;
  const showBranchSelector =
    user?.role === "OWNER" && (group?.branches.length ?? 0) > 1;

  const handleBranchChange = (id: string) => {
    setActiveBranchId(id);
    try {
      localStorage.setItem(BRANCH_KEY, id);
    } catch {}
  };

  // Role-based tabs
  const tabs = [];
  if (["OWNER", "MANAGER", "WAITER", "CASHIER"].includes(user.role)) {
    tabs.push({ to: "/", label: "Tables", end: true });
  }
  if (["OWNER", "MANAGER"].includes(user.role)) {
    tabs.push({ to: "/menu", label: "Menu" });
  }
  if (["OWNER", "MANAGER", "KITCHEN", "BARTENDER"].includes(user.role)) {
    tabs.push({ to: "/kitchen", label: "Orders" });
  }
  if (["OWNER", "MANAGER"].includes(user.role)) {
    tabs.push({ to: "/history", label: "History" });
    tabs.push({ to: "/settings", label: "Settings" });
  }
  if (user.role === "OWNER") {
    tabs.push({ to: "/analytics", label: "Analytics" });
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      <header className="bg-surface-container-lowest border-b border-surface-container-high">
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
            {showBranchSelector && group && (
              <div className="relative">
                <select
                  value={activeBranchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="pl-s pr-8 py-xs rounded-lg border border-outline-variant bg-surface-container text-caption-md text-primary-text font-semibold outline-none focus:border-primary appearance-none cursor-pointer max-w-[160px]"
                >
                  <option value="">All Branches</option>
                  {group.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <i className="mgc_down_line absolute right-s top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm" aria-hidden />
              </div>
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
              className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container text-secondary-text border-[1.5px] border-transparent hover:bg-error-container hover:text-on-error-container transition-colors"
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
