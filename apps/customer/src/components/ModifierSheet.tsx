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
  /**
   * How many more the guest may take, counting what is already in their cart.
   * `null` means untracked. The sheet opens for a sold-out dish too — the card
   * body stays tappable so a guest can still read what it was — so it has to be
   * able to show everything and add nothing.
   */
  remaining?: number | null;
}

/** Wording for the constraint, in the terms a guest thinks in. */
function ruleFor(group: ModifierGroup): string {
  if (group.max === 1) return group.required ? "Choose 1" : "Choose up to 1";
  if (group.required && group.min === group.max) return `Choose ${group.min}`;
  if (group.required) return `Choose ${group.min}–${group.max}`;
  return `Optional · up to ${group.max}`;
}

/**
 * The item detail sheet — the one place a dish is shown in full.
 *
 * It opens two ways, and has to serve both: tapping a card body (to read the
 * whole description, which the card clamps to one line) and tapping ADD on a
 * dish with choices (to pick them). A dish with no choices simply has no groups
 * to render, so the same sheet is its detail view.
 *
 * Selection state is keyed by group so the rules can be enforced per group:
 * a `max: 1` group replaces rather than accumulates, which is what makes
 * "Protein" behave like radio buttons and "Extras" like checkboxes without
 * either being modelled as a separate concept.
 */
export default function ModifierSheet({ item, onClose, onAdd, remaining = null }: Props) {
  const groups = useMemo(
    () => [...(item.modifier_groups ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [item.modifier_groups],
  );

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");

  /**
   * Grow the notes field to fit what is in it.
   *
   * It starts one row tall so the placeholder sits on the vertical centre of
   * the field — a two-row box parks it against the top edge, which reads as a
   * misaligned label rather than a prompt. Centring the empty state any other
   * way means shifting the padding once text arrives, and the caret visibly
   * jumps on the first keystroke.
   */
  const growNotes = (el: HTMLTextAreaElement) => {
    // `py-md` against a 20px line puts the field at 54px with the single line —
    // placeholder or typed — on its centre. It is the only step on the spacing
    // scale that clears the 48px touch minimum: `py-s` lands at 38px.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
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

  // A sold-out dish still opens — the card body stays tappable so the guest can
  // read what it was — so the sheet shows everything and adds nothing.
  const soldOut = remaining != null && remaining <= 0;
  const overStock = remaining != null && quantity > remaining;
  const canAdd = unmet.length === 0 && !soldOut && !overStock;

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
        /* The name follows the job the sheet is doing. It opens two ways: to
           pick options, and to read a dish in full. Naming it "Choose options"
           when there is nothing to choose misdescribes it to a screen reader;
           naming it for the dish alone loses the purpose when there is. */
        aria-label={
          groups.length > 0 ? `Choose options for ${item.name}` : item.name
        }
        className="fixed left-0 right-0 bottom-0 max-h-[88vh] bg-surface-container-low rounded-t-xl z-[100] flex flex-col shadow-[0_-4px_24px_var(--ds-shadow)] animate-[slide-up-drawer_0.3s_ease] will-change-transform"
      >
        <div
          {...handleProps}
          className="flex justify-center py-s cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <div className="flex flex-col gap-md px-md pb-md border-b border-outline-variant">
          <div className="flex items-start justify-between gap-md">
            <div className="flex items-start gap-md min-w-0">
              <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-primary-container">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-primary-container text-2xl">
                    <i className="mgc_fork_spoon_line" />
                  </div>
                )}
              </div>
              {/* Not truncated. The card clamps the title to two lines and the
                  description to one; this sheet is where the guest comes to
                  read the rest, so clamping here would leave nowhere that
                  shows it. */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <h2 className="font-display text-title-medium font-semibold text-on-surface">
                  {item.name}
                </h2>
                <span className="text-body-medium text-on-surface-variant">
                  {formatCurrency(item.price)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <i className="mgc_close_line text-xl" />
            </button>
          </div>

          {item.description && (
            <p className="text-body-medium text-on-surface-variant">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-md py-md flex flex-col gap-l">
          {groups.map((group) => {
            const current = selected[group.id] ?? [];
            const full = group.max > 1 && current.length >= group.max;
            return (
              <fieldset key={group.id} className="flex flex-col gap-s border-0 p-0 m-0">
                <legend className="flex items-baseline justify-between gap-md w-full mb-xs">
                  <span className="text-title-medium font-semibold text-on-surface">
                    {group.name}
                    {group.required && (
                      <span className="text-error ml-0.5" aria-hidden="true">
                        *
                      </span>
                    )}
                  </span>
                  <span className="text-body-small text-on-surface-variant">
                    {ruleFor(group)}
                  </span>
                </legend>

                <div className="flex flex-col rounded-lg bg-surface-container overflow-hidden">
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
                              group.max === 1 ? "rounded-full" : "rounded-xs"
                            } ${
                              isSelected
                                ? "bg-primary-action border-primary text-on-primary"
                                : "border-outline"
                            }`}
                          >
                            {isSelected && (
                              <i className="mgc_check_line text-xs font-bold" />
                            )}
                          </span>
                          <span className="flex-1 text-body-medium text-on-surface min-w-0">
                            {option.name}
                            {!option.available && (
                              <span className="text-label-small text-on-surface-variant ml-s">
                                Unavailable
                              </span>
                            )}
                          </span>
                          {option.price_delta !== 0 && (
                            <span className="text-label-medium font-semibold text-on-surface-variant tabular-nums shrink-0">
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
              className="text-title-medium font-semibold text-on-surface"
            >
              Anything else?
            </label>
            <textarea
              id="oshap-item-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                growNotes(e.currentTarget);
              }}
              rows={1}
              maxLength={140}
              placeholder="e.g. no onions, well done"
              className="w-full px-md py-md rounded-sm bg-surface-container border border-outline-variant text-body-medium text-on-surface placeholder:text-on-surface-variant focus:border-primary transition-colors resize-none overflow-hidden"
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
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary-action hover:text-on-primary disabled:opacity-40 disabled:hover:bg-surface-container-high disabled:hover:text-on-surface"
            >
              <i className="mgc_minimize_line" />
            </button>
            <span className="font-bold text-body-large min-w-6 text-center text-on-surface tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => (remaining != null ? Math.min(remaining, q + 1) : q + 1))
              }
              disabled={remaining != null && quantity >= remaining}
              aria-label="Increase quantity"
              title={
                remaining != null && quantity >= remaining
                  ? `Only ${remaining} left today`
                  : undefined
              }
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface text-lg font-bold transition-colors hover:bg-primary-action hover:text-on-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-container-high disabled:hover:text-on-surface"
            >
              <i className="mgc_add_line" />
            </button>
          </div>

          <PrimaryButton
            className="flex-1"
            disabled={!canAdd}
            onClick={() => onAdd(chosen, notes.trim(), quantity)}
          >
            {soldOut
              ? "Sold out"
              : unmet.length > 0
                ? `Choose ${unmet[0]!.name.toLowerCase()}`
                : overStock
                  ? `Only ${remaining} left`
                  : `Add · ${formatCurrency(linePrice)}`}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}
