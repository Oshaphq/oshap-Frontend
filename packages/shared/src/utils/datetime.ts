/**
 * Reads a timestamp from the API without guessing at its time zone.
 *
 * A datetime with no zone marker is ambiguous, and `new Date()` resolves that
 * ambiguity as **local** time. The API sends UTC. In Lagos, UTC+1, the two
 * disagree by exactly an hour — which is how a waiter call placed seconds
 * earlier displayed as "1h" in the notification panel on its first day.
 *
 * The error is invisible in most places. Nobody checks whether an order from
 * this morning is stamped 08:15 or 09:15. It only showed up here because
 * notifications are the one screen measured in minutes.
 *
 * Treating a naive string as UTC is the right default because that is what the
 * server means by it. This is a guard, not a fix: the API should send RFC 3339
 * with an offset, which its own spec already requires. Remove this once it
 * does — but not before, because it is silent when it is wrong.
 */
export function parseApiDate(value: string): Date {
  // Date-only strings are already read as UTC by every engine, and appending a
  // marker to one produces an invalid date rather than a corrected one.
  const isDateTime = value.includes("T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(isDateTime && !hasZone ? `${value}Z` : value);
}

/**
 * Date and time as staff read it, from an API timestamp.
 *
 * Exists so call sites stop reaching for `new Date(x).toLocaleString()`, which
 * is how the zoneless-timestamp bug reached five screens without anyone
 * noticing: an hour is invisible on a receipt or an audit row in a way it is
 * not on a waiter call placed a minute ago.
 */
export function formatApiDateTime(value: string): string {
  return parseApiDate(value).toLocaleString();
}

/**
 * Day only.
 *
 * Worth parsing correctly even here — arguably especially here. An order at
 * 23:30 in Lagos read as UTC lands on the previous day, so a whole row moves
 * date rather than merely shifting an hour.
 */
export function formatApiDate(
  value: string,
  locale = "en-NG",
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  return parseApiDate(value).toLocaleDateString(locale, options);
}

/** Clock time only. */
export function formatApiTime(
  value: string,
  locale = "en-NG",
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  return parseApiDate(value).toLocaleTimeString(locale, options);
}
