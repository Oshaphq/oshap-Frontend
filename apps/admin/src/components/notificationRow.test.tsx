import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { Notification } from "@oshap/shared";
import { NotificationRow } from "./NotificationBell";

/**
 * A claimed row is still a row.
 *
 * It used to fade to 60% and swap its type icon for a generic tick, which
 * turned a Saturday's history into a column of ghosts — and threw away the one
 * thing that makes the page scannable, since the icon says what *kind* of
 * thing happened, not whether it is finished.
 */
const row = (over: Partial<Notification> = {}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationRow
          notification={
            {
              id: "n1",
              type: "waiter_called",
              created_at: "2026-08-27T10:00:00Z",
              is_unread: false,
              ...over,
            } as Notification
          }
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("NotificationRow", () => {
  it("keeps its surface when claimed", () => {
    const claimed = row({ resolved_at: "2026-08-27T10:05:00Z" });
    expect(claimed).toContain("bg-surface-container");
    expect(claimed).not.toContain("opacity-60");
  });

  it("keeps its type icon when claimed", () => {
    // A waiter call stays a waiter call after somebody goes.
    const claimed = row({ resolved_at: "2026-08-27T10:05:00Z" });
    expect(claimed).toContain("mgc_service_line");
    expect(claimed).not.toContain("mgc_check_circle_line");
  });

  it("says who went, which is where done-ness lives now", () => {
    expect(
      row({ resolved_at: "2026-08-27T10:05:00Z", resolved_by_name: "Tunde" }),
    ).toContain("Tunde went");
    expect(row({ resolved_at: "2026-08-27T10:05:00Z" })).toContain("Claimed");
  });

  it("offers the claim only while it is unclaimed", () => {
    expect(row()).toContain("I&#x27;ll go");
    expect(row({ resolved_at: "2026-08-27T10:05:00Z" })).not.toContain(
      "I&#x27;ll go",
    );
  });

  it("colours the icon by type, not by state", () => {
    // Money is warning, food is success, a call is primary.
    expect(row({ type: "payment_claimed" })).toContain("text-warning");
    expect(row({ type: "order_ready" })).toContain("text-success");
    expect(row()).toContain("text-primary-label");
  });

  it("centres its row rather than hanging the icon off the top", () => {
    expect(row()).toContain("items-center");
  });
});
