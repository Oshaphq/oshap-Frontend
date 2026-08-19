import SecondaryButton from "./SecondaryButton";

interface Props {
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
 */
export default function QueryError({
  message = "Couldn't load. Check your connection.",
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-s py-10 px-md text-center">
      <i className="mgc_warning_line text-5xl text-error opacity-60" />
      <span className="font-display text-display-h4 font-semibold text-primary-text">
        Something went wrong
      </span>
      <p className="text-p2 text-secondary-text">{message}</p>
      <SecondaryButton size="md" onClick={onRetry}>
        <i className="mgc_refresh_3_line" /> Try again
      </SecondaryButton>
    </div>
  );
}
