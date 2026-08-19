import { usePlatformRestaurants, formatCurrency } from "@oshap/shared";
import { QueryError } from "@oshap/shared/ui";
import type { SubscriptionTier } from "@oshap/shared";
import { Link } from "react-router";
import { TIER_MONTHLY_KOBO, TIER_ORDER, tierPriceLabel } from "../tiers";

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  LITE: [
    "QR Code Menu & Paperless digital menu",
    "Live menu & price updates",
    "Instant price controls & Out of Stock toggle",
    "Up to 3 active staff accounts",
  ],
  STANDARD: [
    "Everything in Lite",
    "BYOD table & Waiter phone ordering",
    "Customer self-ordering",
    "Digital Kitchen Dashboard & KOT",
    "Manual payment ledger (Transfer/POS/Cash)",
  ],
  PRO: [
    "Everything in Standard",
    "Inventory management & stock depletion",
    "End-of-shift Z-reports & reconciliation",
    "Sales summaries & operational analytics",
  ],
  ENTERPRISE: [
    "Multi-branch master dashboard",
    "Consolidated financial reporting",
    "Branch-level performance & franchise mgmt",
    "Branch settlement & custom integrations",
  ],
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  LITE: "bg-surface-container-high text-outline border-outline-variant",
  STANDARD: "bg-secondary-container text-on-secondary-container border-secondary",
  PRO: "bg-primary-container text-on-primary-container border-primary",
  ENTERPRISE: "bg-tertiary-container text-on-tertiary-container border-tertiary",
};

export default function SubscriptionsPage() {
  const query = usePlatformRestaurants();
  const restaurants = query.data?.restaurants ?? [];

  const byTier = TIER_ORDER.reduce<Record<SubscriptionTier, typeof restaurants>>(
    (acc, tier) => {
      acc[tier] = restaurants.filter((r) => r.subscription_tier === tier);
      return acc;
    },
    { LITE: [], STANDARD: [], PRO: [], ENTERPRISE: [] },
  );

  const mrr = TIER_ORDER.reduce((sum, tier) => {
    const active = byTier[tier].filter((r) => r.is_active).length;
    return sum + active * TIER_MONTHLY_KOBO[tier];
  }, 0);

  const arr = mrr * 12;

  if (query.isError) {
    return (
      <main className="p-md flex flex-col gap-l">
        <QueryError onRetry={() => query.refetch()} />
      </main>
    );
  }

  return (
    <main className="p-md flex flex-col gap-l">
      <header>
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Subscriptions
        </h1>
        <p className="text-p2 text-secondary-text mt-xs">Mock billing overview — no real payments processed.</p>
      </header>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">MRR (est.)</span>
          <span className="font-display text-display-h3 font-semibold text-primary-text">{formatCurrency(mrr)}</span>
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">ARR (est.)</span>
          <span className="font-display text-display-h3 font-semibold text-primary-text">{formatCurrency(arr)}</span>
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">Active</span>
          <span className="font-display text-display-h3 font-semibold text-primary-text">
            {restaurants.filter((r) => r.is_active).length}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">Lite Tier</span>
          <span className="font-display text-display-h3 font-semibold text-secondary-text">
            {byTier.LITE.length}
          </span>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        {TIER_ORDER.map((tier) => {
          const count = byTier[tier].length;
          const active = byTier[tier].filter((r) => r.is_active).length;
          const revenue = active * TIER_MONTHLY_KOBO[tier];
          return (
            <div
              key={tier}
              className={`rounded-md p-md flex flex-col gap-s border-2 ${TIER_COLORS[tier]}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-p">{tier}</span>
                <span className="text-caption-sm font-semibold opacity-80">
                  {tierPriceLabel(tier)}
                </span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-display-h3 font-display font-semibold">{count}</span>
                <span className="text-caption-xs opacity-70">{active} active · {count - active} inactive</span>
              </div>
              {TIER_MONTHLY_KOBO[tier] > 0 && (
                <span className="text-caption-sm font-semibold opacity-80">
                  {formatCurrency(revenue)}/mo revenue
                </span>
              )}
              <ul className="flex flex-col gap-s">
                {TIER_FEATURES[tier].map((f) => (
                  <li key={f} className="text-caption-xs opacity-75 flex items-start gap-s">
                    <i className="mgc_check_line text-sm shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* All restaurants in a table */}
      {restaurants.length > 0 && (
        <div className="bg-surface-container-low rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-surface-container-highest">
                <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">Restaurant</th>
                <th className="py-s px-md text-label-l4 font-semibold text-secondary-text hidden sm:table-cell">Owner</th>
                <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">Tier</th>
                <th className="py-s px-md text-label-l4 font-semibold text-secondary-text text-right">MRR</th>
              </tr>
            </thead>
            <tbody>
              {[...restaurants]
                .sort((a, b) => TIER_MONTHLY_KOBO[b.subscription_tier] - TIER_MONTHLY_KOBO[a.subscription_tier])
                .map((r) => (
                  <tr key={r.id} className="border-b border-surface-container-highest last:border-none hover:bg-surface-container-low transition-colors">
                    <td className="py-s px-md text-p2 font-medium">
                      <Link to={`/restaurants/${r.id}`} className="text-primary hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-s px-md text-caption-sm text-secondary-text hidden sm:table-cell">{r.owner_email}</td>
                    <td className="py-s px-md">
                      <span className="text-caption-xs font-bold uppercase tracking-wider">
                        {r.subscription_tier}
                      </span>
                    </td>
                    <td className="py-s px-md text-p2 text-right font-semibold text-primary-text">
                      {r.is_active ? formatCurrency(TIER_MONTHLY_KOBO[r.subscription_tier]) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
