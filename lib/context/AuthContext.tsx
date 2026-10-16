"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  normalizeRole,
  isProcessor,
  canViewClaims as canViewClaimsFn,
  canViewAllClaims as canViewAllClaimsFn,
  canCreateClaim as canCreateClaimFn,
  canEditClaim as canEditClaimFn,
  canDeleteClaim as canDeleteClaimFn,
  canApproveClaim as canApproveClaimFn,
  canSubmitClaim as canSubmitClaimFn,
  canAssignClaim as canAssignClaimFn,
  canViewSoF as canViewSoFFn,
  canEditSoF as canEditSoFFn,
  canViewDocuments as canViewDocumentsFn,
  canUploadDocuments as canUploadDocumentsFn,
  canDeleteDocuments as canDeleteDocumentsFn,
  canViewLaytime as canViewLaytimeFn,
  canEditLaytime as canEditLaytimeFn,
  canRecalculateLaytime as canRecalculateLaytimeFn,
  canOverrideCalculation as canOverrideCalculationFn,
  canViewRac as canViewRacFn,
  canEditRac as canEditRacFn,
  canAuthorizeRac as canAuthorizeRacFn,
  canSubmitRac as canSubmitRacFn,
  canResolveRacFindings as canResolveRacFindingsFn,
  canUploadOcr as canUploadOcrFn,
  canInitiateNegotiation as canInitiateNegotiationFn,
  canRequestNegotiation as canRequestNegotiationFn,
  canLogCounterpartyOffers as canLogCounterpartyOffersFn,
  canDraftOurOffer as canDraftOurOfferFn,
  canApproveOurOffer as canApproveOurOfferFn,
  canViewMinAcceptableAmount as canViewMinAcceptableAmountFn,
  canSetMinAcceptableAmount as canSetMinAcceptableAmountFn,
  canAcceptRejectCloseNegotiation as canAcceptRejectCloseNegotiationFn,
  canClientApproveFinalOffer as canClientApproveFinalOfferFn,
  getNegotiationHistoryScope as getNegotiationHistoryScopeFn,
  canSettleClaim as canSettleClaimFn,
  canViewInvoices as canViewInvoicesFn,
  canCreateEditInvoices as canCreateEditInvoicesFn,
  canViewPayments as canViewPaymentsFn,
  canRecordPayments as canRecordPaymentsFn,
  canEditPayments as canEditPaymentsFn,
  canViewOwnersClaim as canViewOwnersClaimFn,
  canEditBillableAmount as canEditBillableAmountFn,
  canViewDashboard as canViewDashboardFn,
  getDashboardScope as getDashboardScopeFn,
  canViewReports as canViewReportsFn,
  getReportsScope as getReportsScopeFn,
  canViewClientsVessels as canViewClientsVesselsFn,
  canCreateClientsVessels as canCreateClientsVesselsFn,
  canEditClientsVessels as canEditClientsVesselsFn,
  canDeleteClientsVessels as canDeleteClientsVesselsFn,
  canManageUsers as canManageUsersFn,
  canViewUsers as canViewUsersFn,
  canAccessUsers as canAccessUsersFn,
  canManageSettings as canManageSettingsFn,
  canAccessSettings as canAccessSettingsFn,
  canViewAuditLog as canViewAuditLogFn
} from "@/lib/auth/permissions";

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
  canEditClaim: (claimAssignedTo?: string, claimClient?: string) => boolean;
  canEditRac: (racAssignedTo?: string) => boolean;
  canViewClaims: boolean;
  canViewAllClaims: boolean;
  canCreateClaim: boolean;
  canDeleteClaim: boolean;
  canApproveClaim: boolean;
  canSubmitClaim: boolean;
  canSettleClaim: boolean;
  canAssignClaim: boolean;
  canViewSoF: (claimStatus?: string) => boolean;
  canEditSoF: (claimAssignedTo?: string) => boolean;
  canViewDocuments: boolean;
  canUploadDocuments: (isClientRequested?: boolean) => boolean;
  canDeleteDocuments: boolean;
  canViewLaytime: boolean;
  canEditLaytime: (claimAssignedTo?: string) => boolean;
  canRecalculateLaytime: boolean;
  canOverrideCalculation: boolean;
  canViewRac: boolean;
  canAuthorizeRac: boolean;
  canSubmitRac: boolean;
  canResolveRacFindings: boolean;
  canUploadOcr: boolean;
  canInitiateNegotiation: boolean;
  canRequestNegotiation: boolean;
  canLogCounterpartyOffers: (claimAssignedTo?: string) => boolean;
  canDraftOurOffer: boolean;
  canApproveOurOffer: boolean;
  canViewMinAcceptableAmount: boolean;
  canSetMinAcceptableAmount: boolean;
  canAcceptRejectCloseNegotiation: boolean;
  canClientApproveFinalOffer: boolean;
  negotiationHistoryScope: "all" | "own" | "outcome" | "shared" | "none";
  canViewInvoices: boolean;
  canCreateEditInvoices: boolean;
  canViewPayments: boolean;
  canRecordPayments: boolean;
  canEditPayments: boolean;
  canViewOwnersClaim: boolean;
  canEditBillableAmount: boolean;
  canViewDashboard: boolean;
  dashboardScope: "global" | "own" | "financial" | "none";
  canViewReports: boolean;
  reportsScope: "all" | "own" | "financial" | "none";
  canViewClientsVessels: boolean;
  canCreateClientsVessels: boolean;
  canEditClientsVessels: boolean;
  canDeleteClientsVessels: boolean;
  canManageUsers: boolean;
  canViewUsers: boolean;
  canAccessUsers: boolean;
  canManageSettings: boolean;
  canAccessSettings: boolean;
  canViewAuditLog: boolean;
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

  const userRole = user ? normalizeRole(user.role) : "Reviewer";

  const canEditClaim = useCallback(
    (claimAssignedTo?: string, claimClient?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      return canEditClaimFn(user.role, user.email, claimAssignedTo, user.name, claimClient, user.clientName);
    },
    [isAuthenticated, user]
  );

  const canEditRac = useCallback(
    (racAssignedTo?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      return canEditRacFn(user.role, user.email, racAssignedTo, user.name);
    },
    [isAuthenticated, user]
  );

  const canViewSoF = useCallback(
    (claimStatus?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      return canViewSoFFn(user.role, claimStatus);
    },
    [isAuthenticated, user]
  );

  const canEditSoF = useCallback(
    (claimAssignedTo?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      return canEditSoFFn(user.role, user.email, claimAssignedTo, user.name);
    },
    [isAuthenticated, user]
  );

  const canUploadDocuments = useCallback(
    (isClientRequested?: boolean): boolean => {
      if (!isAuthenticated || !user) return false;
      return canUploadDocumentsFn(user.role, isClientRequested);
    },
    [isAuthenticated, user]
  );

  const canEditLaytime = useCallback(
    (claimAssignedTo?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      return canEditLaytimeFn(user.role, user.email, claimAssignedTo, user.name);
    },
    [isAuthenticated, user]
  );

  const canLogCounterpartyOffers = useCallback(
    (claimAssignedTo?: string): boolean => {
      if (!isAuthenticated || !user) return false;
      return canLogCounterpartyOffersFn(user.role, user.email, claimAssignedTo, user.name);
    },
    [isAuthenticated, user]
  );

  const canViewClaims = isAuthenticated && canViewClaimsFn(user?.role);
  const canViewAllClaims = isAuthenticated && canViewAllClaimsFn(user?.role);
  const canCreateClaim = isAuthenticated && canCreateClaimFn(user?.role);
  const canDeleteClaim = isAuthenticated && canDeleteClaimFn(user?.role);
  const canApproveClaim = isAuthenticated && canApproveClaimFn(user?.role);
  const canSubmitClaim = isAuthenticated && canSubmitClaimFn(user?.role);
  const canSettleClaim = isAuthenticated && canSettleClaimFn(user?.role);
  const canAssignClaim = isAuthenticated && canAssignClaimFn(user?.role);
  const canViewDocuments = isAuthenticated && canViewDocumentsFn(user?.role);
  const canDeleteDocuments = isAuthenticated && canDeleteDocumentsFn(user?.role);
  const canViewLaytime = isAuthenticated && canViewLaytimeFn(user?.role);
  const canRecalculateLaytime = isAuthenticated && canRecalculateLaytimeFn(user?.role);
  const canOverrideCalculation = isAuthenticated && canOverrideCalculationFn(user?.role);
  const canViewRac = isAuthenticated && canViewRacFn(user?.role);
  const canAuthorizeRac = isAuthenticated && canAuthorizeRacFn(user?.role);
  const canSubmitRac = isAuthenticated && canSubmitRacFn(user?.role);
  const canResolveRacFindings = isAuthenticated && canResolveRacFindingsFn(user?.role);
  const canUploadOcr = isAuthenticated && canUploadOcrFn(user?.role);
  const canInitiateNegotiation = isAuthenticated && canInitiateNegotiationFn(user?.role);
  const canRequestNegotiation = isAuthenticated && canRequestNegotiationFn(user?.role);
  const canDraftOurOffer = isAuthenticated && canDraftOurOfferFn(user?.role);
  const canApproveOurOffer = isAuthenticated && canApproveOurOfferFn(user?.role);
  const canViewMinAcceptableAmount = isAuthenticated && canViewMinAcceptableAmountFn(user?.role);
  const canSetMinAcceptableAmount = isAuthenticated && canSetMinAcceptableAmountFn(user?.role);
  const canAcceptRejectCloseNegotiation = isAuthenticated && canAcceptRejectCloseNegotiationFn(user?.role);
  const canClientApproveFinalOffer = isAuthenticated && canClientApproveFinalOfferFn(user?.role);
  const negotiationHistoryScope = user ? getNegotiationHistoryScopeFn(user.role) : "none";
  const canViewInvoices = isAuthenticated && canViewInvoicesFn(user?.role);
  const canCreateEditInvoices = isAuthenticated && canCreateEditInvoicesFn(user?.role);
  const canViewPayments = isAuthenticated && canViewPaymentsFn(user?.role);
  const canRecordPayments = isAuthenticated && canRecordPaymentsFn(user?.role);
  const canEditPayments = isAuthenticated && canEditPaymentsFn(user?.role);
  const canViewOwnersClaim = isAuthenticated && canViewOwnersClaimFn(user?.role);
  const canEditBillableAmount = isAuthenticated && canEditBillableAmountFn(user?.role);
  const canViewDashboard = isAuthenticated && canViewDashboardFn(user?.role);
  const dashboardScope = user ? getDashboardScopeFn(user.role) : "none";
  const canViewReports = isAuthenticated && canViewReportsFn(user?.role);
  const reportsScope = user ? getReportsScopeFn(user.role) : "none";
  const canViewClientsVessels = isAuthenticated && canViewClientsVesselsFn(user?.role);
  const canCreateClientsVessels = isAuthenticated && canCreateClientsVesselsFn(user?.role);
  const canEditClientsVessels = isAuthenticated && canEditClientsVesselsFn(user?.role);
  const canDeleteClientsVessels = isAuthenticated && canDeleteClientsVesselsFn(user?.role);
  const canManageUsers = isAuthenticated && canManageUsersFn(user?.role);
  const canViewUsers = isAuthenticated && canViewUsersFn(user?.role);
  const canAccessUsers = isAuthenticated && canAccessUsersFn(user?.role);
  const canManageSettings = isAuthenticated && canManageSettingsFn(user?.role);
  const canAccessSettings = isAuthenticated && canAccessSettingsFn(user?.role);
  const canViewAuditLog = isAuthenticated && canViewAuditLogFn(user?.role);
  const isReadOnly = !isAuthenticated || userRole === "Reviewer";

  return (
    <AuthContext.Provider
      value={{
        currentUser: user || ANONYMOUS_USER,
        user,
        role: userRole,
        isAuthenticated,
        isMounted,
        isLoading,
        login,
        logout,
        setUser,
        canEditClaim,
        canEditRac,
        canViewClaims,
        canViewAllClaims,
        canCreateClaim,
        canDeleteClaim,
        canApproveClaim,
        canSubmitClaim,
        canSettleClaim,
        canAssignClaim,
        canViewSoF,
        canEditSoF,
        canViewDocuments,
        canUploadDocuments,
        canDeleteDocuments,
        canViewLaytime,
        canEditLaytime,
        canRecalculateLaytime,
        canOverrideCalculation,
        canViewRac,
        canAuthorizeRac,
        canSubmitRac,
        canResolveRacFindings,
        canUploadOcr,
        canInitiateNegotiation,
        canRequestNegotiation,
        canLogCounterpartyOffers,
        canDraftOurOffer,
        canApproveOurOffer,
        canViewMinAcceptableAmount,
        canSetMinAcceptableAmount,
        canAcceptRejectCloseNegotiation,
        canClientApproveFinalOffer,
        negotiationHistoryScope,
        canViewInvoices,
        canCreateEditInvoices,
        canViewPayments,
        canRecordPayments,
        canEditPayments,
        canViewOwnersClaim,
        canEditBillableAmount,
        canViewDashboard,
        dashboardScope,
        canViewReports,
        reportsScope,
        canViewClientsVessels,
        canCreateClientsVessels,
        canEditClientsVessels,
        canDeleteClientsVessels,
        canManageUsers,
        canViewUsers,
        canAccessUsers,
        canManageSettings,
        canAccessSettings,
        canViewAuditLog,
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
