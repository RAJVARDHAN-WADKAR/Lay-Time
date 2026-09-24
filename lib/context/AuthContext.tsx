"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, UserRole } from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock/users";
import { useRouter } from "next/navigation";

const DEFAULT_USER: User = {
  id: "usr-proc-1",
  name: "Sarah Jenkins",
  email: "processor@laytime.com",
  username: "sarah.jenkins",
  role: "Claim Processor",
  status: "Active",
  createdAt: "2024-01-01",
  roleDescription: "Senior Demurrage Analyst. Manages assigned claim and Statement of Facts portfolios."
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
  switchRole: (role: UserRole) => void;
  canEditClaim: (claimAssignedTo?: string) => boolean;
  canEditRac: (racAssignedTo?: string) => boolean;
  canAccessUsers: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem("laytime_demo_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role) {
          setCurrentUser(parsed);
          setIsAuthenticated(true);
        }
      } else {
        // Default to Claim Processor
        localStorage.setItem("laytime_demo_user", JSON.stringify(DEFAULT_USER));
      }
      // Ensure auth cookie is present for Next.js routing
      document.cookie = "laytime_auth_token=demo-token; path=/; max-age=31536000; SameSite=Lax";
    } catch (e) {
      console.warn("Auth initialization error:", e);
    }
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const emailLower = email.toLowerCase().trim();
      let matchedUser = MOCK_USERS.find(
        (u) =>
          u.email.toLowerCase() === emailLower ||
          u.role.toLowerCase() === emailLower ||
          emailLower.includes(u.role.toLowerCase().split(" ")[0])
      );

      if (!matchedUser) {
        if (emailLower.includes("admin")) {
          matchedUser = MOCK_USERS.find((u) => u.role === "Admin");
        } else if (emailLower.includes("super")) {
          matchedUser = MOCK_USERS.find((u) => u.role === "Supervisor");
        } else if (emailLower.includes("review")) {
          matchedUser = MOCK_USERS.find((u) => u.role === "Reviewer");
        } else {
          matchedUser = DEFAULT_USER;
        }
      }

      const activeUser = matchedUser || DEFAULT_USER;
      setCurrentUser(activeUser);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("laytime_demo_user", JSON.stringify(activeUser));
        document.cookie = "laytime_auth_token=demo-token; path=/; max-age=31536000; SameSite=Lax";
        window.dispatchEvent(new Event("demurrage_storage_change"));
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = useCallback((newRole: UserRole) => {
    const matched = MOCK_USERS.find((u) => u.role === newRole) || {
      ...DEFAULT_USER,
      role: newRole,
      name: `${newRole} User`
    };
    setCurrentUser(matched);
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("laytime_demo_user", JSON.stringify(matched));
      document.cookie = "laytime_auth_token=demo-token; path=/; max-age=31536000; SameSite=Lax";
      window.dispatchEvent(new Event("demurrage_storage_change"));
    }
  }, []);

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("laytime_demo_user");
      document.cookie = "laytime_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
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
        switchRole,
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
