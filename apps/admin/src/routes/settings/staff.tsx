import { useState } from "react";
import {
  useAdminStaff,
  useAdminCreateStaff,
  useAdminUpdateStaff,
  useAdminDeleteStaff,
} from "@oshap/shared/hooks";
import { Role, StaffMember } from "@oshap/shared/types";
import { errorMessage, formatPhone, tryNormalizePhone } from "@oshap/shared";
import {
  DataTable,
  Dialog,
  PrimaryButton,
  SecondaryButton,
  Select,
  Spinner,
  TextField,
  toast,
} from "@oshap/shared/ui";
import { useAuth } from "../../context/AuthContext";

export default function StaffSettings() {
  const { data: staffList = [], isLoading } = useAdminStaff();
  const createStaff = useAdminCreateStaff();
  const updateStaff = useAdminUpdateStaff();
  const deleteStaff = useAdminDeleteStaff();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "WAITER" as Role,
    password: "", // Only needed for creation or reset
  });
  const [phoneError, setPhoneError] = useState("");

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", email: "", role: "WAITER", password: "" });
    setPhoneError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingId(staff.id);
    setForm({
      name: staff.name,
      phone: formatPhone(staff.phone),
      email: staff.email ?? "",
      role: staff.role,
      password: "",
    });
    setPhoneError("");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    // Normalized here rather than at the input, so a half-typed number isn't
    // rejected mid-keystroke — and so what reaches the API is always E.164.
    const phone = tryNormalizePhone(form.phone);
    if (!phone) {
      setPhoneError("Enter a valid Nigerian phone number");
      return;
    }
    setPhoneError("");

    if (editingId) {
      updateStaff.mutate(
        {
          id: editingId,
          payload: {
            name: form.name,
            phone,
            email: form.email || undefined,
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success("Staff updated successfully");
            setIsModalOpen(false);
          },
          onError: (err: unknown) =>
            toast.error(errorMessage(err, "update the staff member")),
        },
      );
    } else {
      createStaff.mutate(
        {
          name: form.name,
          phone,
          email: form.email || undefined,
          role: form.role,
          // No silent default: an account created without one used to be
          // given the literal string "password", which makes the audit trail
          // worthless the moment two people share it.
          password: form.password,
        },
        {
          onSuccess: () => {
            toast.success("Staff created successfully");
            setIsModalOpen(false);
          },
          onError: (err: unknown) =>
            toast.error(errorMessage(err, "add the staff member")),
        },
      );
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this staff member?")) {
      deleteStaff.mutate(id, {
        onSuccess: () => toast.success("Staff removed"),
        onError: (err: unknown) =>
          toast.error(errorMessage(err, "remove the staff member")),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-xl">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md pb-10">
      {/* No heading of its own: the section wrapper names the screen, and two
          titles in a row read as two screens. */}
      <div className="flex items-center justify-end">
        {user?.role === "OWNER" && (
          <PrimaryButton size="md" onClick={handleOpenNew} className="gap-s">
            <i className="mgc_add_line" />
            Add Staff
          </PrimaryButton>
        )}
      </div>

      <DataTable
        caption="Staff accounts, their contact details and their roles"
        minWidth="min-w-[32rem]"
        rows={staffList}
        rowKey={(staff) => staff.id}
        empty={
          <div className="bg-surface-container-low rounded-lg p-xl text-center text-on-surface-variant">
            No staff members found.
          </div>
        }
        columns={[
          {
            header: "Name",
            cellClassName: "text-body-medium text-on-surface font-medium",
            cell: (staff) => staff.name,
          },
          {
            /* The column leads with the phone number, which is what staff sign
               in with. Calling it "Email" named the optional half. */
            header: "Contact",
            cellClassName: "text-body-medium text-on-surface-variant",
            cell: (staff) => (
              <>
                <span className="tabular-nums">{formatPhone(staff.phone)}</span>
                {staff.email && (
                  <span className="block text-body-small text-on-surface-variant">
                    {staff.email}
                  </span>
                )}
              </>
            ),
          },
          {
            header: "Role",
            cell: (staff) => (
              <span className="px-xs py-xs bg-surface-container-highest text-on-surface text-label-large rounded-lg font-mono">
                {staff.role}
              </span>
            ),
          },
          ...(user?.role === "OWNER"
            ? [
                {
                  header: "Actions",
                  align: "right" as const,
                  cell: (staff: StaffMember) => (
                    <>
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        className="p-xs text-on-surface-variant hover:text-primary-label transition-colors"
                        title="Edit"
                        aria-label={`Edit ${staff.name}`}
                      >
                        <i className="mgc_edit_line text-lg" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(staff.id)}
                        className="p-xs text-on-surface-variant hover:text-error transition-colors"
                        title="Remove"
                        aria-label={`Remove ${staff.name}`}
                        disabled={
                          staff.role === "OWNER" &&
                          staffList.filter((s) => s.role === "OWNER").length === 1
                        }
                      >
                        <i className="mgc_delete_line text-lg" aria-hidden="true" />
                      </button>
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

      {isModalOpen && (
        <Dialog
          onClose={() => setIsModalOpen(false)}
          title={<>{editingId ? "Edit Staff" : "Add Staff"}</>}
          footer={
            <>
              <SecondaryButton size="md" onClick={() => setIsModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                size="md"
                onClick={handleSave}
                disabled={
                  !form.name ||
                  !form.phone ||
                  (!editingId && !form.password) ||
                  createStaff.isPending ||
                  updateStaff.isPending
                }
              >
                {createStaff.isPending || updateStaff.isPending
                  ? "Saving..."
                  : "Save"}
              </PrimaryButton>
            </>
          }
        >
          <div className="flex flex-col gap-md">
            <TextField
              label="Name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Phone number"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
                if (phoneError) setPhoneError("");
              }}
              placeholder="0803 123 4567"
              error={phoneError || undefined}
              hint="How they sign in. Every member of staff needs one."
            />
            <TextField
              label={
                <>
                  Email{" "}
                  <span className="font-normal text-on-surface-variant">
                    (optional)
                  </span>
                </>
              }
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <div>
              <label
                htmlFor="staff-role"
                className="block text-body-medium font-semibold text-on-surface mb-xs"
              >
                Role
              </label>
              <Select
                id="staff-role"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Role })
                }
                wrapperClassName="block w-full"
              >
                <option value="OWNER">Owner</option>
                <option value="MANAGER">Manager</option>
                <option value="WAITER">Waiter</option>
                <option value="CASHIER">Cashier</option>
                <option value="KITCHEN">Kitchen Staff</option>
                <option value="BARTENDER">Bartender</option>
              </Select>
            </div>
            <TextField
              label={editingId ? "New Password (optional)" : "Password"}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={
                editingId ? "Leave blank to keep current" : "Choose a password"
              }
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors rounded-full"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i
                    className={
                      showPassword
                        ? "mgc_eye_close_line text-xl"
                        : "mgc_eye_line text-xl"
                    }
                  />
                </button>
              }
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
