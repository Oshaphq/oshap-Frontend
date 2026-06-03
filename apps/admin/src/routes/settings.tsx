import { NavLink, Routes, Route, Navigate } from "react-router";
import GeneralSettings from "./settings/general";
import StaffSettings from "./settings/staff";

export default function SettingsLayout() {
  return (
    <div className="p-md max-w-4xl mx-auto space-y-md pb-32">
      <div>
        <h1 className="text-display-h2 font-display font-semibold text-primary-text mb-s">
          Settings
        </h1>
        <p className="text-p2 text-secondary-text">
          Manage your restaurant details and staff access.
        </p>
      </div>

      <div className="flex items-center gap-md border-b border-surface-container-high pb-xs">
        <NavLink 
          to="general" 
          className={({ isActive }) => 
            `pb-xs font-semibold text-label-l3 border-b-2 transition-colors ${isActive ? "border-primary text-primary" : "border-transparent text-secondary-text hover:text-primary-text"}`
          }
        >
          General
        </NavLink>
        <NavLink 
          to="staff" 
          className={({ isActive }) => 
            `pb-xs font-semibold text-label-l3 border-b-2 transition-colors ${isActive ? "border-primary text-primary" : "border-transparent text-secondary-text hover:text-primary-text"}`
          }
        >
          Staff Management
        </NavLink>
      </div>

      <div className="pt-md">
        <Routes>
          <Route path="general" element={<GeneralSettings />} />
          <Route path="staff" element={<StaffSettings />} />
          <Route path="*" element={<Navigate to="general" replace />} />
        </Routes>
      </div>
    </div>
  );
}
