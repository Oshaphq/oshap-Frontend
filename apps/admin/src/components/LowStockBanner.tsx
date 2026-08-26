import { useAdminInventoryAlerts } from "@oshap/shared";

export default function LowStockBanner() {
  const alertsQuery = useAdminInventoryAlerts();
  const alerts = alertsQuery.data?.alerts ?? [];

  if (!alerts.length) return null;

  return (
    <div
      role="alert"
      className="flex flex-col gap-xs p-md rounded-md bg-warning-container text-on-warning-container border border-warning animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {/* The icon sits on the heading line rather than in a column of its own.
          Held to the left of everything, it took a chunk of width off the chip
          list beneath it — and the chips are the part naming the dishes that
          are about to run out. */}
      <span className="flex items-center gap-s text-label-l4 font-bold font-display">
        <i className="mgc_alert_line text-xl shrink-0" />
        {alerts.length} item{alerts.length > 1 ? "s" : ""} running low on stock
      </span>
      <ul className="flex flex-wrap gap-xs">
        {alerts.map((a) => (
          <li
            key={a.item_id}
            className="flex items-center gap-xs bg-warning/20 rounded-4xl px-s py-0.5 text-caption-xs font-bold"
          >
            <i className="mgc_box_3_line text-sm" />
            {a.name}
            <span className="opacity-70">({a.stock_count} left)</span>
          </li>
        ))}
      </ul>
      <span className="text-caption-xs opacity-75">
        Click the stock badge on any item below to restock.
      </span>
    </div>
  );
}
