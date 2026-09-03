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
  "w-full px-md py-s rounded-sm bg-surface-container-low border border-outline-variant text-body-medium text-on-surface placeholder:text-on-surface-placeholder outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-body-medium font-semibold text-on-surface mb-xs";

/**
 * Manages payout accounts.
 *
 * Restaurants hold several because bank transfers fail often enough that one
 * account is a single point of failure. Guests are offered the default first,
 * then the rest ordered by how often payments into them actually get verified.
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
  const isBusy = updateAccount.isPending || deleteAccount.isPending;
  const isDraftValid =
    draft.bank_name.trim() !== "" &&
    draft.account_number.trim() !== "" &&
    draft.account_name.trim() !== "";

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setIsAdding(false);
  };

  const fail = (err: unknown, fallback: string) =>
    toast.error(err instanceof Error ? err.message : fallback);

  const handleCreate = () => {
    if (!isDraftValid) return;
    createAccount.mutate(
      { ...draft, is_default: list.length === 0 },
      {
        onSuccess: () => {
          resetDraft();
          toast.success("Bank account added");
        },
        onError: (err) => fail(err, "Failed to add bank account"),
      },
    );
  };

  const handleMakeDefault = (account: BankAccount) => {
    updateAccount.mutate(
      { id: account.id, payload: { is_default: true } },
      {
        onSuccess: () =>
          toast.success(`Guests will now be shown ${account.bank_name} first`),
        onError: (err) => fail(err, "Failed to set default account"),
      },
    );
  };

  const handleToggleActive = (account: BankAccount) => {
    updateAccount.mutate(
      { id: account.id, payload: { is_active: !account.is_active } },
      {
        onSuccess: () =>
          toast.success(
            account.is_active
              ? `${account.bank_name} hidden from guests`
              : `${account.bank_name} is live again`,
          ),
        onError: (err) => fail(err, "Failed to update account"),
      },
    );
  };

  const handleDelete = (account: BankAccount) => {
    deleteAccount.mutate(account.id, {
      onSuccess: () => {
        setPendingDeleteId(null);
        toast.success("Bank account removed");
      },
      onError: (err) => fail(err, "Failed to remove account"),
    });
  };

  return (
    <div className="bg-surface-container-low rounded-lg p-l flex flex-col gap-md border border-transparent hover:border-outline-variant transition-colors">
      <div className="flex items-start justify-between gap-md">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-on-surface">Bank Accounts</h3>
          <p className="text-body-medium text-on-surface-variant">
            Guests are shown the default first, then the rest as fallbacks.
          </p>
        </div>
        {canEdit && !isAdding && (
          <SecondaryButton size="md" onClick={() => setIsAdding(true)}>
            <i className="mgc_add_line" /> Add
          </SecondaryButton>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-l">
          <div className="oshap-spinner" />
        </div>
      ) : list.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center gap-xs py-l px-md text-center rounded-sm bg-surface-container">
          <i className="mgc_bank_card_line text-3xl text-on-surface-variant" />
          <p className="text-body-medium text-on-surface-variant">
            No bank account yet — guests can only pay by POS.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-s">
          {list.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              canEdit={canEdit}
              isBusy={isBusy}
              isConfirmingDelete={pendingDeleteId === account.id}
              onMakeDefault={() => handleMakeDefault(account)}
              onToggleActive={() => handleToggleActive(account)}
              onRequestDelete={() => setPendingDeleteId(account.id)}
              onCancelDelete={() => setPendingDeleteId(null)}
              onConfirmDelete={() => handleDelete(account)}
            />
          ))}
        </div>
      )}

      {isAdding && (
        <div className="flex flex-col gap-md p-md rounded-sm bg-surface-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div>
              <label className={labelClass} htmlFor="bank-name">
                Bank Name
              </label>
              <input
                id="bank-name"
                type="text"
                value={draft.bank_name}
                onChange={(e) => setDraft((d) => ({ ...d, bank_name: e.target.value }))}
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
  onMakeDefault: () => void;
  onToggleActive: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

/** Success rate as a percentage, or null when the account has no history yet. */
function successRate(account: BankAccount): number | null {
  const ok = account.success_count ?? 0;
  const bad = account.failure_count ?? 0;
  if (ok + bad === 0) return null;
  return Math.round((ok / (ok + bad)) * 100);
}

function AccountRow({
  account,
  canEdit,
  isBusy,
  isConfirmingDelete,
  onMakeDefault,
  onToggleActive,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: AccountRowProps) {
  const rate = successRate(account);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-s p-md rounded-sm bg-surface-container ${
        account.is_active ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-s flex-wrap">
          <span className="text-title-medium font-semibold text-on-surface truncate">
            {account.bank_name}
          </span>
          {account.is_default && (
            <span className="shrink-0 px-s py-0.5 rounded-full bg-success-container text-on-success-container text-label-small font-semibold uppercase tracking-wider">
              Default
            </span>
          )}
          {!account.is_active && (
            <span className="shrink-0 px-s py-0.5 rounded-full bg-surface-container-high text-outline text-label-small font-semibold uppercase tracking-wider">
              Hidden
            </span>
          )}
        </div>
        <span className="text-label-medium text-on-surface-variant tracking-wider">
          {account.account_number}
        </span>
        <span className="text-body-medium text-on-surface-variant truncate">
          {account.account_name}
          {rate !== null && (
            <>
              {" · "}
              <span className={rate < 70 ? "text-error font-semibold" : ""}>
                {rate}% verified
              </span>
            </>
          )}
        </span>
      </div>

      {canEdit && (
        <div className="flex items-center gap-s shrink-0">
          {isConfirmingDelete ? (
            <>
              <button
                type="button"
                onClick={onCancelDelete}
                className="text-body-medium text-on-surface-variant hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isBusy}
                className="text-body-medium font-semibold text-error hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              {!account.is_default && account.is_active && (
                <button
                  type="button"
                  onClick={onMakeDefault}
                  disabled={isBusy}
                  className="text-body-medium font-semibold text-primary-label hover:underline disabled:opacity-50"
                >
                  Make default
                </button>
              )}
              <button
                type="button"
                onClick={onToggleActive}
                disabled={isBusy}
                className="text-body-medium text-on-surface-variant hover:underline disabled:opacity-50"
              >
                {account.is_active ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={onRequestDelete}
                aria-label={`Remove ${account.bank_name} account`}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
              >
                <i className="mgc_delete_line" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
