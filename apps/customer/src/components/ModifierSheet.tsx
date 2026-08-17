import { useMemo, useState } from "react";
import { formatCurrency } from "@oshap/shared";
import type { MenuItem, ModifierGroup } from "@oshap/shared";
import { PrimaryButton } from "@oshap/shared/ui";
import { useDragToDismiss } from "../hooks/useDragToDismiss";
import { unitPrice, type CartModifier } from "../context/CartContext";

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAdd: (modifiers: CartModifier[], notes: string, quantity: number) => void;
}

/** Wording for the constraint, in the terms a guest thinks in. */
function ruleFor(group: ModifierGroup): string {
  if (group.max === 1) return group.required ? "Choose 1" : "Choose up to 1";
  if (group.required && group.min === group.max) return `Choose ${group.min}`;
  if (group.required) return `Choose ${group.min}–${group.max}`;
  return `Optional · up to ${group.max}`;
}

/**
 * Option picker shown before a dish with choices reaches the cart.
 *
 * Selection state is keyed by group so the rules can be enforced per group:
 * a `max: 1` group replaces rather than accumulates, which is what makes
 * "Protein" behave like radio buttons and "Extras" like checkboxes without
 * either being modelled as a separate concept.
 */
export default function ModifierSheet({ item, onClose, onAdd }: Props) {
  const groups = useMemo(
    () => [...(item.modifier_groups ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [item.modifier_groups],
  );

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { sheetRef, handleProps } = useDragToDismiss(onClose);

  const toggle = (group: ModifierGroup, optionId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.max === 1) {
        // Tapping the chosen option again clears it, but only where the group
        // allows nothing — a required group must always keep one.
        if (current[0] === optionId) {
          return group.required ? prev : { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.max) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const chosen: CartModifier[] = useMemo(() => {
    const out: CartModifier[] = [];
    for (const group of groups) {
      for (const optionId of selected[group.id] ?? []) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          out.push({
            option_id: option.id,
            group_name: group.name,
            option_name: option.name,
            price_delta: option.price_delta,
          });
        }
      }
    }
    return out;
  }, [groups, selected]);

  /** Which required groups are still short, so the guest can be told which. */
  const unmet = groups.filter(
    (g) => g.required && (selected[g.id]?.length ?? 0) < Math.max(1, g.min),
  );
  const canAdd = unmet.length === 0;

  const linePrice = unitPrice({ basePrice: item.price, modifiers: chosen }) * quantity;

  return (
    <>
      <div
        className="fixed inset-0 bg-scrim z-[90] animate-[fade-in_0.2s_ease]"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={`Choose options for ${item.name}`}
        className="fixed left-0 right-0 bottom-0 max-h-[88vh] bg-surface-container-low rounded-t-l z-[100] flex flex-col shadow-[0_-4px_24px_var(--ds-shadow)] animate-[slide-up-drawer_0.3s_ease] will-change-transform"
      >
        <div
          {...handleProps}
          className="flex justify-center py-s cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-4xl bg-outline-variant" />
        </div>

        <div className="flex items-start justify-between gap-md px-md pb-md border-b border-outline-variant">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="font-display text-display-h3 font-semibold text-primary-text truncate">
              {item.name}
            </h2>
            <span className="text-p2 text-secondary-text">
              {formatCurrency(item.price)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-4xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <i className="mgc_close_line text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-md py-md flex flex-col gap-l">
          {groups.map((group) => {
            const current = selected[group.id] ?? [];
            const full = group.max > 1 && current.length >= group.max;
            return (
              <fieldset key={group.id} className="flex flex-col gap-s border-0 p-0 m-0">
                <legend className="flex items-baseline justify-between gap-md w-full mb-xs">
                  <span className="text-label-l3 font-semibold text-primary-text">
                    {group.name}
                    {group.required && (
                      <span className="text-error ml-0.5" aria-hidden="true">
                        *
                      </span>
                    )}
                  </span>
                  <span className="text-caption-sm text-secondary-text">
                    {ruleFor(group)}
                  </span>
                </legend>

                <div className="flex flex-col rounded-md bg-surface-container overflow-hidden">
                  {group.options
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((option) => {
                      const isSelected = current.includes(option.id);
                      // Unavailable options stay visible: a guest who can't find
                      // "Fish" assumes we forgot it, not that it's finished.
                      const blocked =
                        !option.available || (full && !isSelected);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role={group.max === 1 ? "radio" : "checkbox"}
                          aria-checked={isSelected}
                          disabled={blocked}
                          onClick={() => toggle(group, option.id)}
                          className="flex items-center gap-s px-md py-s text-left border-b border-outline-variant/40 last:border-none transition-colors hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <span
                            aria-hidden="true"
                            className={`w-5 h-5 shrink-0 flex items-center justify-center border-2 transition-colors ${
                              group.max === 1 ? "rounded-4xl" : "rounded-xs"
                            } ${
                              isSelected
                                ? "bg-primary border-primary text-on-primary"
                                : "border-outline"
                            }`}
                          >
                            {isSelected && (
                              <i className="mgc_check_line text-xs font-bold" />
                            )}
                          </span>
                          <span className="flex-1 text-p2 text-primary-text min-w-0">
                            {option.name}
                            {!option.available && (
                              <span className="text-caption-xs text-secondary-text ml-s">
                                Unavailable
                              </span>
                            )}
                          </span>
                          {option.price_delta !== 0 && (
                            <span className="text-label-l5 font-semibold text-secondary-text tabular-nums shrink-0">
                              {option.price_delta > 0 ? "+" : "−"}
                              {formatCurrency(Math.abs(option.price_delta))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </fieldset>
            );
          })}

          <div className="flex flex-col gap-xs">
            <label
              htmlFor="oshap-item-notes"
              className="text-label-l3 font-semibold text-primary-text"
            >
              Anything else?
            </label>
            <textarea
              id="oshap-item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={140}
              placeholder="e.g. no onions, well done"
              className="w-full px-md py-s rounded-md bg-surface-container border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="border-t border-outline-variant px-md py-md flex items-center gap-md">
          <div className="flex items-center gap-s shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-40 disabled:hover:bg-surface-container-high disabled:hover:text-on-surface"
            >
              <i className="mgc_minimize_line" />
            </button>
            <span className="font-bold text-p min-w-6 text-center text-primary-text tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
              className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary hover:text-on-primary"
            >
              <i className="mgc_add_line" />
            </button>
          </div>

          <PrimaryButton
            className="flex-1"
            disabled={!canAdd}
            onClick={() => onAdd(chosen, notes.trim(), quantity)}
          >
            {canAdd
              ? `Add · ${formatCurrency(linePrice)}`
              : `Choose ${unmet[0]!.name.toLowerCase()}`}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}
