import { useState } from "react";
import {
  errorMessage,
  formatCurrency,
  useAdminModifierGroups,
  useAdminSetMenuItemGroups,
} from "@oshap/shared";
import type { MenuItem } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";

interface Props {
  item: MenuItem;
  onClose: () => void;
}

/**
 * Chooses which option groups a dish offers.
 *
 * Attachment only — the groups themselves are edited in one place, so this
 * can't accidentally imply that renaming an option here affects only this
 * dish when it would in fact change every dish sharing the group.
 */
export default function ItemModifiersDialog({ item, onClose }: Props) {
  const groupsQuery = useAdminModifierGroups();
  const setGroups = useAdminSetMenuItemGroups();

  const [selected, setSelected] = useState<string[]>(
    () => item.modifier_groups?.map((g) => g.id) ?? [],
  );

  const groups = groupsQuery.data ?? [];

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );

  const handleSave = () => {
    setGroups.mutate(
      { itemId: item.id, payload: { group_ids: selected } },
      {
        onSuccess: () => {
          toast.success(`Options updated for ${item.name}`);
          onClose();
        },
        onError: (e: unknown) =>
          toast.error(errorMessage(e, "save the options")),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md">
      <div className="w-full max-w-[520px] max-h-[85vh] rounded-md bg-surface-container-high flex flex-col border border-outline-variant shadow-xl">
        <header className="flex items-start justify-between gap-md p-l border-b border-outline-variant">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="font-display text-display-h3 font-semibold text-primary-text truncate">
              Options for {item.name}
            </h2>
            <p className="text-caption-md text-secondary-text">
              Guests will be asked to choose before adding this to their order.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-4xl bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            <i className="mgc_close_line text-xl" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-l flex flex-col gap-s">
          {groupsQuery.isLoading ? (
            <div className="flex justify-center py-xl">
              <div className="oshap-spinner" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-p2 text-secondary-text text-center py-l">
              No option groups exist yet. Create one from{" "}
              <span className="font-semibold">Options</span> on the menu screen
              first.
            </p>
          ) : (
            groups.map((group) => {
              const isOn = selected.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  role="checkbox"
                  aria-checked={isOn}
                  onClick={() => toggle(group.id)}
                  className={`flex items-start gap-s p-md rounded-md text-left border transition-colors ${
                    isOn
                      ? "border-primary bg-primary-container/40"
                      : "border-outline-variant bg-surface-container hover:bg-surface-container-highest"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-5 h-5 mt-0.5 shrink-0 flex items-center justify-center rounded-xs border-2 transition-colors ${
                      isOn
                        ? "bg-primary border-primary text-on-primary"
                        : "border-outline"
                    }`}
                  >
                    {isOn && <i className="mgc_check_line text-xs font-bold" />}
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-label-l3 font-semibold text-primary-text">
                      {group.name}
                      {group.required && (
                        <span className="text-caption-xs text-secondary-text font-normal ml-s">
                          required
                        </span>
                      )}
                    </span>
                    <span className="text-caption-md text-secondary-text">
                      {group.options.length === 0
                        ? "No options yet"
                        : group.options
                            .map((o) =>
                              o.price_delta === 0
                                ? o.name
                                : `${o.name} +${formatCurrency(o.price_delta)}`,
                            )
                            .join(" · ")}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <footer className="p-l border-t border-outline-variant flex justify-end gap-s">
          <SecondaryButton size="md" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            size="md"
            onClick={handleSave}
            disabled={setGroups.isPending}
          >
            {setGroups.isPending ? "Saving…" : "Save"}
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
}
