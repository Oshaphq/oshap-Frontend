import { useState } from "react";
import {
  useAdminTables,
  useAdminCreateTable,
  useAdminDeleteTable,
  useAdminSettings,
} from "@oshap/shared/hooks";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
import TableQrDialog from "../../components/TableQrDialog";
import QrPrintSheet, { type QrPrintRequest } from "../../components/QrPrintSheet";
import { isLocalOrigin } from "../../utils/qr";

export default function TablesSettings() {
  const tablesQuery = useAdminTables();
  const settingsQuery = useAdminSettings();
  const createTable = useAdminCreateTable();
  const deleteTable = useAdminDeleteTable();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableId, setTableId] = useState("");
  const [qrTableId, setQrTableId] = useState<string | null>(null);
  const [printRequest, setPrintRequest] = useState<QrPrintRequest | null>(null);

  const tables = tablesQuery.data?.tables ?? [];

  const requestPrint = (tableIds: string[]) => {
    if (tableIds.length === 0) return;
    setPrintRequest({
      tableIds,
      restaurantName: settingsQuery.data?.name ?? "Oshap",
      logoUrl: settingsQuery.data?.logo_url,
    });
  };

  const handleAdd = () => {
    const id = tableId.trim();
    if (!id) return;
    createTable.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success(`Table "${id}" added`);
          setTableId("");
          setIsModalOpen(false);
        },
        onError: (err: unknown) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to add table",
          ),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteTable.mutate(id, {
      onSuccess: () => toast.success(`Table "${id}" removed`),
      onError: (err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Cannot remove table with active orders",
        ),
    });
  };

  const inputClass =
    "w-full px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors";

  if (tablesQuery.isLoading) {
    return (
      <div className="flex justify-center p-xl">
        <div className="oshap-spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-h3 font-display font-semibold text-primary-text">
            Tables
          </h2>
          <p className="text-caption-md text-secondary-text mt-xs">
            {tables.length} table{tables.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-s">
          <SecondaryButton
            size="md"
            onClick={() => requestPrint(tables.map((t) => t.id))}
            disabled={tables.length === 0}
          >
            <i className="mgc_print_line" /> Print QR Codes
          </SecondaryButton>
          <PrimaryButton size="md" onClick={() => setIsModalOpen(true)}>
            <i className="mgc_add_line" /> Add Table
          </PrimaryButton>
        </div>
      </div>

      {isLocalOrigin() && tables.length > 0 && (
        <div className="flex items-start gap-s p-md rounded-lg bg-warning-container text-on-warning-container">
          <i className="mgc_alert_line text-xl shrink-0 mt-0.5" />
          <p className="text-p2">
            QR codes currently point at <span className="font-semibold">localhost</span>,
            which guests&apos; phones can&apos;t reach. Set{" "}
            <span className="font-semibold">VITE_CUSTOMER_APP_URL</span> to your public
            customer URL before printing.
          </p>
        </div>
      )}

      <div className="bg-surface-container-low rounded-md border border-transparent hover:border-outline-variant transition-colors overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high border-b border-surface-container-highest">
              <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">
                Table ID
              </th>
              <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">
                Status
              </th>
              <th className="py-s px-md text-label-l4 font-semibold text-secondary-text text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => {
              const isPending = table.hasPending;
              const isUnpaid = table.hasUnpaid;
              const isEmpty = !isPending && !isUnpaid;
              const isDeleting =
                deleteTable.isPending &&
                deleteTable.variables === table.id;

              return (
                <tr
                  key={table.id}
                  className="border-b border-surface-container-highest last:border-none hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-s px-md text-p2 text-primary-text font-semibold font-display">
                    {table.id}
                  </td>
                  <td className="py-s px-md">
                    {isPending ? (
                      <span className="px-s py-xs rounded-4xl text-caption-xs font-bold uppercase tracking-wider bg-warning text-on-warning">
                        Verification Req.
                      </span>
                    ) : isUnpaid ? (
                      <span className="px-s py-xs rounded-4xl text-caption-xs font-bold uppercase tracking-wider bg-error-container text-on-error-container">
                        Dining
                      </span>
                    ) : (
                      <span className="px-s py-xs rounded-4xl text-caption-xs font-bold uppercase tracking-wider bg-surface-container-high text-outline">
                        Empty
                      </span>
                    )}
                  </td>
                  <td className="py-s px-md text-right">
                    <button
                      onClick={() => setQrTableId(table.id)}
                      title={`Show QR code for ${table.id}`}
                      aria-label={`Show QR code for ${table.id}`}
                      className="p-xs text-secondary-text hover:text-primary transition-colors"
                    >
                      <i className="mgc_qrcode_line text-lg" />
                    </button>
                    <button
                      onClick={() => handleDelete(table.id)}
                      disabled={!isEmpty || isDeleting}
                      title={isEmpty ? "Remove table" : "Cannot remove table with active orders"}
                      className="p-xs text-secondary-text hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <i className="mgc_loading_line animate-spin text-lg" />
                      ) : (
                        <i className="mgc_delete_line text-lg" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {tables.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="p-xl text-center text-secondary-text"
                >
                  No tables configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md">
          <div className="w-full max-w-[400px] rounded-md bg-surface-container-high p-l flex flex-col gap-md border border-primary shadow-xl">
            <h3 className="font-bold text-primary-text">Add Table</h3>
            <div>
              <label className="block text-caption-md font-semibold text-primary-text mb-xs">
                Table ID / Name
              </label>
              <input
                type="text"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. T14, VIP 1, Bar 2"
                className={inputClass}
                autoFocus
              />
              <p className="text-caption-xs text-secondary-text mt-xs">
                This ID will appear on the QR code for this table.
              </p>
            </div>
            <div className="flex justify-end gap-s pt-s">
              <SecondaryButton
                size="md"
                onClick={() => {
                  setTableId("");
                  setIsModalOpen(false);
                }}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                size="md"
                onClick={handleAdd}
                disabled={!tableId.trim() || createTable.isPending}
              >
                {createTable.isPending ? "Adding..." : "Add Table"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {qrTableId && (
        <TableQrDialog
          tableId={qrTableId}
          onClose={() => setQrTableId(null)}
          onPrint={() => {
            requestPrint([qrTableId]);
            setQrTableId(null);
          }}
        />
      )}

      <QrPrintSheet request={printRequest} onDone={() => setPrintRequest(null)} />
    </div>
  );
}
