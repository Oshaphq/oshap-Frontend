import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import {
  useAdminMenu,
  useAdminCreateMenuItem,
  useAdminUpdateMenuItem,
  useAdminToggleMenuItem,
  useAdminDeleteMenuItem,
  useAdminUploadImage,
  formatCurrency,
} from "@oshap/shared";
import type { MenuItem } from "@oshap/shared";

export default function MenuPage() {
  const menuQuery = useAdminMenu();
  const createItem = useAdminCreateMenuItem();
  const updateItem = useAdminUpdateMenuItem();
  const toggleItem = useAdminToggleMenuItem();
  const deleteItem = useAdminDeleteMenuItem();
  const uploadImage = useAdminUploadImage();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Meals",
    description: "",
    image_url: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    try {
      const result = await uploadImage.mutateAsync(file);
      setForm((prev) => ({ ...prev, image_url: result.url }));
    } catch {
      alert("Upload failed. Please try again.");
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.price || !form.category) {
      alert("Name, price, and category are required.");
      return;
    }
    try {
      await createItem.mutateAsync({
        name: form.name,
        price: Number(form.price),
        category: form.category,
        description: form.description || undefined,
        image_url: form.image_url || undefined,
      });
      setShowNewForm(false);
      setForm({
        name: "",
        price: "",
        category: "Meals",
        description: "",
        image_url: "",
      });
    } catch {
      alert("Failed to create item");
    }
  };

  const handleSave = async (id: string) => {
    try {
      await updateItem.mutateAsync({
        id,
        payload: {
          name: form.name,
          price: Number(form.price),
          category: form.category,
          description: form.description || undefined,
          image_url: form.image_url || undefined,
        },
      });
      setEditingId(null);
    } catch {
      alert("Failed to save");
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description ?? "",
      image_url: item.image_url ?? "",
    });
  };

  const handleToggleAvailable = async (id: string, available: boolean) => {
    try {
      await toggleItem.mutateAsync({ id, available: !available });
    } catch {
      alert("Failed to update item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await deleteItem.mutateAsync(id);
    } catch {
      alert("Failed to delete");
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

  const items = menuQuery.data ?? [];
  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <main className="p-md">
      <header className="flex items-center justify-between mb-lg">
        <h1 className="text-display-h1 font-bold text-primary-text">
          Menu Management
        </h1>
        <button
          className="px-lg py-s rounded-xl bg-primary text-on-primary text-label-l5 font-semibold transition-opacity hover:opacity-90"
          onClick={() => {
            setShowNewForm(true);
            setEditingId(null);
            setForm({
              name: "",
              price: "",
              category: "Meals",
              description: "",
              image_url: "",
            });
          }}
        >
          + Add Item
        </button>
      </header>

      <div className="max-w-3xl">
        {showNewForm && (
          <div className="mb-lg bg-surface-container-low rounded-2xl border border-outline-variant p-lg">
            <h3 className="text-display-h3 font-semibold text-primary-text mb-md">
              New Menu Item
            </h3>
            <div className="flex flex-col gap-md">
              <input
                className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                placeholder="Name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
              <input
                className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                placeholder="Price (e.g. 2500)"
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
              />
              <select
                className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text outline-none focus:border-primary transition-colors"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                <option>Meals</option>
                <option>Grills</option>
                <option>Drinks</option>
                <option>Sides</option>
              </select>
              <input
                className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />

              <div className="flex flex-col gap-s">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                  }}
                />
                <div className="flex items-center gap-s">
                  <button
                    type="button"
                    className="px-lg py-s rounded-xl bg-surface-container-high text-label-l5 font-semibold text-primary-text hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadImage.isPending}
                  >
                    {uploadImage.isPending ? "Uploading..." : "Upload Image"}
                  </button>
                  <input
                    className="flex-1 px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                    placeholder="Or paste image URL"
                    value={form.image_url}
                    onChange={(e) =>
                      setForm({ ...form, image_url: e.target.value })
                    }
                  />
                </div>
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-xl border border-outline-variant"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-s mt-lg">
              <button
                className="px-lg py-s rounded-xl border border-outline-variant text-label-l5 text-secondary-text hover:bg-surface-container-high transition-colors"
                onClick={() => setShowNewForm(false)}
              >
                Cancel
              </button>
              <button
                className="px-lg py-s rounded-xl bg-primary text-on-primary text-label-l5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                onClick={handleCreate}
                disabled={isSaving || uploadImage.isPending}
              >
                {createItem.isPending ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-s">
          {items.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-lg transition-colors ${
                  !item.available
                    ? "bg-surface-container-low opacity-60"
                    : "bg-surface-container-low border-outline-variant"
                }`}
              >
                {isEditing ? (
                  <div>
                    <h3 className="text-display-h3 font-semibold text-primary-text mb-md">
                      Edit {item.name}
                    </h3>
                    <div className="flex flex-col gap-md">
                      <input
                        className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                      <input
                        className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                        placeholder="Price"
                        type="number"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: e.target.value })
                        }
                      />
                      <select
                        className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text outline-none focus:border-primary transition-colors"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                      >
                        <option>Meals</option>
                        <option>Grills</option>
                        <option>Drinks</option>
                        <option>Sides</option>
                      </select>
                      <input
                        className="px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                        placeholder="Description"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />

                      <div className="flex flex-col gap-s">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(f);
                          }}
                        />
                        <div className="flex items-center gap-s">
                          <button
                            type="button"
                            className="px-lg py-s rounded-xl bg-surface-container-high text-label-l5 font-semibold text-primary-text hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadImage.isPending}
                          >
                            {uploadImage.isPending
                              ? "Uploading..."
                              : "Upload Image"}
                          </button>
                          <input
                            className="flex-1 px-lg py-md rounded-xl bg-surface border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
                            placeholder="Or paste image URL"
                            value={form.image_url}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                image_url: e.target.value,
                              })
                            }
                          />
                        </div>
                        {form.image_url && (
                          <img
                            src={form.image_url}
                            alt="Preview"
                            className="w-24 h-24 object-cover rounded-xl border border-outline-variant"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-s mt-lg">
                      <button
                        className="px-lg py-s rounded-xl border border-outline-variant text-label-l5 text-secondary-text hover:bg-surface-container-high transition-colors"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-lg py-s rounded-xl bg-primary text-on-primary text-label-l5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        onClick={() => handleSave(item.id)}
                        disabled={isSaving || uploadImage.isPending}
                      >
                        {updateItem.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className="text-label-l4 font-semibold text-primary-text">
                          {item.name}
                        </span>
                        <span className="text-caption text-secondary-text">
                          {item.category} · {formatCurrency(item.price)}
                        </span>
                        {item.description && (
                          <span className="text-caption text-secondary-text mt-s">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-s">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.available ? "bg-success" : "bg-error"
                          }`}
                        />
                        <span className="text-caption text-secondary-text">
                          {item.available ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-s mt-md pt-md border-t border-outline-variant">
                      <button
                        className="px-md py-s rounded-xl border border-outline-variant text-label-l5 text-secondary-text hover:bg-surface-container-high transition-colors"
                        onClick={() =>
                          handleToggleAvailable(item.id, item.available)
                        }
                      >
                        {item.available ? "Mark Unavailable" : "Mark Available"}
                      </button>
                      <button
                        className="px-md py-s rounded-xl bg-primary-container text-on-primary-container text-label-l5 font-semibold hover:opacity-80 transition-opacity"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-md py-s rounded-xl bg-error/10 text-error text-label-l5 font-semibold hover:opacity-80 transition-opacity"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-md text-secondary-text">
              <i className="mgc_cook_line text-5xl opacity-30" />
              <p>No menu items yet. Click "+ Add Item" to create one.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
