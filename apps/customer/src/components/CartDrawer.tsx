import { useNavigate } from "react-router";
import { formatCurrency } from "@oshap/shared";
import { unitPrice, useCart } from "../context/CartContext";
import { useDragToDismiss } from "../hooks/useDragToDismiss";
import { PrimaryButton } from "@oshap/shared/ui";

interface CartDrawerProps {
  tableId: string;
}

export default function CartDrawer({ tableId }: CartDrawerProps) {
  const {
    items,
    totalItems,
    totalPrice,
    updateQuantity,
    isCartOpen,
    setIsCartOpen,
  } = useCart();
  const navigate = useNavigate();
  const { sheetRef, handleProps } = useDragToDismiss(() => setIsCartOpen(false));

  if (!isCartOpen) return null;

  const handlePlaceOrder = () => {
    setIsCartOpen(false);
    navigate(`/checkout?table=${tableId}`);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-scrim z-[90] animate-[fade-in_0.2s_ease]"
        onClick={() => setIsCartOpen(false)}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label="Your cart"
        className="fixed left-0 right-0 bottom-0 max-h-[80vh] bg-surface-container-low rounded-t-xl z-[100] flex flex-col shadow-[0_-4px_24px_var(--ds-shadow)] animate-[slide-up-drawer_0.3s_ease] will-change-transform"
      >
        <div {...handleProps} className="flex justify-center py-s cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <div className="flex items-center justify-between px-md pb-md border-b border-outline-variant">
          <h2 className="font-display text-title-large font-semibold text-on-surface">
            Your Order ({totalItems})
          </h2>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <i className="mgc_close_line text-xl" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-s py-10 px-md text-center">
            <i className="mgc_shopping_cart_1_line text-5xl text-on-surface-variant" />
            <p className="text-body-medium text-on-surface-variant">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-md py-md flex flex-col gap-md">
              {items.map((item) => (
                <div
                  key={item.lineId}
                  className="flex items-start justify-between gap-md"
                >
                  <div className="flex items-start gap-s flex-1 min-w-0">
                    <i className="mgc_fork_spoon_line text-xl text-on-surface-variant mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-title-medium font-semibold text-on-surface truncate">
                        {item.name}
                      </span>
                      {/* What was chosen, so a guest can tell two otherwise
                          identical lines apart before they pay for both. */}
                      {item.modifiers.length > 0 && (
                        <span className="text-body-small text-on-surface-variant">
                          {item.modifiers.map((m) => m.option_name).join(" · ")}
                        </span>
                      )}
                      {item.notes && (
                        <span className="text-body-small text-on-surface-variant italic">
                          {item.notes}
                        </span>
                      )}
                      <span className="text-label-medium text-on-surface-variant tabular-nums">
                        {formatCurrency(unitPrice(item) * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-s shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.lineId, item.quantity - 1)
                      }
                      aria-label={`Decrease ${item.name}`}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      <i className="mgc_minimize_line" />
                    </button>
                    <span className="text-title-medium font-semibold min-w-5 text-center text-on-surface">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.lineId, item.quantity + 1)
                      }
                      aria-label={`Increase ${item.name}`}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      <i className="mgc_add_line" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-md py-md border-t border-outline-variant flex flex-col gap-md">
              <div className="flex justify-between items-center">
                <span className="text-label-large text-on-surface-variant">Total</span>
                <span className="font-display text-title-large font-semibold text-on-surface">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <PrimaryButton
                onClick={handlePlaceOrder}
                disabled={totalItems === 0}
              >
                Place Order
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </>
  );
}
