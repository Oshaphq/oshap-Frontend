/**
 * Nigerian phone normalization, transcribed from the backend's
 * `app/services/phone.py`.
 *
 * The two implementations must agree exactly. Phone is the unique identity of
 * a staff account, so a client that canonicalizes differently creates people
 * who cannot log in, or duplicates of people who already exist — and neither
 * failure announces itself.
 */

/** Nigerian mobile: +234 then 10 digits beginning 7, 8 or 9. */
const NG_PHONE = /^\+234[789]\d{9}$/;

/** Loose enough to tell a phone from an email, not to validate one. */
const PHONE_SHAPED = /^[\d+\s\-()]{7,}$/;

export class InvalidPhoneError extends Error {
  constructor(message = "Enter a valid Nigerian phone number") {
    super(message);
    this.name = "InvalidPhoneError";
  }
}

/**
 * Canonicalizes to E.164. Accepts local (`0803…`), bare (`803…`, `234803…`)
 * and already-E.164 input, with any spacing or dashes.
 *
 * Throws rather than returning null so a caller cannot accidentally persist
 * un-normalized input by ignoring a falsy result.
 */
export function normalizePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");

  let local = digits;
  if (local.startsWith("234")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);

  const canonical = `+234${local}`;
  if (!NG_PHONE.test(canonical)) throw new InvalidPhoneError();
  return canonical;
}

/** Non-throwing variant, for validating a field as it's typed. */
export function tryNormalizePhone(raw: string): string | null {
  try {
    return normalizePhone(raw);
  } catch {
    return null;
  }
}

/**
 * Whether an identifier should be treated as a phone rather than an email.
 * Mirrors the backend's `looks_like_phone`, which is what decides the column
 * a login is resolved against.
 */
export function looksLikePhone(identifier: string): boolean {
  return PHONE_SHAPED.test((identifier ?? "").trim());
}

/**
 * Phone-shaped, but not a phone number.
 *
 * The one case a login form can reject on its own. An auth failure has to stay
 * vague — saying which half was wrong lets a stranger check whether an account
 * exists — but this is about the shape of what was typed, not whether it
 * matches anything, so naming it leaks nothing.
 *
 * Returns false for an email, which is why `looksLikePhone` gates it: the
 * backend picks the lookup column the same way, so an address is never refused
 * for failing to be a number.
 */
export function isMalformedPhone(identifier: string): boolean {
  const id = (identifier ?? "").trim();
  return looksLikePhone(id) && tryNormalizePhone(id) === null;
}

/** `+2348031234567` → `0803 123 4567`, for display back to a merchant. */
export function formatPhone(canonical: string): string {
  const match = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(canonical ?? "");
  if (!match) return canonical ?? "";
  return `0${match[1]} ${match[2]} ${match[3]}`;
}
