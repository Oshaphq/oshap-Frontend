import {
  useAdminKitchen,
  useAdminUpdateKitchenStatus,
  formatCurrency,
} from "@oshap/shared";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function stripRef(ref: string) {
  return ref.split("-").pop() || ref;
}

export default function KitchenPage() {
  const kitchenQuery = useAdminKitchen(5000);
  const updateStatus = useAdminUpdateKitchenStatus();

  const handleUpdateStatus = async (orderId: string, newStatus: "PREPARING" | "READY") => {
    await updateStatus.mutateAsync({
      order_id: orderId,
      status: newStatus,
    });
  };

  if (kitchenQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading orders...</p>
      </div>
    );
  }

  const orders = kitchenQuery.data ?? [];
  const newOrders = orders.filter((o) => o.status === "CREATED");
  const inProgress = orders.filter((o) => o.status === "PREPARING");

  return (
    <main className="h-[calc(100vh-56px)] flex flex-col">
      <header className="flex items-center justify-between px-md py-s bg-surface-container border-b border-outline-variant shrink-0">
        <h1 className="text-display-h2 font-bold text-primary-text">
          Kitchen Display
        </h1>
        <div className="flex items-center gap-s">
          <span className="px-s py-0.5 rounded-lg bg-primary-container text-on-primary-container text-caption font-semibold">
            {newOrders.length} new
          </span>
          <span className="px-s py-0.5 rounded-lg bg-warning/20 text-warning text-caption font-semibold">
            {inProgress.length} cooking
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-md">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-md text-secondary-text">
            <i className="mgc_knife_line text-5xl opacity-30" />
            <p className="text-label-l4">No orders yet</p>
            <span className="text-caption">Waiting for new orders...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg h-full">
            <div>
              <h2 className="text-display-h3 font-semibold text-primary-text mb-md flex items-center gap-s">
                <span className="w-2 h-2 rounded-full bg-primary" />
                New
              </h2>
              {newOrders.length === 0 ? (
                <p className="text-secondary-text text-caption">—</p>
              ) : (
                <div className="flex flex-col gap-md">
                  {newOrders.map((order) => {
                    const isUpdating =
                      updateStatus.isPending &&
                      updateStatus.variables?.order_id === order.id;
                    return (
                      <div
                        key={order.id}
                        className="bg-surface-container-low rounded-2xl border border-outline-variant p-lg"
                      >
                        <div className="flex items-center justify-between mb-md">
                          <div className="flex items-center gap-s">
                            <span className="text-label-l4 font-bold text-primary-text">
                              {order.table_id}
                            </span>
                            <span className="text-caption text-secondary-text">
                              {timeAgo(order.created_at)}
                            </span>
                          </div>
                          <span className="text-caption font-mono text-secondary-text">
                            #{stripRef(order.reference)}
                          </span>
                        </div>
                        <ul className="flex flex-col gap-s mb-md">
                          {order.order_items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-s"
                            >
                              <span className="text-label-l5 font-bold text-primary min-w-[2rem]">
                                {item.quantity}x
                              </span>
                              <span className="text-label-l5 text-primary-text">
                                {item.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between">
                          <span className="text-label-l4 font-semibold text-primary-text">
                            {formatCurrency(order.total)}
                          </span>
                          <button
                            className="px-lg py-s rounded-xl bg-primary text-on-primary text-label-l5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                            onClick={() =>
                              handleUpdateStatus(order.id, "PREPARING")
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? "..." : "Start"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-display-h3 font-semibold text-warning mb-md flex items-center gap-s">
                <span className="w-2 h-2 rounded-full bg-warning" />
                Cooking
              </h2>
              {inProgress.length === 0 ? (
                <p className="text-secondary-text text-caption">—</p>
              ) : (
                <div className="flex flex-col gap-md">
                  {inProgress.map((order) => {
                    const isUpdating =
                      updateStatus.isPending &&
                      updateStatus.variables?.order_id === order.id;
                    return (
                      <div
                        key={order.id}
                        className="bg-warning/5 rounded-2xl border border-warning/30 p-lg"
                      >
                        <div className="flex items-center justify-between mb-md">
                          <div className="flex items-center gap-s">
                            <span className="text-label-l4 font-bold text-primary-text">
                              {order.table_id}
                            </span>
                            <span className="text-caption text-secondary-text">
                              {timeAgo(order.created_at)}
                            </span>
                          </div>
                          <span className="text-caption font-mono text-secondary-text">
                            #{stripRef(order.reference)}
                          </span>
                        </div>
                        <ul className="flex flex-col gap-s mb-md">
                          {order.order_items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-s"
                            >
                              <span className="text-label-l5 font-bold text-warning min-w-[2rem]">
                                {item.quantity}x
                              </span>
                              <span className="text-label-l5 text-primary-text">
                                {item.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between">
                          <span className="text-label-l4 font-semibold text-primary-text">
                            {formatCurrency(order.total)}
                          </span>
                          <button
                            className="px-lg py-s rounded-xl bg-success text-white text-label-l5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                            onClick={() =>
                              handleUpdateStatus(order.id, "READY")
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? "..." : "Ready"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
