import { describe, it, expect } from "vitest";
import { menuQueryOptions } from "./useMenu";

/**
 * `GET /menu` with no `restaurant_id` answers 200 with every tenant's items —
 * 109 dishes across 25 restaurants, measured against production. This hook
 * used to fire exactly that call on every scan, because nothing stopped it
 * running before the table said which restaurant the guest was sitting in.
 *
 * Two costs: a wasted round trip on an API that takes 1.5s to answer, and a
 * window where a guest could be shown another restaurant's food at another
 * restaurant's prices. The endpoint should refuse an unscoped read; this makes
 * sure we never ask.
 */
describe("the menu is never requested unscoped", () => {
  it.each([undefined, ""])("stays disabled when the restaurant is %o", (id) => {
    expect(menuQueryOptions(id).enabled).toBe(false);
  });

  it("runs once the restaurant is known", () => {
    expect(menuQueryOptions("rest-001").enabled).toBe(true);
  });

  it("keys the cache by restaurant, so two venues never share a menu", () => {
    // One device can scan codes in two restaurants. A shared key would serve
    // the first venue's menu at the second.
    expect(menuQueryOptions("rest-001").queryKey).not.toEqual(
      menuQueryOptions("rest-002").queryKey,
    );
  });
});

describe("polling", () => {
  it("checks about once a minute, not six times", () => {
    // Availability is the only thing that moves often, and a minute is soon
    // enough to stop an order for a dish that just sold out.
    expect(menuQueryOptions("rest-001").refetchInterval).toBe(60000);
  });

  it("can be turned off where a caller does not want it", () => {
    expect(menuQueryOptions("rest-001", false).refetchInterval).toBe(false);
  });
});
