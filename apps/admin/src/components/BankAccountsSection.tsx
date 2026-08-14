import { useState } from "react";
import {
  useAdminBankAccounts,
  useAdminCreateBankAccount,
  useAdminDeleteBankAccount,
  useAdminUpdateBankAccount,
} from "@oshap/shared/hooks";
import type { BankAccount } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";

const EMPTY_DRAFT = { bank_name: "", account_number: "", account_name: "" };

const inputClass =
  "w-full px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass =
  "block text-caption-md font-semibold text-primary-text mb-xs";

/**
 * Manages the restaurant's payout accounts. Exactly one is active at a time —
 * that's the account the customer pay screen tells people to transfer to, so
 * activating one here changes what every guest sees.
 */
export default function BankAccountsSection({ canEdit }: { canEdit: boolean }) {
  const { data: accounts, isLoading } = useAdminBankAccounts();
  const createAccount = useAdminCreateBankAccount();
  const updateAccount = useAdminUpdateBankAccount();
  const deleteAccount = useAdminDeleteBankAccount();

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const list = accounts ?? [];
  const isDraftValid =
    draft.bank_name.trim() !== "" &&
    draft.account_number.trim() !== "" &&
    draft.account_name.trim() !== "";

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setIsAdding(false);
  };

  const handleCreate = () => {
    if (!isDraftValid) return;
    createAccount.mutate(
      { ...draft, is_active: list.length === 0 },
      {
        onSuccess: () => {
          resetDraft();
          toast.success("Bank account added");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to add bank account",
          ),
      },
    );
  };

  const handleActivate = (account: BankAccount) => {
    updateAccount.mutate(
      { id: account.id, payload: { is_active: true } },
      {
        onSuccess: () =>
          toast.success(`Customers will now pay into ${account.bank_name}`),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to activate account",
          ),
      },
    );
  };

  const handleDelete = (account: BankAccount) => {
    deleteAccount.mutate(account.id, {
      onSuccess: () => {
        setPendingDeleteId(null);
        toast.success("Bank account removed");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to remove account",
        ),
    });
  };

  return (
    <div className="bg-surface-container-low rounded-md p-l flex flex-col gap-md border border-transparent hover:border-outline-variant transition-colors">
      <div className="flex items-start justify-between gap-md">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-primary-text">Bank Accounts</h3>
          <p className="text-caption-md text-secondary-text">
            Customers are told to transfer to the active account.
          </p>
        </div>
        {canEdit && !isAdding && (
          <SecondaryButton size="md" onClick={() => setIsAdding(true)}>
            <i className="mgc_add_line" />
            Add
          </SecondaryButton>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-l">
          <div className="oshap-spinner" />
        </div>
      ) : list.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center gap-xs py-l px-md text-center rounded-lg bg-surface-container">
          <i className="mgc_bank_card_line text-3xl text-outline-variant" />
          <p className="text-p2 text-secondary-text">
            No bank account yet — customers can only pay by POS.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-s">
          {list.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              canEdit={canEdit}
              isBusy={updateAccount.isPending || deleteAccount.isPending}
              isConfirmingDelete={pendingDeleteId === account.id}
              onActivate={() => handleActivate(account)}
              onRequestDelete={() => setPendingDeleteId(account.id)}
              onCancelDelete={() => setPendingDeleteId(null)}
              onConfirmDelete={() => handleDelete(account)}
            />
          ))}
        </div>
      )}

      {isAdding && (
        <div className="flex flex-col gap-md p-md rounded-lg bg-surface-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div>
              <label className={labelClass} htmlFor="bank-name">
                Bank Name
              </label>
              <input
                id="bank-name"
                type="text"
                value={draft.bank_name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bank_name: e.target.value }))
                }
                className={inputClass}
                placeholder="Access Bank"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="account-number">
                Account Number
              </label>
              <input
                id="account-number"
                type="text"
                inputMode="numeric"
                value={draft.account_number}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, account_number: e.target.value }))
                }
                className={inputClass}
                placeholder="0123456789"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="account-name">
                Account Name
              </label>
              <input
                id="account-name"
                type="text"
                value={draft.account_name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, account_name: e.target.value }))
                }
                className={inputClass}
                placeholder="Aji's Kitchen Ltd"
              />
            </div>
          </div>
          <div className="flex justify-end gap-s">
            <SecondaryButton size="md" onClick={resetDraft}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              size="md"
              onClick={handleCreate}
              disabled={!isDraftValid || createAccount.isPending}
            >
              {createAccount.isPending ? "Adding…" : "Add Account"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

interface AccountRowProps {
  account: BankAccount;
  canEdit: boolean;
  isBusy: boolean;
  isConfirmingDelete: boolean;
  onActivate: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function AccountRow({
  account,
  canEdit,
  isBusy,
  isConfirmingDelete,
  onActivate,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: AccountRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-s p-md rounded-lg bg-surface-container">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-s">
          <span className="text-label-l3 font-semibold text-primary-text truncate">
            {account.bank_name}
          </span>
          {account.is_active && (
            <span className="shrink-0 px-s py-0.5 rounded-4xl bg-success-container text-on-success-container text-caption-xs font-semibold uppercase tracking-wider">
              Active
            </span>
          )}
        </div>
        <span className="text-label-l5 text-secondary-text tracking-wider">
          {account.account_number}
        </span>
        <span className="text-caption-md text-secondary-text truncate">
          {account.account_name}
        </span>
      </div>

      {canEdit && (
        <div className="flex items-center gap-s shrink-0">
          {isConfirmingDelete ? (
            <>
              <button
                type="button"
                onClick={onCancelDelete}
                className="text-caption-md text-secondary-text hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isBusy}
                className="text-caption-md font-semibold text-error hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              {!account.is_active && (
                <button
                  type="button"
                  onClick={onActivate}
                  disabled={isBusy}
                  className="text-caption-md font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  Set active
                </button>
              )}
              <button
                type="button"
                onClick={onRequestDelete}
                aria-label={`Remove ${account.bank_name} account`}
                className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
              >
                <i className="mgc_delete_2_line" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
