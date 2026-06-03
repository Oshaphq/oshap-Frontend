import { useState } from "react";
import { 
  useAdminStaff, 
  useAdminCreateStaff, 
  useAdminUpdateStaff, 
  useAdminDeleteStaff 
} from "@oshap/shared/hooks";
import { Role, StaffMember } from "@oshap/shared/types";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
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
    email: "",
    role: "WAITER" as Role,
    password: "", // Only needed for creation or reset
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ name: "", email: "", role: "WAITER", password: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingId(staff.id);
    setForm({ name: staff.name, email: staff.email, role: staff.role, password: "" });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateStaff.mutate(
        { 
          id: editingId, 
          payload: { 
            name: form.name, 
            email: form.email, 
            role: form.role,
            ...(form.password ? { password: form.password } : {})
          } 
        },
        {
          onSuccess: () => {
            toast.success("Staff updated successfully");
            setIsModalOpen(false);
          },
          onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to update staff"),
        }
      );
    } else {
      createStaff.mutate(
        { 
          name: form.name, 
          email: form.email, 
          role: form.role,
          password: form.password || "password" // Default mock password
        },
        {
          onSuccess: () => {
            toast.success("Staff created successfully");
            setIsModalOpen(false);
          },
          onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to create staff"),
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this staff member?")) {
      deleteStaff.mutate(id, {
        onSuccess: () => toast.success("Staff removed"),
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to remove staff"),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-xl">
        <div className="oshap-spinner" />
      </div>
    );
  }

  const inputClass = "w-full px-md py-s rounded-lg bg-surface-container-lowest border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors";
  const labelClass = "block text-caption-md font-semibold text-primary-text mb-xs";

  return (
    <div className="flex flex-col gap-md pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-display-h3 font-display font-semibold text-primary-text">
          Team Members
        </h2>
        {user?.role === "OWNER" && (
          <PrimaryButton size="md" onClick={handleOpenNew} className="gap-s">
            <i className="mgc_add_line" />
            Add Staff
          </PrimaryButton>
        )}
      </div>

      <div className="bg-surface-container rounded-md border border-transparent hover:border-outline-variant transition-colors overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high border-b border-surface-container-highest">
              <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">Name</th>
              <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">Email</th>
              <th className="py-s px-md text-label-l4 font-semibold text-secondary-text">Role</th>
              {user?.role === "OWNER" && (
                <th className="py-s px-md text-label-l4 font-semibold text-secondary-text text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id} className="border-b border-surface-container-highest last:border-none hover:bg-surface-container-low transition-colors">
                <td className="py-s px-md text-p2 text-primary-text font-medium">{staff.name}</td>
                <td className="py-s px-md text-p2 text-secondary-text">{staff.email}</td>
                <td className="py-s px-md">
                  <span className="px-xs py-xs bg-surface-container-highest text-primary-text text-label-l4 rounded-md font-mono">
                    {staff.role}
                  </span>
                </td>
                {user?.role === "OWNER" && (
                  <td className="py-s px-md text-right">
                    <button 
                      onClick={() => handleOpenEdit(staff)}
                      className="p-xs text-secondary-text hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <i className="mgc_edit_line text-lg" />
                    </button>
                    <button 
                      onClick={() => handleDelete(staff.id)}
                      className="p-xs text-secondary-text hover:text-error transition-colors"
                      title="Remove"
                      disabled={staff.role === "OWNER" && staffList.filter(s => s.role === "OWNER").length === 1}
                    >
                      <i className="mgc_delete_line text-lg" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {staffList.length === 0 && (
              <tr>
                <td colSpan={4} className="p-xl text-center text-secondary-text">
                  No staff members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md">
          <div className="w-full max-w-[448px] rounded-md bg-surface-container p-l flex flex-col gap-md border border-primary shadow-xl">
            <h3 className="font-bold text-primary-text">
              {editingId ? "Edit Staff" : "Add Staff"}
            </h3>

            <div className="flex flex-col gap-md">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="OWNER">Owner</option>
                    <option value="MANAGER">Manager</option>
                    <option value="WAITER">Waiter</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="KITCHEN">Kitchen Staff</option>
                    <option value="BARTENDER">Bartender</option>
                  </select>
                  <i
                    className="mgc_down_line absolute right-md top-1/2 -translate-y-1/2 text-outline pointer-events-none"
                    aria-hidden
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  {editingId ? "New Password (optional)" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? "Leave blank to keep current" : "default: password"}
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-xs top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-outline hover:text-primary-text transition-colors rounded-full"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={showPassword ? "mgc_eye_close_line text-xl" : "mgc_eye_line text-xl"} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-s pt-s">
              <SecondaryButton size="md" onClick={() => setIsModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                size="md"
                onClick={handleSave}
                disabled={!form.name || !form.email || createStaff.isPending || updateStaff.isPending}
              >
                {createStaff.isPending || updateStaff.isPending ? "Saving..." : "Save"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
