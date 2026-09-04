import { useState } from "react";
import { Link } from "react-router";
import { useAdminAnalytics, useAdminGroup } from "@oshap/shared/hooks";
import { formatCurrency } from "@oshap/shared";
import {
  DataTable,
  PrimaryButton,
  Select,
  Spinner,
  Page,
} from "@oshap/shared/ui";
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
//
// The third entry was --color-accent-2-50 until DS v3 removed the accent
// palettes; it resolved to nothing, which is invisible in CSS and drew an
// unstroked line. v3 has no wide-hue categorical set — primary, secondary,
// tertiary and warning are all within 60 degrees of the seed — so these five
// separate mostly by tone. A chart needing more series than this needs its own
// scale, not more design-system roles.
const CHART_COLORS = [
  "var(--color-primary)",
  "var(--color-success-40)",
  "var(--color-tertiary-50)",
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
    <Page width="wide" gap="l">
      <header className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        {/* Title + secondary link stacked */}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-title-large font-semibold text-on-surface">
            Analytics Dashboard
          </h1>
          {showGroupLink && (
            <Link
              to="/analytics/group"
              className="text-body-medium font-semibold text-primary-label hover:underline no-underline self-start"
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
              className="px-s py-s rounded-lg bg-surface-container-low border border-outline-variant text-body-medium text-on-surface outline-none focus:border-primary"
            />
            <span className="text-on-surface-variant shrink-0">to</span>
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-s py-s rounded-lg bg-surface-container-low border border-outline-variant text-body-medium text-on-surface outline-none focus:border-primary"
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
          <Spinner />
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container p-md rounded-lg">
          Failed to load analytics data.
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-l">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="bg-surface-container-low rounded-lg p-md border border-transparent">
              <h3 className="text-label-large font-semibold text-on-surface-variant mb-xs">
                Total Revenue
              </h3>
              <p className="text-title-large font-display font-semibold text-on-surface">
                {formatCurrency(data.summary.total_revenue)}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-md border border-transparent">
              <h3 className="text-label-large font-semibold text-on-surface-variant mb-xs">
                Total Orders
              </h3>
              <p className="text-title-large font-display font-semibold text-on-surface">
                {data.summary.total_orders.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-md border border-transparent">
              <h3 className="text-label-large font-semibold text-on-surface-variant mb-xs">
                Avg Order Value
              </h3>
              <p className="text-title-large font-display font-semibold text-on-surface">
                {formatCurrency(data.summary.avg_order_value)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {/* Revenue Over Time Chart */}
            <div className="bg-surface-container-low rounded-lg p-md border border-transparent flex flex-col">
              <h3 className="text-title-large font-semibold text-on-surface mb-md">
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
            <div className="bg-surface-container-low rounded-lg p-md border border-transparent flex flex-col">
              <h3 className="text-title-large font-semibold text-on-surface mb-md">
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
            <div className="bg-surface-container-low rounded-lg p-md border border-transparent flex flex-col">
              <h3 className="text-title-large font-semibold text-on-surface mb-md">
                Peak Hours (Orders)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.peak_hours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-container-highest)" />
                    <XAxis dataKey="hour" stroke="var(--color-outline)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--color-outline)" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="order_count" stroke="var(--color-tertiary-50)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table Performance */}
            <div className="bg-surface-container-low rounded-lg p-md border border-transparent flex flex-col">
              <h3 className="text-title-large font-semibold text-on-surface mb-md">
                Table Performance
              </h3>
              <div className="h-[300px] w-full overflow-y-auto">
                {/* Scrolls inside its own box. Four or five columns of names and
                    money cannot usefully collapse, and without this the whole
                    page slides sideways on a phone. */}
                <DataTable
                  caption="Orders and revenue by table"
                  className="-mx-md"
                  minWidth="min-w-[32rem]"
                  rows={data.table_performance}
                  rowKey={(_, idx) => String(idx)}
                  columns={[
                    {
                      header: "Table",
                      cellClassName: "text-body-medium text-on-surface font-medium",
                      cell: (row) => row.table_id,
                    },
                    {
                      header: "Orders",
                      align: "right",
                      cellClassName: "text-body-medium text-on-surface",
                      cell: (row) => row.order_count,
                    },
                    {
                      header: "Revenue",
                      align: "right",
                      cellClassName: "text-body-medium text-on-surface",
                      cell: (row) => formatCurrency(row.revenue),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
