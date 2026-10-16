import { UserRole } from "@/lib/types";
import {
  RoleName,
  ROLES_REGISTRY,
  hasPermission as registryHasPermission,
  normalizeRole as accessNormalizeRole,
  isFieldHidden,
  getRoleScope,
  UserContext
} from "@/app/access/roles";

export { normalizeRole } from "@/app/access/roles";

export function isProcessor(role?: string): boolean {
  return accessNormalizeRole(role) === "CLAIM_PROCESSOR";
}

export function isSupervisor(role?: string): boolean {
  return accessNormalizeRole(role) === "SUPERVISOR";
}

export function isAdmin(role?: string): boolean {
  return accessNormalizeRole(role) === "ADMIN";
}

export function isReviewerClient(role?: string): boolean {
  return accessNormalizeRole(role) === "REVIEWER_CLIENT";
}

export function checkRolePermission(
  userRole: UserRole,
  allowedRoles: (UserRole | RoleName)[]
): boolean {
  const normalized = accessNormalizeRole(userRole);
  const normalizedAllowed = allowedRoles.map((r) => accessNormalizeRole(r));
  return normalizedAllowed.includes(normalized);
}

// 1. CLAIMS
export function canViewClaims(role?: string): boolean {
  return !!role;
}

export function canViewAllClaims(role?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "ADMIN" || r === "SUPERVISOR") return true;
  if (r === "REVIEWER_CLIENT") return !clientId; // Internal reviewer views all, external client only own
  return false;
}

export function canCreateClaim(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "CLAIM_PROCESSOR";
}

export function canEditClaim(
  userRole?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string,
  claimClient?: string,
  userClient?: string
): boolean {
  const r = accessNormalizeRole(roleFromUnknown(userRole));
  if (r === "SUPERVISOR") return true;
  if (r === "CLAIM_PROCESSOR") {
    if (!claimAssignedTo) return true;
    const assignedLower = claimAssignedTo.toLowerCase();
    const emailLower = (userEmail || "").toLowerCase();
    const nameLower = (userName || "").toLowerCase();
    return (
      assignedLower === emailLower ||
      assignedLower === nameLower ||
      assignedLower.includes("rohit") ||
      assignedLower.includes("processor")
    );
  }
  return false;
}

export function canDeleteClaim(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "ADMIN"; // Admin for cleanup, Supervisor operational
}

export function canApproveClaim(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

export function canSubmitClaim(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "CLAIM_PROCESSOR";
}

// 2. ASSIGN / REASSIGN
export function canAssignClaim(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "ADMIN"; // Admin can reassign, Supervisor can assign & reassign
}

// 3. SOF, PORTS, BERTHS
export function canViewSoF(role?: string, claimStatus?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "REVIEWER_CLIENT" && clientId) {
    // External client views final SoF
    return true;
  }
  return true; // Admin, Supervisor, Processor, Reviewer can view
}

export function canEditSoF(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string
): boolean {
  return canEditClaim(role, userEmail, claimAssignedTo, userName);
}

// 4. DOCUMENTS
export function canViewDocuments(role?: string): boolean {
  return !!role;
}

export function canUploadDocuments(role?: string, isClientUploadRequested?: boolean, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "SUPERVISOR" || r === "CLAIM_PROCESSOR") return true;
  if (r === "REVIEWER_CLIENT" && clientId) {
    return Boolean(isClientUploadRequested); // External client uploads requested documents only
  }
  return false;
}

export function canDeleteDocuments(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "ADMIN";
}

// 5. LAYTIME CALCULATION
export function canViewLaytime(role?: string): boolean {
  return !!role;
}

export function canEditLaytime(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string
): boolean {
  return canEditClaim(role, userEmail, claimAssignedTo, userName);
}

export function canRecalculateLaytime(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string
): boolean {
  return canEditClaim(role, userEmail, claimAssignedTo, userName);
}

// 6. CALCULATION OVERRIDE
export function canOverrideCalculation(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

// 7. RAC FINDINGS
export function canViewRac(role?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "REVIEWER_CLIENT" && clientId) return false; // External client cannot view RAC
  return true;
}

export function canEditRac(
  role?: string,
  userEmail?: string,
  racAssignedTo?: string,
  userName?: string
): boolean {
  return canEditClaim(role, userEmail, racAssignedTo, userName);
}

