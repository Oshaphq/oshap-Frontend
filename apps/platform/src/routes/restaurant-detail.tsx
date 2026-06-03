import { useState } from "react";
import { useParams, Link } from "react-router";
import {
  usePlatformRestaurant,
  usePlatformUpdateRestaurant,
} from "@oshap/shared";
import type { SubscriptionTier } from "@oshap/shared";
import { toast } from "@oshap/shared/ui";

const TIERS: SubscriptionTier[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

const TIER_PRICES: Record<SubscriptionTier, string> = {
  FREE: "₦0/mo",
  STARTER: "₦9,900/mo",
  PRO: "₦24,900/mo",
  ENTERPRISE: "₦79,900/mo",
};

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePlatformRestaurant(id ?? "");
  const update = usePlatformUpdateRestaurant();

  const [editTier, setEditTier] = useState(false);
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);

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
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleSaveTier = async () => {
    if (!pendingTier) return;
    try {
      await update.mutateAsync({ id: r.id, payload: { subscription_tier: pendingTier } });
      toast.success("Subscription tier updated.");
      setEditTier(false);
      setPendingTier(null);
    } catch {
      toast.error("Failed to update tier.");
    }
  };

  return (
    <main className="p-md flex flex-col gap-l max-w-2xl">
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
          className={`px-md py-s rounded-xl font-bold text-caption-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${
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
        <div className="bg-surface-container rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Status
          </span>
          <span className={`font-bold text-p ${r.is_active ? "text-success" : "text-error"}`}>
            {r.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="bg-surface-container rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Tables
          </span>
          <span className="font-bold text-p text-primary-text">{r.table_count}</span>
        </div>
        <div className="bg-surface-container rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Monthly Orders
          </span>
          <span className="font-bold text-p text-primary-text">{r.monthly_orders}</span>
        </div>
        <div className="bg-surface-container rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Onboarded
          </span>
          <span className="font-bold text-p text-primary-text">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Subscription tier */}
      <div className="bg-surface-container rounded-md p-md flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <h2 className="text-label-l2 font-semibold text-primary-text">Subscription</h2>
          {!editTier && (
            <button
              type="button"
              onClick={() => { setEditTier(true); setPendingTier(r.subscription_tier); }}
              className="text-caption-sm font-semibold text-primary hover:underline"
            >
              Change Tier
            </button>
          )}
        </div>

        {editTier ? (
          <div className="flex flex-col gap-s">
            <div className="grid grid-cols-2 gap-s">
              {TIERS.map((tier) => (
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
                  <p className="text-caption-xs opacity-70">{TIER_PRICES[tier]}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-s">
              <button
                type="button"
                onClick={handleSaveTier}
                disabled={update.isPending || !pendingTier}
                className="px-md py-s rounded-lg font-bold text-caption-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {update.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setEditTier(false); setPendingTier(null); }}
                className="px-md py-s rounded-lg font-bold text-caption-md border border-outline-variant text-secondary-text hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-md">
            <span className="font-display text-display-h3 font-semibold text-primary-text">
              {r.subscription_tier}
            </span>
            <span className="text-p2 text-secondary-text">
              {TIER_PRICES[r.subscription_tier]}
            </span>
          </div>
        )}
      </div>

      {/* Bank details */}
      {(r.bank_name || r.account_number) && (
        <div className="bg-surface-container rounded-md p-md flex flex-col gap-s">
          <h2 className="text-label-l2 font-semibold text-primary-text">Bank Details</h2>
          {r.bank_name && (
            <p className="text-p2 text-secondary-text">
              Bank: <span className="text-primary-text font-medium">{r.bank_name}</span>
            </p>
          )}
          {r.account_number && (
            <p className="text-p2 text-secondary-text">
              Account: <span className="text-primary-text font-medium">{r.account_number}</span>
            </p>
          )}
          {r.account_name && (
            <p className="text-p2 text-secondary-text">
              Name: <span className="text-primary-text font-medium">{r.account_name}</span>
            </p>
          )}
        </div>
      )}
    </main>
  );
}
