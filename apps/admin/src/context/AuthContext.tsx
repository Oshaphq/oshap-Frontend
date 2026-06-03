import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { StaffMember, Restaurant, getAdminPin, adminApi, ADMIN_UNAUTHORIZED_EVENT, setAdminPin, setAdminRestaurant } from "@oshap/shared";

interface AuthContextValue {
  user: StaffMember | null;
  isAuthenticated: boolean;
  login: (user: StaffMember, token: string, restaurant: Restaurant) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const pin = getAdminPin();
      if (pin) {
        try {
          const res = await adminApi.adminGetMe();
          setUser(res.user);
        } catch {
          setAdminPin(null);
          setAdminRestaurant(null);
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = (u: StaffMember, t: string, r: Restaurant) => {
    setAdminPin(t);
    setAdminRestaurant(r);
    setUser(u);
  };

  const logout = () => {
    setAdminPin(null);
    setAdminRestaurant(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
