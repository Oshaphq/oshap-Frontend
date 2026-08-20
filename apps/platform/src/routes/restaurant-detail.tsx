import { useState } from "react";
import {
  PHASE_1_TIERS,
  locationAllowanceLabel,
  orderUsage,
  tierAnnualLabel,
  tierPriceLabel,
} from "../tiers";
import { useParams, Link } from "react-router";
import {
  usePlatformRestaurant,
  usePlatformUpdateRestaurant,
  errorMessage,
} from "@oshap/shared";
import type { BillingPeriod, SubscriptionTier } from "@oshap/shared";
import { toast } from "@oshap/shared/ui";


export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePlatformRestaurant(id ?? "");
  const update = usePlatformUpdateRestaurant();

  const [editTier, setEditTier] = useState(false);
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [pendingPeriod, setPendingPeriod] = useState<BillingPeriod | null>(null);

  if (query.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading restaurant...</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <main className="p-md">
        <p className="text-error">Restaurant not found.</p>
        <Link to="/restaurants" className="text-primary">← Back</Link>
      </main>
    );
  }

  const r = query.data;

  const handleToggleActive = async () => {
    try {
      await update.mutateAsync({ id: r.id, payload: { is_active: !r.is_active } });
      toast.success(`${r.name} ${r.is_active ? "deactivated" : "activated"}.`);
    } catch (err) {
      toast.error(errorMessage(err, "change the status"));
    }
  };

  const handleSaveTier = async () => {
    if (!pendingTier || !pendingPeriod) return;
    try {
      await update.mutateAsync({
        id: r.id,
        payload: { subscription_tier: pendingTier, billing_period: pendingPeriod },
      });
      toast.success("Plan updated");
      setEditTier(false);
      setPendingTier(null);
      setPendingPeriod(null);
    } catch (err) {
      toast.error(errorMessage(err, "change the plan"));
    }
  };

  return (
    <main className="p-md flex flex-col gap-l max-w-[42rem]">
      <header className="flex items-center gap-md">
        <Link
          to="/restaurants"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant text-secondary-text hover:bg-surface-container-high transition-colors no-underline"
        >
          <i className="mgc_left_line" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-display-h2 font-semibold text-primary-text truncate">
            {r.name}
          </h1>
          <p className="text-caption-md text-secondary-text">{r.owner_email}</p>
        </div>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={update.isPending}
          className={`px-md py-s rounded-lg font-bold text-caption-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${
            r.is_active
              ? "bg-error-container text-on-error-container"
              : "bg-success-container text-on-success-container"
          }`}
        >
          {update.isPending ? "Saving..." : r.is_active ? "Deactivate" : "Activate"}
        </button>
      </header>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-md">
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Status
          </span>
          <span className={`font-bold text-p ${r.is_active ? "text-success" : "text-error"}`}>
            {r.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Tables
          </span>
          <span className="font-bold text-p text-primary-text">{r.table_count}</span>
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Monthly Orders
          </span>
          {(() => {
            // Uncapped plans get a bare figure. A progress bar that can never
            // fill says "you are nowhere near a limit" about a limit that does
            // not exist, which is worse than saying nothing.
            const usage = orderUsage(r.subscription_tier, r.monthly_orders);
            if (!usage) {
              return (
                <span className="font-bold text-p text-primary-text">
                  {r.monthly_orders.toLocaleString()}
                </span>
              );
            }
            return (
              <>
                <span className="font-bold text-p text-primary-text tabular-nums">
                  {usage.used.toLocaleString()}
                  <span className="text-caption-md font-normal text-secondary-text">
                    {" "}of {usage.cap.toLocaleString()}
                  </span>
                </span>
                <div
                  className="h-1.5 w-full rounded-4xl bg-surface-container-high overflow-hidden"
                  role="img"
                  aria-label={`${usage.used} of ${usage.cap} orders used this month`}
                >
                  <div
                    className={`h-full rounded-4xl ${usage.nearLimit ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.max(usage.fraction * 100, 2)}%` }}
                  />
                </div>
                {usage.nearLimit && (
                  <span className="text-caption-xs text-warning font-semibold">
                    Close to the {r.subscription_tier} limit — worth a conversation
                    before it bites.
                  </span>
                )}
              </>
            );
          })()}
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Onboarded
          </span>
          <span className="font-bold text-p text-primary-text">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Subscription tier */}
      <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <h2 className="text-label-l2 font-semibold text-primary-text">Subscription</h2>
          {!editTier && (
            <button
              type="button"
              onClick={() => {
                setEditTier(true);
                setPendingTier(r.subscription_tier);
                setPendingPeriod(r.billing_period);
              }}
              className="text-caption-sm font-semibold text-primary hover:underline"
            >
              Change plan
            </button>
          )}
        </div>

        {editTier ? (
          <div className="flex flex-col gap-s">
            <div className="grid grid-cols-2 gap-s">
              {PHASE_1_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setPendingTier(tier)}
                  className={`py-s px-md rounded-lg border-2 text-left transition-all ${
                    pendingTier === tier
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-low text-primary-text hover:border-outline"
                  }`}
                >
                  <p className="font-bold text-caption-md">{tier}</p>
                  <p className="text-caption-xs opacity-70">{tierPriceLabel(tier)}</p>
                  <p className="text-caption-xs opacity-50">{tierAnnualLabel(tier)}</p>
                </button>
              ))}
            </div>

            {/* The term is part of the same decision, so it is changed in the
                same place. Splitting them is how a restaurant ends up on the
                right plan and the wrong billing. */}
            <div className="grid grid-cols-2 gap-s">
              {(["MONTHLY", "ANNUAL"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setPendingPeriod(period)}
                  className={`py-s px-md rounded-lg border-2 text-left transition-all ${
                    pendingPeriod === period
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-low text-primary-text hover:border-outline"
                  }`}
                >
                  <p className="font-bold text-caption-md">
                    {period === "MONTHLY" ? "Monthly" : "Annual"}
                  </p>
                  <p className="text-caption-xs opacity-70">
                    {period === "MONTHLY"
                      ? tierPriceLabel(pendingTier ?? r.subscription_tier)
                      : tierAnnualLabel(pendingTier ?? r.subscription_tier)}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex gap-s">
              <button
                type="button"
                onClick={handleSaveTier}
                disabled={update.isPending || !pendingTier || !pendingPeriod}
                className="px-md py-s rounded-lg font-bold text-caption-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {update.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditTier(false);
                  setPendingTier(null);
                  setPendingPeriod(null);
                }}
                className="px-md py-s rounded-lg font-bold text-caption-md border border-outline-variant text-secondary-text hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-md flex-wrap">
              <span className="font-display text-display-h3 font-semibold text-primary-text">
                {r.subscription_tier}
              </span>
              <span className="text-p2 text-secondary-text">
                {r.billing_period === "ANNUAL"
                  ? tierAnnualLabel(r.subscription_tier)
                  : tierPriceLabel(r.subscription_tier)}
              </span>
              <span className="px-s py-xs rounded-4xl text-caption-xs font-bold uppercase tracking-wider bg-surface-container-high text-secondary-text">
                {r.billing_period === "ANNUAL" ? "Annual" : "Monthly"}
              </span>
            </div>
            <span className="text-caption-md text-secondary-text">
              {locationAllowanceLabel(r.subscription_tier)}
            </span>
          </div>
        )}
      </div>

      {/* Bank details deliberately absent: they live in the tenant's own
          bank_accounts, not on the restaurant, and the platform portal has no
          endpoint for them. Operators manage accounts from the admin app. */}
    </main>
  );
}
