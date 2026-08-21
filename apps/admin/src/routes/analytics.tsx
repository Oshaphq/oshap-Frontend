import { useState } from "react";
import { Link } from "react-router";
import { useAdminAnalytics, useAdminGroup } from "@oshap/shared/hooks";
import { formatCurrency } from "@oshap/shared";
import { PrimaryButton, Select } from "@oshap/shared/ui";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 Days", days: 7 },
  { label: "This Month", days: 30 }, // Approximation for simplicity
  { label: "Year to Date", days: 365 }, // Approximation for simplicity
];

function getFormattedDate(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0]!;
}

// Chart series palette, referenced from the design-token ramp (resolved via
// CSS vars) so charts stay on-brand and follow any future palette change.
const CHART_COLORS = [
  "var(--color-primary)",
  "var(--color-success-40)",
  "var(--color-accent-2-50)",
  "var(--color-warning-50)",
  "var(--color-secondary-50)",
];

export default function Analytics() {
  const [startDate, setStartDate] = useState(getFormattedDate(7));
  const [endDate, setEndDate] = useState(getFormattedDate(0));

  const { data: group } = useAdminGroup();
  const showGroupLink = !!group && group.branches && group.branches.length > 1;
  const { data, isLoading, error } = useAdminAnalytics(startDate, endDate);

  const handleExportCSV = () => {
    if (!data) return;

    // Create a simple CSV representation of the summary and table performance
    const rows = [
      ["Analytics Export", `${startDate} to ${endDate}`],
      [],
      ["Summary"],
      ["Total Revenue", data.summary.total_revenue],
      ["Total Orders", data.summary.total_orders],
      ["Avg Order Value", data.summary.avg_order_value],
      [],
      ["Table Performance"],
      ["Table ID", "Orders", "Revenue"],
      ...data.table_performance.map((t) => [t.table_id, t.order_count, t.revenue]),
    ];

    // Escape per RFC 4180: wrap cells containing comma/quote/newline in quotes
    // and double any embedded quotes (item/table names can contain commas).
    const escapeCell = (cell: string | number) => {
      const s = String(cell);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvContent = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics_${startDate}_to_${endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="p-md flex flex-col gap-l">
      <header className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        {/* Title + secondary link stacked */}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Analytics Dashboard
          </h1>
          {showGroupLink && (
            <Link
              to="/analytics/group"
              className="text-caption-md font-semibold text-primary hover:underline no-underline self-start"
            >
              Group View →
            </Link>
          )}
        </div>

        {/* Controls — two rows: date range | preset + export */}
        <div className="flex flex-col gap-s sm:items-end">
          <div className="flex items-center gap-s flex-wrap">
            <input
              type="date"
              aria-label="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-s py-s rounded-md bg-surface-container-low border border-outline-variant text-p2 text-primary-text outline-none focus:border-primary"
            />
            <span className="text-secondary-text shrink-0">to</span>
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-s py-s rounded-md bg-surface-container-low border border-outline-variant text-p2 text-primary-text outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-s">
              <Select
                aria-label="Date range preset"
                onChange={(e) => {
                  const days = parseInt(e.target.value, 10);
                  if (isNaN(days)) return;
                  if (days === 30) {
                    const d = new Date();
                    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]!);
                  } else if (days === 365) {
                    const d = new Date();
                    setStartDate(new Date(d.getFullYear(), 0, 1).toISOString().split("T")[0]!);
                  } else {
                    setStartDate(getFormattedDate(days));
                  }
                  setEndDate(getFormattedDate(0));
                }}
              >
                <option value="">Custom Range...</option>
                {PRESETS.map((p) => (
                  <option key={p.label} value={p.days}>
                    {p.label}
                  </option>
                ))}
              </Select>

            <PrimaryButton size="md" onClick={handleExportCSV} disabled={!data}>
              Export CSV
            </PrimaryButton>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="flex justify-center p-xl">
          <div className="oshap-spinner" />
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container p-md rounded-md">
          Failed to load analytics data.
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-l">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="bg-surface-container-low rounded-md p-md border border-transparent">
              <h3 className="text-label-l4 font-semibold text-secondary-text mb-xs">
                Total Revenue
              </h3>
              <p className="text-display-h2 font-display font-semibold text-primary-text">
                {formatCurrency(data.summary.total_revenue)}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-md p-md border border-transparent">
              <h3 className="text-label-l4 font-semibold text-secondary-text mb-xs">
                Total Orders
              </h3>
              <p className="text-display-h2 font-display font-semibold text-primary-text">
                {data.summary.total_orders.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-md p-md border border-transparent">
              <h3 className="text-label-l4 font-semibold text-secondary-text mb-xs">
                Avg Order Value
              </h3>
              <p className="text-display-h2 font-display font-semibold text-primary-text">
                {formatCurrency(data.summary.avg_order_value)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {/* Revenue Over Time Chart */}
            <div className="bg-surface-container-low rounded-md p-md border border-transparent flex flex-col">
              <h3 className="text-label-l2 font-semibold text-primary-text mb-md">
                Revenue Over Time
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenue_over_time}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-container-highest)" />
                    <XAxis dataKey="date" stroke="var(--color-outline)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--color-outline)" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Popular Items Chart */}
            <div className="bg-surface-container-low rounded-md p-md border border-transparent flex flex-col">
              <h3 className="text-label-l2 font-semibold text-primary-text mb-md">
                Popular Items
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.popular_items}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {data.popular_items.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Hours Chart */}
            <div className="bg-surface-container-low rounded-md p-md border border-transparent flex flex-col">
              <h3 className="text-label-l2 font-semibold text-primary-text mb-md">
                Peak Hours (Orders)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.peak_hours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-container-highest)" />
                    <XAxis dataKey="hour" stroke="var(--color-outline)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--color-outline)" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="order_count" stroke="var(--color-accent-2-50)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table Performance */}
            <div className="bg-surface-container-low rounded-md p-md border border-transparent flex flex-col">
              <h3 className="text-label-l2 font-semibold text-primary-text mb-md">
                Table Performance
              </h3>
              <div className="h-[300px] w-full overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high border-b border-surface-container-highest">
                      <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">Table</th>
                      <th className="py-s px-md text-label-l4 font-semibold text-secondary-text text-right">Orders</th>
                      <th className="py-s px-md text-label-l4 font-semibold text-secondary-text text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.table_performance.map((row, idx) => (
                      <tr key={idx} className="border-b border-surface-container-highest last:border-none hover:bg-surface-container-low transition-colors">
                        <td className="py-s px-md text-p2 text-primary-text font-medium">{row.table_id}</td>
                        <td className="py-s px-md text-p2 text-primary-text text-right">{row.order_count}</td>
                        <td className="py-s px-md text-p2 text-primary-text text-right">{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
