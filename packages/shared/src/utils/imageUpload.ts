/** Largest image we send. A modern phone photo is 3–8MB, so this bites often. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** The `accept` attribute matching what the server takes — keep the two in step. */
export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Check a file before uploading it.
 *
 * Returns a message to show the merchant, or `null` when the file is fine.
 * Worth doing client-side: on a Nigerian mobile connection, discovering a 9MB
 * photo is too large *after* a two-minute upload is the difference between a
 * corrected mistake and an abandoned menu.
 */
export function validateImageFile(file: File): string | null {
  if (
    file.type &&
    !ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])
  ) {
    return "That file isn't an image we can use. Try a JPG, PNG, WebP or GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(
      MAX_IMAGE_BYTES,
    )} — try a smaller photo, or crop it first.`;
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  return null;
}
