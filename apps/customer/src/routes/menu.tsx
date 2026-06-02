import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { getDeviceToken, useMenu, useTable } from "@oshap/shared";
import { CartProvider } from "../context/CartContext";
import { useSession } from "../context/SessionContext";
import BottomNav from "../components/BottomNav";
import CallWaiterButton from "../components/CallWaiterButton";
import CartBar from "../components/CartBar";
import CartDrawer from "../components/CartDrawer";
import CategoryTabs from "../components/CategoryTabs";
import MenuCard from "../components/MenuCard";
import { TableBadge, ThemeToggle } from "@oshap/shared/ui";

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
  const restaurantName = tableQuery.data?.restaurant?.name ?? "";

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

  const isLoading = menuQuery.isLoading || tableQuery.isLoading;

  return (
    <div className="min-h-screen bg-surface pb-20">
      <header className="sticky top-0 z-40 flex items-center justify-between p-md bg-surface-container-low border-b border-outline-variant">
        <div className="flex items-center gap-s">
          <h1 className="font-display text-display-h1 font-bold text-primary-text">
            {restaurantName}
          </h1>
          <TableBadge tableId={tableId} />
        </div>
        <div className="flex items-center gap-s">
          <ThemeToggle />
          <CallWaiterButton tableId={tableId} />
          <button
            type="button"
            aria-label="Search menu"
            onClick={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setSearchQuery("");
            }}
            className="w-10 h-10 flex items-center justify-center rounded-4xl bg-surface-container text-on-surface-variant text-xl transition-colors hover:bg-surface-container-high"
          >
            <i className={searchOpen ? "mgc_close_line" : "mgc_search_line"} />
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="px-md py-s bg-surface-container-low border-b border-outline-variant">
          <div className="flex items-center gap-s px-md py-s rounded-lg bg-surface border border-outline-variant">
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
        </div>
      )}

      <div className="px-md bg-surface-container-low border-b border-outline-variant">
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      <section className="p-md flex flex-col gap-md">
        <h2 className="font-display text-display-h2 font-semibold text-primary-text">
          {activeCategory === "All" ? "Full Menu" : activeCategory}
        </h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
            <div className="oshap-spinner" />
            <p>Loading menu...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-s">
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                description={item.description}
                image={item.image_url}
              />
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
