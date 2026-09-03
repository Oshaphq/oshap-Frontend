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
  parseApiDate,
} from "@oshap/shared";
import type { BillingPeriod, SubscriptionTier } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";


export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePlatformRestaurant(id ?? "");
  const update = usePlatformUpdateRestaurant();

  const [editTier, setEditTier] = useState(false);
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [pendingPeriod, setPendingPeriod] = useState<BillingPeriod | null>(null);

  if (query.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-on-surface-variant">
        <div className="oshap-spinner" />
        <p>Loading restaurant...</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <main className="p-md">
        <p className="text-error">Restaurant not found.</p>
        <Link to="/restaurants" className="text-primary-label">← Back</Link>
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
          className="w-9 h-9 flex items-center justify-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors no-underline"
        >
          <i className="mgc_left_line" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-title-large font-semibold text-on-surface truncate">
            {r.name}
          </h1>
          <p className="text-body-medium text-on-surface-variant">{r.owner_email}</p>
        </div>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={update.isPending}
          className={`px-md py-s rounded-sm font-bold text-body-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${
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
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Status
          </span>
          <span className={`font-bold text-body-large ${r.is_active ? "text-success" : "text-error"}`}>
            {r.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Tables
          </span>
          <span className="font-bold text-body-large text-on-surface">{r.table_count}</span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Monthly Orders
          </span>
          {(() => {
            // Uncapped plans get a bare figure. A progress bar that can never
            // fill says "you are nowhere near a limit" about a limit that does
            // not exist, which is worse than saying nothing.
            const usage = orderUsage(r.subscription_tier, r.monthly_orders);
            if (!usage) {
              return (
                <span className="font-bold text-body-large text-on-surface">
                  {r.monthly_orders.toLocaleString()}
                </span>
              );
            }
            return (
              <>
                <span className="font-bold text-body-large text-on-surface tabular-nums">
                  {usage.used.toLocaleString()}
                  <span className="text-body-medium font-normal text-on-surface-variant">
                    {" "}of {usage.cap.toLocaleString()}
                  </span>
                </span>
                <div
                  className="h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden"
                  role="img"
                  aria-label={`${usage.used} of ${usage.cap} orders used this month`}
                >
                  <div
                    className={`h-full rounded-full ${usage.nearLimit ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.max(usage.fraction * 100, 2)}%` }}
                  />
                </div>
                {usage.nearLimit && (
                  <span className="text-label-small text-warning font-semibold">
                    Close to the {r.subscription_tier} limit — worth a conversation
                    before it bites.
                  </span>
                )}
              </>
            );
          })()}
        </div>
        <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Onboarded
          </span>
          <span className="font-bold text-body-large text-on-surface">
            {parseApiDate(r.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Subscription tier */}
      <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <h2 className="text-title-large font-semibold text-on-surface">Subscription</h2>
          {!editTier && (
            <button
              type="button"
              onClick={() => {
                setEditTier(true);
                setPendingTier(r.subscription_tier);
                setPendingPeriod(r.billing_period);
              }}
              className="text-body-small font-semibold text-primary-label hover:underline"
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
                  className={`py-s px-md rounded-sm border-2 text-left transition-all ${
                    pendingTier === tier
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-low text-on-surface hover:border-outline"
                  }`}
                >
                  <p className="font-bold text-body-medium">{tier}</p>
                  <p className="text-label-small opacity-70">{tierPriceLabel(tier)}</p>
                  <p className="text-label-small opacity-50">{tierAnnualLabel(tier)}</p>
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
                  className={`py-s px-md rounded-sm border-2 text-left transition-all ${
                    pendingPeriod === period
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-low text-on-surface hover:border-outline"
                  }`}
                >
                  <p className="font-bold text-body-medium">
                    {period === "MONTHLY" ? "Monthly" : "Annual"}
                  </p>
                  <p className="text-label-small opacity-70">
                    {period === "MONTHLY"
                      ? tierPriceLabel(pendingTier ?? r.subscription_tier)
                      : tierAnnualLabel(pendingTier ?? r.subscription_tier)}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex gap-s">
              <PrimaryButton
                size="md"
                onClick={handleSaveTier}
                disabled={update.isPending || !pendingTier || !pendingPeriod}
              >
                {update.isPending ? "Saving..." : "Save"}
              </PrimaryButton>
              <SecondaryButton
                size="md"
                onClick={() => {
                  setEditTier(false);
                  setPendingTier(null);
                  setPendingPeriod(null);
                }}
              >
                Cancel
              </SecondaryButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-md flex-wrap">
              <span className="font-display text-title-medium font-semibold text-on-surface">
                {r.subscription_tier}
              </span>
              <span className="text-body-medium text-on-surface-variant">
                {r.billing_period === "ANNUAL"
                  ? tierAnnualLabel(r.subscription_tier)
                  : tierPriceLabel(r.subscription_tier)}
              </span>
              <span className="px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider bg-surface-container-high text-on-surface-variant">
                {r.billing_period === "ANNUAL" ? "Annual" : "Monthly"}
              </span>
            </div>
            <span className="text-body-medium text-on-surface-variant">
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
