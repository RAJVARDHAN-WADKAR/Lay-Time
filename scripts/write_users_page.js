const fs = require('fs');
const path = require('path');

const code = `"use client";

import React, { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, toggleUserStatus } from "@/lib/api";
import { User, UserRole } from "@/lib/types";
import { useAuth } from "@/lib/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils/formatters";
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Lock,
  Edit2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export default function UsersPage() {
  const { role, canAccessUsers, setRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<{ name: string; email: string; role: UserRole }>({
    name: "",
    email: "",
    role: "Claim Processor",
  });

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await getUsers();
      setUsers(data);
      setIsLoading(false);
    }
    load();
  }, []);

  // Strict UI Route Guard
  if (!canAccessUsers) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <Card className="border-rose-200 bg-rose-50/50 p-8 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            The User Management screen is restricted to <strong>Admin</strong> users only. Your active role is{" "}
            <span className="font-semibold text-rose-700">{role}</span>.
          </p>
          <div className="pt-4">
            <Button onClick={() => setRole("Admin")} className="text-xs">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              <span>Switch to Admin Role</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleCreateUser = async () => {
    if (!newUserData.name || !newUserData.email) return;
    setIsSaving(true);
    const created = await createUser(newUserData);
    setUsers((prev) => [...prev, created]);
    setIsSaving(false);
    setIsAddModalOpen(false);
    setNewUserData({ name: "", email: "", role: "Claim Processor" });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    const updated = await updateUser(editingUser.id, editingUser);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setIsSaving(false);
    setEditingUser(null);
  };

  const handleToggleStatus = async (id: string) => {
    const toggled = await toggleUserStatus(id);
    setUsers((prev) => prev.map((u) => (u.id === toggled.id ? toggled : u)));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User & Role Management</h1>
            <Badge variant="destructive" className="flex items-center space-x-1">
              <Shield className="h-3 w-3 mr-0.5" />
              <span>Admin Protected</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assign workflow roles, manage claim processor permissions, and control team directory.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center space-x-1.5 text-xs">
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </Button>
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">System Users Directory</CardTitle>
            <CardDescription>Local mock user dataset for role-switching verification</CardDescription>
          </div>
          <span className="text-xs font-semibold text-slate-500">{users.length} Users</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Assigned Claims</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => {
                  const roleColors: Record<UserRole, string> = {
                    Admin: "bg-rose-50 text-rose-700 border-rose-200",
                    Supervisor: "bg-blue-50 text-blue-700 border-blue-200",
                    "Claim Processor": "bg-amber-50 text-amber-700 border-amber-200",
                    Reviewer: "bg-purple-50 text-purple-700 border-purple-200",
                  };

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center space-x-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">{u.email}</td>
                      <td className="p-3.5">
                        <span
                          className={\`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border \${roleColors[u.role]}\`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">{u.assignedClaimsCount ?? 0} claims</td>
                      <td className="p-3.5">
                        {u.status === "Active" ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-400 font-semibold text-xs">
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500">{formatDate(u.createdAt)}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser({ ...u })}
                            className="h-7 text-xs text-blue-600"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(u.id)}
                            className={\`h-7 text-xs \${
                              u.status === "Active" ? "text-rose-600 hover:text-rose-700" : "text-emerald-600"
                            }\`}
                          >
                            {u.status === "Active" ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New System User"
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
            <Input
              placeholder="e.g. Rachel Adams"
              value={newUserData.name}
              onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
            <Input
              type="email"
              placeholder="rachel.adams@maritime-ops.com"
              value={newUserData.email}
              onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Assigned Role</label>
            <Select
              value={newUserData.role}
              onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
            >
              <option value="Claim Processor">Claim Processor (assigned claims only)</option>
              <option value="Supervisor">Supervisor (all claims editable)</option>
              <option value="Reviewer">Reviewer (read-only mode)</option>
              <option value="Admin">Admin (full access + users management)</option>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} isLoading={isSaving}>Create User</Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={\`Edit User: \${editingUser.name}\`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name</label>
              <Input
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">System Role</label>
              <Select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
              >
                <option value="Claim Processor">Claim Processor</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Admin">Admin</option>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={handleUpdateUser} isLoading={isSaving}>Save Role</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/users/page.tsx'), code, 'utf8');
console.log('Successfully wrote app/users/page.tsx');
