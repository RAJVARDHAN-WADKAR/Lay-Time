import { User } from "@/lib/types";
import {
  getStoreUsers,
  updateStoreUser
} from "@/lib/mock/clientStore";

export async function getUsers(): Promise<User[]> {
  return getStoreUsers();
}

export async function getUserById(id: string): Promise<User | null> {
  const users = getStoreUsers();
  return users.find((u) => u.id === id) || null;
}

export async function createUser(userData: {
  name: string;
  email: string;
  role: User["role"];
  password?: string;
  username?: string;
  roleDescription?: string;
}): Promise<User> {
  const users = getStoreUsers();
  const newUser: User = {
    id: `usr-${Date.now()}`,
    name: userData.name,
    email: userData.email,
    username: userData.username || userData.email.split("@")[0],
    role: userData.role,
    status: "Active",
    createdAt: new Date().toISOString(),
    roleDescription: userData.roleDescription || "System user"
  };
  users.push(newUser);
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  return updateStoreUser(id, updates);
}

export async function deactivateUser(id: string): Promise<boolean> {
  updateStoreUser(id, { status: "Inactive" });
  return true;
}

export const deleteUser = deactivateUser;

export async function toggleUserStatus(id: string): Promise<User> {
  const user = await getUserById(id);
  if (!user) throw new Error("User not found");
  const newStatus = user.status === "Active" ? "Inactive" : "Active";
  return updateUser(id, { status: newStatus });
}
