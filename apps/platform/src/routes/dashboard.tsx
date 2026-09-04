import { Link } from "react-router";
import {
  Card,
  Page,
  QueryError,
} from "@oshap/shared/ui";
import { monthlyRecurringKobo } from "../tiers";
import {
  usePlatformRestaurants,
  usePlatformHealth,
  formatCurrency,
} from "@oshap/shared";

export default function DashboardPage() {
  const restaurantsQuery = usePlatformRestaurants();
  const healthQuery = usePlatformHealth();

  const restaurants = restaurantsQuery.data?.restaurants ?? [];
  const health = healthQuery.data;

  const active = restaurants.filter((r) => r.is_active).length;
  const mrr = monthlyRecurringKobo(restaurants);

  return (
    <Page width="wide" gap="l">
      <header>
        <h1 className="font-display text-title-large font-semibold text-on-surface">
          Platform Overview
        </h1>
        <p className="text-body-medium text-on-surface-variant">Internal Oshap operator dashboard</p>
      </header>

      {/* A failed query must never render as a real figure. Zero restaurants
          and "we could not ask" are different facts, and the tiles cannot tell
          them apart on their own. */}
      {restaurantsQuery.isError && (
        <QueryError
          error={restaurantsQuery.error}
          action="load the restaurants"
          onRetry={() => restaurantsQuery.refetch()}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <Card gap="xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Total Restaurants
          </span>
          <span className="font-display text-title-large font-semibold text-on-surface">
            {restaurantsQuery.isLoading || restaurantsQuery.isError ? "—" : restaurants.length}
          </span>
        </Card>
        <Card gap="xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Active
          </span>
          <span className="font-display text-title-large font-semibold text-success">
            {restaurantsQuery.isLoading || restaurantsQuery.isError ? "—" : active}
          </span>
        </Card>
        <Card gap="xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Est. MRR
          </span>
          <span className="font-display text-title-large font-semibold text-on-surface">
            {restaurantsQuery.isLoading || restaurantsQuery.isError ? "—" : formatCurrency(mrr)}
          </span>
        </Card>
        <div
          className={`rounded-lg p-md flex flex-col gap-xs border ${
            health && health.error_rate_pct < 1
              ? "bg-success-container border-success"
              : "bg-error-container border-error"
          }`}
        >
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            API Health
          </span>
          <span className="font-display text-title-large font-semibold text-on-surface">
            {healthQuery.isLoading
              ? "—"
              : health
              ? `${health.api_uptime_pct}%`
              : "N/A"}
          </span>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <Link
          to="/restaurants/new"
          className="bg-primary text-on-primary rounded-lg p-md flex items-center gap-md no-underline hover:opacity-90 transition-opacity"
        >
          <i className="mgc_add_circle_line text-2xl" />
          <div>
            <p className="font-bold font-display text-body-large">Onboard Restaurant</p>
            <p className="text-body-small opacity-80">Create new account</p>
          </div>
        </Link>
        <Link
          to="/restaurants"
          className="bg-surface-container-low text-on-surface rounded-lg p-md flex items-center gap-md no-underline hover:bg-surface-container-high transition-colors border border-transparent hover:border-outline-variant"
        >
          <i className="mgc_fork_spoon_line text-2xl text-primary-label" />
          <div>
            <p className="font-bold font-display text-body-large">Manage Restaurants</p>
            <p className="text-body-small text-on-surface-variant">View & edit all accounts</p>
          </div>
        </Link>
        <Link
          to="/health"
          className="bg-surface-container-low text-on-surface rounded-lg p-md flex items-center gap-md no-underline hover:bg-surface-container-high transition-colors border border-transparent hover:border-outline-variant"
        >
          <i className="mgc_heartbeat_line text-2xl text-primary-label" />
          <div>
            <p className="font-bold font-display text-body-large">System Health</p>
            <p className="text-body-small text-on-surface-variant">Uptime &amp; error rates</p>
          </div>
        </Link>
      </div>

      {/* Recent restaurants */}
      {restaurants.length > 0 && (
        <div className="flex flex-col gap-md">
          <h2 className="text-title-large font-semibold text-on-surface">
            Recently Onboarded
          </h2>
          <div className="flex flex-col gap-s">
            {[...restaurants]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 5)
              .map((r) => (
                <Link
                  key={r.id}
                  to={`/restaurants/${r.id}`}
                  className="bg-surface-container-low rounded-lg p-md flex items-center justify-between gap-md no-underline hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex items-center gap-md min-w-0">
                    <div className="w-10 h-10 rounded-sm bg-primary-container flex items-center justify-center shrink-0">
                      <i className="mgc_fork_spoon_line text-on-primary-container" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface truncate">
                        {r.name}
                      </p>
                      <p className="text-body-small text-on-surface-variant">
                        {r.owner_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-s shrink-0">
                    <span
                      className={`px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider ${
                        r.subscription_tier === "PRO" || r.subscription_tier === "ENTERPRISE"
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {r.subscription_tier}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        r.is_active ? "bg-success" : "bg-error"
                      }`}
                    />
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </Page>
  );
}
