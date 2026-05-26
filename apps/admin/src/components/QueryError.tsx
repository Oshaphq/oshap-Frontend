import { SecondaryButton } from "@oshap/shared/ui";

interface Props {
  message?: string;
  onRetry: () => void;
}

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
