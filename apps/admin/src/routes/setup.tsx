import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { adminApi, errorMessage } from "@oshap/shared";
import type { SetupVerifyResponse } from "@oshap/shared";
import { PrimaryButton, ThemeToggle, toast } from "@oshap/shared/ui";
import { useAuth } from "../context/AuthContext";

const MIN_PASSWORD = 10;

/** True only for the status that actually means "this token is finished". */
function isGone(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 410
  );
}

/**
 * Where an owner claims the account that was provisioned for them.
 *
 * Registered outside AuthGate — the visitor has no session yet, which is the
 * entire point. The token is verified before any form renders so a dead link
 * says so up front, rather than after someone has chosen a password.
 */
export default function SetupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<
    "checking" | "ready" | "dead" | "unreachable"
  >("checking");
  const [account, setAccount] = useState<SetupVerifyResponse | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("dead");
      return;
    }
    adminApi
      .verifySetupToken({ token })
      .then((data) => {
        if (cancelled) return;
        setAccount(data);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Only a 410 means the link is actually spent. A network failure, a
        // CORS rejection or a 5xx says nothing about the token — and telling
        // someone their link expired when the server is unreachable sends
        // them to fetch a new one that will fail in exactly the same way.
        setStatus(isGone(err) ? "dead" : "unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    password.length >= MIN_PASSWORD && confirm === password && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await adminApi.completeSetup({ token, password });
      login(res);
      // `replace`, so Back doesn't return to a token that is now spent.
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        errorMessage(err, "complete setup");
      // A 410 here means the link was spent between loading the page and
      // submitting it, so the form is no longer the right screen.
      if (isGone(err)) {
        setStatus("dead");
      } else {
        toast.error(message);
      }
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-md py-s rounded-lg bg-surface-container border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors";

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="oshap-spinner" />
      </div>
    );
  }

  if (status === "unreachable") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface p-md">
        <div className="w-full max-w-[400px] bg-surface-container-low rounded-xl p-xl flex flex-col items-center gap-md text-center">
          <div className="w-16 h-16 rounded-full bg-warning-container flex items-center justify-center text-2xl text-on-warning-container">
            <i className="mgc_wifi_off_line" />
          </div>
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Can&rsquo;t reach Oshap
          </h1>
          <p className="text-p2 text-secondary-text">
            Your link is probably fine — we just couldn&rsquo;t check it. Try
            again in a moment, and tell your Oshap contact if it keeps failing.
          </p>
          <PrimaryButton
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Try again
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // A terminal screen, not an error on a form: there is nothing to retry, and
  // a retry button would invite someone to sit here clicking it.
  if (status === "dead") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface p-md">
        <div className="w-full max-w-[400px] bg-surface-container-low rounded-xl p-xl flex flex-col items-center gap-md text-center">
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center text-2xl text-on-error-container">
            <i className="mgc_link_line" />
          </div>
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            This link has expired
          </h1>
          <p className="text-p2 text-secondary-text">
            Setup links work once and time out after a week. If you already set
            a password, just sign in. Otherwise use{" "}
            <span className="font-semibold">Forgot password</span> on the
            sign-in screen to get a new link.
          </p>
          <PrimaryButton className="w-full" onClick={() => navigate("/")}>
            Go to sign in
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface p-md">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[400px] bg-surface-container-low rounded-xl p-xl flex flex-col gap-md"
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="font-display text-display-h2 font-semibold text-primary-text truncate">
              {account?.restaurant_name}
            </h1>
            <p className="text-caption-md text-secondary-text">
              Welcome, {account?.owner_name}. Choose a password to finish setting
              up your account.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Masked, not full: enough to recognise the account, not enough to
            hand a contact detail to whoever is holding the link. */}
        <p className="text-caption-sm text-secondary-text bg-surface-container rounded-lg px-md py-s">
          Signing in as{" "}
          <span className="font-semibold text-primary-text">
            {account?.phone_hint}
          </span>
        </p>

        <div className="flex flex-col gap-xs">
          <label
            htmlFor="setup-password"
            className="text-caption-md font-semibold text-primary-text"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="setup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-md top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text transition-colors"
            >
              <i className={showPassword ? "mgc_eye_close_line" : "mgc_eye_line"} />
            </button>
          </div>
          <p
            className={`text-caption-xs ${
              tooShort ? "text-error font-semibold" : "text-secondary-text"
            }`}
          >
            At least {MIN_PASSWORD} characters. Length matters more than symbols.
          </p>
        </div>

        <div className="flex flex-col gap-xs">
          <label
            htmlFor="setup-confirm"
            className="text-caption-md font-semibold text-primary-text"
          >
            Confirm password
          </label>
          <input
            id="setup-confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
          {mismatch && (
            <p className="text-caption-xs text-error font-semibold">
              These don&rsquo;t match.
            </p>
          )}
        </div>

        <PrimaryButton type="submit" disabled={!canSubmit} className="w-full">
          {submitting ? "Setting up…" : "Finish setup"}
        </PrimaryButton>
      </form>
    </div>
  );
}
