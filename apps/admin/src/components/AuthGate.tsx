import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router";
import { adminApi, getAdminRestaurantId, getAdminRestaurantName } from "@oshap/shared";
import { PrimaryButton, ThemeToggle } from "@oshap/shared/ui";
import { initFCM } from "../utils/fcm";
import AlertCenter from "./AlertCenter";
import { useAuth } from "../context/AuthContext";

export default function AuthGate() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-surface-container rounded-xl p-xl flex flex-col items-center gap-md">
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
          <input
            className={`w-full px-md py-md rounded-lg bg-surface-container-lowest border-2 text-p text-primary-text placeholder:text-outline outline-none transition-colors ${error ? "border-error" : "border-outline-variant focus:border-primary"}`}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            required
          />
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

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      <nav className="flex items-center justify-between gap-md px-md py-s bg-surface-container-lowest border-b border-surface-container-high overflow-x-auto">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `px-md py-s rounded-lg text-label-l4 font-semibold font-display whitespace-nowrap transition-colors no-underline ${isActive
                  ? "bg-primary text-on-primary"
                  : "text-secondary-text hover:bg-surface-container-high"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-md">
          <ThemeToggle />
          <div className="hidden sm:flex flex-col items-end mr-s">
             <span className="text-label-l4 font-semibold text-primary-text">{user.name}</span>
             <span className="text-caption-md text-secondary-text">{user.role}</span>
          </div>
          {restaurantName && (
            <span
              className="hidden md:inline text-caption-md font-semibold text-secondary-text truncate max-w-[200px]"
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
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <AlertCenter />
    </div>
  );
}
