import { formatCurrency } from "@oshap/shared";
import { useCart } from "../context/CartContext";
import AddButton from "./AddButton";

interface MenuCardProps {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
}

export default function MenuCard({
  id,
  name,
  price,
  description,
  image,
}: MenuCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.id === id);
  const quantity = cartItem?.quantity ?? 0;

  return (
    <article className="flex gap-md p-md bg-surface-container-low rounded-md border-b border-outline-variant/30 transition-shadow">
      <div className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-primary-container">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-primary-container text-4xl">
            <i className="mgc_fork_spoon_line" />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="flex flex-col gap-xs">
          <h3 className="text-label-l3 font-semibold text-primary-text">
            {name}
          </h3>
          {description && (
            <p className="text-p2 text-secondary-text line-clamp-2">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-label-l3 font-semibold text-primary-text">
            {formatCurrency(price)}
          </span>

          {quantity === 0 ? (
            <AddButton
              onClick={() =>
                addItem({ id, name, price, image: image ?? undefined })
              }
              aria-label={`Add ${name} to cart`}
            />
          ) : (
            <div className="flex items-center gap-s">
              <button
                type="button"
                onClick={() => updateQuantity(id, quantity - 1)}
                aria-label={`Decrease ${name} quantity`}
                className="w-8 h-8 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary"
              >
                <i className="mgc_minimize_line" />
              </button>
              <span className="font-bold text-p min-w-6 text-center text-primary-text">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(id, quantity + 1)}
                aria-label={`Increase ${name} quantity`}
                className="w-8 h-8 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary"
              >
                <i className="mgc_add_line" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
