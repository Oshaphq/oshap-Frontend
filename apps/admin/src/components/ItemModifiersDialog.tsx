import { useState } from "react";
import {
  errorMessage,
  formatCurrency,
  useAdminModifierGroups,
  useAdminSetMenuItemGroups,
} from "@oshap/shared";
import type { MenuItem } from "@oshap/shared";
import {
  Dialog,
  PrimaryButton,
  SecondaryButton,
  toast,
} from "@oshap/shared/ui";

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
    <Dialog
      onClose={onClose}
      title={<>Options for {item.name}</>}
      subtitle="Guests will be asked to choose before adding this to their order."
      size="lg"
      scrollable
      bodyClassName="gap-s"
      footer={
        <>
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
        </>
      }
    >
      {groupsQuery.isLoading ? (
        <div className="flex justify-center py-xl">
          <div className="oshap-spinner" />
        </div>
      ) : groups.length === 0 ? (
        <p className="text-body-medium text-on-surface-variant text-center py-l">
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
              className={`flex items-start gap-s p-md rounded-lg text-left border transition-colors ${
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
                <span className="text-title-medium font-semibold text-on-surface">
                  {group.name}
                  {group.required && (
                    <span className="text-label-small text-on-surface-variant font-normal ml-s">
                      required
                    </span>
                  )}
                </span>
                <span className="text-body-medium text-on-surface-variant">
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
      )}    </Dialog>
);
}
