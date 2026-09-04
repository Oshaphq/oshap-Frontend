import { useEffect, useState } from "react";
import {
  errorMessage,
  useAdminIngredients,
  useAdminRecipe,
  useAdminSetRecipe,
} from "@oshap/shared";
import type { MenuItem } from "@oshap/shared";
import {
  PrimaryButton,
  SecondaryButton,
  Select,
  TextField,
  toast,
} from "@oshap/shared/ui";


interface Props {
  item: MenuItem;
  onClose: () => void;
}

interface DraftLine {
  ingredient_id: string;
  qty_per_serving: string;
}

/**
 * What one serving of a dish consumes.
 *
 * Quantities are held as strings while editing so a half-typed "0." doesn't
 * collapse to 0 under the user's cursor, and are parsed once on save.
 */
export default function RecipeDialog({ item, onClose }: Props) {
  const ingredientsQuery = useAdminIngredients();
  const recipeQuery = useAdminRecipe(item.id);
  const setRecipe = useAdminSetRecipe();

  const [lines, setLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    if (recipeQuery.data) {
      setLines(
        recipeQuery.data.lines.map((l) => ({
          ingredient_id: l.ingredient_id,
          qty_per_serving: String(l.qty_per_serving),
        })),
      );
    }
  }, [recipeQuery.data]);

  const ingredients = ingredientsQuery.data ?? [];
  const used = new Set(lines.map((l) => l.ingredient_id));
  const available = ingredients.filter((i) => !used.has(i.id));

  const addLine = () => {
    const next = available[0];
    if (!next) return;
    setLines((prev) => [
      ...prev,
      { ingredient_id: next.id, qty_per_serving: "1" },
    ]);
  };

  const handleSave = () => {
    const parsed = lines
      .map((l) => ({
        ingredient_id: l.ingredient_id,
        qty_per_serving: Number(l.qty_per_serving),
      }))
      .filter((l) => l.qty_per_serving > 0 && !Number.isNaN(l.qty_per_serving));

    if (parsed.length !== lines.length) {
      toast.error("Every line needs a quantity above zero.");
      return;
    }

    setRecipe.mutate(
      { menuItemId: item.id, payload: { lines: parsed } },
      {
        onSuccess: () => {
          toast.success(`Recipe saved for ${item.name}`);
          onClose();
        },
        onError: (e: unknown) =>
          toast.error(errorMessage(e, "save the recipe")),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md">
      <div className="w-full max-w-[520px] max-h-[85vh] rounded-xl bg-surface-container-high flex flex-col border border-outline-variant shadow-xl">
        <header className="flex items-start justify-between gap-md p-l border-b border-outline-variant">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="font-display text-title-medium font-semibold text-on-surface truncate">
              Recipe · {item.name}
            </h2>
            <p className="text-body-medium text-on-surface-variant">
              What one serving uses. Orders draw these down automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            <i className="mgc_close_line text-xl" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-l flex flex-col gap-s">
          {recipeQuery.isLoading || ingredientsQuery.isLoading ? (
            <div className="flex justify-center py-xl">
              <div className="oshap-spinner" />
            </div>
          ) : ingredients.length === 0 ? (
            <p className="text-body-medium text-on-surface-variant text-center py-l">
              No ingredients exist yet. Add some on the Inventory screen first.
            </p>
          ) : lines.length === 0 ? (
            <p className="text-body-medium text-on-surface-variant text-center py-l">
              No recipe yet — this dish won&rsquo;t affect ingredient stock.
            </p>
          ) : (
            lines.map((line, index) => {
              const ingredient = ingredients.find(
                (i) => i.id === line.ingredient_id,
              );
              return (
                <div key={line.ingredient_id} className="flex items-center gap-s">
                  <Select
                    value={line.ingredient_id}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index
                            ? { ...l, ingredient_id: e.target.value }
                            : l,
                        ),
                      )
                    }
                    aria-label="Ingredient"
                    wrapperClassName="flex-1 min-w-0"
                  >
                    {/* Its own value plus anything not already used, so the
                        same ingredient can't appear on two lines. */}
                    {[ingredient, ...available]
                      .filter((i): i is NonNullable<typeof i> => Boolean(i))
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                  </Select>
                  <TextField
                    value={line.qty_per_serving}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index
                            ? { ...l, qty_per_serving: e.target.value }
                            : l,
                        ),
                      )
                    }
                    inputMode="decimal"
                    aria-label={`Quantity of ${ingredient?.name ?? "ingredient"} per serving`}
                    wrapperClassName="w-24"
                  />
                  <span className="text-body-medium text-on-surface-variant w-12 shrink-0">
                    {ingredient?.unit ?? ""}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove ${ingredient?.name ?? "line"}`}
                    className="p-xs text-on-surface-variant hover:text-error transition-colors"
                  >
                    <i className="mgc_delete_line text-lg" />
                  </button>
                </div>
              );
            })
          )}

          {ingredients.length > 0 && (
            <SecondaryButton
              size="md"
              onClick={addLine}
              disabled={available.length === 0}
            >
              <i className="mgc_add_line" />{" "}
              {available.length === 0 ? "All ingredients used" : "Add ingredient"}
            </SecondaryButton>
          )}
        </div>

        <footer className="p-l border-t border-outline-variant flex justify-end gap-s">
          <SecondaryButton size="md" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            size="md"
            onClick={handleSave}
            disabled={setRecipe.isPending || ingredients.length === 0}
          >
            {setRecipe.isPending ? "Saving…" : "Save recipe"}
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
}
