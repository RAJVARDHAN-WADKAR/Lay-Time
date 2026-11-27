import { UserRole } from "@/lib/types";
import {
  AppRole,
  Permission,
  ACCESS_MATRIX,
  normalizeRole,
  can as canRole,
  isRouteAllowed,
  getRoleDashboardPath
} from "./accessMatrix";

export {
  normalizeRole,
  canRole as can,
  getRoleDashboardPath,
  isRouteAllowed as canAccessRoute,
  ACCESS_MATRIX
};
export type { AppRole, Permission };

export function isProcessor(role?: string): boolean {
  return normalizeRole(role) === "CLAIM_PROCESSOR";
}

export function isSupervisor(role?: string): boolean {
  return normalizeRole(role) === "SUPERVISOR";
}

export function isAdmin(role?: string): boolean {
  return normalizeRole(role) === "ADMIN";
}

export function isReviewer(role?: string): boolean {
  return normalizeRole(role) === "REVIEWER";
}

export function isClient(role?: string, clientId?: string | null): boolean {
  return normalizeRole(role, Boolean(clientId)) === "CLIENT";
}

export function checkRolePermission(
  userRole: UserRole | string,
  allowedRoles: (UserRole | AppRole | string)[]
): boolean {
  const normalized = normalizeRole(userRole);
  return allowedRoles.some((r) => normalizeRole(r) === normalized);
}

// 1. CLAIMS
export function canViewClaims(role?: string, clientId?: string | null): boolean {
  return canRole(role, "claims:view", Boolean(clientId));
}

export function canViewAllClaims(role?: string, clientId?: string | null): boolean {
  return canRole(role, "claims:view_all", Boolean(clientId));
}

export function canCreateClaim(role?: string, clientId?: string | null): boolean {
  return canRole(role, "claims:create", Boolean(clientId));
}

export function canEditClaim(
  userRole?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string,
  _claimClient?: string,
  _userClient?: string,
  userId?: string
): boolean {
  const r = normalizeRole(userRole);
  if (!canRole(r, "claims:edit")) return false;
  if (r === "ADMIN" || r === "SUPERVISOR") return true;
  if (r === "CLAIM_PROCESSOR") {
    if (!claimAssignedTo || !claimAssignedTo.trim()) return false;
    const assignedLower = claimAssignedTo.trim().toLowerCase();
    const emailLower = (userEmail || "").trim().toLowerCase();
    const nameLower = (userName || "").trim().toLowerCase();
    const idLower = (userId || "").trim().toLowerCase();
    return (
      (emailLower !== "" && assignedLower === emailLower) ||
      (nameLower !== "" && assignedLower === nameLower) ||
      (idLower !== "" && assignedLower === idLower)
    );
  }
  return false;
}

export function canDeleteClaim(role?: string): boolean {
  return canRole(role, "claims:delete");
}

export function canApproveClaim(role?: string): boolean {
  return canRole(role, "claims:approve");
}

export function canSubmitClaim(role?: string): boolean {
  return canRole(role, "claims:edit");
}

// 2. ASSIGN / REASSIGN
export function canAssignClaim(role?: string): boolean {
  return canRole(role, "claims:assign");
}

export function canReassignClaim(role?: string): boolean {
  return canRole(role, "claims:reassign");
}

// 3. SOF, PORTS, BERTHS
export function canViewSoF(role?: string, _claimStatus?: string, clientId?: string | null): boolean {
  return canRole(role, "sof:view", Boolean(clientId));
}

export function canEditSoF(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string,
  userId?: string
): boolean {
  if (!canRole(role, "sof:edit")) return false;
  return canEditClaim(role, userEmail, claimAssignedTo, userName, undefined, undefined, userId);
}

// 4. DOCUMENTS
export function canViewDocuments(role?: string, clientId?: string | null): boolean {
  return canRole(role, "documents:view", Boolean(clientId));
}

export function canUploadDocuments(
  role?: string,
  _isClientUploadRequested?: boolean,
  clientId?: string | null
): boolean {
  return canRole(role, "documents:upload", Boolean(clientId));
}

export function canDeleteDocuments(role?: string): boolean {
  return canRole(role, "documents:delete");
}

// 5. LAYTIME CALCULATION
export function canViewLaytime(role?: string, clientId?: string | null): boolean {
  return canRole(role, "calculator:view", Boolean(clientId));
}

export function canEditLaytime(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string,
  userId?: string
): boolean {
  if (!canRole(role, "calculator:use")) return false;
  return canEditClaim(role, userEmail, claimAssignedTo, userName, undefined, undefined, userId);
}

export function canRecalculateLaytime(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string,
  userId?: string
): boolean {
  return canEditLaytime(role, userEmail, claimAssignedTo, userName, userId);
}

// 6. CALCULATION OVERRIDE
export function canOverrideCalculation(role?: string): boolean {
  return canRole(role, "calculator:override");
}

// 7. RAC FINDINGS
export function canViewRac(role?: string, clientId?: string | null): boolean {
  return canRole(role, "rac:view", Boolean(clientId));
}

export function canEditRac(
  role?: string,
  userEmail?: string,
  racAssignedTo?: string,
  userName?: string,
  userId?: string
): boolean {
  if (!canRole(role, "rac:edit")) return false;
  return canEditClaim(role, userEmail, racAssignedTo, userName, undefined, undefined, userId);
}

export function canAuthorizeRac(role?: string): boolean {
  return canRole(role, "rac:authorize");
}

export function canSubmitRac(role?: string): boolean {
  return canRole(role, "rac:submit");
}

export function canResolveRacFindings(role?: string): boolean {
  return canRole(role, "rac:edit");
}

export function canUploadOcr(role?: string): boolean {
  return canRole(role, "ocr:run") || canRole(role, "ocr:use");
}

