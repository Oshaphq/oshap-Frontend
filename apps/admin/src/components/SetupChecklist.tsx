import { useState } from "react";
import { Link } from "react-router";
import {
  useAdminBankAccounts,
  useAdminHistory,
  useAdminMenu,
  useAdminSettings,
  useAdminStaff,
} from "@oshap/shared";

/** Set once a QR sheet has actually been printed for this restaurant. */
export const qrPrintedKey = (restaurantId: string) =>
  `oshap-qr-printed-${restaurantId}`;

const dismissedKey = (restaurantId: string) =>
  `oshap-setup-dismissed-${restaurantId}`;

interface Step {
  label: string;
  detail: string;
  done: boolean;
  to: string;
}

/**
 * What a new restaurant still has to do, on the dashboard until it's finished.
 *
 * Every step reads its own completion from data the app already fetches, so
 * there's no new backend state to add and nothing to drift. It also self-heals:
 * delete the whole menu and the menu step re-opens.
 *
 * A merchant landing on an empty dashboard has no idea what to do next, which
 * is where onboarding actually fails — account creation is the easy part.
 */
export default function SetupChecklist({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const settings = useAdminSettings();
  const banks = useAdminBankAccounts();
  const menu = useAdminMenu();
  const staff = useAdminStaff();
  const history = useAdminHistory({ page: 1, per_page: 1 });

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissedKey(restaurantId)) === "true";
    } catch {
      return false;
    }
  });

  // Wait for the data rather than flashing a checklist of unticked boxes at a
  // restaurant that finished setting up months ago.
  const loading =
    settings.isLoading || banks.isLoading || menu.isLoading || staff.isLoading;
  if (loading || dismissed) return null;

  const qrPrinted = (() => {
    try {
      return localStorage.getItem(qrPrintedKey(restaurantId)) === "true";
    } catch {
      return false;
    }
  })();

  const steps: Step[] = [
    // Two errands on two screens, so two steps. Together they sent people to
    // General and left them looking for a logo uploader that lives in
    // Branding.
    {
      label: "Add your address",
      detail: "Guests see it as “You’re sitting at …”.",
      done: Boolean(settings.data?.address),
      to: "/settings/general",
    },
    {
      label: "Add your logo",
      detail: "It goes on receipts and the top of the guest’s menu.",
      done: Boolean(settings.data?.logo_url),
      to: "/settings/branding",
    },
    {
      label: "Add a bank account",
      detail: "Where transfers land when a guest pays.",
      done: (banks.data?.length ?? 0) > 0,
      to: "/settings/bank",
    },
    {
      label: "Build your menu",
      detail: "Add one dish by hand first, then import the rest.",
      done: (menu.data?.length ?? 0) > 0,
      to: "/menu",
    },
    {
      label: "Print your table QR codes",
      detail: "Name your tables first — a printed code can’t be edited.",
      done: qrPrinted,
      to: "/settings/tables",
    },
    {
      label: "Add your staff",
      detail: "One account each, so the audit trail names a real person.",
      done: (staff.data?.length ?? 0) > 1,
      to: "/settings/staff",
    },
    {
      label: "Take a test order",
      detail: "Scan a code, order, pay and close it before opening.",
      done: (history.data?.orders?.length ?? 0) > 0,
      to: "/history",
    },
  ];

  const complete = steps.filter((s) => s.done).length;
  const allDone = complete === steps.length;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissedKey(restaurantId), "true");
    } catch {
      // Non-fatal: the checklist simply reappears next session.
    }
    setDismissed(true);
  };

  // Collapsed to one line once finished, rather than vanishing — a merchant
  // who ticked the last box should see that it's done.
  if (allDone) {
    return (
      <section className="flex items-center justify-between gap-md px-md py-s rounded-md bg-surface-container-low">
        <span className="text-p2 text-primary-text">
          <i className="mgc_check_circle_fill text-success mr-xs" />
          Setup complete — you&rsquo;re ready to open.
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="text-caption-md font-semibold text-primary hover:underline"
        >
          Dismiss
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-md bg-surface-container-low overflow-hidden">
      <header className="flex items-center justify-between gap-md px-md py-s border-b border-outline-variant">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-label-l2 font-semibold text-primary-text">
            Finish setting up
          </h2>
          <p className="text-caption-md text-secondary-text">
            {complete} of {steps.length} done
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-caption-md text-secondary-text hover:text-primary-text transition-colors"
        >
          Hide
        </button>
      </header>

      <ol className="flex flex-col">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              to={step.to}
              className="flex items-start gap-s px-md py-s border-b border-outline-variant/40 last:border-none hover:bg-surface-container transition-colors no-underline"
            >
              <span
                aria-hidden="true"
                className={`w-5 h-5 mt-0.5 shrink-0 flex items-center justify-center rounded-4xl border-2 ${
                  step.done
                    ? "bg-success border-success text-on-success"
                    : "border-outline"
                }`}
              >
                {step.done && (
                  <i className="mgc_check_line text-xs font-bold" />
                )}
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span
                  className={`text-p2 font-semibold ${
                    step.done
                      ? "text-secondary-text line-through"
                      : "text-primary-text"
                  }`}
                >
                  {step.label}
                </span>
                {!step.done && (
                  <span className="text-caption-md text-secondary-text">
                    {step.detail}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
