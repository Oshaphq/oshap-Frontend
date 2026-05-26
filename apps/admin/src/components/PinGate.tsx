import { useState, useCallback, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router";
import {
  ADMIN_UNAUTHORIZED_EVENT,
  ApiError,
  getAdminPin,
  getAdminRestaurantId,
  getAdminRestaurantName,
  initFCM,
  setAdminPin,
  setAdminRestaurant,
} from "@oshap/shared";
import { adminApi } from "@oshap/shared/api";
import { PrimaryButton } from "@oshap/shared/ui";

export default function PinGate() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const stored = getAdminPin();
    if (stored) {
      setAuthenticated(true);
      setRestaurantName(getAdminRestaurantName());
    }
    setChecked(true);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthenticated(false);
      setRestaurantName(null);
      setPinInput("");
      setPinError("Session expired. Sign in again.");
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () =>
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const restaurantId = getAdminRestaurantId();
    if (!restaurantId) return;

    initFCM(restaurantId, navigator.userAgent).catch((err) => {
      console.error("[FCM] initFCM failed:", err);
    });
  }, [authenticated]);

  const handleLogin = useCallback(async () => {
    setPinError("");
    setIsLoggingIn(true);

    try {
      setAdminPin(pinInput);
      const me = await adminApi.adminGetMe();
      setAdminRestaurant(me.restaurant);
      setRestaurantName(me.restaurant.name);
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
    setRestaurantName(null);
    setPinInput("");
    setPinError("");
    navigate("/");
  };

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest">
        <div className="oshap-spinner" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest p-md">
        <div className="w-full max-w-sm bg-surface-container rounded-xl p-xl flex flex-col items-center gap-md">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-2xl text-on-primary-container">
            <i className="mgc_lock_fill" />
          </div>
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Staff Login
          </h1>
          <p className="text-p2 text-secondary-text text-center">
            Enter your PIN to access the dashboard.
          </p>

          <input
            className={`w-full px-md py-md rounded-lg bg-surface-container-lowest border-2 text-xl text-center text-primary-text placeholder:text-outline outline-none transition-colors font-mono tracking-[16px] ${pinError ? "border-error" : "border-outline-variant focus:border-primary"
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
            <p className="text-caption-md text-error">{pinError}</p>
          )}

          <PrimaryButton
            onClick={handleLogin}
            disabled={isLoggingIn || pinInput.length < 3}
            className="w-full"
          >
            {isLoggingIn ? "Verifying..." : "Login"}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      <nav className="flex items-center justify-between gap-md px-md py-s bg-surface-container-lowest border-b border-surface-container-high overflow-x-auto">
        <div className="flex items-center gap-1">
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

        <div className="flex items-center gap-s">
          {restaurantName && (
            <span
              className="hidden sm:inline text-caption-md font-semibold text-secondary-text truncate max-w-[200px]"
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
      <Outlet />
    </div>
  );
}
