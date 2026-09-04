import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { getDeviceToken, useMenu, useTable } from "@oshap/shared";
import { CartProvider } from "../context/CartContext";
import { useSession } from "../context/SessionContext";
import BottomNav from "../components/BottomNav";
import CartBar from "../components/CartBar";
import CartDrawer from "../components/CartDrawer";
import CategoryTabs from "../components/CategoryTabs";
import MenuCard from "../components/MenuCard";
import {
  QueryError,
  Skeleton,
  SkeletonGroup,
} from "@oshap/shared/ui";
import CustomerHeader from "../components/CustomerHeader";

export default function MenuPage() {
  const [params] = useSearchParams();
  const tableId = params.get("table") ?? "T1";

  return (
    <CartProvider tableId={tableId}>
      <MenuView tableId={tableId} />
      <CartBar />
      <CartDrawer tableId={tableId} />
      <BottomNav tableId={tableId} />
    </CartProvider>
  );
}

function MenuView({ tableId }: { tableId: string }) {
  const { session } = useSession();
  const deviceToken = getDeviceToken();

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const tableQuery = useTable({
    tableId,
    deviceToken,
    sessionId: session?.id,
  });
  const restaurantId = tableQuery.data?.restaurant?.id;

  const menuQuery = useMenu(restaurantId);
  const menuItems = useMemo(() => menuQuery.data ?? [], [menuQuery.data]);

  const categories = useMemo(() => {
    const unique = new Set(menuItems.map((item) => item.category));
    return [
      { name: "All" },
      ...Array.from(unique).map((name) => ({ name })),
    ];
  }, [menuItems]);

  const filteredItems = useMemo(
    () =>
      menuItems.filter((item) => {
        const matchesCategory =
          activeCategory === "All" || item.category === activeCategory;
        const matchesSearch =
          !searchQuery ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [menuItems, activeCategory, searchQuery],
  );

  /**
   * The menu cannot be requested until the table says which restaurant this
   * is, so a guest waiting on either call is still waiting for the menu.
   */
  const isLoading = tableQuery.isLoading || menuQuery.isLoading;
  const failed = tableQuery.isError || menuQuery.isError;

  return (
    <div className="min-h-screen bg-surface pb-[var(--app-bottom-inset)]">
      <CustomerHeader tableId={tableId} />

      {/* The restaurant's own photograph, when they have uploaded one. Absent
          means no hero rather than a grey placeholder — an empty box says
          "something failed to load", which is worse than saying nothing. */}
      {tableQuery.data?.restaurant?.cover_image_url && (
        <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-surface-container">
          <img
            src={tableQuery.data.restaurant.cover_image_url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              // A stored URL that stops resolving should remove the hero, not
              // leave a broken-image glyph across the top of the menu.
              e.currentTarget.parentElement?.remove();
            }}
          />
          {/* The name sits over the photo, so it needs a floor to stay legible
              no matter what the picture is doing underneath it. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-md left-md font-display text-title-medium font-semibold text-white drop-shadow">
            {tableQuery.data.restaurant.name}
          </p>
        </div>
      )}

      <div className="px-md bg-surface border-b border-outline-variant">
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      <section className="p-md flex flex-col gap-md">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-title-large font-semibold text-on-surface">
            {activeCategory === "All" ? "Full Menu" : activeCategory}
          </h2>
          <button
            type="button"
            aria-label="Search menu"
            onClick={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setSearchQuery("");
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant text-xl transition-colors hover:bg-surface-container-highest shadow-sm"
          >
            <i className={searchOpen ? "mgc_close_line" : "mgc_search_line"} />
          </button>
        </div>

        {searchOpen && (
          <div className="flex items-center gap-s px-md py-s rounded-sm bg-surface-container-low border border-outline-variant">
            <i className="mgc_search_line text-lg text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent outline-none border-none text-body-large text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
        )}

        {isLoading ? (
          <MenuSkeleton />
        ) : failed ? (
          /* Without this a failed request fell through to "No items found in
             this category" — a guest at a table with a working kitchen being
             told the restaurant serves nothing. An empty menu and a broken
             request look identical and mean opposite things. */
          <QueryError
            error={tableQuery.error ?? menuQuery.error}
            action="load the menu"
            onRetry={() => {
              tableQuery.refetch();
              menuQuery.refetch();
            }}
          />
        ) : (
          <div className="flex flex-col gap-s">
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
            {filteredItems.length === 0 && (
              <div className="py-xl text-center">
                <p className="text-on-surface-variant">
                  No items found in this category.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * The menu's shape, drawn before the menu arrives.
 *
 * A spinner here threw the layout away and rebuilt it, which is the jump a
 * guest reads as the page loading twice — on the first screen they ever see.
 * The category row and the dish cards are the same shape every time, so there
 * is no reason to hide them.
 *
 * Five cards, not one per real dish: the count is unknown, and five is about
 * a phone screen's worth. One `role="status"` for the block, not per bar.
 */
function MenuSkeleton() {
  return (
    <SkeletonGroup label="Loading the menu" className="flex flex-col gap-md">
      <div className="flex gap-s py-md overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            shape="circle"
            width="w-24"
            height="h-12"
            className="shrink-0"
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-md p-md bg-surface-container-low rounded-lg"
        >
          <Skeleton
            shape="block"
            width="w-24"
            height="h-24"
            className="shrink-0"
          />
          <div className="flex-1 flex flex-col gap-s min-w-0">
            <Skeleton width="w-1/2" height="h-5" />
            <Skeleton width="w-4/5" height="h-3" />
            <Skeleton width="w-20" height="h-4" />
          </div>
          <Skeleton
            shape="circle"
            width="w-12"
            height="h-12"
            className="shrink-0"
          />
        </div>
      ))}
    </SkeletonGroup>
  );
}
