import { useState } from "react";
import {
  errorMessage,
  formatCurrency,
  nairaToKobo,
  useAdminCreateModifierGroup,
  useAdminCreateModifierOption,
  useAdminDeleteModifierGroup,
  useAdminDeleteModifierOption,
  useAdminModifierGroups,
  useAdminUpdateModifierGroup,
  useAdminUpdateModifierOption,
} from "@oshap/shared";
import type { ModifierGroup } from "@oshap/shared";
import {
  Checkbox,
  Dialog,
  PrimaryButton,
  SecondaryButton,
  TextField,
  toast,
} from "@oshap/shared/ui";


/**
 * Manages the restaurant's reusable option groups.
 *
 * Groups are deliberately edited here rather than inside a dish: one "Protein"
 * group is shared by every rice dish, so editing it from a single item would
 * imply a change scoped to that item and silently change all of them.
 */
export default function ModifierGroupsDialog({ onClose }: { onClose: () => void }) {
  const groupsQuery = useAdminModifierGroups();
  const createGroup = useAdminCreateModifierGroup();
  const deleteGroup = useAdminDeleteModifierGroup();

  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = groupsQuery.data ?? [];

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createGroup.mutate(
      { name, required: false, min: 0, max: 1 },
      {
        onSuccess: (group) => {
          toast.success(`"${name}" created`);
          setNewName("");
          setExpanded(group.id);
        },
        onError: (e: unknown) =>
          toast.error(errorMessage(e, "create the group")),
      },
    );
  };

  const handleDelete = (group: ModifierGroup) => {
    deleteGroup.mutate(group.id, {
      onSuccess: () => toast.success(`"${group.name}" deleted`),
      onError: (e: unknown) =>
        toast.error(errorMessage(e, "delete the group")),
    });
  };

  return (
    <Dialog
      onClose={onClose}
      title="Options"
      subtitle={
        <>
          Sizes, extras and choices. Attach a group to as many dishes as you
          like — editing it once updates all of them.
        </>
      }
      size="xl"
      scrollable
      footer={
        <>
            <TextField
              wrapperClassName="flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="New group name — e.g. Size"
              aria-label="New group name"
            />
            <PrimaryButton
              size="md"
              onClick={handleCreate}
              disabled={!newName.trim() || createGroup.isPending}
            >
              {createGroup.isPending ? "Adding…" : "Add group"}
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
            No option groups yet. Create one below — for example
            &ldquo;Size&rdquo; or &ldquo;Spice level&rdquo;.
          </p>
        ) : (
          groups.map((group) => (
            <GroupRow
              key={group.id}
              group={group}
              isOpen={expanded === group.id}
              onToggle={() =>
                setExpanded((id) => (id === group.id ? null : group.id))
              }
              onDelete={() => handleDelete(group)}
            />
          ))
        )}
    </Dialog>
  );
}

function GroupRow({
  group,
  isOpen,
  onToggle,
  onDelete,
}: {
  group: ModifierGroup;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const updateGroup = useAdminUpdateModifierGroup();
  const createOption = useAdminCreateModifierOption();
  const updateOption = useAdminUpdateModifierOption();
  const deleteOption = useAdminDeleteModifierOption();

  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("");

  const addOption = () => {
    const name = optionName.trim();
    if (!name) return;
    // Merchants type naira; everything below this line is kobo.
    const naira = Number(optionPrice || "0");
    if (Number.isNaN(naira)) {
      toast.error("Extra cost must be a number");
      return;
    }
    createOption.mutate(
      { groupId: group.id, payload: { name, price_delta: nairaToKobo(naira) } },
      {
        onSuccess: () => {
          setOptionName("");
          setOptionPrice("");
        },
        onError: (e: unknown) =>
          toast.error(errorMessage(e, "add the option")),
      },
    );
  };

  return (
    <section className="rounded-lg bg-surface-container-low border border-outline-variant overflow-hidden">
      <div className="flex items-center justify-between gap-md p-md">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex items-center gap-s flex-1 min-w-0 text-left"
        >
          <i
            className={`mgc_right_line text-lg text-on-surface-variant transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          />
          <span className="text-title-medium font-semibold text-on-surface truncate">
            {group.name}
          </span>
          <span className="text-body-small text-on-surface-variant shrink-0">
            {group.options.length} option{group.options.length === 1 ? "" : "s"}
            {group.required ? " · required" : ""}
          </span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${group.name}`}
          title="Delete group — it will be removed from every dish using it"
          className="p-xs text-on-surface-variant hover:text-error transition-colors"
        >
          <i className="mgc_delete_line text-lg" />
        </button>
      </div>

      {isOpen && (
        <div className="px-md pb-md flex flex-col gap-md border-t border-outline-variant pt-md">
          <div className="flex flex-wrap items-center gap-md">
            <Checkbox
              checked={group.required}
              onChange={(required) =>
                updateGroup.mutate({
                  id: group.id,
                  payload: {
                    required,
                    // A required group that still allows zero picks can never
                    // be satisfied, so raise the floor with it.
                    min: required ? Math.max(1, group.min) : 0,
                  },
                })
              }
              label="Guest must choose"
              className="items-center"
            />
            <label className="flex items-center gap-s text-body-medium text-on-surface-variant">
              Max choices
              <TextField
                type="number"
                min={1}
                value={group.max}
                onChange={(e) =>
                  updateGroup.mutate({
                    id: group.id,
                    payload: { max: Math.max(1, Number(e.target.value) || 1) },
                  })
                }
                aria-label={`Maximum choices for ${group.name}`}
                wrapperClassName="w-20"
              />
            </label>
          </div>

          <div className="flex flex-col rounded-lg bg-surface-container overflow-hidden">
            {group.options.length === 0 && (
              <p className="text-body-medium text-on-surface-variant px-md py-s">
                No options yet.
              </p>
            )}
            {group.options.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-s px-md py-s border-b border-outline-variant/40 last:border-none"
              >
                <span className="flex-1 text-body-medium text-on-surface min-w-0 truncate">
                  {option.name}
                </span>
                <span className="text-label-medium text-on-surface-variant tabular-nums">
                  {option.price_delta === 0
                    ? "—"
                    : `${option.price_delta > 0 ? "+" : "−"}${formatCurrency(
                        Math.abs(option.price_delta),
                      )}`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateOption.mutate({
                      id: option.id,
                      payload: { available: !option.available },
                    })
                  }
                  className={`px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider transition-colors ${
                    option.available
                      ? "bg-surface-container-high text-on-surface-variant"
                      : "bg-error-container text-on-error-container"
                  }`}
                >
                  {option.available ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteOption.mutate(option.id)}
                  aria-label={`Delete ${option.name}`}
                  className="p-xs text-on-surface-variant hover:text-error transition-colors"
                >
                  <i className="mgc_delete_line" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-s">
            <TextField
              wrapperClassName="flex-1"
              value={optionName}
              onChange={(e) => setOptionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOption()}
              placeholder="Option name"
              aria-label={`New option for ${group.name}`}
            />
            <TextField
              wrapperClassName="w-32"
              value={optionPrice}
              onChange={(e) => setOptionPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOption()}
              placeholder="+₦0"
              inputMode="decimal"
              aria-label="Extra cost in naira"
            />
            <SecondaryButton
              size="md"
              onClick={addOption}
              disabled={!optionName.trim() || createOption.isPending}
            >
              Add
            </SecondaryButton>
          </div>
        </div>
      )}
    </section>
  );
}
