import { User, UserRole } from "@/lib/types";

export async function getUsers(): Promise<User[]> {
  const res = await fetch("/api/users", {
    method: "GET",
    headers: { "Cache-Control": "no-cache" }
  });
  if (!res.ok) {
    throw new Error("Failed to load users");
  }
  const data = await res.json();
  return data.users || [];
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await fetch(`/api/users/${id}`, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to load user");
  }
  const data = await res.json();
  return data.user || null;
}

export async function createUser(userData: {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  temporaryPassword?: string;
  username?: string;
  clientId?: string;
  clientName?: string;
  roleDescription?: string;
}): Promise<User> {
  const res = await fetch("/api/users/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create user");
  }
  return data.user;
}

export async function updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to update user");
  }
  return data.user;
}

export async function deactivateUser(id: string): Promise<boolean> {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE"
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to deactivate user");
  }
  return true;
}

export const deleteUser = deactivateUser;

export async function resetUserPassword(id: string, newPassword?: string): Promise<{ temporaryPassword?: string }> {
  const res = await fetch(`/api/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to reset password");
  }
  return { temporaryPassword: data.temporaryPassword };
}
