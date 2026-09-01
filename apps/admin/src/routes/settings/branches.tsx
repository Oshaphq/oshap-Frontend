import { useState } from "react";
import {
  useAdminBranches,
  useAdminCreateBranch,
  useAdminUpdateBranch,
} from "@oshap/shared/hooks";
import { errorMessage } from "@oshap/shared";
import type { RestaurantBranch } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, QueryError, toast } from "@oshap/shared/ui";
import { useAuth } from "../../context/AuthContext";

const inputClass =
  "w-full px-md py-s rounded-sm bg-surface-container-low border border-outline-variant text-body-medium text-on-surface placeholder:text-outline outline-none focus:border-primary transition-colors";
const labelClass = "block text-body-medium font-semibold text-on-surface mb-xs";

const EMPTY = { name: "", address: "", operating_hours: "", table_count: "" };

/**
 * The venues a group runs.
 *
 * A branch is never deleted — its orders, takings and audit trail have to
 * outlive it, and a venue that closes for a refit reopens with its history
 * intact. Deactivating hides it from the switcher and stops it taking orders,
 * which is what "closed" actually means.
 */
export default function BranchesSettings() {
  const branchesQuery = useAdminBranches();
  const createBranch = useAdminCreateBranch();
  const updateBranch = useAdminUpdateBranch();
  const { activeBranchId, setActiveBranch } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RestaurantBranch | null>(null);
  const [form, setForm] = useState(EMPTY);

  const branches = branchesQuery.data ?? [];

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const startEdit = (branch: RestaurantBranch) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      address: branch.address ?? "",
      operating_hours: branch.operating_hours ?? "",
      table_count: "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Give the branch a name — staff pick it from a list.");
      return;
    }

    try {
      if (editing) {
        await updateBranch.mutateAsync({
          id: editing.id,
          payload: {
            name,
            address: form.address.trim() || null,
            operating_hours: form.operating_hours.trim() || null,
          },
        });
        toast.success(`${name} updated`);
      } else {
        // Tables come with the venue. A branch that cannot print a QR code on
        // its first day is not open, and typing twenty tables by hand before
        // serving anyone is the kind of setup people abandon halfway.
        const count = form.table_count.trim();
        const tableCount = count === "" ? undefined : Number(count);
        if (tableCount !== undefined && (!Number.isInteger(tableCount) || tableCount < 0)) {
          toast.error("Number of tables must be a whole number.");
          return;
        }
        await createBranch.mutateAsync({
          name,
          address: form.address.trim() || null,
          operating_hours: form.operating_hours.trim() || null,
          ...(tableCount !== undefined ? { table_count: tableCount } : {}),
        });
        toast.success(`${name} added`);
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    } catch (err) {
      toast.error(errorMessage(err, editing ? "update the branch" : "add the branch"));
    }
  };

  const toggleActive = async (branch: RestaurantBranch) => {
    const closing = branch.is_active;
    if (
      closing &&
      !confirm(
        `Close ${branch.name}? It stops taking orders and disappears from the branch switcher. Its history is kept, and you can reopen it any time.`,
      )
    ) {
      return;
    }
    try {
      await updateBranch.mutateAsync({
        id: branch.id,
        payload: { is_active: !branch.is_active },
      });
      toast.success(closing ? `${branch.name} closed` : `${branch.name} reopened`);
    } catch (err) {
      toast.error(errorMessage(err, closing ? "close the branch" : "reopen the branch"));
    }
  };

  if (branchesQuery.isLoading) {
    return (
      <div className="flex justify-center p-xl">
        <div className="oshap-spinner" />
      </div>
    );
  }

  if (branchesQuery.isError) {
    return (
      <QueryError
        error={branchesQuery.error}
        action="load your branches"
        onRetry={() => branchesQuery.refetch()}
      />
    );
  }

  const isSaving = createBranch.isPending || updateBranch.isPending;

  return (
    <div className="flex flex-col gap-l pb-10">
      <div className="flex items-start justify-between gap-md flex-wrap">
        <div className="flex flex-col gap-xs">
          <h3 className="font-bold text-on-surface">Branches</h3>
          <p className="text-body-medium text-on-surface-variant max-w-[52ch]">
            Each branch has its own tables, menu and staff. Switch between them
            from the top bar; figures across all of them live under Analytics.
          </p>
        </div>
        {!showForm && (
          <PrimaryButton size="md" onClick={startCreate}>
            <i className="mgc_add_line" /> Add branch
          </PrimaryButton>
        )}
      </div>

      {showForm && (
        <div className="bg-surface-container-low rounded-lg p-l flex flex-col gap-md border border-primary">
          <h4 className="font-bold text-on-surface">
            {editing ? `Edit ${editing.name}` : "New branch"}
          </h4>

          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ikeja"
            />
            <p className="text-label-small text-on-surface-variant mt-xs">
              What staff will see in the switcher. Somewhere recognisable beats
              something formal — &ldquo;Ikeja&rdquo;, not &ldquo;Branch 2&rdquo;.
            </p>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="12 Allen Avenue, Ikeja, Lagos"
            />
          </div>

          <div>
            <label className={labelClass}>Opening hours</label>
            <input
              className={inputClass}
              value={form.operating_hours}
              onChange={(e) => setForm({ ...form, operating_hours: e.target.value })}
              placeholder="Mon–Sat, 11am–11pm"
            />
          </div>

          {!editing && (
            <div>
              <label className={labelClass}>Number of tables</label>
              <input
                className={`${inputClass} max-w-[10rem]`}
                value={form.table_count}
                onChange={(e) => setForm({ ...form, table_count: e.target.value })}
                placeholder="12"
                inputMode="numeric"
              />
              <p className="text-label-small text-on-surface-variant mt-xs">
                Creates them ready to print QR codes for. You can add or remove
                tables afterwards.
              </p>
            </div>
          )}

          <div className="flex gap-s justify-end pt-s">
            <SecondaryButton
              size="md"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton size="md" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Saving…" : editing ? "Save changes" : "Add branch"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {branches.length === 0 ? (
        <p className="text-body-medium text-on-surface-variant text-center py-xl">
          No branches yet.
        </p>
      ) : (
        <div className="flex flex-col gap-md">
          {branches.map((branch) => {
            const isCurrent = branch.id === activeBranchId;
            return (
              <div
                key={branch.id}
                className={`rounded-lg p-l flex flex-wrap items-start justify-between gap-md border transition-colors ${
                  branch.is_active
                    ? "bg-surface-container-low border-outline-variant"
                    : "bg-surface-container-low border-transparent opacity-60"
                }`}
              >
                <div className="flex flex-col gap-xs min-w-0">
                  <div className="flex items-center gap-s flex-wrap">
                    <span className="font-display text-title-medium font-semibold text-on-surface">
                      {branch.name}
                    </span>
                    {isCurrent && (
                      <span className="px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider bg-primary-container text-on-primary-container">
                        Viewing
                      </span>
                    )}
                    {!branch.is_active && (
                      <span className="px-s py-xs rounded-full text-label-small font-bold uppercase tracking-wider bg-surface-container-high text-outline">
                        Closed
                      </span>
                    )}
                  </div>
                  {branch.address && (
                    <span className="text-body-medium text-on-surface-variant">
                      {branch.address}
                    </span>
                  )}
                  <span className="text-body-small text-outline">
                    {branch.table_count} table{branch.table_count === 1 ? "" : "s"}
                    {" · "}
                    {branch.staff_count} staff
                  </span>
                </div>

                <div className="flex items-center gap-s">
                  {branch.is_active && !isCurrent && (
                    <SecondaryButton size="md" onClick={() => setActiveBranch(branch.id)}>
                      Switch to
                    </SecondaryButton>
                  )}
                  <SecondaryButton size="md" onClick={() => startEdit(branch)}>
                    Edit
                  </SecondaryButton>
                  <button
                    type="button"
                    onClick={() => toggleActive(branch)}
                    className="px-md py-s rounded-sm text-body-medium font-semibold text-on-surface-variant bg-transparent border border-outline-variant hover:bg-surface-container-high transition-colors"
                  >
                    {branch.is_active ? "Close" : "Reopen"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
