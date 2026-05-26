import { useState, useCallback, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router";
import { setAdminPin, getAdminPin, ApiError, initFCM } from "@oshap/shared";
import { adminApi } from "@oshap/shared/api";

export default function PinGate() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const stored = getAdminPin();
    if (stored) {
      setAuthenticated(true);
    }
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const restaurantId = import.meta.env.VITE_RESTAURANT_ID ?? "";
    if (!restaurantId) {
      console.warn("[FCM] VITE_RESTAURANT_ID not set — skipping device registration.");
      return;
    }

    initFCM(restaurantId, navigator.userAgent).catch((err) => {
      console.error("[FCM] initFCM failed:", err);
    });
  }, [authenticated]);

  const handleLogin = useCallback(async () => {
    setPinError("");
    setIsLoggingIn(true);

    try {
      setAdminPin(pinInput);
      await adminApi.adminGetTables();
      setAuthenticated(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAdminPin(null);
        setPinError("Invalid PIN. Try again.");
      } else {
        setPinError("Connection failed. Check your network.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  }, [pinInput]);

  const handleLogout = () => {
    setAdminPin(null);
    setAuthenticated(false);
    setPinInput("");
    setPinError("");
    navigate("/");
  };

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="oshap-spinner" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface p-md">
        <div className="w-full max-w-sm bg-surface-container-low rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col items-center gap-md mb-lg">
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
              <i className="mgc_lock_fill text-3xl text-on-primary-container" />
            </div>
            <h1 className="text-display-h2 font-bold text-primary-text">Staff Login</h1>
            <p className="text-label-l4 text-secondary-text">Enter your PIN to access the dashboard</p>
          </div>

          <input
            className={`w-full px-lg py-md rounded-xl bg-surface text-p text-primary-text placeholder:text-secondary-text border outline-none transition-colors ${
              pinError
                ? "border-error"
                : "border-outline-variant focus:border-primary"
            }`}
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter PIN"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            autoFocus
          />
          {pinError && (
            <p className="mt-s text-caption text-error">{pinError}</p>
          )}

          <button
            className="w-full mt-lg py-md rounded-xl bg-primary text-on-primary font-semibold text-label-l4 transition-opacity hover:opacity-90 disabled:opacity-50"
            onClick={handleLogin}
            disabled={isLoggingIn || pinInput.length < 3}
          >
            {isLoggingIn ? "Verifying..." : "Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="flex gap-1 px-md py-s bg-surface-container border-b border-outline-variant overflow-x-auto">
        {[
          { to: "/", label: "Tables", end: true },
          { to: "/menu", label: "Menu" },
          { to: "/kitchen", label: "Kitchen" },
          { to: "/history", label: "History" },
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-md py-s rounded-lg font-semibold text-label-l5 whitespace-nowrap transition-colors no-underline ${
                isActive
                  ? "bg-primary text-white"
                  : "text-secondary-text hover:bg-surface-container-high"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="ml-auto px-md py-s rounded-lg text-secondary-text hover:bg-error-container hover:text-on-error-container transition-colors flex items-center gap-1"
          title="Logout"
        >
          <i className="mgc_exit_line" />
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
