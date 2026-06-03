import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { Role } from "@oshap/shared";

interface RoleGateProps {
  allowedRoles: Role[];
}

export default function RoleGate({ allowedRoles }: RoleGateProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-center px-md">
        <div className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center text-3xl">
          <i className="mgc_close_fill" />
        </div>
        <h2 className="font-display text-display-h2 font-semibold text-primary-text">
          Access Denied
        </h2>
        <p className="text-p2 text-secondary-text max-w-[384px]">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
