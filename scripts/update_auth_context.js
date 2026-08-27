const fs = require('fs');
const path = require('path');

const authCode = `"use client";

/**
 * ============================================================================
 * SECURITY / ARCHITECTURE NOTICE:
 * This authentication and role context is a FRONTEND-ONLY DEMO IMPLEMENTATION.
 * In a production architecture, real authentication must be handled via secure
 * session/token validation (e.g., OAuth2 / OIDC / JWT) and authorization MUST
 * be strictly enforced server-side (API gateway, middleware, and database row-level
 * security). This mock context must NOT be mistaken for real application security.
 * ============================================================================
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock/data";

interface AuthContextType {
  currentUser: User;
  role: UserRole;
  setRole: (role: UserRole) => void;
  setUser: (user: User) => void;
  canEditClaim: (claimAssignedTo?: string) => boolean;
  canAccessUsers: boolean;
  isReadOnly: boolean;
  loginAs: (role: UserRole, name?: string, email?: string) => void;
  logout: () => void;
  isMounted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("demurrage_demo_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        }
      } catch {
        // ignore parse error
      }
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    const matchingMock = MOCK_USERS.find((u) => u.role === newRole) || {
      id: \`usr-\${newRole.toLowerCase().replace(/\\s+/g, "-")}\`,
      name: \`\${newRole} User\`,
      email: \`\${newRole.toLowerCase().replace(/\\s+/g, ".")}@maritime-ops.com\`,
      role: newRole,
      status: "Active" as const,
      createdAt: "2024-01-01",
    };
    setCurrentUser(matchingMock);
    if (typeof window !== "undefined") {
      localStorage.setItem("demurrage_demo_user", JSON.stringify(matchingMock));
    }
  };

  const setUser = (user: User) => {
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      localStorage.setItem("demurrage_demo_user", JSON.stringify(user));
    }
  };

  const loginAs = (role: UserRole, name?: string, email?: string) => {
    const user: User = {
      id: \`usr-\${Date.now()}\`,
      name: name || \`\${role} User\`,
      email: email || \`\${role.toLowerCase().replace(/\\s+/g, ".")}@maritime-ops.com\`,
      role,
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      localStorage.setItem("demurrage_demo_user", JSON.stringify(user));
    }
  };

  const logout = () => {
    setCurrentUser(MOCK_USERS[0]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("demurrage_demo_user");
    }
  };

  // Permission helpers
  const canAccessUsers = currentUser.role === "Admin";
  const isReadOnly = currentUser.role === "Reviewer";

  const canEditClaim = (claimAssignedTo?: string): boolean => {
    if (currentUser.role === "Admin" || currentUser.role === "Supervisor") {
      return true;
    }
    if (currentUser.role === "Reviewer") {
      return false;
    }
    if (currentUser.role === "Claim Processor") {
      if (!claimAssignedTo) return false;
      return (
        claimAssignedTo.toLowerCase().includes("sarah") ||
        claimAssignedTo.toLowerCase() === currentUser.name.toLowerCase()
      );
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser.role,
        setRole,
        setUser,
        canEditClaim,
        canAccessUsers,
        isReadOnly,
        loginAs,
        logout,
        isMounted,
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
`;

fs.writeFileSync(path.join(process.cwd(), 'lib/context/AuthContext.tsx'), authCode, 'utf8');
console.log('Successfully updated lib/context/AuthContext.tsx');
