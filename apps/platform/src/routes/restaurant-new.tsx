import { useState } from "react";
import { PHASE_1_TIERS, tierAnnualLabel, tierPriceLabel } from "../tiers";
import { useNavigate } from "react-router";
import {
  errorMessage,
  formatPhone,
  tryNormalizePhone,
  usePlatformCreateRestaurant,
} from "@oshap/shared";
import type { BillingPeriod, SubscriptionTier } from "@oshap/shared";
import {
  Button,
  Card,
  Page,
  PrimaryButton,
  SecondaryButton,
  TextField,
  toast,
} from "@oshap/shared/ui";


interface FormState {
  name: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  subscription_tier: SubscriptionTier;
  billing_period: BillingPeriod;
  table_count: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

const EMPTY: FormState = {
  name: "",
  owner_name: "",
  owner_phone: "",
  owner_email: "",
  subscription_tier: "LITE",
  billing_period: "MONTHLY",
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
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [created, setCreated] = useState("");

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.owner_name || !form.owner_phone) {
      toast.error("Restaurant name, owner name and phone number are required.");
      return;
    }
    if (!tryNormalizePhone(form.owner_phone)) {
      toast.error("Enter a valid Nigerian phone number for the owner.");
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
        owner_phone: tryNormalizePhone(form.owner_phone)!,
        owner_email: form.owner_email || undefined,
        subscription_tier: form.subscription_tier,
        billing_period: form.billing_period,
        table_count: Number(form.table_count) || 10,
        bank_name: form.bank_name || undefined,
        account_number: form.account_number || undefined,
        account_name: form.account_name || undefined,
      });
      // The setup link is returned once and never again. Hand it to the
      // operator rather than only navigating away, because for an owner with
      // no inbox this link is the only route into their account.
      if (r.owner_setup_url) {
        setSetupUrl(r.owner_setup_url);
        setCreated(r.name);
      } else {
        toast.success(`${r.name} onboarded successfully.`);
        navigate(`/restaurants/${r.id}`);
      }
    } catch (err) {
      // This message was "Failed to create restaurant. Please try again." for
      // a rejected tier, a duplicate phone number and a CORS wall alike. Each
      // time it sent someone looking in the wrong place.
      toast.error(errorMessage(err, "create the restaurant"));
    }
  };

  if (setupUrl) {
    return (
      <Page width="narrow" gap="l">
        <header className="flex flex-col gap-xs">
          <h1 className="font-display text-title-large font-semibold text-on-surface">
            {created} is ready
          </h1>
          <p className="text-body-medium text-on-surface-variant">
            Send this link to {formatPhone(tryNormalizePhone(form.owner_phone) ?? "")} so
            the owner can set their password. It works once and then expires.
          </p>
        </header>

        <Card gap="s">
          <code className="text-body-small text-on-surface break-all font-mono">
            {setupUrl}
          </code>
          <Button
            variant="text"
            onClick={() => {
              navigator.clipboard?.writeText(setupUrl);
              toast.success("Link copied");
            }}
          >
            Copy link
          </Button>
        </Card>

        <p className="text-body-medium text-on-surface-variant">
          This is the only time it is shown. If it is lost, the owner can request
          a new one from the sign-in screen.
        </p>

        <PrimaryButton onClick={() => navigate("/restaurants")}>
          Done
        </PrimaryButton>
      </Page>
    );
  }

  return (
    <Page width="narrow" gap="l">
      <header>
        <h1 className="font-display text-title-large font-semibold text-on-surface">
          Onboard Restaurant
        </h1>
        <div className="flex items-center gap-s mt-s">
          {([1, 2] as const).map((s) => (
            <div key={s} className="flex items-center gap-s">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-label-small font-bold transition-colors ${
                  step >= s
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {s}
              </div>
              <span className={`text-body-small font-medium ${step >= s ? "text-on-surface" : "text-on-surface-variant"}`}>
                {s === 1 ? "Restaurant Info" : "Banking & Tables"}
              </span>
              {s < 2 && <i className="mgc_right_line text-on-surface-variant text-sm" />}
            </div>
          ))}
        </div>
      </header>

      {step === 1 && (
        <form onSubmit={handleNext} className="flex flex-col gap-md">
          <Card gap="md">
            <h2 className="text-title-large font-semibold text-on-surface">Restaurant Details</h2>
            <TextField aria-label="Restaurant name" placeholder="Restaurant name *" value={form.name} onChange={set("name")} />
            <TextField aria-label="Owner full name" placeholder="Owner full name *" value={form.owner_name} onChange={set("owner_name")} />
            <TextField type="tel" inputMode="tel" aria-label="Owner phone number" placeholder="Owner phone number * — 0803 123 4567" value={form.owner_phone} onChange={set("owner_phone")} />
            <TextField type="email" aria-label="Owner email" placeholder="Owner email (optional)" value={form.owner_email} onChange={set("owner_email")} />
          </Card>

          <Card gap="md">
            <h2 className="text-title-large font-semibold text-on-surface">Subscription Tier</h2>
            {/* Phase 1 plans only. Enterprise belongs to Phase 2, alongside
                payment infrastructure that does not exist — offering it here
                would be selling something we cannot deliver. */}
            <div className="grid grid-cols-2 gap-s">
              {PHASE_1_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, subscription_tier: tier }))}
                  className={`py-s px-md rounded-sm border-2 text-left transition-all ${
                    form.subscription_tier === tier
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

            {/* Recorded from the start. The backend has stored this all along
                and we never sent it, so every restaurant onboarded so far reads
                as monthly — including any that signed for a year. */}
            <div className="flex flex-col gap-s">
              <span className="text-body-medium font-semibold text-on-surface">
                Billing
              </span>
              <div className="grid grid-cols-2 gap-s">
                {(["MONTHLY", "ANNUAL"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, billing_period: period }))}
                    className={`py-s px-md rounded-sm border-2 text-left transition-all ${
                      form.billing_period === period
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-outline-variant bg-surface-container-low text-on-surface hover:border-outline"
                    }`}
                  >
                    <p className="font-bold text-body-medium">
                      {period === "MONTHLY" ? "Monthly" : "Annual"}
                    </p>
                    <p className="text-label-small opacity-70">
                      {period === "MONTHLY"
                        ? tierPriceLabel(form.subscription_tier)
                        : tierAnnualLabel(form.subscription_tier)}
                    </p>
                    <p className="text-label-small opacity-50">
                      {period === "MONTHLY" ? "Billed each month" : "Ten months' price"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <PrimaryButton type="submit">Next →</PrimaryButton>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleCreate} className="flex flex-col gap-md">
          <Card gap="md">
            <h2 className="text-title-large font-semibold text-on-surface">Tables</h2>
            <TextField
              type="number"
              min={1}
              aria-label="Number of tables"
              placeholder="Number of tables (default 10)"
              value={form.table_count}
              onChange={set("table_count")}
            />
          </Card>

          <Card gap="md">
            <h2 className="text-title-large font-semibold text-on-surface">Bank Details (optional)</h2>
            <TextField aria-label="Bank name" placeholder="Bank name" value={form.bank_name} onChange={set("bank_name")} />
            <TextField aria-label="Account number" placeholder="Account number" value={form.account_number} onChange={set("account_number")} />
            <TextField aria-label="Account name" placeholder="Account name" value={form.account_name} onChange={set("account_name")} />
          </Card>

          <div className="flex gap-s">
            <SecondaryButton onClick={() => setStep(1)} className="flex-1">
              ← Back
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={create.isPending} className="flex-1">
              {create.isPending ? "Creating..." : "Create Restaurant"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </Page>
  );
}
