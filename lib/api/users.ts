import { User, UserRole } from "@/lib/types";
import { getStorageItem, setStorageItem } from "./storage";
import { createNotification } from "./notifications";

const STORAGE_KEY = "demurrage_users";
const delay = (ms: number = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getUsers(): Promise<User[]> {
  await delay();
  return getStorageItem<User[]>(STORAGE_KEY, []);
}

export async function getUserById(id: string): Promise<User | null> {
  await delay();
  const users = getStorageItem<User[]>(STORAGE_KEY, []);
  const user = users.find((u) => u.id === id);
  return user ? JSON.parse(JSON.stringify(user)) : null;
}

export async function createUser(userData: {
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  status?: "Active" | "Inactive";
  demoPassword?: string;
}): Promise<User> {
  await delay(80);
  const users = getStorageItem<User[]>(STORAGE_KEY, []);
  const newUser: User = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: userData.name,
    email: userData.email,
    username: userData.username || userData.email.split("@")[0],
    role: userData.role,
    status: userData.status || "Active",
    createdAt: new Date().toISOString().split("T")[0],
    assignedClaimsCount: 0,
    demoPassword: userData.demoPassword || "password123",
  };

  const updatedUsers = [newUser, ...users];
  setStorageItem(STORAGE_KEY, updatedUsers);

  try {
    await createNotification({
      title: "New User Added",
      message: `User ${userData.name} was registered with role ${userData.role}.`,
      type: "user",
    });
  } catch (e) {
    console.error(e);
  }

  return JSON.parse(JSON.stringify(newUser));
}

export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User> {
  await delay(50);
  const users = getStorageItem<User[]>(STORAGE_KEY, []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  users[idx] = { ...users[idx], ...updates };
  setStorageItem(STORAGE_KEY, users);
  return JSON.parse(JSON.stringify(users[idx]));
}

export async function toggleUserStatus(id: string): Promise<User> {
  await delay(50);
  const users = getStorageItem<User[]>(STORAGE_KEY, []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const newStatus = users[idx].status === "Active" ? "Inactive" : "Active";
  users[idx].status = newStatus;
  setStorageItem(STORAGE_KEY, users);

  try {
    await createNotification({
      title: "User Status Changed",
      message: `User ${users[idx].name} is now ${newStatus}.`,
      type: "user",
    });
  } catch (e) {
    console.error(e);
  }

  return JSON.parse(JSON.stringify(users[idx]));
}

export async function deleteUser(id: string): Promise<boolean> {
  await delay(50);
  const users = getStorageItem<User[]>(STORAGE_KEY, []);
  const target = users.find((u) => u.id === id);
  const filtered = users.filter((u) => u.id !== id);
  setStorageItem(STORAGE_KEY, filtered);

  if (target) {
    try {
      await createNotification({
        title: "User Removed",
        message: `User ${target.name} (${target.email}) was deleted.`,
        type: "user",
      });
    } catch (e) {
      console.error(e);
    }
  }

  return true;
}

export async function clearAllUsers(): Promise<void> {
  await delay(50);
  setStorageItem(STORAGE_KEY, []);
}
