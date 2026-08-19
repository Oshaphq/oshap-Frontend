import { useState } from "react";
import {
  errorMessage,
  formatCurrency,
  nairaToKobo,
  useAdminAdjustStock,
  useAdminCreateIngredient,
  useAdminIngredients,
  useAdminStockMovements,
} from "@oshap/shared";
import type { Ingredient } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";

const inputClass =
  "px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors";

/** Staff-facing wording for the reasons stock moves. */
const REASONS = [
  { value: "PURCHASE", label: "Delivery received", sign: 1 },
  { value: "WASTAGE", label: "Wastage / spoilage", sign: -1 },
  { value: "STOCK_TAKE", label: "Stock take", sign: 0 },
  { value: "CORRECTION", label: "Correction", sign: 0 },
] as const;

const REASON_LABELS: Record<string, string> = {
  PURCHASE: "Delivery",
  WASTAGE: "Wastage",
  STOCK_TAKE: "Stock take",
  CORRECTION: "Correction",
  SALE: "Sold",
};

/** Trims float noise without pretending 2.5 kg is 3. */
function qty(value: number): string {
  return Number(value.toFixed(3)).toLocaleString();
}

export default function InventoryPage() {
  const ingredientsQuery = useAdminIngredients();
  const [adjusting, setAdjusting] = useState<Ingredient | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showNew, setShowNew] = useState(false);

  if (ingredientsQuery.isError) {
    return <QueryError error={ingredientsQuery.error} action="load the inventory" onRetry={() => ingredientsQuery.refetch()} />;
  }

  const ingredients = ingredientsQuery.data ?? [];
  const low = ingredients.filter(
    (i) => i.low_stock_threshold != null && i.stock_qty <= i.low_stock_threshold,
  );

  return (
    <main className="p-md flex flex-col gap-l max-w-[64rem]">
      <header className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Inventory
          </h1>
          <p className="text-caption-md text-secondary-text">
            What your dishes are made of. Plate counts live on the menu screen.
          </p>
        </div>
        <div className="flex items-center gap-s">
          <SecondaryButton size="md" onClick={() => setShowLedger((v) => !v)}>
            <i className="mgc_history_line" /> {showLedger ? "Hide" : "Movements"}
          </SecondaryButton>
          <PrimaryButton size="md" onClick={() => setShowNew(true)}>
            + Add ingredient
          </PrimaryButton>
        </div>
      </header>

      {low.length > 0 && (
        <div className="flex items-start gap-s p-md rounded-lg bg-warning-container text-on-warning-container">
          <i className="mgc_alert_line text-xl shrink-0 mt-0.5" />
          <p className="text-p2">
            <span className="font-semibold">
              {low.length} ingredient{low.length === 1 ? "" : "s"} at or below
              threshold:
            </span>{" "}
            {low.map((i) => i.name).join(", ")}
          </p>
        </div>
      )}

      {ingredientsQuery.isLoading ? (
        <div className="flex justify-center py-xl">
          <div className="oshap-spinner" />
        </div>
      ) : ingredients.length === 0 ? (
        <div className="flex flex-col items-center gap-xs py-10 px-md text-center rounded-md bg-surface-container-low">
          <i className="mgc_box_2_line text-5xl text-outline-variant opacity-40" />
          <span className="font-display text-display-h4 font-semibold text-primary-text">
            No ingredients yet
          </span>
          <p className="text-p2 text-secondary-text max-w-[36rem]">
            Add what you buy — rice, chicken, oil — then attach them to dishes as
            recipes. Orders will draw stock down automatically.
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-md overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-md px-md py-s bg-surface-container-high text-label-l4 font-semibold text-secondary-text">
            <span>Ingredient</span>
            <span className="text-right">In stock</span>
            <span className="text-right">Alert at</span>
            <span className="text-right">Unit cost</span>
            <span />
          </div>
          {ingredients.map((ingredient) => {
            const isLow =
              ingredient.low_stock_threshold != null &&
              ingredient.stock_qty <= ingredient.low_stock_threshold;
            const isNegative = ingredient.stock_qty < 0;
            return (
              <div
                key={ingredient.id}
                className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-md gap-y-xs px-md py-s border-b border-outline-variant last:border-none items-center"
              >
                <span className="text-p2 font-semibold text-primary-text">
                  {ingredient.name}
                </span>
                <span
                  className={`text-label-l3 font-semibold tabular-nums text-right ${
                    isNegative
                      ? "text-error"
                      : isLow
                        ? "text-warning"
                        : "text-primary-text"
                  }`}
                  title={
                    isNegative
                      ? "Negative means more was sold than the count allowed — the recipe or the count is wrong."
                      : undefined
                  }
                >
                  {qty(ingredient.stock_qty)} {ingredient.unit}
                </span>
                <span className="text-caption-md text-secondary-text tabular-nums text-right">
                  {ingredient.low_stock_threshold == null
                    ? "—"
                    : `${qty(ingredient.low_stock_threshold)} ${ingredient.unit}`}
                </span>
                <span className="text-caption-md text-secondary-text tabular-nums text-right">
                  {ingredient.cost_per_unit == null
                    ? "—"
                    : formatCurrency(ingredient.cost_per_unit)}
                </span>
                <SecondaryButton
                  size="md"
                  onClick={() => setAdjusting(ingredient)}
                >
                  Adjust
                </SecondaryButton>
              </div>
            );
          })}
        </div>
      )}

      {showLedger && <MovementsLedger />}
      {adjusting && (
        <AdjustDialog
          ingredient={adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
      {showNew && <NewIngredientDialog onClose={() => setShowNew(false)} />}
    </main>
  );
}

function MovementsLedger() {
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const movements = useAdminStockMovements({
    reason: reason || undefined,
    page,
  });

  const rows = movements.data?.movements ?? [];
  const perPage = movements.data?.per_page ?? 25;
  const totalPages = movements.data
    ? Math.max(1, Math.ceil(movements.data.total / perPage))
    : 1;

  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h2 className="text-label-l2 font-semibold text-primary-text">
          Stock movements
        </h2>
        <select
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by reason"
          className={inputClass}
        >
          <option value="">Everything</option>
          {Object.entries(REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {movements.isLoading ? (
        <div className="flex justify-center py-l">
          <div className="oshap-spinner" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-p2 text-secondary-text py-l text-center rounded-md bg-surface-container-low">
          Nothing recorded yet.
        </p>
      ) : (
        <div className="bg-surface-container-low rounded-md overflow-hidden">
          {rows.map((movement) => (
            <div
              key={movement.id}
              className="flex flex-wrap items-baseline gap-x-md gap-y-xs px-md py-s border-b border-outline-variant last:border-none"
            >
              <span className="text-caption-md text-secondary-text tabular-nums shrink-0">
                {new Date(movement.created_at).toLocaleString()}
              </span>
              <span className="text-p2 text-primary-text flex-1 min-w-0">
                {REASON_LABELS[movement.reason] ?? movement.reason}
                {movement.note && (
                  <span className="text-secondary-text"> · {movement.note}</span>
                )}
              </span>
              {movement.order_id && (
                <span className="text-caption-md font-mono text-secondary-text shrink-0">
                  order
                </span>
              )}
              <span
                className={`text-label-l4 font-semibold tabular-nums shrink-0 ${
                  movement.delta < 0 ? "text-error" : "text-primary-text"
                }`}
              >
                {movement.delta > 0 ? "+" : "−"}
                {qty(Math.abs(movement.delta))}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-md">
          <SecondaryButton
            size="md"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </SecondaryButton>
          <span className="text-caption-md text-secondary-text tabular-nums">
            Page {page} of {totalPages}
          </span>
          <SecondaryButton
            size="md"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            Next
          </SecondaryButton>
        </div>
      )}
    </section>
  );
}

function AdjustDialog({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient;
  onClose: () => void;
}) {
  const adjust = useAdminAdjustStock();
  const [reason, setReason] = useState<string>("PURCHASE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const rule = REASONS.find((r) => r.value === reason);
  const isCount = rule?.sign === 0 && reason === "STOCK_TAKE";
  const parsed = Number(amount);
  const valid = amount !== "" && !Number.isNaN(parsed);

  // A stock take is a counted total, but the API only moves by deltas — so
  // convert here rather than making staff do subtraction at the shelf.
  const delta = !valid
    ? 0
    : isCount
      ? Number((parsed - ingredient.stock_qty).toFixed(3))
      : (rule?.sign ?? 1) < 0
        ? -Math.abs(parsed)
        : Math.abs(parsed);

  const handleSave = () => {
    if (!valid) return;
    if (delta === 0) {
      toast.error("That leaves the level unchanged.");
      return;
    }
    adjust.mutate(
      { id: ingredient.id, payload: { delta, reason, note: note || undefined } },
      {
        onSuccess: () => {
          toast.success(`${ingredient.name} updated`);
          onClose();
        },
        onError: (e: unknown) =>
          toast.error(errorMessage(e, "adjust stock")),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md">
      <div className="w-full max-w-[440px] rounded-md bg-surface-container-high p-l flex flex-col gap-md border border-outline-variant shadow-xl">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-display-h3 font-semibold text-primary-text">
            {ingredient.name}
          </h3>
          <p className="text-caption-md text-secondary-text">
            Currently {qty(ingredient.stock_qty)} {ingredient.unit}
          </p>
        </div>

        <label className="flex flex-col gap-xs">
          <span className="text-caption-md font-semibold text-primary-text">
            What happened?
          </span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-xs">
          <span className="text-caption-md font-semibold text-primary-text">
            {isCount
              ? `Counted total (${ingredient.unit})`
              : `Amount (${ingredient.unit})`}
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            autoFocus
            placeholder="0"
            className={inputClass}
          />
          {valid && (
            <span className="text-caption-sm text-secondary-text tabular-nums">
              {delta >= 0 ? "+" : "−"}
              {qty(Math.abs(delta))} {ingredient.unit} → new level{" "}
              {qty(ingredient.stock_qty + delta)} {ingredient.unit}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-xs">
          <span className="text-caption-md font-semibold text-primary-text">
            Note <span className="font-normal text-secondary-text">(optional)</span>
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. supplier short-delivered"
            className={inputClass}
          />
        </label>

        <div className="flex justify-end gap-s pt-s">
          <SecondaryButton size="md" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            size="md"
            onClick={handleSave}
            disabled={!valid || adjust.isPending}
          >
            {adjust.isPending ? "Saving…" : "Record"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function NewIngredientDialog({ onClose }: { onClose: () => void }) {
  const create = useAdminCreateIngredient();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("");
  const [cost, setCost] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        unit: unit.trim() || "unit",
        stock_qty: Number(stock || "0") || 0,
        low_stock_threshold: threshold ? Number(threshold) : null,
        // Merchants type naira; kobo is the unit everywhere past this line.
        cost_per_unit: cost ? nairaToKobo(Number(cost)) : null,
      },
      {
        onSuccess: () => {
          toast.success(`${name.trim()} added`);
          onClose();
        },
        onError: (e: unknown) =>
          toast.error(errorMessage(e, "add the ingredient")),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md">
      <div className="w-full max-w-[440px] rounded-md bg-surface-container-high p-l flex flex-col gap-md border border-outline-variant shadow-xl">
        <h3 className="font-display text-display-h3 font-semibold text-primary-text">
          Add ingredient
        </h3>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name — e.g. Rice"
          aria-label="Ingredient name"
          autoFocus
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-s">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit — kg, L, tin"
            aria-label="Unit"
            className={inputClass}
          />
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Opening stock"
            aria-label="Opening stock"
            inputMode="decimal"
            className={inputClass}
          />
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Alert below"
            aria-label="Low stock threshold"
            inputMode="decimal"
            className={inputClass}
          />
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Cost per unit ₦"
            aria-label="Cost per unit in naira"
            inputMode="decimal"
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-s pt-s">
          <SecondaryButton size="md" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            size="md"
            onClick={handleSave}
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? "Adding…" : "Add"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
