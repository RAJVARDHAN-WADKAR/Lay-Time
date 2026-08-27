"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, UserRole } from "@/lib/types";

const DEFAULT_USER: User = {
  id: "usr-default",
  name: "User Name",
  email: "user@shipping-ops.com",
  username: "claimprocessor",
  role: "Claim Processor",
  status: "Active",
  createdAt: "2026-01-01",
};

interface AuthContextType {
  currentUser: User;
  role: UserRole;
  isAuthenticated: boolean;
  isMounted: boolean;
  login: (usernameOrEmail: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAs: (role: UserRole, name?: string, email?: string) => void;
  setRole: (role: UserRole) => void;
  setUser: (user: User) => void;
  logout: () => void;
  canEditClaim: (claimAssignedTo?: string) => boolean;
  canAccessUsers: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("demurrage_current_user");
      const authStatus = localStorage.getItem("demurrage_is_authenticated");

      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.name) {
            setCurrentUser(parsed);
          }
        } catch {
          // ignore parse error
        }
      }

      if (authStatus !== null) {
        setIsAuthenticated(authStatus === "true");
      }
    }
  }, []);

  const persistSession = useCallback((user: User, authState: boolean = true) => {
    setCurrentUser(user);
    setIsAuthenticated(authState);
    if (typeof window !== "undefined") {
      localStorage.setItem("demurrage_current_user", JSON.stringify(user));
      localStorage.setItem("demurrage_is_authenticated", authState ? "true" : "false");
    }
  }, []);

  const login = async (
    usernameOrEmail: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = usernameOrEmail.trim();
    if (!trimmed) {
      return { success: false, error: "Please enter your username or email." };
    }

    const user: User = {
      id: `usr-${Date.now()}`,
      name: trimmed,
      email: trimmed.includes("@") ? trimmed : `${trimmed.toLowerCase()}@shipping-ops.com`,
      username: trimmed.toLowerCase(),
      role: "Claim Processor",
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
    };

    persistSession(user, true);
    return { success: true };
  };

  const loginAs = (role: UserRole, name?: string, email?: string) => {
    const user: User = {
      id: `usr-${Date.now()}`,
      name: name || "User Name",
      email: email || "user@shipping-ops.com",
      username: (name || "user").toLowerCase().replace(/\s+/g, ""),
      role,
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
    };
    persistSession(user, true);
  };

  const setRole = (newRole: UserRole) => {
    loginAs(newRole, currentUser.name, currentUser.email);
  };

  const setUser = (user: User) => {
    persistSession(user, true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("demurrage_is_authenticated", "false");
    }
  };

  // Permission helpers
  const canAccessUsers = currentUser.role === "Admin" || true; // accessible to admin/operators
  const isReadOnly = currentUser.role === "Viewer" || currentUser.role === "Reviewer";

  const canEditClaim = (_claimAssignedTo?: string): boolean => {
    if (currentUser.role === "Viewer" || currentUser.role === "Reviewer") {
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser.role,
        isAuthenticated,
        isMounted,
        login,
        loginAs,
        setRole,
        setUser,
        logout,
        canEditClaim,
        canAccessUsers,
        isReadOnly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
