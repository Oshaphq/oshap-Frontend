import { useAdminInventoryAlerts } from "@oshap/shared";

export default function LowStockBanner() {
  const alertsQuery = useAdminInventoryAlerts();
  const alerts = alertsQuery.data?.alerts ?? [];

  if (!alerts.length) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-s p-md rounded-lg bg-warning-container text-on-warning-container border border-warning animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <i className="mgc_alert_line text-xl shrink-0 mt-0.5" />
      <div className="flex flex-col gap-xs flex-1 min-w-0">
        <span className="text-label-l4 font-bold font-display">
          {alerts.length} item{alerts.length > 1 ? "s" : ""} running low on stock
        </span>
        <ul className="flex flex-wrap gap-s">
          {alerts.map((a) => (
            <li
              key={a.item_id}
              className="flex items-center gap-xs bg-warning/20 rounded-md px-s py-xs text-caption-sm font-semibold"
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
    </div>
  );
}
