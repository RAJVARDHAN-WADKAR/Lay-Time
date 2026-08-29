"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getUsers, createUser, updateUser, toggleUserStatus, deleteUser } from "@/lib/api";
import { User, UserRole } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils/formatters";
import { useToast } from "@/lib/hooks/useToast";
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";

export default function UsersPage() {
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<{
    name: string;
    email: string;
    username: string;
    role: UserRole;
  }>({
    name: "",
    email: "",
    username: "",
    role: "Claim Processor",
  });

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await getUsers();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();

    const handleStorage = () => fetchUsers();
    window.addEventListener("demurrage_storage_change", handleStorage);
    return () => window.removeEventListener("demurrage_storage_change", handleStorage);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      error("Missing Information", "Please enter a name and email address.");
      return;
    }

    setIsSaving(true);
    try {
      const created = await createUser({
        name: newUserData.name.trim(),
        email: newUserData.email.trim(),
        username: newUserData.username.trim() || newUserData.email.split("@")[0],
        role: newUserData.role,
        password: (newUserData as any).password || "Password@123",
      });

      setUsers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewUserData({ name: "", email: "", username: "", role: "Claim Processor" });
      success("User Added", `${created.name} (${created.role}) has been created.`);
    } catch {
      error("Creation Failed", "Could not add user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSaving(true);
    try {
      const updated = await updateUser(editingUser.id, editingUser);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      success("User Updated", "User information saved successfully.");
    } catch {
      error("Update Failed", "Could not update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const updated = await toggleUserStatus(id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      success("Status Changed", `User is now ${updated.status}.`);
    } catch {
      error("Action Failed", "Could not change status.");
    }
  };

  const handleDelete = async () => {
    if (deletingUserId) {
      await deleteUser(deletingUserId);
      setUsers((prev) => prev.filter((u) => u.id !== deletingUserId));
      setDeletingUserId(null);
      success("User Deleted", "User has been removed.");
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.username && user.username.toLowerCase().includes(query));
        if (!matches) return false;
      }

      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }

      return true;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              User Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin console for managing operational team members, access roles, and system permissions
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-xl flex items-center space-x-1.5 shadow-xs"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add User</span>
        </Button>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search user by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Filter by Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-medium rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Claim Processor">Claim Processor</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <UsersIcon className="h-4 w-4 text-blue-600" />
              <span>User Directory</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {filteredUsers.length} users registered in the system
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span>{user.name}</span>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-slate-600">{user.email}</td>

                      {/* Username */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {user.username || user.email.split("@")[0]}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={user.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Edit User"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className={`p-1 transition text-xs font-semibold ${
                              user.status === "Active"
                                ? "text-amber-600 hover:text-amber-700"
                                : "text-emerald-600 hover:text-emerald-700"
                            }`}
                            title={user.status === "Active" ? "Deactivate User" : "Activate User"}
                          >
                            {user.status === "Active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => setDeletingUserId(user.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={UsersIcon}
                title="No users found"
                description="There are currently no users in the directory. Click 'Add User' to register your team members."
                actionText="Add First User"
                onAction={() => setIsAddModalOpen(true)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs text-left">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Full Name *</label>
            <Input
              placeholder="e.g. Sarah Jenkins"
              value={newUserData.name}
              onChange={(e) => setNewUserData((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Email Address *</label>
            <Input
              type="email"
              placeholder="e.g. sarah.j@shipping-ops.com"
              value={newUserData.email}
              onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Username</label>
            <Input
              placeholder="e.g. sjenkins"
              value={newUserData.username}
              onChange={(e) => setNewUserData((p) => ({ ...p, username: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Password *</label>
            <Input
              type="password"
              placeholder="Initial password (e.g. Pass@123)"
              value={(newUserData as any).password || ""}
              onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value } as any))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Role *</label>
            <Select
              value={newUserData.role}
              onChange={(e) => setNewUserData((p) => ({ ...p, role: e.target.value as any }))}
            >
              <option value="Admin">Admin</option>
              <option value="Claim Processor">Claim Processor</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Reviewer">Reviewer</option>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title="Edit User Information"
          maxWidth="md"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4 text-xs text-left">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Full Name</label>
              <Input
                value={editingUser.name}
                onChange={(e) =>
                  setEditingUser((p) => (p ? { ...p, name: e.target.value } : null))
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Email Address</label>
              <Input
                type="email"
                value={editingUser.email}
                onChange={(e) =>
                  setEditingUser((p) => (p ? { ...p, email: e.target.value } : null))
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Username</label>
              <Input
                value={editingUser.username || ""}
                onChange={(e) =>
                  setEditingUser((p) => (p ? { ...p, username: e.target.value } : null))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Role</label>
              <Select
                value={editingUser.role}
                onChange={(e) =>
                  setEditingUser((p) => (p ? { ...p, role: e.target.value as any } : null))
                }
              >
                <option value="Admin">Admin</option>
                <option value="Claim Processor">Claim Processor</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Viewer">Viewer</option>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingUserId)}
        onClose={() => setDeletingUserId(null)}
        onConfirm={handleDelete}
        title="Delete User"
        description="Are you sure you want to remove this user from the system?"
        destructive
      />
    </div>
  );
}
