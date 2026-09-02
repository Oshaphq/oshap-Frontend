import { useState } from "react";
import { QueryError, Select } from "@oshap/shared/ui";
import { Link } from "react-router";
import { formatPhone, usePlatformRestaurants } from "@oshap/shared";
// Every tier, not just the ones on sale — an existing Enterprise restaurant
// still has to be filterable.
import { TIER_ORDER } from "../tiers";
import type { SubscriptionTier } from "@oshap/shared";

const TIER_COLORS: Record<SubscriptionTier, string> = {
  LITE: "bg-surface-container-high text-outline",
  STANDARD: "bg-secondary-container text-on-secondary-container",
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
      (r.owner_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.owner_phone ?? "").includes(search);
    const matchTier = tierFilter === "ALL" || r.subscription_tier === tierFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? r.is_active : !r.is_active);
    return matchSearch && matchTier && matchStatus;
  });

  return (
    <main className="p-md flex flex-col gap-l">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-title-large font-semibold text-on-surface">
          Restaurants
        </h1>
        <Link
          to="/restaurants/new"
          className="inline-flex items-center justify-center gap-xs py-3 px-l rounded-sm bg-primary text-on-primary text-label-large leading-4 tracking-normal font-semibold font-display no-underline transition duration-100 ease-out hover:opacity-90 active:scale-[0.97] active:brightness-95"
        >
          <i className="mgc_add_line" />
          Onboard New
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-s items-center">
        <input
          type="search"
          aria-label="Search restaurants by name or email"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-md py-s rounded-sm border border-outline-variant bg-surface-container-low text-body-medium text-on-surface placeholder:text-outline outline-none focus:border-primary transition-colors flex-1 min-w-[180px] max-w-[320px]"
        />
        <Select
          aria-label="Filter by subscription tier"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as SubscriptionTier | "ALL")}
        >
          <option value="ALL">All Tiers</option>
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      {query.isLoading && (
        <div className="flex justify-center py-xl">
          <div className="oshap-spinner" />
        </div>
      )}

      {/* A failed request and a genuinely empty list look identical unless
          they are told apart. This screen previously showed "no restaurants
          match your filters" while the API was returning 500, so a real
          restaurant looked deleted. */}
      {query.isError && <QueryError
          error={query.error}
          action="load the restaurants"
          onRetry={() => query.refetch()}
        />}

      {!query.isLoading && !query.isError && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-s py-10 text-center">
          <i className="mgc_fork_spoon_line text-5xl text-outline-variant opacity-40" />
          <p className="text-body-medium text-on-surface-variant">No restaurants match your filters.</p>
        </div>
      )}

      <div className="flex flex-col gap-s">
        {filtered.map((r) => (
          <Link
            key={r.id}
            to={`/restaurants/${r.id}`}
            className="bg-surface-container-low rounded-lg p-md flex items-center justify-between gap-md no-underline hover:bg-surface-container-high transition-colors"
          >
            <div className="flex items-center gap-md min-w-0 flex-1">
              <div className="w-10 h-10 rounded-sm bg-primary-container flex items-center justify-center shrink-0">
                <i className="mgc_fork_spoon_line text-on-primary-container text-lg" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-on-surface truncate">{r.name}</p>
                <p className="text-body-small text-on-surface-variant truncate">
                  {r.owner_phone ? formatPhone(r.owner_phone) : r.owner_email} · {r.table_count} tables
                </p>
              </div>
            </div>

            <div className="flex items-center gap-s shrink-0">
              <span className={`px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider ${TIER_COLORS[r.subscription_tier]}`}>
                {r.subscription_tier}
              </span>
              {/* Only annual is marked. Monthly is the default and labelling
                  every row with it would bury the handful that renew yearly,
                  which is the thing an operator is actually scanning for. */}
              {r.billing_period === "ANNUAL" && (
                <span className="px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider bg-surface-container-high text-on-surface-variant">
                  Annual
                </span>
              )}
              <span className={`px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider ${r.is_active ? "bg-success-container text-on-success-container" : "bg-surface-container-high text-outline"}`}>
                {r.is_active ? "Active" : "Inactive"}
              </span>
              <span className="text-body-small text-on-surface-variant hidden sm:inline">
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
