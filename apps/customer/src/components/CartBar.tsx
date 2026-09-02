import { formatCurrency } from "@oshap/shared";
import { useCart } from "../context/CartContext";

export default function CartBar() {
  const { totalItems, totalPrice, setIsCartOpen } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed left-0 right-0 bottom-16 px-md py-s z-[45] animate-[slide-up_0.3s_ease]">
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="w-full flex items-center justify-between p-md bg-primary text-on-primary rounded-lg shadow-lg transition-opacity hover:opacity-95 active:scale-[0.98]"
      >
        <div className="flex items-center gap-s">
          <span className="bg-on-primary text-primary-label w-7 h-7 flex items-center justify-center rounded-full text-body-medium font-bold">
            {totalItems}
          </span>
          <span className="font-semibold text-body-large">View Cart</span>
        </div>
        <span className="text-title-medium font-semibold">
          {formatCurrency(totalPrice)}
        </span>
      </button>
    </div>
  );
}
