import { ApiError, NetworkError } from "./client";

/**
 * Telling one failure from another.
 *
 * Every debugging session this week began with a message that named the wrong
 * cause. "Failed to create restaurant" was a rejected tier enum, then a
 * duplicate phone, then a CORS wall. "This link has expired" was an
 * unreachable server. "No restaurants match your filters" was a 500. Each
 * time, the screen said something confident and wrong, and someone went
 * looking in the wrong place.
 *
 * The fix is not longer messages. It is deciding, in one place, what kind of
 * failure this is — because the useful thing to say depends entirely on that,
 * and on one question above all: is this something the person can fix?
 */

export { NetworkError };

export type ErrorKind =
  | "offline"
  | "unreachable"
  | "unauthenticated"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "invalid"
  | "server"
  | "unknown";

export interface ErrorDescription {
  kind: ErrorKind;
  /** Short enough for a toast title or a heading. */
  title: string;
  /** What happened and, where there is one, what to do about it. */
  message: string;
  /** Whether trying the same thing again could plausibly work. */
  canRetry: boolean;
  /**
   * False when the person did something wrong and can fix it; true when the
   * fault is ours or the server's and no amount of care on their part helps.
   * Drives tone: a validation error should not apologise, and a 500 should
   * not imply they mistyped something.
   */
  isOurFault: boolean;
  /** The HTTP status, where there was a response at all. */
  status?: number;
}

/** Messages a server sends that tell the reader nothing. */
const USELESS = [
  "something went wrong",
  "internal server error",
  "error",
  "failed",
  "bad request",
  "unprocessable entity",
];

/** Words that mean the subscription, rather than the person. */
const PLAN_WORDS = ["plan", "tier", "upgrade", "subscription"];

function isUseless(message: string | undefined): boolean {
  if (!message) return true;
  const m = message.trim().toLowerCase();
  return m.length < 3 || USELESS.includes(m);
}

/**
 * Classifies any thrown value into something worth showing a person.
 *
 * `action` is the thing being attempted, lowercase and without punctuation —
 * "create the restaurant", "upload the logo". It is woven into the message so
 * the reader knows what failed without matching a toast to a button.
 */
export function describeError(err: unknown, action?: string): ErrorDescription {
  const doing = action ? ` while trying to ${action}` : "";

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      kind: "offline",
      title: "You're offline",
      message: "Check your connection and try again — nothing was sent.",
      canRetry: true,
      isOurFault: false,
    };
  }

  if (err instanceof NetworkError || isFetchFailure(err)) {
    return {
      kind: "unreachable",
      title: "Can't reach Oshap",
      message: `The server didn't respond${doing}. It may be a moment's outage — try again, and tell your Oshap contact if it keeps happening.`,
      canRetry: true,
      isOurFault: true,
    };
  }

  if (!(err instanceof ApiError)) {
    return {
      kind: "unknown",
      title: "Something went wrong",
      message: err instanceof Error && !isUseless(err.message)
        ? err.message
        : `An unexpected problem stopped this${doing}.`,
      canRetry: true,
      isOurFault: true,
    };
  }

  const { status } = err;
  const server = isUseless(err.message) ? null : err.message;

  if (status === 401) {
    return {
      kind: "unauthenticated",
      title: "Signed out",
      message: "Your session has ended. Sign in again to continue.",
      canRetry: false,
      isOurFault: false,
      status,
    };
  }

  if (status === 403) {
    /**
     * Two very different refusals share this status: the plan does not include
     * something, or this person's role does not allow it. The title used to
     * assume the first, so a waiter refused the kitchen board by role read
     * **"Not available on this plan"** over the server's own words,
     * *"Insufficient permissions"* — a heading and a message contradicting each
     * other, and an owner sent to check their subscription over a staff
     * permission.
     *
     * Only claim the plan when the server says something plan-shaped.
     */
    const aboutThePlan = PLAN_WORDS.some((word) =>
      (server ?? "").toLowerCase().includes(word),
    );
    return {
      kind: "forbidden",
      title: aboutThePlan ? "Not available on this plan" : "You can't open this",
      message:
        server ??
        "This feature isn't included in your current plan, or your role doesn't allow it.",
      canRetry: false,
      isOurFault: false,
      status,
    };
  }

  if (status === 404) {
    return {
      kind: "notFound",
      title: "Not found",
      message: server ?? `That no longer exists${doing}.`,
      canRetry: false,
      isOurFault: false,
      status,
    };
  }

  if (status === 409) {
    return {
      kind: "conflict",
      title: "Already exists",
      message: server ?? "Something with those details is already saved.",
      canRetry: false,
      isOurFault: false,
      status,
    };
  }

  if (status === 422 || status === 400) {
    // client.ts already folds the offending field name into the message for a
    // 422, which is the most useful sentence available here.
    return {
      kind: "invalid",
      title: "Check the details",
      message: server ?? "Some of what was entered isn't valid.",
      canRetry: false,
      isOurFault: false,
      status,
    };
  }

  if (status === 429) {
    return {
      kind: "server",
      title: "Slow down a moment",
      message: "Too many requests in a row. Wait a few seconds and try again.",
      canRetry: true,
      isOurFault: false,
      status,
    };
  }

  if (status >= 500) {
    return {
      kind: "server",
      title: "Server problem",
      message: `The server failed${doing}. This isn't something you did — nothing may have been saved. Try again, and report it if it persists.`,
      canRetry: true,
      isOurFault: true,
      status,
    };
  }

  return {
    kind: "unknown",
    title: "Something went wrong",
    message: server ?? `That didn't work${doing}.`,
    canRetry: true,
    isOurFault: true,
    status,
  };
}

/**
 * A browser reports a blocked or failed request as a bare TypeError, with no
 * status and a message that varies by engine. CORS rejections arrive this way
 * too, which is why "can't reach the server" has to cover both.
 */
function isFetchFailure(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("load failed") ||
    m.includes("connection")
  );
}

/** One line for a toast. Title and message read as a sentence together. */
export function errorMessage(err: unknown, action?: string): string {
  const d = describeError(err, action);
  return d.kind === "invalid" || d.kind === "conflict" || d.kind === "forbidden"
    ? d.message
    : `${d.title}. ${d.message}`;
}
