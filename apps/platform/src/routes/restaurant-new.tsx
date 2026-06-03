import { useState } from "react";
import { useNavigate } from "react-router";
import { usePlatformCreateRestaurant } from "@oshap/shared";
import type { SubscriptionTier } from "@oshap/shared";
import { toast } from "@oshap/shared/ui";

const TIERS: SubscriptionTier[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

const TIER_PRICES: Record<SubscriptionTier, string> = {
  FREE: "₦0/mo",
  STARTER: "₦9,900/mo",
  PRO: "₦24,900/mo",
  ENTERPRISE: "₦79,900/mo",
};

interface FormState {
  name: string;
  owner_name: string;
  owner_email: string;
  subscription_tier: SubscriptionTier;
  table_count: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

const EMPTY: FormState = {
  name: "",
  owner_name: "",
  owner_email: "",
  subscription_tier: "STARTER",
  table_count: "10",
  bank_name: "",
  account_number: "",
  account_name: "",
};

export default function RestaurantNewPage() {
  const navigate = useNavigate();
  const create = usePlatformCreateRestaurant();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [step, setStep] = useState<1 | 2>(1);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.owner_name || !form.owner_email) {
      toast.error("Name, owner name, and email are required.");
      return;
    }
    setStep(2);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await create.mutateAsync({
        name: form.name,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        subscription_tier: form.subscription_tier,
        table_count: Number(form.table_count) || 10,
        bank_name: form.bank_name || undefined,
        account_number: form.account_number || undefined,
        account_name: form.account_name || undefined,
      });
      toast.success(`${r.name} onboarded successfully.`);
      navigate(`/restaurants/${r.id}`);
    } catch {
      toast.error("Failed to create restaurant. Please try again.");
    }
  };

  const inputClass =
    "w-full px-md py-s rounded-lg bg-surface-container-lowest border-[1.5px] border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors";

  return (
    <main className="p-md flex flex-col gap-l max-w-xl">
      <header>
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Onboard Restaurant
        </h1>
        <div className="flex items-center gap-s mt-s">
          {([1, 2] as const).map((s) => (
            <div key={s} className="flex items-center gap-s">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-caption-xs font-bold transition-colors ${
                  step >= s
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-outline"
                }`}
              >
                {s}
              </div>
              <span className={`text-caption-sm font-medium ${step >= s ? "text-primary-text" : "text-secondary-text"}`}>
                {s === 1 ? "Restaurant Info" : "Banking & Tables"}
              </span>
              {s < 2 && <i className="mgc_right_line text-outline text-sm" />}
            </div>
          ))}
        </div>
      </header>

      {step === 1 && (
        <form onSubmit={handleNext} className="flex flex-col gap-md">
          <div className="bg-surface-container rounded-md p-md flex flex-col gap-md">
            <h2 className="text-label-l2 font-semibold text-primary-text">Restaurant Details</h2>
            <input className={inputClass} placeholder="Restaurant name *" value={form.name} onChange={set("name")} />
            <input className={inputClass} placeholder="Owner full name *" value={form.owner_name} onChange={set("owner_name")} />
            <input className={inputClass} type="email" placeholder="Owner email *" value={form.owner_email} onChange={set("owner_email")} />
          </div>

          <div className="bg-surface-container rounded-md p-md flex flex-col gap-md">
            <h2 className="text-label-l2 font-semibold text-primary-text">Subscription Tier</h2>
            <div className="grid grid-cols-2 gap-s">
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, subscription_tier: tier }))}
                  className={`py-s px-md rounded-lg border-2 text-left transition-all ${
                    form.subscription_tier === tier
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-low text-primary-text hover:border-outline"
                  }`}
                >
                  <p className="font-bold text-caption-md">{tier}</p>
                  <p className="text-caption-xs opacity-70">{TIER_PRICES[tier]}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="py-md rounded-xl font-bold text-p font-display bg-primary text-on-primary hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Next →
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleCreate} className="flex flex-col gap-md">
          <div className="bg-surface-container rounded-md p-md flex flex-col gap-md">
            <h2 className="text-label-l2 font-semibold text-primary-text">Tables</h2>
            <input
              className={inputClass}
              type="number"
              min={1}
              placeholder="Number of tables (default 10)"
              value={form.table_count}
              onChange={set("table_count")}
            />
          </div>

          <div className="bg-surface-container rounded-md p-md flex flex-col gap-md">
            <h2 className="text-label-l2 font-semibold text-primary-text">Bank Details (optional)</h2>
            <input className={inputClass} placeholder="Bank name" value={form.bank_name} onChange={set("bank_name")} />
            <input className={inputClass} placeholder="Account number" value={form.account_number} onChange={set("account_number")} />
            <input className={inputClass} placeholder="Account name" value={form.account_name} onChange={set("account_name")} />
          </div>

          <div className="flex gap-s">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-md rounded-xl font-bold text-p font-display border border-outline-variant text-secondary-text hover:bg-surface-container-high transition-all"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 py-md rounded-xl font-bold text-p font-display bg-primary text-on-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {create.isPending ? "Creating..." : "Create Restaurant"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
