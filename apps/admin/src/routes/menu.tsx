import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  useAdminMenu,
  useAdminCreateMenuItem,
  useAdminUpdateMenuItem,
  useAdminToggleMenuItem,
  useAdminDeleteMenuItem,
  useAdminUploadImage,
  useAdminInventoryAlerts,
  useAdminUpdateStock,
  useAdminExportMenu,
  formatCurrency,
  nairaToKobo,
  koboToNaira,
  errorMessage,
  validateImageFile,
  IMAGE_ACCEPT_ATTR,
} from "@oshap/shared";
import type { MenuItem } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, Select, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
import LowStockBanner from "../components/LowStockBanner";
import MenuImportDialog from "../components/MenuImportDialog";
import ModifierGroupsDialog from "../components/ModifierGroupsDialog";
import ItemModifiersDialog from "../components/ItemModifiersDialog";
import RecipeDialog from "../components/RecipeDialog";

interface MenuFormState {
  name: string;
  price: string;
  category: string;
  description: string;
  image_url: string;
}

const EMPTY_FORM: MenuFormState = {
  name: "",
  price: "",
  category: "Meals",
  description: "",
  image_url: "",
};

const CATEGORIES = ["Meals", "Grills", "Drinks", "Sides"] as const;

export default function MenuPage() {
  const menuQuery = useAdminMenu();
  const createItem = useAdminCreateMenuItem();
  const updateItem = useAdminUpdateMenuItem();
  const toggleItem = useAdminToggleMenuItem();
  const deleteItem = useAdminDeleteMenuItem();
  const uploadImage = useAdminUploadImage();
  const updateStock = useAdminUpdateStock();
  const exportMenu = useAdminExportMenu();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState<MenuFormState>(EMPTY_FORM);
  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState<string>("");
  const [thresholdInput, setThresholdInput] = useState<string>("");
  const [showImport, setShowImport] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [optionsFor, setOptionsFor] = useState<MenuItem | null>(null);
  const [recipeFor, setRecipeFor] = useState<MenuItem | null>(null);

  const handleExport = () => {
    exportMenu.mutate(undefined, {
      onSuccess: (csv) => {
        // Served as a CSV body rather than a file URL, so the download is
        // assembled here.
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `menu-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      },
      onError: () => toast.error("Could not export the menu"),
    });
  };

  const handleCreate = async () => {
    if (!form.name || !form.price || !form.category) {
      toast.error("Name, price, and category are required.");
      return;
    }
    try {
      await createItem.mutateAsync({
        name: form.name,
        price: nairaToKobo(Number(form.price)),
        category: form.category,
        description: form.description || undefined,
        image_url: form.image_url || undefined,
      });
      setShowNewForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(errorMessage(err, "add the dish"));
    }
  };

  const handleSave = async (id: string) => {
    try {
      await updateItem.mutateAsync({
        id,
        payload: {
          name: form.name,
          price: nairaToKobo(Number(form.price)),
          category: form.category,
          description: form.description || undefined,
          image_url: form.image_url || undefined,
        },
      });
      setEditingId(null);
    } catch (err) {
      toast.error(errorMessage(err, "save the dish"));
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setShowNewForm(false);
    setForm({
      name: item.name,
      price: String(koboToNaira(item.price)),
      category: item.category,
      description: item.description ?? "",
      image_url: item.image_url ?? "",
    });
  };

  const handleToggleAvailable = async (id: string, available: boolean) => {
    try {
      await toggleItem.mutateAsync({ id, available: !available });
    } catch (err) {
      toast.error(errorMessage(err, "update the dish"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await deleteItem.mutateAsync(id);
      toast.success("Dish deleted");
    } catch (err) {
      // This swallowed the cause entirely, so a real and reproducible failure
      // reached the pilot as "Failed to delete" — a sentence that rules nothing
      // out and sends whoever reads it looking in the wrong place.
      toast.error(errorMessage(err, "delete the dish"));
    }
  };

  /**
   * Saving a blank box means "stop counting this dish" — a real thing to want,
   * and the reason this said "Stock updated" while the badge stayed
   * "Untracked". That reads as a failed save rather than a successful one, so
   * the two outcomes now say what they actually are.
   *
   * `parseInt` also turned anything unparseable into NaN, which serialises to
   * null — so a stray character silently untracked the dish and reported
   * success. Rejected now instead.
   */
  const handleSaveStock = async (item: MenuItem) => {
    const raw = stockInput.trim();
    const parsed = raw === "" ? null : Number(raw);

    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Stock has to be a number, or blank to stop counting.");
      return;
    }

    const count = parsed === null ? null : Math.floor(parsed);
    const threshold = thresholdInput.trim();
    const parsedThreshold = threshold === "" ? null : Number(threshold);

    if (parsedThreshold !== null && (!Number.isFinite(parsedThreshold) || parsedThreshold < 0)) {
      toast.error("The low-stock number has to be a number.");
      return;
    }

    try {
      await updateStock.mutateAsync({
        id: item.id,
        payload: {
          stock_count: count,
          ...(parsedThreshold === null ? {} : { low_stock_threshold: Math.floor(parsedThreshold) }),
        },
      });
      setStockEditId(null);
      toast.success(
        count === null
          ? `${item.name} is no longer counted`
          : `${item.name}: ${count} in stock`,
      );
    } catch (err) {
      toast.error(errorMessage(err, "update the stock count"));
    }
  };

  if (menuQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading menu...</p>
      </div>
    );
  }

  if (menuQuery.isError) {
    return <QueryError error={menuQuery.error} action="load the menu" onRetry={() => menuQuery.refetch()} />;
  }

  const items = menuQuery.data ?? [];
  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <main className="p-md flex flex-col gap-l">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Menu Management
        </h1>
        <div className="flex items-center gap-s">
          <SecondaryButton
            size="md"
            onClick={handleExport}
            disabled={exportMenu.isPending || items.length === 0}
          >
            <i className="mgc_download_2_line" />
            {exportMenu.isPending ? "Exporting…" : "Export"}
          </SecondaryButton>
          <SecondaryButton size="md" onClick={() => setShowImport(true)}>
            <i className="mgc_file_upload_line" /> Import
          </SecondaryButton>
          <SecondaryButton size="md" onClick={() => setShowGroups(true)}>
            <i className="mgc_list_check_line" /> Options
          </SecondaryButton>
          <PrimaryButton
            size="md"
            onClick={() => {
              setShowNewForm(true);
              setEditingId(null);
              setForm(EMPTY_FORM);
            }}
          >
            + Add Item
          </PrimaryButton>
        </div>
      </header>

      <LowStockBanner />

      <div className="flex flex-col gap-md">
        {showNewForm && (
          <MenuItemForm
            heading="New Menu Item"
            form={form}
            setForm={setForm}
            onCancel={() => {
              setShowNewForm(false);
              setForm(EMPTY_FORM);
            }}
            onSubmit={handleCreate}
            submitLabel="Create"
            submitting={createItem.isPending}
            isSaving={isSaving}
            uploadImage={uploadImage}
          />
        )}

        {items.map((item) => {
          const isEditing = editingId === item.id;
          if (isEditing) {
            return (
              <MenuItemForm
                key={item.id}
                heading={`Edit ${item.name}`}
                form={form}
                setForm={setForm}
                onCancel={() => setEditingId(null)}
                onSubmit={() => handleSave(item.id)}
                submitLabel="Save"
                submitting={updateItem.isPending}
                isSaving={isSaving}
                uploadImage={uploadImage}
              />
            );
          }
          return (
            <MenuItemRow
              key={item.id}
              item={item}
              isStockEditing={stockEditId === item.id}
              stockInput={stockInput}
              thresholdInput={thresholdInput}
              onStockEditStart={() => {
                setStockEditId(item.id);
                setStockInput(item.stock_count !== null ? String(item.stock_count) : "");
                setThresholdInput(String(item.low_stock_threshold ?? ""));
              }}
              onStockInputChange={setStockInput}
              onThresholdInputChange={setThresholdInput}
              onStockSave={() => handleSaveStock(item)}
              onStockCancel={() => setStockEditId(null)}
              onToggle={() => handleToggleAvailable(item.id, item.available)}
              onEdit={() => handleEdit(item)}
              onEditOptions={() => setOptionsFor(item)}
              onEditRecipe={() => setRecipeFor(item)}
              onDelete={() => handleDelete(item.id)}
            />
          );
        })}

        {items.length === 0 && !showNewForm && (
          <div className="flex flex-col items-center justify-center gap-s py-10 px-md text-center">
            <i className="mgc_cook_line text-5xl text-outline-variant opacity-40" />
            <span className="font-display text-display-h4 font-semibold text-primary-text">
              No menu items yet
            </span>
            <p className="text-p2 text-secondary-text">
              Click <span className="font-semibold">+ Add Item</span> to create your first menu item.
            </p>
          </div>
        )}
      </div>

      {showImport && <MenuImportDialog onClose={() => setShowImport(false)} />}
      {showGroups && <ModifierGroupsDialog onClose={() => setShowGroups(false)} />}
      {optionsFor && (
        <ItemModifiersDialog
          item={optionsFor}
          onClose={() => setOptionsFor(null)}
        />
      )}
      {recipeFor && (
        <RecipeDialog item={recipeFor} onClose={() => setRecipeFor(null)} />
      )}
    </main>
  );
}

interface ItemRowProps {
  item: MenuItem;
  isStockEditing: boolean;
  stockInput: string;
  thresholdInput: string;
  onStockEditStart: () => void;
  onThresholdInputChange: (v: string) => void;
  onStockInputChange: (v: string) => void;
  onStockSave: () => void;
  onStockCancel: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onEditOptions: () => void;
  onEditRecipe: () => void;
  onDelete: () => void;
}

function MenuItemRow({ item, isStockEditing, stockInput, thresholdInput, onStockEditStart, onStockInputChange, onThresholdInputChange, onStockSave, onStockCancel, onToggle, onEdit, onEditOptions, onEditRecipe, onDelete }: ItemRowProps) {
  const isLow = item.stock_count !== null && item.stock_count <= item.low_stock_threshold;
  const isOut = item.stock_count !== null && item.stock_count === 0;

  return (
    <div
      className={`rounded-md bg-surface-container-low border border-transparent transition-all hover:border-outline-variant overflow-hidden ${
        !item.available ? "opacity-55" : ""
      }`}
    >
      <div className="p-md flex flex-col gap-s">
        <div className="flex items-start justify-between gap-md">
          <div className="flex items-start gap-md flex-1 min-w-0">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg border border-outline-variant shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                <i className="mgc_fork_spoon_line text-2xl text-on-primary-container" />
              </div>
            )}
            <div className="flex flex-col gap-xs min-w-0">
              <span className="font-bold text-primary-text truncate">
                {item.name}
              </span>
              <span className="text-caption-md text-secondary-text">
                {item.category} · {formatCurrency(item.price)}
              </span>
              {item.description && (
                <span className="text-caption-sm text-outline line-clamp-2">
                  {item.description}
                </span>
              )}
              {/* Stock badge / inline editor */}
              {isStockEditing ? (
                <div className="flex flex-wrap items-end gap-s mt-xs">
                  <label className="flex flex-col gap-xs text-caption-xs text-secondary-text">
                    Plates left
                    <input
                      type="number"
                      min={0}
                      value={stockInput}
                      placeholder="Blank = don't count"
                      aria-label={`Stock count for ${item.name}`}
                      onChange={(e) => onStockInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        // Typing a number and pressing Enter is the whole
                        // interaction; without this it silently did nothing.
                        if (e.key === "Enter") onStockSave();
                        if (e.key === "Escape") onStockCancel();
                      }}
                      className="w-28 px-s py-xs rounded-md border border-outline-variant bg-surface-container-low text-caption-md text-primary-text outline-none focus:border-primary"
                      autoFocus
                    />
                  </label>
                  {/* The threshold was settable through the API and nowhere in
                      the UI, so every dish sat on whatever default it was
                      created with. */}
                  <label className="flex flex-col gap-xs text-caption-xs text-secondary-text">
                    Warn at
                    <input
                      type="number"
                      min={0}
                      value={thresholdInput}
                      placeholder="e.g. 5"
                      aria-label={`Low stock warning level for ${item.name}`}
                      onChange={(e) => onThresholdInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onStockSave();
                        if (e.key === "Escape") onStockCancel();
                      }}
                      className="w-24 px-s py-xs rounded-md border border-outline-variant bg-surface-container-low text-caption-md text-primary-text outline-none focus:border-primary"
                    />
                  </label>
                  <button type="button" onClick={onStockSave} className="text-caption-sm font-bold text-success hover:underline pb-xs">Save</button>
                  <button type="button" onClick={onStockCancel} className="text-caption-sm text-outline hover:underline pb-xs">Cancel</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStockEditStart}
                  className={`mt-xs w-fit px-s py-xs rounded-md text-caption-xs font-bold flex items-center gap-xs transition-colors ${
                    isOut
                      ? "bg-error-container text-on-error-container"
                      : isLow
                      ? "bg-warning-container text-on-warning-container"
                      : item.stock_count === null
                      ? "bg-surface-container-high text-outline"
                      : "bg-success-container text-on-success-container"
                  }`}
                >
                  <i className={`text-sm ${ isOut ? "mgc_box_3_line" : isLow ? "mgc_alert_line" : "mgc_inventory_line" }`} />
                  {isOut
                    ? "Out of stock"
                    : item.stock_count === null
                    ? "Untracked — click to set stock"
                    : `${item.stock_count} in stock`}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-s shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                item.available ? "bg-success" : "bg-error"
              }`}
            />
            <span className="text-caption-sm font-medium text-secondary-text">
              {item.available ? "Available" : "Unavailable"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-s flex-wrap">
          <button
            type="button"
            onClick={onToggle}
            className="px-md py-s rounded-lg border border-outline-variant bg-transparent text-secondary-text text-caption-sm font-semibold hover:border-primary-text hover:text-primary-text transition-all"
          >
            {item.available ? "Mark Unavailable" : "Mark Available"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="px-md py-s rounded-lg border border-primary bg-transparent text-primary text-caption-sm font-bold hover:bg-primary hover:text-on-primary transition-all"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onEditOptions}
            className="px-md py-s rounded-lg border border-outline-variant bg-transparent text-secondary-text text-caption-sm font-semibold hover:border-primary-text hover:text-primary-text transition-all"
          >
            Options
            {(item.modifier_groups?.length ?? 0) > 0 && (
              <span className="ml-xs text-primary font-bold">
                {item.modifier_groups!.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onEditRecipe}
            className="px-md py-s rounded-lg border border-outline-variant bg-transparent text-secondary-text text-caption-sm font-semibold hover:border-primary-text hover:text-primary-text transition-all"
          >
            Recipe
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-md py-s rounded-lg border border-error bg-transparent text-error text-caption-sm font-bold hover:bg-error hover:text-on-error transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface FormProps {
  heading: string;
  form: MenuFormState;
  setForm: (next: MenuFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
  isSaving: boolean;
  uploadImage: ReturnType<typeof useAdminUploadImage>;
}

function MenuItemForm({
  heading,
  form,
  setForm,
  onCancel,
  onSubmit,
  submitLabel,
  submitting,
  isSaving,
  uploadImage,
}: FormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      const result = await uploadImage.mutateAsync(file);
      setForm({ ...form, image_url: result.url });
    } catch (err) {
      toast.error(errorMessage(err, "upload the image"));
    }
  };

  const inputClass =
    "px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors";

  return (
    <div className="rounded-md bg-surface-container-low p-l flex flex-col gap-md border border-primary">
      <h3 className="font-bold text-primary-text">{heading}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-s">
        <input
          className={inputClass}
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Price in ₦ (e.g. 2500)"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          wrapperClassName="block w-full"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <input
          className={inputClass}
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-s">
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT_ATTR}
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) handleImageUpload(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadImage.isPending}
          className="self-start inline-flex items-center gap-s py-s px-md rounded-lg border border-dashed border-primary bg-transparent text-primary text-caption-md font-semibold transition-all hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadImage.isPending ? "Uploading..." : "Upload Image"}
        </button>
        <input
          className={`w-full ${inputClass}`}
          placeholder="Or paste image URL"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
        />
        {form.image_url && (
          <img
            src={form.image_url}
            alt="Preview"
            className="w-24 h-24 object-cover rounded-lg border border-outline-variant"
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-s">
        <SecondaryButton size="md" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          size="md"
          onClick={onSubmit}
          disabled={isSaving || uploadImage.isPending}
        >
          {submitting ? "Saving..." : submitLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}
