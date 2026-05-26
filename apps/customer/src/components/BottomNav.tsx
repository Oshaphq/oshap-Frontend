import { Link, useLocation } from "react-router";

interface BottomNavProps {
  tableId: string;
}

const NAV_ITEMS = [
  { path: "/menu", label: "Menu", icon: "mgc_book_4_line" },
  { path: "/orders", label: "My Orders", icon: "mgc_group_line" },
  { path: "/pay", label: "Pay Bill", icon: "mgc_bank_card_line" },
] as const;

export default function BottomNav({ tableId }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed left-0 right-0 bottom-0 flex justify-between items-center h-16 px-6 bg-surface-container-low border-t border-outline-variant z-50 pb-[env(safe-area-inset-bottom,0)]"
    >
      {NAV_ITEMS.map(({ path, label, icon }) => {
        const active = location.pathname.startsWith(path);
        return (
          <Link
            key={path}
            to={`${path}?table=${tableId}`}
            className={`relative flex flex-col items-center gap-0.5 py-1 px-md rounded-lg transition-colors ${
              active
                ? "text-primary after:content-[''] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-6 after:h-[3px] after:rounded-4xl after:bg-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <i
              className={`${icon} text-[22px] leading-none ${
                active ? "text-primary" : ""
              }`}
            />
            <span className="text-caption-c1-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
