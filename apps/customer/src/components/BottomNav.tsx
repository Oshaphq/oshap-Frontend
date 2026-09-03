import { NavLink } from "react-router";

interface BottomNavProps {
  tableId: string;
}

const NAV_ITEMS = [
  { path: "/menu", label: "Menu", icon: "mgc_book_4_line" },
  { path: "/orders", label: "My Orders", icon: "mgc_group_line" },
  { path: "/pay", label: "Pay Bill", icon: "mgc_bank_card_line" },
] as const;

/**
 * The customer app's three destinations.
 *
 * `NavLink` rather than `Link` because it sets `aria-current="page"` on the
 * active destination. This used to compute active state by hand, which meant
 * the only signals a guest got were a colour change and a decorative bar drawn
 * in `::after` — neither of which a screen reader announces, so the current
 * destination was unidentifiable without sight.
 *
 * Not shared with the platform's nav. That one is a row of text pills with no
 * icon and a filled active state; this is an icon-over-label destination with
 * an underline indicator. They are two different patterns, and one component
 * covering both would be a union type wearing a component's clothes.
 */
export default function BottomNav({ tableId }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed left-0 right-0 bottom-0 flex justify-between items-center h-16 px-l bg-surface border-t border-outline-variant z-50 pb-[env(safe-area-inset-bottom,0)]"
    >
      {NAV_ITEMS.map(({ path, label, icon }) => (
        <NavLink
          key={path}
          to={`${path}?table=${tableId}`}
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-0.5 py-xs px-md rounded-sm transition-colors ${
              isActive
                ? "text-primary-label after:content-[''] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-6 after:h-[3px] after:rounded-full after:bg-primary"
                : "text-on-surface-variant hover:text-primary-label"
            }`
          }
        >
          <i className={`${icon} text-[22px] leading-none`} aria-hidden="true" />
          <span className="text-label-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
