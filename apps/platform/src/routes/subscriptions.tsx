import { usePlatformRestaurants, formatCurrency } from "@oshap/shared";
import {
  DataTable,
  QueryError,
} from "@oshap/shared/ui";
import type { SubscriptionTier } from "@oshap/shared";
import { Link } from "react-router";
import {
  TIER_MONTHLY_KOBO,
  TIER_ORDER,
  tierPriceLabel,
  locationAllowanceLabel,
  orderAllowanceLabel,
} from "../tiers";

/**
 * What each plan includes. Plans differ by **capacity, not capability** —
 * every tier gets the whole product (docs/plans.md); the only axes are
 * monthly order volume and locations. Derived from the caps rather than
 * written out, so copy and data can never disagree. Staff accounts and
 * tables are unlimited on every tier and are never listed as a limit.
 */
function tierCapacityLines(tier: SubscriptionTier): string[] {
  return [
    "Every feature included",
    orderAllowanceLabel(tier),
    locationAllowanceLabel(tier),
  ];
}

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
        <QueryError
          error={query.error}
          action="load the subscriptions"
          onRetry={() => query.refetch()}
        />
      </main>
    );
  }

  return (
    <main className="p-md flex flex-col gap-l">
      <header>
        <h1 className="font-display text-title-large font-semibold text-on-surface">
          Subscriptions
        </h1>
        <p className="text-body-medium text-on-surface-variant mt-xs">Mock billing overview — no real payments processed.</p>
      </header>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">MRR (est.)</span>
          <span className="font-display text-title-medium font-semibold text-on-surface">{formatCurrency(mrr)}</span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">ARR (est.)</span>
          <span className="font-display text-title-medium font-semibold text-on-surface">{formatCurrency(arr)}</span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">Active</span>
          <span className="font-display text-title-medium font-semibold text-on-surface">
            {restaurants.filter((r) => r.is_active).length}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">Lite Tier</span>
          <span className="font-display text-title-medium font-semibold text-on-surface-variant">
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
              className={`rounded-lg p-md flex flex-col gap-s border-2 ${TIER_COLORS[tier]}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-body-large">{tier}</span>
                <span className="text-body-small font-semibold opacity-80">
                  {tierPriceLabel(tier)}
                </span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-title-medium font-display font-semibold">{count}</span>
                <span className="text-label-small opacity-70">{active} active · {count - active} inactive</span>
              </div>
              {TIER_MONTHLY_KOBO[tier] > 0 && (
                <span className="text-body-small font-semibold opacity-80">
                  {formatCurrency(revenue)}/mo revenue
                </span>
              )}
              <ul className="flex flex-col gap-s">
                {tierCapacityLines(tier).map((f) => (
                  <li key={f} className="text-label-small opacity-75 flex items-start gap-s">
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
        <DataTable
          caption="All restaurants by subscription tier"
          rows={[...restaurants].sort(
            (a, b) =>
              TIER_MONTHLY_KOBO[b.subscription_tier] -
              TIER_MONTHLY_KOBO[a.subscription_tier],
          )}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Restaurant",
              cellClassName: "text-body-medium font-medium",
              cell: (r) => (
                <Link
                  to={`/restaurants/${r.id}`}
                  className="text-primary-label hover:underline"
                >
                  {r.name}
                </Link>
              ),
            },
            {
              header: "Owner",
              hideBelow: "sm",
              cellClassName: "text-body-small text-on-surface-variant",
              cell: (r) => r.owner_email,
            },
            {
              header: "Tier",
              cell: (r) => (
                <span className="text-label-small font-bold uppercase tracking-wider">
                  {r.subscription_tier}
                </span>
              ),
            },
            {
              header: "MRR",
              align: "right",
              cellClassName: "text-body-medium font-semibold text-on-surface",
              cell: (r) =>
                r.is_active
                  ? formatCurrency(TIER_MONTHLY_KOBO[r.subscription_tier])
                  : "—",
            },
          ]}
        />
      )}
    </main>
  );
}
