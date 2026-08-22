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
import { QueryError } from "@oshap/shared/ui";
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
          <p className="absolute bottom-md left-md font-display text-display-h3 font-semibold text-white drop-shadow">
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
          <h2 className="font-display text-display-h2 font-semibold text-primary-text">
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
          <div className="flex items-center gap-s px-md py-s rounded-lg bg-surface-container-low border border-outline-variant">
            <i className="mgc_search_line text-lg text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent outline-none border-none text-p text-primary-text placeholder:text-secondary-text"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
            <div className="oshap-spinner" />
            <p>Loading menu...</p>
          </div>
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
                <p className="text-secondary-text">
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
