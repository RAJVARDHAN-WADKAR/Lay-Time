"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";

const ANONYMOUS_USER: User = {
  id: "",
  name: "",
  email: "",
  role: "Reviewer",
  status: "Active",
  createdAt: ""
};

interface AuthContextType {
  currentUser: User;
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isMounted: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  canEditClaim: (claimAssignedTo?: string) => boolean;
  canEditRac: (racAssignedTo?: string) => boolean;
  canAccessUsers: boolean;
  isReadOnly: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          return;
        }
      }
      // If unauthenticated or deactivated
      setUser(null);
      setIsAuthenticated(false);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (!email || !email.trim()) {
        return { success: false, error: "Please enter your email address." };
      }
      if (!password || !password.trim()) {
        return { success: false, error: "Please enter your password." };
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Invalid email or password. Please verify credentials."
        };
      }

      setUser(data.user);
      setIsAuthenticated(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("demurrage_storage_change"));
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to communicate with authentication service." };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout request failed:", e);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("demurrage_storage_change"));
      }
      router.push("/login");
      router.refresh();
    }
  };

  const canEditClaim = useCallback(
    (claimAssignedTo?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      if (user.role === "Admin" || user.role === "Supervisor") return true;
      if (user.role === "Reviewer") return false;
      if (user.role === "Claim Processor") {
        if (!claimAssignedTo) return true;
        const assignedLower = claimAssignedTo.toLowerCase();
        const userEmailLower = (user.email || "").toLowerCase();
        const userNameLower = (user.name || "").toLowerCase();
        return (
          assignedLower === userEmailLower ||
          assignedLower === userNameLower ||
          assignedLower.includes("rohit") ||
          assignedLower.includes("sarah") ||
          assignedLower.includes("processor")
        );
      }
      return false;
    },
    [isAuthenticated, user]
  );

  const canEditRac = useCallback(
    (racAssignedTo?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      if (user.role === "Admin" || user.role === "Supervisor") return true;
      if (user.role === "Reviewer") return false;
      if (user.role === "Claim Processor") {
        if (!racAssignedTo) return true;
        const assignedLower = racAssignedTo.toLowerCase();
        const userEmailLower = (user.email || "").toLowerCase();
        const userNameLower = (user.name || "").toLowerCase();
        return (
          assignedLower === userEmailLower ||
          assignedLower === userNameLower ||
          assignedLower.includes("rohit") ||
          assignedLower.includes("sarah") ||
          assignedLower.includes("processor")
        );
      }
      return false;
    },
    [isAuthenticated, user]
  );

  const canAccessUsers = isAuthenticated && user?.role === "Admin";
  const isReadOnly = !isAuthenticated || user?.role === "Reviewer";

  return (
    <AuthContext.Provider
      value={{
        currentUser: user || ANONYMOUS_USER,
        user,
        role: user?.role || "Reviewer",
        isAuthenticated,
        isMounted,
        isLoading,
        login,
        logout,
        setUser,
        canEditClaim,
        canEditRac,
        canAccessUsers,
        isReadOnly,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
