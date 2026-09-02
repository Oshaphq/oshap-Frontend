import { Link, Routes, Route, Navigate, useLocation } from "react-router";
import {
  useAdminBankAccounts,
  useAdminBranches,
  useAdminSettings,
  useAdminStaff,
  useAdminTables,
} from "@oshap/shared";
import GeneralSettings from "./settings/general";
import StaffSettings from "./settings/staff";
import TablesSettings from "./settings/tables";
import BranchesSettings from "./settings/branches";
import BrandingSettings from "./settings/branding";
import BankSettings from "./settings/bank";
import NotificationSettings from "./settings/notifications";
import { useAuth } from "../context/AuthContext";

/**
 * Settings as a list of places, not a row of tabs.
 *
 * Seven sections do not fit across a phone, so the tab bar wrapped to three
 * lines and the current one was wherever it landed. A list has room for what
 * each section actually holds — and the counts underneath answer the question
 * people open settings to ask ("how many tables have I got?") without anyone
 * having to go in and look.
 */

/** One row of the list. The chevron is the only affordance it needs. */
function Row({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-md px-md py-md border-b border-outline-variant last:border-none no-underline hover:bg-surface-container transition-colors group"
    >
      <i className={`${icon} text-xl shrink-0 text-primary-label`} aria-hidden />
      <span className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-body-medium font-semibold text-on-surface">{title}</span>
        <span className="text-body-medium text-on-surface-variant">{subtitle}</span>
      </span>
      <i
        className="mgc_right_line text-lg shrink-0 text-outline group-hover:text-primary-label transition-colors"
        aria-hidden
      />
    </Link>
  );
}

/**
 * Counts live in their own components so each hook runs only for a role that
 * may call it. `useAdminStaff` 403s for anyone but an owner, and a hook cannot
 * be skipped with a condition — but a component that is never rendered never
 * calls one.
 */
function BankRow() {
  const { data } = useAdminBankAccounts();
  const n = data?.length ?? 0;
  return (
    <Row
      to="/settings/bank"
      icon="mgc_bank_line"
      title="Bank accounts"
      subtitle={
        n === 0
          ? "Where transfers go — none set up yet"
          : `${n} account${n === 1 ? "" : "s"} — guests see the top one`
      }
    />
  );
}

function StaffRow() {
  const { data } = useAdminStaff();
  const staff = data ?? [];
  const roles = new Set(staff.map((s) => s.role)).size;
  return (
    <Row
      to="/settings/staff"
      icon="mgc_group_line"
      title="Staff"
      subtitle={
        staff.length === 0
          ? "Who can sign in, and what they can do"
          : `${staff.length} account${staff.length === 1 ? "" : "s"} across ${roles} role${roles === 1 ? "" : "s"}`
      }
    />
  );
}

function TablesRow() {
  const { data } = useAdminTables();
  const n = data?.tables.length ?? 0;
  return (
    <Row
      to="/settings/tables"
      icon="mgc_qrcode_line"
      title="Tables"
      subtitle={n === 0 ? "QR codes for each table" : `${n} table${n === 1 ? "" : "s"} · QR codes`}
    />
  );
}

function BranchesRow() {
  const { data } = useAdminBranches();
  const n = data?.length ?? 0;
  return (
    <Row
      to="/settings/branches"
      icon="mgc_building_2_line"
      title="Branches"
      subtitle={n <= 1 ? "One location" : `${n} locations`}
    />
  );
}

export default function SettingsLayout() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { pathname } = useLocation();
  const { data: settings } = useAdminSettings();

  const atIndex = pathname === "/settings" || pathname === "/settings/";

  return (
    <main className="p-md flex flex-col gap-md max-w-[52rem]">
      {atIndex ? (
        <>
          <header className="flex flex-col gap-0.5">
            <h1 className="font-display text-title-large font-semibold text-on-surface">
              Settings
            </h1>
            {/* The restaurant's own name, so an owner with two venues open in
                two tabs can tell which one they are about to change. */}
            <p className="text-body-medium text-on-surface-variant">
              {settings?.name ?? "Your restaurant"}
            </p>
          </header>

          <nav className="bg-surface-container-low rounded-lg overflow-hidden">
            <Row
              to="/settings/general"
              icon="mgc_store_2_line"
              title="General"
              subtitle="Name, hours, service charge and VAT"
            />
            <BankRow />
            {/* Owner-only, as the routes below are. A manager running one venue
                has no business adding accounts or closing another branch. */}
            {isOwner && <StaffRow />}
            <TablesRow />
            <Row
              to="/settings/branding"
              icon="mgc_palette_line"
              title="Branding"
              subtitle="Logo, cover image, brand colour"
            />
            <Row
              to="/settings/notifications"
              icon="mgc_notification_line"
              title="Notifications"
              subtitle="Which alerts reach which roles"
            />
            {isOwner && <BranchesRow />}
          </nav>
        </>
      ) : (
        <Routes>
          <Route path="general" element={<Section title="General"><GeneralSettings /></Section>} />
          <Route path="bank" element={<Section title="Bank accounts"><BankSettings /></Section>} />
          <Route path="tables" element={<Section title="Tables"><TablesSettings /></Section>} />
          <Route path="branding" element={<Section title="Branding"><BrandingSettings /></Section>} />
          <Route
            path="notifications"
            element={<Section title="Notifications"><NotificationSettings /></Section>}
          />
          {isOwner && <Route path="staff" element={<Section title="Staff"><StaffSettings /></Section>} />}
          {isOwner && (
            <Route path="branches" element={<Section title="Branches"><BranchesSettings /></Section>} />
          )}
          {/* Anything else lands on the list rather than on General. A wrong
              URL should show you where you can go, not pick for you. */}
          <Route path="*" element={<Navigate to="/settings" replace />} />
        </Routes>
      )}
    </main>
  );
}

/** A section's own screen: a way back, its name, then the section. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-md">
      <header className="flex flex-col gap-xs">
        <Link
          to="/settings"
          className="flex items-center gap-xs w-fit text-body-medium font-semibold text-on-surface-variant hover:text-primary-label no-underline transition-colors"
        >
          <i className="mgc_left_line text-base" aria-hidden />
          Settings
        </Link>
        <h1 className="font-display text-title-large font-semibold text-on-surface">
          {title}
        </h1>
      </header>
      {children}
    </div>
  );
}
