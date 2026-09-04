import { useState } from "react";
import {
  useAdminTables,
  useAdminCreateTable,
  useAdminDeleteTable,
  useAdminSettings,
} from "@oshap/shared/hooks";
import { errorMessage, getAdminRestaurantId } from "@oshap/shared";
import {
  Button,
  DataTable,
  Dialog,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Spinner,
  TextField,
  toast,
} from "@oshap/shared/ui";
import TableQrDialog from "../../components/TableQrDialog";
import QrPrintSheet, {
  type QrPrintRequest,
  type QrPrintTable,
} from "../../components/QrPrintSheet";
import { isLocalOrigin, isOriginUnusable } from "../../utils/qr";
import { qrPrintedKey } from "../../components/SetupChecklist";

export default function TablesSettings() {
  const tablesQuery = useAdminTables();
  const settingsQuery = useAdminSettings();
  const createTable = useAdminCreateTable();
  const deleteTable = useAdminDeleteTable();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableId, setTableId] = useState("");
  const [qrTable, setQrTable] = useState<QrPrintTable | null>(null);
  const [printRequest, setPrintRequest] = useState<QrPrintRequest | null>(null);

  const tables = tablesQuery.data?.tables ?? [];

  const requestPrint = (tablesToPrint: QrPrintTable[]) => {
    if (tablesToPrint.length === 0) return;
    // Marks the checklist step done. Nothing server-side records that paper
    // came out of a printer, so this is the only signal available — and a
    // false positive here costs a ticked box, not a broken restaurant.
    const restaurantId = getAdminRestaurantId();
    if (restaurantId) {
      try {
        localStorage.setItem(qrPrintedKey(restaurantId), "true");
      } catch {
        // Non-fatal.
      }
    }
    setPrintRequest({
      tables: tablesToPrint,
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
          toast.error(errorMessage(err, "add the table")),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteTable.mutate(id, {
      onSuccess: () => toast.success(`Table "${id}" removed`),
      onError: (err: unknown) =>
        toast.error(errorMessage(err, "remove the table")),
    });
  };

  if (tablesQuery.isLoading) {
    return (
      <div className="flex justify-center p-xl">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md pb-10">
      <div className="flex items-center justify-between gap-md flex-wrap">
        {/* The count stays; the title does not. The section wrapper names the
            screen already. */}
        <p className="text-body-medium text-on-surface-variant">
          {tables.length} table{tables.length !== 1 ? "s" : ""} configured
        </p>
        <div className="flex items-center gap-s">
          <Button
            variant="text"
            size="md"
            onClick={() =>
              requestPrint(
                tables.map((t) => ({ uuid: t.id, name: t.table_id })),
              )
            }
            disabled={tables.length === 0}
          >
            <i className="mgc_print_line" /> Print QR Codes
          </Button>
          <PrimaryButton size="md" onClick={() => setIsModalOpen(true)}>
            <i className="mgc_add_line" /> Add Table
          </PrimaryButton>
        </div>
      </div>

      {isOriginUnusable() && tables.length > 0 && (
        <div className="flex items-start gap-s p-md rounded-sm bg-warning-container text-on-warning-container">
          <i className="mgc_alert_line text-xl shrink-0 mt-0.5" />
          <p className="text-body-medium">
            {isLocalOrigin() ? (
              <>
                QR codes currently point at{" "}
                <span className="font-semibold">localhost</span>, which
                guests&apos; phones can&apos;t reach. Set{" "}
                <span className="font-semibold">VITE_CUSTOMER_APP_URL</span> to
                your public customer URL before printing.
              </>
            ) : (
              <>
                <span className="font-semibold">VITE_CUSTOMER_APP_URL</span> is
                missing <span className="font-semibold">https://</span>. Codes
                generated here now add it, but any already printed encode a bare
                domain, which is text rather than a link — some phones will open
                it, some will not.{" "}
                <span className="font-semibold">
                  Reprint anything already on a table.
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {/* Three short columns. The 32rem this carried was inherited from a
          four-column table and forced a scroll on any phone. */}
      <DataTable
        caption="Tables, their status and their QR codes"
        minWidth="min-w-[20rem]"
        rows={tables}
        rowKey={(table) => table.table_id}
        empty={
          <div className="bg-surface-container-low rounded-lg p-xl text-center text-on-surface-variant">
            No tables configured yet.
          </div>
        }
        columns={[
          {
            header: "Table ID",
            cellClassName:
              "text-body-medium text-on-surface font-semibold font-display",
            cell: (table) => table.table_id,
          },
          {
            header: "Status",
            cell: (table) =>
              table.hasPending ? (
                <StatusBadge tone="warning">Verification Req.</StatusBadge>
              ) : table.hasUnpaid ? (
                <StatusBadge tone="error">Dining</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Empty</StatusBadge>
              ),
          },
          {
            header: "Actions",
            align: "right",
            cell: (table) => {
              const isEmpty = !table.hasPending && !table.hasUnpaid;
              const isDeleting =
                deleteTable.isPending && deleteTable.variables === table.id;
              return (
                <>
                  <button
                    onClick={() =>
                      setQrTable({ uuid: table.id, name: table.table_id })
                    }
                    title={`Show QR code for ${table.table_id}`}
                    aria-label={`Show QR code for ${table.table_id}`}
                    className="p-xs text-on-surface-variant hover:text-primary-label transition-colors"
                  >
                    <i className="mgc_qrcode_line text-lg" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    disabled={!isEmpty || isDeleting}
                    title={
                      isEmpty
                        ? "Remove table"
                        : "Cannot remove table with active orders"
                    }
                    aria-label={`Remove table ${table.table_id}`}
                    className="p-xs text-on-surface-variant hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <i className="mgc_loading_line animate-spin text-lg" aria-hidden="true" />
                    ) : (
                      <i className="mgc_delete_line text-lg" aria-hidden="true" />
                    )}
                  </button>
                </>
              );
            },
          },
        ]}
      />

      {isModalOpen && (
        <Dialog
          onClose={() => setIsModalOpen(false)}
          title="Add Table"
          size="sm"
          footer={
            <>
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
            </>
          }
        >
          <TextField
            label="Table ID / Name"
            type="text"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. T14, VIP 1, Bar 2"
            hint="This ID will appear on the QR code for this table."
            autoFocus
          />        </Dialog>
      )}

      {qrTable && (
        <TableQrDialog
          tableUuid={qrTable.uuid}
          tableName={qrTable.name}
          onClose={() => setQrTable(null)}
          onPrint={() => {
            requestPrint([qrTable]);
            setQrTable(null);
          }}
        />
      )}

      <QrPrintSheet
        request={printRequest}
        onDone={() => setPrintRequest(null)}
      />
    </div>
  );
}
