import { useState } from "react";
import { formatCurrency } from "@oshap/shared";
import type { MenuItem } from "@oshap/shared";
import { hasChoices, useCart } from "../context/CartContext";
import AddButton from "./AddButton";
import ModifierSheet from "./ModifierSheet";

interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  const { items, addItem, updateQuantity, quantityOf } = useCart();
  const [isChoosing, setIsChoosing] = useState(false);

  const configurable = hasChoices(item.modifier_groups);
  const quantity = quantityOf(item.id);

  // Only meaningful for a plain dish, which can occupy at most one line.
  const plainLine = items.find((i) => i.menuItemId === item.id);

  const addPlain = () =>
    addItem({
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      modifiers: [],
      image: item.image_url ?? undefined,
    });

  return (
    <article className="flex gap-md p-md bg-surface-container-low rounded-md border-b border-outline-variant/30 transition-shadow">
      <div className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-primary-container">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
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
            {item.name}
          </h3>
          {item.description && (
            <p className="text-p2 text-secondary-text line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-l3 font-semibold text-primary-text">
              {formatCurrency(item.price)}
            </span>
            {configurable && (
              <span className="text-caption-xs text-secondary-text">
                Choices available
              </span>
            )}
          </div>

          {/* A dish with choices always routes through the sheet: a bare "+1"
              can't say which variant to add, and silently repeating the last
              one would put food the guest didn't choose on the bill. */}
          {configurable ? (
            <div className="flex items-center gap-s">
              {quantity > 0 && (
                <span className="text-label-l5 font-semibold text-primary tabular-nums">
                  {quantity} in cart
                </span>
              )}
              <AddButton
                onClick={() => setIsChoosing(true)}
                aria-label={`Choose options for ${item.name}`}
              />
            </div>
          ) : quantity === 0 ? (
            <AddButton
              onClick={addPlain}
              aria-label={`Add ${item.name} to cart`}
            />
          ) : (
            <div className="flex items-center gap-s">
              <button
                type="button"
                onClick={() => updateQuantity(plainLine!.lineId, quantity - 1)}
                aria-label={`Decrease ${item.name} quantity`}
                className="w-8 h-8 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary"
              >
                <i className="mgc_minimize_line" />
              </button>
              <span className="font-bold text-p min-w-6 text-center text-primary-text">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(plainLine!.lineId, quantity + 1)}
                aria-label={`Increase ${item.name} quantity`}
                className="w-8 h-8 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary"
              >
                <i className="mgc_add_line" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isChoosing && (
        <ModifierSheet
          item={item}
          onClose={() => setIsChoosing(false)}
          onAdd={(modifiers, notes, qty) => {
            addItem(
              {
                menuItemId: item.id,
                name: item.name,
                basePrice: item.price,
                modifiers,
                notes: notes || undefined,
                image: item.image_url ?? undefined,
              },
              qty,
            );
            setIsChoosing(false);
          }}
        />
      )}
    </article>
  );
}
