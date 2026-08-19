import SecondaryButton from "./SecondaryButton";
import { describeError } from "../api/errors";

interface Props {
  /**
   * The failure itself, normally `query.error`. Pass it — without it this
   * component can only guess, and it used to guess "check your connection"
   * at people whose connection was fine.
   */
  error?: unknown;
  /** What the user was trying to do, e.g. "load the restaurants". */
  action?: string;
  /** Overrides the classified message. Rarely needed. */
  message?: string;
  onRetry: () => void;
}

/**
 * What to show when a query fails.
 *
 * Exists because the alternative keeps happening: a screen that renders its
 * empty state on failure. A failed restaurant list said "No restaurants match
 * your filters", so a real restaurant looked deleted; the customer app showed
 * an empty menu while CORS blocked every call. An empty result and a broken
 * request look identical to the user and mean completely different things, so
 * every list that can fail should be able to say which happened.
 *
 * Saying *that* something failed was only half of it. Every call site used the
 * default copy — "Couldn't load. Check your connection." — so a 500 from the
 * server told an operator to check their own network while the platform
 * dashboard sat blank for a reason nobody could act on. The error is now
 * classified, so a server fault reads as ours and a retry is only offered when
 * retrying could actually help.
 */
export default function QueryError({
  error,
  action,
  message,
  onRetry,
}: Props) {
  const described = describeError(error, action);

  return (
    <div className="flex flex-col items-center justify-center gap-s py-10 px-md text-center">
      <i className="mgc_warning_line text-5xl text-error opacity-60" />
      <span className="font-display text-display-h4 font-semibold text-primary-text">
        {described.title}
      </span>
      <p className="text-p2 text-secondary-text max-w-[46ch]">
        {message ?? described.message}
      </p>
      {described.canRetry && (
        <SecondaryButton size="md" onClick={onRetry}>
          <i className="mgc_refresh_3_line" /> Try again
        </SecondaryButton>
      )}
    </div>
  );
}
