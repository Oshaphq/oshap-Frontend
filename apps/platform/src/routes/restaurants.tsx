import { useState } from "react";
import { Link } from "react-router";
import { usePlatformRestaurants } from "@oshap/shared";
import type { SubscriptionTier } from "@oshap/shared";

const TIER_ORDER: SubscriptionTier[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

const TIER_COLORS: Record<SubscriptionTier, string> = {
  FREE: "bg-surface-container-high text-outline",
  STARTER: "bg-secondary-container text-on-secondary-container",
  PRO: "bg-primary-container text-on-primary-container",
  ENTERPRISE: "bg-tertiary-container text-on-tertiary-container",
};

export default function RestaurantsPage() {
  const query = usePlatformRestaurants();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<SubscriptionTier | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const restaurants = query.data?.restaurants ?? [];

  const filtered = restaurants.filter((r) => {
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.owner_email.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "ALL" || r.subscription_tier === tierFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? r.is_active : !r.is_active);
    return matchSearch && matchTier && matchStatus;
  });

  return (
    <main className="p-md flex flex-col gap-l">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Restaurants
        </h1>
        <Link
          to="/restaurants/new"
          className="inline-flex items-center gap-s px-md py-s rounded-xl font-bold text-caption-md font-display bg-primary text-on-primary no-underline hover:opacity-90 transition-opacity"
        >
          <i className="mgc_add_line" />
          Onboard New
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-s items-center">
        <input
          type="search"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-md py-s rounded-lg border border-outline-variant bg-surface-container text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors flex-1 min-w-[180px] max-w-[320px]"
        />
        <div className="relative">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as SubscriptionTier | "ALL")}
            className="pl-s pr-8 py-s rounded-lg border border-outline-variant bg-surface-container text-p2 text-primary-text outline-none focus:border-primary appearance-none cursor-pointer"
          >
            <option value="ALL">All Tiers</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <i className="mgc_down_line absolute right-s top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm" aria-hidden />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="pl-s pr-8 py-s rounded-lg border border-outline-variant bg-surface-container text-p2 text-primary-text outline-none focus:border-primary appearance-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <i className="mgc_down_line absolute right-s top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm" aria-hidden />
        </div>
      </div>

      {query.isLoading && (
        <div className="flex justify-center py-xl">
          <div className="oshap-spinner" />
        </div>
      )}

      {!query.isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-s py-10 text-center">
          <i className="mgc_fork_spoon_line text-5xl text-outline-variant opacity-40" />
          <p className="text-p2 text-secondary-text">No restaurants match your filters.</p>
        </div>
      )}

      <div className="flex flex-col gap-s">
        {filtered.map((r) => (
          <Link
            key={r.id}
            to={`/restaurants/${r.id}`}
            className="bg-surface-container rounded-md p-md flex items-center justify-between gap-md no-underline hover:bg-surface-container-high transition-colors"
          >
            <div className="flex items-center gap-md min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                <i className="mgc_fork_spoon_line text-on-primary-container text-lg" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-primary-text truncate">{r.name}</p>
                <p className="text-caption-sm text-secondary-text truncate">
                  {r.owner_email} · {r.table_count} tables
                </p>
              </div>
            </div>

            <div className="flex items-center gap-s shrink-0">
              <span className={`px-s py-xs rounded-4xl text-caption-xs font-bold uppercase tracking-wider ${TIER_COLORS[r.subscription_tier]}`}>
                {r.subscription_tier}
              </span>
              <span className={`px-s py-xs rounded-4xl text-caption-xs font-bold uppercase tracking-wider ${r.is_active ? "bg-success-container text-on-success-container" : "bg-surface-container-high text-outline"}`}>
                {r.is_active ? "Active" : "Inactive"}
              </span>
              <span className="text-caption-sm text-secondary-text hidden sm:inline">
                {r.monthly_orders} orders/mo
              </span>
              <i className="mgc_right_line text-outline" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
