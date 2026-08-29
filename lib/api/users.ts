import { User } from "@/lib/types";

export async function getUsers(): Promise<User[]> {
  try {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch (error) {
    console.error("API getUsers error:", error);
    return [];
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const res = await fetch(`/api/users/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (error) {
    return null;
  }
}

export async function createUser(userData: {
  name: string;
  email: string;
  role: User["role"];
  password: string;
  username?: string;
  roleDescription?: string;
}): Promise<User> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create user");
  }

  const data = await res.json();
  return data.user;
}

export async function updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update user");
  }

  const data = await res.json();
  return data.user;
}

export async function deactivateUser(id: string): Promise<boolean> {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE"
  });
  return res.ok;
}

export const deleteUser = deactivateUser;

export async function toggleUserStatus(id: string): Promise<User> {
  const user = await getUserById(id);
  if (!user) throw new Error("User not found");
  const newStatus = user.status === "Active" ? "Inactive" : "Active";
  return await updateUser(id, { status: newStatus });
}
