import { useState } from "react";
import { buttonClassName, Card } from "@oshap/shared/ui";
import {
  formatCurrency,
  MONTHS_BILLED_ANNUALLY,
  PHASE_1_TIERS,
  TIER_ANNUAL_KOBO,
  TIER_LOCATION_CAP,
  TIER_MONTHLY_KOBO,
  TIER_MONTHLY_ORDER_CAP,
} from "@oshap/shared/utils";
import type { SubscriptionTier } from "@oshap/shared/types";

/**
 * The marketing page, for restaurant owners rather than guests. See
 * docs/landing-page.md for who it is for and what it must not claim.
 *
 * Imported from the `ui`, `utils` and `types` entry points rather than the
 * `@oshap/shared` barrel, which would also pull in the API client and hooks
 * that a static page never uses.
 *
 * Every price and cap comes from the shared tier data. Nothing here is typed
 * in by hand, so the page cannot quote a plan the platform doesn't sell.
 */

const WHATSAPP_NUMBER = import.meta.env.VITE_SALES_WHATSAPP?.replace(/\D/g, "");

/** `null` when no number is configured, so the demo buttons hide rather than dead-end. */
const DEMO_URL = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      "Hi Oshap, I'd like a demo for my restaurant.",
    )}`
  : null;

const TIER_NAME: Record<SubscriptionTier, string> = {
  LITE: "Lite",
  STANDARD: "Standard",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const TIER_FOR: Record<SubscriptionTier, string> = {
  LITE: "For a small restaurant or bar",
  STANDARD: "For a busy restaurant",
  PRO: "For more than one location",
  ENTERPRISE: "For large groups",
};

const FREE_MONTHS = 12 - MONTHS_BILLED_ANNUALLY;

const STEPS = [
  {
    title: "Guests scan and order",
    body: "No app, no account. The phone camera opens your menu.",
  },
  {
    title: "Your kitchen gets it straight away",
    body: "Staff phones alert. The kitchen screen shows every order, oldest first.",
  },
  {
    title: "You confirm the payment",
    body: "Guests pay by transfer or ask for your POS. One tap confirms it and closes the table.",
  },
];

const JOBS = [
  {
    who: "For your guests",
    title: "No more waving for a waiter",
    points: [
      "Order, and add another round, any time",
      "See when food is being prepared and when it's ready",
      "Call a waiter with one tap",
    ],
  },
  {
    who: "For your staff",
    title: "Every order reaches the right person",
    points: [
      "Phone alerts for new orders, waiter calls and POS requests",
      "The kitchen moves orders along with Start and Ready",
      "Every alert names the table",
    ],
  },
  {
    who: "For you",
    title: "Every order matched to a payment",
    points: [
      "Each bill has its own reference, so a transfer is easy to find",
      "Unpaid tables stay open until someone accounts for them",
      "End-of-day totals by transfer, POS and unpaid",
    ],
  },
];

/** Locations are left off on purpose: Lite and Standard are capped at one. */
const INCLUDED = [
  { icon: "mgc_book_4_line", name: "Menu and add-ons", detail: "Change prices or mark dishes sold out from your phone." },
  { icon: "mgc_inventory_line", name: "Stock tracking", detail: "Track ingredients as orders come in." },
  { icon: "mgc_qrcode_line", name: "QR codes", detail: "One for every table, ready to print." },
  { icon: "mgc_bill_line", name: "Receipts", detail: "Guests get a receipt for every paid bill." },
  { icon: "mgc_group_line", name: "Staff roles", detail: "Owners, managers, waiters and kitchen each see what they need." },
  { icon: "mgc_table_line", name: "Group ordering", detail: "Friends at one table order on one shared tab." },
  { icon: "mgc_chart_bar_line", name: "Sales reports", detail: "See what sells, and when." },
];

const FAQS = [
  {
    q: "Do guests need to download an app?",
    a: "No. They point their phone camera at the QR code and your menu opens in the browser. No account, no download.",
  },
  {
    q: "How do guests pay?",
    a: "By bank transfer to your account, or by asking for your POS. Staff confirm the payment in Oshap with one tap.",
  },
  {
    q: "Does Oshap hold our money?",
    a: "No. Transfers go straight into your own bank account, and card payments go through your own POS.",
  },
  {
    q: "What happens if we pass 10,000 orders a month on Lite?",
    a: "Your guests can still order. We never stop orders in the middle of service. We'll get in touch to talk about your plan.",
  },
  {
    q: "What do we need to get started?",
    a: "A phone or tablet for your staff, and printed QR codes for your tables. Oshap makes the codes for you.",
  },
  {
    q: "Can we change the menu ourselves?",
    a: "Yes. Add dishes, change prices or mark something sold out from your phone, and guests see it straight away.",
  },
];

/** Side gutter 16 → 24, content capped so lines stay readable on a wide screen. */
const CONTAINER = "mx-auto w-full max-w-[72rem] px-md md:px-l";

function DemoLink({ className }: { className: string }) {
  if (!DEMO_URL) return null;
  return (
    <a
      href={DEMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Book a demo on WhatsApp"
      className={className}
    >
      Book a demo
    </a>
  );
}

function SectionHeading({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="flex max-w-[42rem] flex-col gap-s">
      <h2 id={id} className="font-display text-headline-large text-on-surface">
        {title}
      </h2>
      {lead && <p className="text-body-large text-on-surface-variant">{lead}</p>}
    </div>
  );
}

function capLine(cap: number | null, unit: string, capped: string): string {
  return cap === null ? `Unlimited ${unit}` : capped.replace("{n}", cap.toLocaleString("en-NG"));
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const billing = [
    { value: false, label: "Monthly" },
    { value: true, label: `Annual · ${FREE_MONTHS} months free` },
  ];

  return (
    <section aria-labelledby="pricing-title" id="pricing" className="scroll-mt-20">
      <div className={`${CONTAINER} flex flex-col gap-xl`}>
        <SectionHeading
          id="pricing-title"
          title="One product. Pay for the size of your restaurant."
          lead="Every plan includes everything. Staff and tables are unlimited on all of them."
        />

        {/* A radiogroup, like the bank picker on the pay page: exactly one
            billing period is always chosen. */}
        <div role="radiogroup" aria-label="Billing period" className="flex flex-wrap gap-s">
          {billing.map((option) => {
            const selected = option.value === annual;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setAnnual(option.value)}
                className={`h-9 rounded-full border px-md text-label-large transition-colors ${
                  selected
                    ? "bg-primary text-on-primary border-transparent"
                    : "bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <ul className="grid gap-md md:grid-cols-3">
          {PHASE_1_TIERS.map((tier) => {
            const kobo = annual ? TIER_ANNUAL_KOBO[tier] : TIER_MONTHLY_KOBO[tier];
            return (
              <li key={tier}>
                <Card as="article" padding="l" className="flex h-full flex-col gap-l">
                  <div className="flex flex-col gap-xs">
                    <h3 className="font-display text-title-large text-on-surface">
                      {TIER_NAME[tier]}
                    </h3>
                    <p className="text-body-medium text-on-surface-variant">{TIER_FOR[tier]}</p>
                  </div>

                  {/* Announced on change, so switching billing period is heard
                      as well as seen. */}
                  <p aria-live="polite" className="flex items-baseline gap-xs">
                    <span className="font-display text-headline-large text-on-surface">
                      {formatCurrency(kobo)}
                    </span>
                    <span className="text-body-medium text-on-surface-variant">
                      {annual ? "/year" : "/month"}
                    </span>
                  </p>

                  <ul className="flex flex-1 flex-col gap-s text-body-medium text-on-surface">
                    {[
                      capLine(TIER_MONTHLY_ORDER_CAP[tier], "orders", "{n} orders a month"),
                      capLine(TIER_LOCATION_CAP[tier], "locations", "{n} location"),
                      "Unlimited staff and tables",
                      "Every feature",
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-s">
                        <i className="mgc_check_line mt-0.5 text-primary-label" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>

                  <DemoLink
                    className={buttonClassName({ variant: "outlined", size: "lg", fullWidth: true })}
                  />
                </Card>
              </li>
            );
          })}
        </ul>

        {DEMO_URL && (
          <p className="text-body-small text-on-surface-variant">
            Book a demo opens a WhatsApp chat with our team.
          </p>
        )}
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-md focus:top-md focus:z-50 focus:rounded-sm focus:bg-surface-container-high focus:px-md focus:py-s"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface">
        <nav aria-label="Main" className={`${CONTAINER} flex h-16 items-center justify-between gap-md`}>
          <a href="/" className="flex items-center gap-s">
            <img src="/oshap.png" alt="" className="h-8 w-8 rounded-sm" />
            <span className="font-display text-title-large text-on-surface">Oshap</span>
          </a>
          <div className="flex items-center gap-l">
            <ul className="hidden items-center gap-l text-label-large text-on-surface-variant md:flex">
              <li><a href="#how-it-works" className="hover:text-on-surface">How it works</a></li>
              <li><a href="#pricing" className="hover:text-on-surface">Pricing</a></li>
              <li><a href="#faq" className="hover:text-on-surface">FAQ</a></li>
            </ul>
            <DemoLink className={buttonClassName({ variant: "filled", size: "md" })} />
          </div>
        </nav>
      </header>

      <main id="main" className="flex flex-col gap-5xl pb-5xl md:gap-9xl md:pb-9xl">
        {/* Hero */}
        <section aria-labelledby="hero-title" className={`${CONTAINER} pt-3xl md:pt-8xl`}>
          <div className="flex max-w-[48rem] flex-col gap-l">
            <h1 id="hero-title" className="font-display text-display-large text-on-surface">
              Order shap shap.
            </h1>
            <p className="text-body-large text-on-surface-variant">
              Guests scan the QR code on their table and order from their phone, then pay by
              transfer or card. Your kitchen sees every order straight away, and every order is
              matched to a payment.
            </p>
            <div className="flex flex-wrap items-center gap-s pt-s">
              <DemoLink className={buttonClassName({ variant: "filled", size: "lg" })} />
              <a
                href="#pricing"
                className={buttonClassName({
                  variant: DEMO_URL ? "text" : "filled",
                  size: "lg",
                })}
              >
                See pricing
              </a>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-title" id="how-it-works" className="scroll-mt-20">
          <div className={`${CONTAINER} flex flex-col gap-xl`}>
            <SectionHeading id="how-title" title="How it works" />
            <ol className="grid gap-xl md:grid-cols-3 md:gap-l">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-s">
                  <span className="font-display text-title-large text-primary-label" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-title-large text-on-surface">{step.title}</h3>
                  <p className="text-body-large text-on-surface-variant">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Three jobs */}
        <section aria-labelledby="jobs-title">
          <div className={`${CONTAINER} flex flex-col gap-xl`}>
            <SectionHeading id="jobs-title" title="Built for the whole room" />
            <div className="grid gap-md md:grid-cols-3">
              {JOBS.map((job) => (
                <Card key={job.title} as="article" padding="l" gap="md">
                  <p className="text-label-large text-primary-label">{job.who}</p>
                  <h3 className="font-display text-headline-small text-on-surface">{job.title}</h3>
                  <ul className="flex flex-col gap-s text-body-medium text-on-surface-variant">
                    {job.points.map((point) => (
                      <li key={point} className="flex items-start gap-s">
                        <i className="mgc_check_line mt-0.5 text-primary-label" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Everything included — the proof behind the pricing claim below it */}
        <section aria-labelledby="included-title">
          <div className={`${CONTAINER} flex flex-col gap-xl`}>
            <SectionHeading id="included-title" title="Everything is included on every plan" />
            <ul className="grid gap-x-l gap-y-l sm:grid-cols-2 lg:grid-cols-3">
              {INCLUDED.map((item) => (
                <li key={item.name} className="flex items-start gap-md">
                  <i className={`${item.icon} mt-0.5 text-[24px] text-on-surface-variant`} aria-hidden="true" />
                  <div className="flex flex-col gap-xs">
                    <span className="font-display text-title-medium text-on-surface">{item.name}</span>
                    <span className="text-body-medium text-on-surface-variant">{item.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Pricing />

        {/* FAQ — <details> so it opens before any JavaScript has loaded */}
        <section aria-labelledby="faq-title" id="faq" className="scroll-mt-20">
          <div className={`${CONTAINER} flex flex-col gap-xl`}>
            <SectionHeading id="faq-title" title="Questions" />
            <div className="max-w-[48rem] divide-y divide-outline-variant border-y border-outline-variant">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-md py-md font-display text-title-medium text-on-surface [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <i
                      className="mgc_down_line shrink-0 text-[20px] text-on-surface-variant transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-md text-body-large text-on-surface-variant">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action — neutral, not an orange band: the seed may
            not carry a paragraph. */}
        {DEMO_URL && (
          <section aria-labelledby="cta-title" className={CONTAINER}>
            <Card padding="none" className="flex flex-col items-start gap-l px-l py-2xl md:items-center md:px-3xl md:py-4xl md:text-center">
              <h2 id="cta-title" className="font-display text-headline-large text-on-surface">
                See Oshap in your restaurant
              </h2>
              <p className="max-w-[36rem] text-body-large text-on-surface-variant">
                We'll show you the whole thing on a call, then set up your menu and tables with you.
              </p>
              <DemoLink className={buttonClassName({ variant: "filled", size: "lg" })} />
            </Card>
          </section>
        )}
      </main>

      <footer className="border-t border-outline-variant">
        <div className={`${CONTAINER} flex items-center gap-s py-xl text-body-medium text-on-surface-variant`}>
          <img src="/oshap.png" alt="" className="h-6 w-6 rounded-xs" />
          Oshap · Order shap shap.
        </div>
      </footer>
    </div>
  );
}
