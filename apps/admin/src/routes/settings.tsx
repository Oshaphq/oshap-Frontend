import { NavLink, Routes, Route, Navigate } from "react-router";
import GeneralSettings from "./settings/general";
import StaffSettings from "./settings/staff";
import TablesSettings from "./settings/tables";
import { useAuth } from "../context/AuthContext";

const tabCls = ({ isActive }: { isActive: boolean }) =>
  `px-md py-s rounded-lg font-semibold text-caption-md transition-all border ${
    isActive
      ? "bg-surface-container-high text-primary border-outline-variant"
      : "text-secondary-text hover:bg-surface-container-high border-transparent"
  }`;

export default function SettingsLayout() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  return (
    <main className="p-md flex flex-col gap-l">
      <header>
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Settings
        </h1>
        <p className="text-p2 text-secondary-text mt-xs">
          Manage your restaurant details, tables, and staff access.
        </p>
      </header>

      <div className="flex items-center gap-s border-b border-surface-container-high pb-s flex-wrap">
        <NavLink to="/settings/general" className={tabCls}>
          General
        </NavLink>
        <NavLink to="/settings/tables" className={tabCls}>
          Tables
        </NavLink>
        {isOwner && (
          <NavLink to="/settings/staff" className={tabCls}>
            Staff
          </NavLink>
        )}
      </div>

      <div className="flex-1">
        <Routes>
          <Route path="general" element={<GeneralSettings />} />
          <Route path="tables" element={<TablesSettings />} />
          {isOwner && <Route path="staff" element={<StaffSettings />} />}
          <Route path="*" element={<Navigate to="general" replace />} />
        </Routes>
      </div>
    </main>
  );
}
