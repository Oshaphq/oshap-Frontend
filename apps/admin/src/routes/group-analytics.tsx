import { Link } from "react-router";
import { Card } from "@oshap/shared/ui";
import {
  useAdminGroup,
  useAdminGroupAnalytics,
  formatCurrency,
  koboToNaira,
} from "@oshap/shared";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import QueryError from "../components/QueryError";

export default function GroupAnalyticsPage() {
  const groupQuery = useAdminGroup();
  const analyticsQuery = useAdminGroupAnalytics();

  const isLoading = groupQuery.isLoading || analyticsQuery.isLoading;
  const isError = groupQuery.isError || analyticsQuery.isError;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-on-surface-variant">
        <div className="oshap-spinner" />
        <p>Loading group analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        error={groupQuery.error ?? analyticsQuery.error}
        action="load the group figures"
        onRetry={() => {
          groupQuery.refetch();
          analyticsQuery.refetch();
        }}
      />
    );
  }

  const group = groupQuery.data;
  const analytics = analyticsQuery.data;
  if (!group || !analytics) return null;

  const maxRevenue = Math.max(...analytics.branches.map((b) => b.total_revenue), 1);

  return (
    <main className="p-md flex flex-col gap-l">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-title-large font-semibold text-on-surface">
            Group Analytics
          </h1>
          <p className="text-body-medium text-on-surface-variant">{group.name}</p>
        </div>
        <Link
          to="/analytics"
          className="text-body-medium font-semibold text-primary-label hover:underline no-underline"
        >
          ← Single Branch View
        </Link>
      </header>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <Card gap="xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Total Revenue
          </span>
          <span className="font-display text-title-large font-semibold text-on-surface">
            {formatCurrency(analytics.total_revenue)}
          </span>
        </Card>
        <Card gap="xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Total Orders
          </span>
          <span className="font-display text-title-large font-semibold text-on-surface">
            {analytics.total_orders.toLocaleString()}
          </span>
        </Card>
        <Card gap="xs">
          <span className="text-label-large font-semibold text-on-surface-variant uppercase tracking-wider">
            Branches
          </span>
          <span className="font-display text-title-large font-semibold text-on-surface">
            {group.branches.length}
          </span>
        </Card>
      </div>

      {/* Bar chart */}
      <Card>
        <h2 className="text-title-large font-semibold text-on-surface mb-md">
          Revenue by Branch
        </h2>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analytics.branches}
              margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--ds-outline-variant)"
              />
              <XAxis
                dataKey="branch_name"
                stroke="var(--ds-outline)"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="var(--ds-outline)"
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `₦${(koboToNaira(v) / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(Number(v ?? 0)), "Revenue"]}
              />
              <Bar
                dataKey="total_revenue"
                fill="var(--ds-primary)"
                radius={[4, 4, 0, 0]}
                name="Revenue"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Per-branch breakdown */}
      <div className="flex flex-col gap-md">
        <h2 className="text-title-large font-semibold text-on-surface">
          Branch Breakdown
        </h2>
        {analytics.branches.map((branch) => {
          const meta = group.branches.find((b) => b.id === branch.branch_id);
          const share = (branch.total_revenue / maxRevenue) * 100;
          return (
            <Card key={branch.branch_id} gap="s">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-s">
                  <span className="font-bold text-on-surface">
                    {branch.branch_name}
                  </span>
                  <span
                    className={`px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider ${
                      meta?.is_active
                        ? "bg-success-container text-on-success-container"
                        : "bg-surface-container-high text-outline"
                    }`}
                  >
                    {meta?.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <span className="text-body-medium font-semibold text-on-surface-variant">
                  {branch.total_orders} orders
                </span>
              </div>

              <div className="flex items-center gap-md">
                <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <span className="text-body-medium font-bold text-on-surface shrink-0 min-w-[80px] text-right">
                  {formatCurrency(branch.total_revenue)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-l text-body-small text-on-surface-variant">
                <span>
                  Avg order:{" "}
                  <strong className="text-on-surface">
                    {formatCurrency(branch.avg_order_value)}
                  </strong>
                </span>
                {meta && (
                  <span>
                    {meta.table_count} tables · {meta.staff_count} staff
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
