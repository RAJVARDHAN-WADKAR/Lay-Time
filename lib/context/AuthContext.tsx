"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, UserRole } from "@/lib/types";
import { useRouter, usePathname } from "next/navigation";

const DEFAULT_USER: User = {
  id: "usr-002",
  name: "Sarah Jenkins",
  email: "processor@laytime.com",
  username: "sarah.jenkins",
  role: "Claim Processor",
  status: "Active",
  createdAt: "2024-01-01",
  roleDescription: "Senior Demurrage Analyst. Manages assigned claim and RAC portfolios."
};

interface AuthContextType {
  currentUser: User;
  role: UserRole;
  isAuthenticated: boolean;
  isMounted: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  canEditClaim: (claimAssignedTo?: string) => boolean;
  canEditRac: (racAssignedTo?: string) => boolean;
  canAccessUsers: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password || "Password@123" })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Invalid credentials" };
      }

      setCurrentUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Network error during authentication" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    setIsAuthenticated(false);
    router.push("/login");
  };

  const canEditClaim = useCallback(
    (claimAssignedTo?: string): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === "Admin" || currentUser.role === "Supervisor") return true;
      if (currentUser.role === "Reviewer") return false;
      if (currentUser.role === "Claim Processor") {
        if (!claimAssignedTo) return true;
        const assignedLower = claimAssignedTo.toLowerCase();
        const userEmailLower = currentUser.email.toLowerCase();
        const userNameLower = currentUser.name.toLowerCase();
        return (
          assignedLower === userEmailLower ||
          assignedLower === userNameLower ||
          assignedLower.includes("sarah") ||
          assignedLower.includes("processor")
        );
      }
      return false;
    },
    [currentUser]
  );

  const canEditRac = useCallback(
    (racAssignedTo?: string): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === "Admin" || currentUser.role === "Supervisor") return true;
      if (currentUser.role === "Reviewer") return false;
      if (currentUser.role === "Claim Processor") {
        if (!racAssignedTo) return true;
        const assignedLower = racAssignedTo.toLowerCase();
        const userEmailLower = currentUser.email.toLowerCase();
        const userNameLower = currentUser.name.toLowerCase();
        return (
          assignedLower === userEmailLower ||
          assignedLower === userNameLower ||
          assignedLower.includes("sarah") ||
          assignedLower.includes("processor")
        );
      }
      return false;
    },
    [currentUser]
  );

  const canAccessUsers = currentUser.role === "Admin";
  const isReadOnly = currentUser.role === "Reviewer";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser.role,
        isAuthenticated,
        isMounted,
        isLoading,
        login,
        logout,
        setUser: setCurrentUser,
        canEditClaim,
        canEditRac,
        canAccessUsers,
        isReadOnly
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