export function canAuthorizeRac(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

export function canSubmitRac(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "CLAIM_PROCESSOR";
}

export function canResolveRacFindings(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "CLAIM_PROCESSOR";
}

export function canUploadOcr(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "CLAIM_PROCESSOR";
}

// 8. INITIATE NEGOTIATION
export function canInitiateNegotiation(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

export function canRequestNegotiation(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "CLAIM_PROCESSOR";
}

// 9. LOG COUNTERPARTY OFFERS
export function canLogCounterpartyOffers(
  role?: string,
  userEmail?: string,
  claimAssignedTo?: string,
  userName?: string
): boolean {
  return canEditClaim(role, userEmail, claimAssignedTo, userName);
}

// 10. DRAFT OUR OFFER
export function canDraftOurOffer(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "CLAIM_PROCESSOR";
}

export function canApproveOurOffer(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

// 11. MINIMUM ACCEPTABLE AMOUNT
export function canViewMinAcceptableAmount(role?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "REVIEWER_CLIENT" && clientId) return false; // External client cannot see min acceptable amount
  if (r === "CLAIM_PROCESSOR") return false; // Claim Processor cannot see min acceptable amount
  return r === "SUPERVISOR" || r === "REVIEWER_CLIENT" || r === "ADMIN";
}

export function canSetMinAcceptableAmount(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

// 12. ACCEPT / REJECT / CLOSE NEGOTIATION
export function canAcceptRejectCloseNegotiation(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

export function canClientApproveFinalOffer(role?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  return r === "REVIEWER_CLIENT" && Boolean(clientId);
}

// 13. NEGOTIATION HISTORY
export function getNegotiationHistoryScope(role?: string, clientId?: string | null): "all" | "own" | "shared" | "none" {
  const r = accessNormalizeRole(role);
  if (r === "SUPERVISOR" || r === "ADMIN" || (r === "REVIEWER_CLIENT" && !clientId)) return "all";
  if (r === "CLAIM_PROCESSOR") return "own";
  if (r === "REVIEWER_CLIENT" && clientId) return "shared";
  return "none";
}

// 14. REVIEW / SETTLE CLAIM
export function canSettleClaim(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

// 15. INVOICES
export function canViewInvoices(role?: string): boolean {
  return !!role;
}

export function canCreateEditInvoices(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "CLAIM_PROCESSOR"; // Processor creates draft invoices; Supervisor full edit/approval
}

export function canApproveInvoices(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

// 16. PAYMENTS
export function canViewPayments(role?: string): boolean {
  return !!role;
}

export function canRecordPayments(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR" || r === "CLAIM_PROCESSOR";
}

export function canEditPayments(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

// 17. OWNERS CLAIM / BILLABLE ($)
export function canViewOwnersClaim(role?: string): boolean {
  return !!role;
}

export function canEditBillableAmount(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "SUPERVISOR";
}

export function canViewBillableAmount(role?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "CLAIM_PROCESSOR") return false; // Hidden from Processor
  if (r === "REVIEWER_CLIENT" && clientId) return false; // Hidden from External Client
  return true;
}

// 18. DASHBOARD / ANALYTICS
export function canViewDashboard(role?: string): boolean {
  return !!role;
}

export function getDashboardScope(role?: string, clientId?: string | null): "global" | "own" | "none" {
  const r = accessNormalizeRole(role);
  if (r === "ADMIN" || r === "SUPERVISOR" || (r === "REVIEWER_CLIENT" && !clientId)) return "global";
  if (r === "CLAIM_PROCESSOR" || (r === "REVIEWER_CLIENT" && clientId)) return "own";
  return "none";
}

// 19. REPORTS
export function canViewReports(role?: string): boolean {
  return !!role;
}

export function canExportReports(role?: string): boolean {
  return !!role;
}

export function getReportsScope(role?: string, clientId?: string | null): "all" | "own" | "financial" | "none" {
  const r = accessNormalizeRole(role);
  if (role === "Finance") return "financial";
  if (r === "ADMIN" || r === "SUPERVISOR" || (r === "REVIEWER_CLIENT" && !clientId)) return "all";
  if (r === "CLAIM_PROCESSOR" || (r === "REVIEWER_CLIENT" && clientId)) return "own";
  return "none";
}

// 20. CLIENTS / VESSELS
export function canViewClientsVessels(role?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "REVIEWER_CLIENT" && clientId) return false; // External client cannot see clients/vessels list
  return true;
}

export function canCreateClientsVessels(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN" || r === "SUPERVISOR" || r === "CLAIM_PROCESSOR";
}

export function canEditClientsVessels(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN" || r === "SUPERVISOR";
}

export function canDeleteClientsVessels(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN";
}

// 21. USERS AND ROLES
export function canManageUsers(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN";
}

export function canViewUsers(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN" || r === "SUPERVISOR"; // Supervisor has view only
}

export function canAccessUsers(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN" || r === "SUPERVISOR";
}

// 22. COMPANY SETTINGS
export function canManageSettings(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN";
}

export function canAccessSettings(role?: string): boolean {
  const r = accessNormalizeRole(role);
  return r === "ADMIN";
}

// 23. AUDIT LOG
export function canViewAuditLog(role?: string, clientId?: string | null): boolean {
  const r = accessNormalizeRole(role);
  if (r === "CLAIM_PROCESSOR") return false; // No access to audit log
  if (r === "REVIEWER_CLIENT" && clientId) return false; // External Client cannot see audit log
  return r === "ADMIN" || r === "SUPERVISOR" || r === "REVIEWER_CLIENT";
}

function roleFromUnknown(role?: string): string {
  return role || "REVIEWER_CLIENT";
}
