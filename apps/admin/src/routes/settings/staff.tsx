import { useState } from "react";
import { 
  useAdminStaff, 
  useAdminCreateStaff, 
  useAdminUpdateStaff, 
  useAdminDeleteStaff 
} from "@oshap/shared/hooks";
import { Role, StaffMember } from "@oshap/shared/types";
import { PrimaryButton, toast } from "@oshap/shared/ui";
import { useAuth } from "../../context/AuthContext";

export default function StaffSettings() {
  const { data: staffList = [], isLoading } = useAdminStaff();
  const createStaff = useAdminCreateStaff();
  const updateStaff = useAdminUpdateStaff();
  const deleteStaff = useAdminDeleteStaff();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
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

  return (
    <div className="space-y-md pb-32">
      <div className="flex items-center justify-between">
        <h2 className="text-display-h3 font-display font-semibold text-primary-text">
          Team Members
        </h2>
        {user?.role === "OWNER" && (
          <PrimaryButton onClick={handleOpenNew} className="gap-2">
            <i className="mgc_add_line" />
            Add Staff
          </PrimaryButton>
        )}
      </div>

      <div className="bg-surface-container rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high border-b border-surface-container-highest">
              <th className="p-s text-label-l4 font-semibold text-secondary-text">Name</th>
              <th className="p-s text-label-l4 font-semibold text-secondary-text">Email</th>
              <th className="p-s text-label-l4 font-semibold text-secondary-text">Role</th>
              {user?.role === "OWNER" && (
                <th className="p-s text-label-l4 font-semibold text-secondary-text text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id} className="border-b border-surface-container-highest last:border-none hover:bg-surface-container-low transition-colors">
                <td className="p-s text-p2 text-primary-text font-medium">{staff.name}</td>
                <td className="p-s text-p2 text-secondary-text">{staff.email}</td>
                <td className="p-s">
                  <span className="px-xs py-1 bg-surface-container-highest text-primary-text text-label-l4 rounded-md font-mono">
                    {staff.role}
                  </span>
                </td>
                {user?.role === "OWNER" && (
                  <td className="p-s text-right">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 backdrop-blur-sm p-md">
          <div className="w-full max-w-md bg-surface-container rounded-2xl p-xl shadow-xl flex flex-col gap-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-outline-variant pb-s">
              <h2 className="text-display-h3 font-display font-semibold text-primary-text">
                {editingId ? "Edit Staff" : "Add Staff"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-secondary-text transition-colors"
              >
                <i className="mgc_close_line text-xl" />
              </button>
            </div>

            <div className="space-y-s">
              <div>
                <label className="block text-label-l4 font-semibold text-primary-text mb-xs">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-label-l4 font-semibold text-primary-text mb-xs">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-label-l4 font-semibold text-primary-text mb-xs">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
                >
                  <option value="OWNER">Owner</option>
                  <option value="MANAGER">Manager</option>
                  <option value="WAITER">Waiter</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="KITCHEN">Kitchen Staff</option>
                  <option value="BARTENDER">Bartender</option>
                </select>
              </div>
              <div>
                <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
                  {editingId ? "New Password (optional)" : "Password"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingId ? "Leave blank to keep current" : "default: password"}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-s pt-s">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-md py-xs font-semibold text-primary-text hover:bg-surface-container-high rounded-lg transition-colors"
              >
                Cancel
              </button>
              <PrimaryButton
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
