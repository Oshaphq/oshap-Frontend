import { useState } from "react";

interface BrandMarkProps {
  /** The restaurant's uploaded logo. Null, empty or broken all fall back. */
  logoUrl?: string | null;
  /** Shown when there is no usable logo. */
  fallbackSrc: string;
  alt?: string;
  className?: string;
}

/**
 * A restaurant's logo, with a fallback that survives a dead URL.
 *
 * Uploaded images live in object storage, so a URL can be persisted and later
 * stop resolving — a rotated bucket, an expired link, a failed upload that
 * still wrote a row. Without an `onError` the guest gets the browser's broken
 * image glyph, which looks like the app is broken rather than the logo missing.
 */
export default function BrandMark({
  logoUrl,
  fallbackSrc,
  alt = "",
  className,
}: BrandMarkProps) {
  const [failed, setFailed] = useState(false);

  // Re-try a changed URL: without this, one bad logo poisons every later one.
  const [lastUrl, setLastUrl] = useState(logoUrl);
  if (lastUrl !== logoUrl) {
    setLastUrl(logoUrl);
    setFailed(false);
  }

  const src = logoUrl && !failed ? logoUrl : fallbackSrc;

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
