import { usePlatformHealth } from "@oshap/shared";
import {
  Card,
  QueryError,
  Spinner,
  Page,
} from "@oshap/shared/ui";

function Metric({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string | number;
  unit?: string;
  status?: "ok" | "warn" | "error";
}) {
  const statusCls =
    status === "error"
      ? "bg-error-container border-error text-on-error-container"
      : status === "warn"
      ? "bg-warning-container border-warning text-on-warning-container"
      : "bg-surface-container-low border-transparent";

  return (
    <div className={`rounded-lg p-md flex flex-col gap-xs border ${statusCls}`}>
      <span className="text-label-large font-semibold uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="font-display text-title-medium font-semibold">
        {value}
        {unit && (
          <span className="text-label-large font-normal opacity-60 ml-xs">{unit}</span>
        )}
      </span>
    </div>
  );
}

export default function HealthPage() {
  const query = usePlatformHealth();
  const h = query.data;

  const uptimeStatus =
    !h ? undefined : h.api_uptime_pct >= 99.5 ? "ok" : h.api_uptime_pct >= 98 ? "warn" : "error";
  const errorStatus =
    !h ? undefined : h.error_rate_pct < 1 ? "ok" : h.error_rate_pct < 3 ? "warn" : "error";
  const latencyStatus =
    !h ? undefined : h.avg_response_ms < 200 ? "ok" : h.avg_response_ms < 500 ? "warn" : "error";

  return (
    <Page width="wide" gap="l">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-title-large font-semibold text-on-surface">
            System Health
          </h1>
          <p className="text-body-medium text-on-surface-variant">Live mock metrics — refreshes every 30 s</p>
        </div>
        {h && (
          <div
            className={`flex items-center gap-s px-md py-s rounded-2xl font-bold text-body-medium ${
              uptimeStatus === "ok" && errorStatus === "ok"
                ? "bg-success-container text-on-success-container"
                : "bg-warning-container text-on-warning-container"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                uptimeStatus === "ok" && errorStatus === "ok" ? "bg-success" : "bg-warning"
              }`}
            />
            {uptimeStatus === "ok" && errorStatus === "ok" ? "All Systems Operational" : "Degraded"}
          </div>
        )}
      </header>

      {query.isError && <QueryError
          error={query.error}
          action="load system health"
          onRetry={() => query.refetch()}
        />}

      {query.isLoading && (
        <div className="flex justify-center py-xl">
          <Spinner />
        </div>
      )}

      {h && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-md">
            <Metric
              label="API Uptime"
              value={`${h.api_uptime_pct}%`}
              status={uptimeStatus}
            />
            <Metric
              label="Avg Response"
              value={h.avg_response_ms}
              unit="ms"
              status={latencyStatus}
            />
            <Metric
              label="Error Rate"
              value={`${h.error_rate_pct}%`}
              status={errorStatus}
            />
            <Metric
              label="Active Sessions"
              value={h.active_sessions}
              status="ok"
            />
            <Metric
              label="Restaurants"
              value={h.total_restaurants}
              status="ok"
            />
            <Metric
              label="Orders Today"
              value={h.total_orders_today}
              status="ok"
            />
          </div>

          <Card gap="s">
            <h2 className="text-title-large font-semibold text-on-surface">Thresholds</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md text-body-small text-on-surface-variant">
              <div>
                <p className="font-semibold text-on-surface mb-xs">Uptime</p>
                <p><span className="text-success font-bold">≥ 99.5%</span> — Healthy</p>
                <p><span className="text-warning font-bold">≥ 98%</span> — Degraded</p>
                <p><span className="text-error font-bold">&lt; 98%</span> — Critical</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface mb-xs">Response Time</p>
                <p><span className="text-success font-bold">&lt; 200 ms</span> — Fast</p>
                <p><span className="text-warning font-bold">&lt; 500 ms</span> — Slow</p>
                <p><span className="text-error font-bold">≥ 500 ms</span> — Critical</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface mb-xs">Error Rate</p>
                <p><span className="text-success font-bold">&lt; 1%</span> — Normal</p>
                <p><span className="text-warning font-bold">&lt; 3%</span> — Elevated</p>
                <p><span className="text-error font-bold">≥ 3%</span> — Critical</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}