// 8. INITIATE NEGOTIATION
export function canInitiateNegotiation(role?: string): boolean {
  return canRole(role, "negotiations:initiate");
}

export function canRequestNegotiation(role?: string): boolean {
  return normalizeRole(role) === "CLAIM_PROCESSOR";
}

// 9. LOG COUNTERPARTY OFFERS
export function canLogCounterpartyOffers(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string,
  userId?: string
): boolean {
  return canEditClaim(role, userEmail, claimAssignedTo, userName, undefined, undefined, userId);
}

// 10. DRAFT OUR OFFER
export function canDraftOurOffer(role?: string): boolean {
  return canRole(role, "negotiations:offer");
}

export function canApproveOurOffer(role?: string): boolean {
  return canRole(role, "negotiations:approve");
}

// 11. MINIMUM ACCEPTABLE AMOUNT
export function canViewMinAcceptableAmount(role?: string, clientId?: string | null): boolean {
  const r = normalizeRole(role, Boolean(clientId));
  return r === "ADMIN" || r === "SUPERVISOR" || r === "REVIEWER";
}

export function canSetMinAcceptableAmount(role?: string): boolean {
  return canRole(role, "claims:settle");
}

// 12. ACCEPT / REJECT / CLOSE NEGOTIATION
export function canAcceptRejectCloseNegotiation(role?: string): boolean {
  return canRole(role, "negotiations:close");
}

export function canClientApproveFinalOffer(role?: string, clientId?: string | null): boolean {
  return normalizeRole(role, Boolean(clientId)) === "CLIENT";
}

// 13. NEGOTIATION HISTORY
export function getNegotiationHistoryScope(
  role?: string,
  clientId?: string | null
): "all" | "own" | "shared" | "none" {
  const r = normalizeRole(role, Boolean(clientId));
  if (r === "ADMIN" || r === "SUPERVISOR" || r === "REVIEWER") return "all";
  if (r === "CLAIM_PROCESSOR") return "own";
  if (r === "CLIENT") return "shared";
  return "none";
}

// 14. REVIEW / SETTLE CLAIM
export function canSettleClaim(role?: string): boolean {
  return canRole(role, "claims:settle");
}

// 15. INVOICES
export function canViewInvoices(role?: string): boolean {
  return canRole(role, "invoices:view");
}

export function canCreateEditInvoices(role?: string): boolean {
  return canRole(role, "invoices:manage");
}

export function canApproveInvoices(role?: string): boolean {
  return canRole(role, "invoices:manage");
}

// 16. PAYMENTS
export function canViewPayments(role?: string): boolean {
  return canRole(role, "payments:view");
}

export function canRecordPayments(role?: string): boolean {
  return canRole(role, "payments:manage");
}

export function canEditPayments(role?: string): boolean {
  return canRole(role, "payments:manage");
}

// 17. OWNERS CLAIM / BILLABLE ($)
export function canViewOwnersClaim(_role?: string): boolean {
  return true;
}

export function canEditBillableAmount(role?: string): boolean {
  return canRole(role, "claims:settle");
}

export function canViewBillableAmount(role?: string, clientId?: string | null): boolean {
  const r = normalizeRole(role, Boolean(clientId));
  return r === "ADMIN" || r === "SUPERVISOR" || r === "REVIEWER";
}

// 18. DASHBOARD / ANALYTICS
export function canViewDashboard(role?: string): boolean {
  return !!role;
}

export function getDashboardScope(
  role?: string,
  clientId?: string | null
): "global" | "own" | "financial" | "none" {
  const r = normalizeRole(role, Boolean(clientId));
  if (r === "ADMIN" || r === "SUPERVISOR" || r === "REVIEWER") return "global";
  if (r === "CLAIM_PROCESSOR" || r === "CLIENT") return "own";
  return "none";
}

// 19. REPORTS
export function canViewReports(role?: string, clientId?: string | null): boolean {
  return canRole(role, "reports:view", Boolean(clientId));
}

export function canExportReports(role?: string, clientId?: string | null): boolean {
  return canRole(role, "reports:export", Boolean(clientId));
}

export function getReportsScope(
  role?: string,
  clientId?: string | null
): "all" | "own" | "financial" | "none" {
  const r = normalizeRole(role, Boolean(clientId));
  if (r === "ADMIN" || r === "SUPERVISOR" || r === "REVIEWER") return "all";
  return "none";
}

// 20. CLIENTS / VESSELS
export function canViewClientsVessels(role?: string, clientId?: string | null): boolean {
  return canRole(role, "clients:view", Boolean(clientId));
}

export function canCreateClientsVessels(role?: string): boolean {
  return canRole(role, "claims:create");
}

export function canEditClientsVessels(role?: string): boolean {
  return canRole(role, "claims:assign");
}

export function canDeleteClientsVessels(role?: string): boolean {
  return canRole(role, "settings:manage");
}

// 21. USERS AND ROLES
export function canManageUsers(role?: string): boolean {
  return canRole(role, "users:manage");
}

export function canViewUsers(role?: string): boolean {
  return canRole(role, "users:view");
}

export function canAccessUsers(role?: string): boolean {
  return canRole(role, "users:view");
}

// 22. COMPANY SETTINGS
export function canManageSettings(role?: string): boolean {
  return canRole(role, "settings:manage");
}

export function canAccessSettings(role?: string): boolean {
  return canRole(role, "settings:manage");
}

// 23. AUDIT LOG
export function canViewAuditLog(role?: string, clientId?: string | null): boolean {
  return canRole(role, "audit:view", Boolean(clientId));
}

// 24. TRACKER SYNC
export function canSyncTracker(role?: string, clientId?: string | null): boolean {
  return canRole(role, "tracker:sync", Boolean(clientId));
}
