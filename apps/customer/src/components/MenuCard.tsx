import { useState } from "react";
import { formatCurrency, stockLabel, stockState } from "@oshap/shared";
import type { MenuItem } from "@oshap/shared";
import { hasChoices, useCart } from "../context/CartContext";
import AddButton from "./AddButton";
import { toast } from "@oshap/shared/ui";
import ModifierSheet from "./ModifierSheet";

interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  const { items, addItem, updateQuantity, quantityOf } = useCart();
  const [isChoosing, setIsChoosing] = useState(false);

  const configurable = hasChoices(item.modifier_groups);
  const quantity = quantityOf(item.id);

  // What is left, counting what this guest already holds. Most dishes are
  // untracked and unaffected.
  const stock = stockState(item, quantity);
  const label = stockLabel(stock);

  // Only meaningful for a plain dish, which can occupy at most one line.
  const plainLine = items.find((i) => i.menuItemId === item.id);

  const addPlain = () => {
    if (!stock.canAddMore) {
      // Saying the number is the difference between "no" and "no, and here is
      // why" — the second is something a guest can act on.
      toast.info(`Only ${item.stock_count} ${item.name} left today.`);
      return;
    }
    addItem({
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      modifiers: [],
      image: item.image_url ?? undefined,
    });
    // The stepper appearing in place of ADD is the durable signal; this is the
    // one that reaches a guest whose thumb is covering that corner of the card.
    toast.success(`${item.name} added`, 1800);
  };

  return (
    <article className="relative flex items-center gap-md p-md bg-surface-container-low rounded-lg border-b border-outline-variant/30 transition-shadow">
      <div className="shrink-0 w-24 h-24 rounded-sm overflow-hidden bg-primary-container">
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

      {/* Gap, not `justify-between`. The column hugs its content — 40 + 8 +
          31.31 = 79.31 against a 96px image — so spreading it to the image
          height opens a gap that grows with the image rather than a fixed one. */}
      <div className="flex-1 flex flex-col gap-s min-w-0">
        <div className="flex flex-col gap-xs">
          {/* Two lines, then clamp. A dish whose name needs three lines pushes
              the price and ADD off the card, and the name is the one thing a
              guest scans by — so it gets the room, and the sheet has the rest. */}
          <h3 className="text-title-medium font-semibold text-on-surface line-clamp-2">
            {item.name}
          </h3>
          {item.description && (
            /* One line. The description is what a guest reads *after* deciding
               the name is interesting, so on the card it only has to hint. */
            <p className="text-body-medium text-on-surface-variant line-clamp-1">
              {item.description}
            </p>
          )}
        </div>

        {/* `items-end`: the price sits on the button's bottom edge. Centring a
            20px price against a 31px button lifts it two pixels off the line
            the eye reads along. */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-title-medium font-semibold text-on-surface">
              {formatCurrency(item.price)}
            </span>
            {configurable && !label && (
              <span className="text-label-small text-on-surface-variant">
                Choices available
              </span>
            )}
            {label && (
              <span
                className={`text-label-small font-semibold ${
                  stock.soldOut ? "text-error" : "text-warning"
                }`}
              >
                {label}
              </span>
            )}
          </div>

          {/* Above the body overlay, so these keep their own tap targets. */}
          <div className="relative z-10 flex items-center gap-s">
            {/* A dish with choices always routes through the sheet: a bare "+1"
                can't say which variant to add, and silently repeating the last
                one would put food the guest didn't choose on the bill. */}
            {configurable ? (
              <>
                {quantity > 0 && (
                  <span className="text-label-medium font-semibold text-primary-label tabular-nums">
                    {quantity} in cart
                  </span>
                )}
                <AddButton
                  onClick={() => {
                    if (!stock.canAddMore) {
                      toast.info(`Only ${item.stock_count} ${item.name} left today.`);
                      return;
                    }
                    setIsChoosing(true);
                  }}
                  aria-label={`Choose options for ${item.name}`}
                />
              </>
            ) : stock.soldOut ? (
              /* Nothing to add. The API still lists it, so the guest is told
                 plainly rather than left tapping a button that cannot work —
                 but the card body below still opens the dish. */
              <span className="text-label-small font-semibold text-error">
                Unavailable
              </span>
            ) : quantity === 0 ? (
              <AddButton
                onClick={addPlain}
                aria-label={`Add ${item.name} to cart`}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => updateQuantity(plainLine!.lineId, quantity - 1)}
                  aria-label={`Decrease ${item.name} quantity`}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary"
                >
                  <i className="mgc_minimize_line" />
                </button>
                <span className="font-bold text-body-large min-w-6 text-center text-on-surface tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(plainLine!.lineId, quantity + 1)}
                  disabled={!stock.canAddMore}
                  aria-label={`Increase ${item.name} quantity`}
                  title={
                    stock.canAddMore
                      ? undefined
                      : `Only ${item.stock_count} left today`
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-container-high disabled:hover:text-on-surface"
                >
                  <i className="mgc_add_line" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/*
        The card body, as one real button rather than a click handler on the
        <article>.

        It is a sibling laid over the card instead of a wrapper around it,
        because a wrapper would nest ADD and the stepper inside a button — which
        is invalid, and which screen readers and Enter/Space handling both get
        wrong. The controls above carry `z-10`, so this catches every tap that
        is not one of them, including on a sold-out dish.
      */}
      <button
        type="button"
        onClick={() => setIsChoosing(true)}
        aria-label={`View ${item.name}`}
        className="absolute inset-0 rounded-lg"
      />

      {isChoosing && (
        <ModifierSheet
          item={item}
          remaining={stock.remaining}
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
