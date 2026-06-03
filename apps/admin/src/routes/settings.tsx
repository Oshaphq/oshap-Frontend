import { NavLink, Routes, Route, Navigate } from "react-router";
import GeneralSettings from "./settings/general";
import StaffSettings from "./settings/staff";

export default function SettingsLayout() {
  return (
    <main className="p-md flex flex-col gap-l">
      <header className="flex flex-col gap-md sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Settings
          </h1>
          <p className="text-p2 text-secondary-text mt-xs">
            Manage your restaurant details and staff access.
          </p>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-surface-container-high pb-s">
        <NavLink 
          to="/settings/general" 
          className={({ isActive }) => 
            `px-md py-s rounded-lg font-semibold text-caption-md transition-all ${isActive ? "bg-surface-container text-primary border-[1.5px] border-outline-variant" : "text-secondary-text hover:bg-surface-container-high border-[1.5px] border-transparent"}`
          }
        >
          General
        </NavLink>
        <NavLink 
          to="/settings/staff" 
          className={({ isActive }) => 
            `px-md py-s rounded-lg font-semibold text-caption-md transition-all ${isActive ? "bg-surface-container text-primary border-[1.5px] border-outline-variant" : "text-secondary-text hover:bg-surface-container-high border-[1.5px] border-transparent"}`
          }
        >
          Staff Management
        </NavLink>
      </div>

      <div className="flex-1">
        <Routes>
          <Route path="general" element={<GeneralSettings />} />
          <Route path="staff" element={<StaffSettings />} />
          <Route path="*" element={<Navigate to="general" replace />} />
        </Routes>
      </div>
    </main>
  );
}
