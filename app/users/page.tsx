"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getUsers, createUser, updateUser, deactivateUser, resetUserPassword } from "@/lib/api/users";
import { User, UserRole } from "@/lib/types";
import { CREATE_MATRIX } from "@/lib/auth/userHierarchyConstants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/lib/hooks/useToast";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Shield,
  KeyRound,
  Building2,
  RefreshCw
} from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const { user: currentAuthUser, role, canAccessUsers, isLoading: authLoading } = useAuth();
  const { success, error, info } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Derive roles actor is allowed to create per CREATE_MATRIX
  const allowedRoles = useMemo(() => {
    return CREATE_MATRIX[role] || [];
  }, [role]);

  // Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<{
    name: string;
    email: string;
    username: string;
    role: UserRole;
    clientId?: string;
    clientName?: string;
    password?: string;
  }>({
    name: "",
    email: "",
    username: "",
    role: "Claim Processor",
    clientName: "",
    password: ""
  });

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      error("Fetch Error", err.message || "Failed to load users from database");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchUsers();
    }
  }, [authLoading]);

  // Set default role when opening Add modal
  const handleOpenAddModal = () => {
    if (allowedRoles.length === 0) return;
    setNewUserData({
      name: "",
      email: "",
      username: "",
      role: allowedRoles[0],
      clientName: "",
      password: "TempPass@123"
    });
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      error("Missing Information", "Please enter a name and email address.");
      return;
    }

    if (newUserData.role === "Client" && !newUserData.clientName?.trim()) {
      error("Client Name Required", "Please specify the Client Organization name.");
      return;
    }

    setIsSaving(true);
    try {
      const created = await createUser({
        name: newUserData.name.trim(),
        email: newUserData.email.trim(),
        username: newUserData.username.trim() || newUserData.email.split("@")[0],
        role: newUserData.role,
        clientName: newUserData.clientName?.trim(),
        temporaryPassword: newUserData.password || "TempPass@123"
      });

      setUsers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      success("User Created", `${created.name} (${created.role}) registered in your hierarchy.`);
    } catch (err: any) {
      error("Creation Failed", err.message || "Could not add user.");
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
    } catch (err: any) {
      error("Update Failed", err.message || "Could not update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deletingUserId) return;
    try {
      await deactivateUser(deletingUserId);
      setUsers((prev) =>
        prev.map((u) => (u.id === deletingUserId ? { ...u, status: "Inactive" } : u))
      );
      setDeletingUserId(null);
      success("User Deactivated", "Account deactivated and active sessions revoked.");
    } catch (err: any) {
      error("Deactivation Failed", err.message || "Could not deactivate user.");
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const res = await resetUserPassword(userId);
      info(
        "Password Reset",
        `Temporary password: ${res.temporaryPassword || "TempReset@123"}. Active sessions invalidated.`
      );
    } catch (err: any) {
      error("Reset Failed", err.message || "Could not reset password.");
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.clientName && u.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UsersIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Hierarchical User Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage accounts strictly within your assigned organization subtree
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="text-xs font-semibold h-9 px-3.5 rounded-xl border-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          {allowedRoles.length > 0 && (
            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 rounded-xl flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Subtree User</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search team members by name, email, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Filter by Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-medium rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Claim Processor">Claim Processor</option>
            <option value="Reviewer">Reviewer</option>
            <option value="Client">Client</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <UsersIcon className="h-4 w-4 text-blue-600" />
              <span>Managed Subtree Directory</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {filteredUsers.length} user accounts in your management hierarchy
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
              Loading users...
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Client Org</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentAuthUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2.5">
                          <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600">{u.email}</td>

                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {u.clientName || u.clientId ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                              <Building2 className="h-3 w-3 text-cyan-600" />
                              {u.clientName || u.clientId}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Internal</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <StatusBadge status={u.status} />
                        </td>

                        <td className="py-3 px-4 text-center">
                          {!isSelf ? (
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                title="Edit User"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                className="p-1 text-slate-400 hover:text-amber-600 transition cursor-pointer"
                                title="Reset Password & Revoke Sessions"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingUserId(u.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Deactivate User"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              Self (Protected)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={UsersIcon}
                title="No users in your subtree"
                description={
                  allowedRoles.length > 0
                    ? `You can create ${allowedRoles.join(", ")} accounts.`
                    : "Your role does not manage sub-accounts."
                }
                actionText={allowedRoles.length > 0 ? "Add First User" : undefined}
                onAction={allowedRoles.length > 0 ? handleOpenAddModal : undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Subtree User"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs text-left">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Full Name *</label>
            <Input
              placeholder="e.g. Alex Mercer"
              value={newUserData.name}
              onChange={(e) => setNewUserData((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Email Address *</label>
            <Input
              type="email"
              placeholder="e.g. alex.mercer@company.com"
              value={newUserData.email}
              onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Username</label>
            <Input
              placeholder="e.g. alex.mercer"
              value={newUserData.username}
              onChange={(e) => setNewUserData((p) => ({ ...p, username: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Role * (Allowed by Hierarchy)</label>
            <Select
              value={newUserData.role}
              onChange={(e) => setNewUserData((p) => ({ ...p, role: e.target.value as any }))}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>

          {newUserData.role === "Client" && (
            <div className="space-y-1 p-3 bg-cyan-50/50 border border-cyan-100 rounded-xl">
              <label className="font-bold text-cyan-900 block">Client Organization Name *</label>
              <Input
                placeholder="e.g. Trafigura Trading Pte Ltd"
                value={newUserData.clientName || ""}
                onChange={(e) => setNewUserData((p) => ({ ...p, clientName: e.target.value }))}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Initial Temporary Password *</label>
            <Input
              type="text"
              value={newUserData.password || ""}
              onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value }))}
              placeholder="e.g. TempPass@123"
              required
            />
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
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isSaving ? "Creating User..." : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Edit User: ${editingUser.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4 text-xs text-left">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Full Name</label>
              <Input
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Email Address</label>
              <Input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                required
              />
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
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingUserId}
        onClose={() => setDeletingUserId(null)}
        onConfirm={handleDeactivate}
        title="Deactivate User Account"
        message="Are you sure you want to deactivate this account? The user will immediately be logged out and their session tokens will be invalidated."
        confirmText="Deactivate Account"
        variant="destructive"
      />
    </div>
  );
}
