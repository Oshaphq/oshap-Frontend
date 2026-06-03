import { Link } from "react-router";
import {
  useAdminGroup,
  useAdminGroupAnalytics,
  formatCurrency,
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading group analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
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
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Group Analytics
          </h1>
          <p className="text-p2 text-secondary-text">{group.name}</p>
        </div>
        <Link
          to="/analytics"
          className="text-caption-md font-semibold text-primary hover:underline no-underline"
        >
          ← Single Branch View
        </Link>
      </header>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Total Revenue
          </span>
          <span className="font-display text-display-h2 font-semibold text-primary-text">
            {formatCurrency(analytics.total_revenue)}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Total Orders
          </span>
          <span className="font-display text-display-h2 font-semibold text-primary-text">
            {analytics.total_orders.toLocaleString()}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-md p-md flex flex-col gap-xs">
          <span className="text-label-l4 font-semibold text-secondary-text uppercase tracking-wider">
            Branches
          </span>
          <span className="font-display text-display-h2 font-semibold text-primary-text">
            {group.branches.length}
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-surface-container-low rounded-md p-md">
        <h2 className="text-label-l2 font-semibold text-primary-text mb-md">
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
                tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
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
      </div>

      {/* Per-branch breakdown */}
      <div className="flex flex-col gap-md">
        <h2 className="text-label-l2 font-semibold text-primary-text">
          Branch Breakdown
        </h2>
        {analytics.branches.map((branch) => {
          const meta = group.branches.find((b) => b.id === branch.branch_id);
          const share = (branch.total_revenue / maxRevenue) * 100;
          return (
            <div
              key={branch.branch_id}
              className="bg-surface-container-low rounded-md p-md flex flex-col gap-s"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-s">
                  <span className="font-bold text-primary-text">
                    {branch.branch_name}
                  </span>
                  <span
                    className={`px-s py-xs rounded-4xl text-caption-xs font-bold uppercase tracking-wider ${
                      meta?.is_active
                        ? "bg-success-container text-on-success-container"
                        : "bg-surface-container-high text-outline"
                    }`}
                  >
                    {meta?.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <span className="text-caption-md font-semibold text-secondary-text">
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
                <span className="text-caption-md font-bold text-primary-text shrink-0 min-w-[80px] text-right">
                  {formatCurrency(branch.total_revenue)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-l text-caption-sm text-secondary-text">
                <span>
                  Avg order:{" "}
                  <strong className="text-primary-text">
                    {formatCurrency(branch.avg_order_value)}
                  </strong>
                </span>
                {meta && (
                  <span>
                    {meta.table_count} tables · {meta.staff_count} staff
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
