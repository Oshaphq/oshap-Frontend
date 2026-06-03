import { useState } from "react";
import { useAdminAnalytics } from "@oshap/shared/hooks";
import { PrimaryButton } from "@oshap/shared/ui";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
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
  return d.toISOString().split("T")[0];
}

const COLORS = ["#FF5722", "#4CAF50", "#2196F3", "#9C27B0", "#FFC107"];

export default function Analytics() {
  const [startDate, setStartDate] = useState(getFormattedDate(7));
  const [endDate, setEndDate] = useState(getFormattedDate(0));

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

    const csvContent = rows.map((e) => e.join(",")).join("\n");
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
      <header className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Analytics Dashboard
        </h1>

        <div className="flex flex-col gap-md sm:flex-row sm:items-center">
          <div className="flex items-center gap-md">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-md py-s rounded-md bg-surface-container border-[1.5px] border-outline-variant text-p2 text-primary-text outline-none focus:border-primary"
            />
            <span className="text-secondary-text">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-md py-s rounded-md bg-surface-container border-[1.5px] border-outline-variant text-p2 text-primary-text outline-none focus:border-primary"
            />
          </div>

          <div className="relative">
            <select
              className="px-md py-s rounded-md bg-surface-container border-[1.5px] border-outline-variant text-p2 text-primary-text outline-none focus:border-primary appearance-none pr-10"
              onChange={(e) => {
                const days = parseInt(e.target.value, 10);
                if (isNaN(days)) return;
                if (days === 30) {
                  // This Month
                  const d = new Date();
                  setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]);
                } else if (days === 365) {
                  // Year to date
                  const d = new Date();
                  setStartDate(new Date(d.getFullYear(), 0, 1).toISOString().split("T")[0]);
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
            </select>
            <i
              className="mgc_down_line absolute right-md top-1/2 -translate-y-1/2 text-outline pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <PrimaryButton size="md" onClick={handleExportCSV} disabled={!data}>
            Export CSV
          </PrimaryButton>
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
            <div className="bg-surface-container rounded-md p-md border-[1.5px] border-transparent">
              <h3 className="text-label-l4 font-semibold text-secondary-text mb-xs">
                Total Revenue
              </h3>
              <p className="text-display-h2 font-display font-semibold text-primary-text">
                ₦{data.summary.total_revenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface-container rounded-md p-md border-[1.5px] border-transparent">
              <h3 className="text-label-l4 font-semibold text-secondary-text mb-xs">
                Total Orders
              </h3>
              <p className="text-display-h2 font-display font-semibold text-primary-text">
                {data.summary.total_orders.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface-container rounded-md p-md border-[1.5px] border-transparent">
              <h3 className="text-label-l4 font-semibold text-secondary-text mb-xs">
                Avg Order Value
              </h3>
              <p className="text-display-h2 font-display font-semibold text-primary-text">
                ₦{data.summary.avg_order_value.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {/* Revenue Over Time Chart */}
            <div className="bg-surface-container rounded-md p-md border-[1.5px] border-transparent flex flex-col">
              <h3 className="text-label-l2 font-semibold text-primary-text mb-md">
                Revenue Over Time
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenue_over_time}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#FF5722"
                      fill="#FF5722"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Popular Items Chart */}
            <div className="bg-surface-container rounded-md p-md border-[1.5px] border-transparent flex flex-col">
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
                      {data.popular_items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Hours Chart */}
            <div className="bg-surface-container rounded-md p-md border-[1.5px] border-transparent flex flex-col">
              <h3 className="text-label-l2 font-semibold text-primary-text mb-md">
                Peak Hours (Orders)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.peak_hours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="hour" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Line type="monotone" dataKey="order_count" stroke="#2196F3" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table Performance */}
            <div className="bg-surface-container rounded-md p-md border-[1.5px] border-transparent flex flex-col">
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
                        <td className="py-s px-md text-p2 text-primary-text text-right">₦{row.revenue.toLocaleString()}</td>
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
