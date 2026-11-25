/**
 * Shared Status Normalization Helper
 * Used consistently across Dashboard, Ledger, and Timebar calculations.
 */

export type NormalizedClaimStatus =
  | "Submitted"
  | "Review"
  | "Incomplete"
  | "Settled"
  | "Disputed"
  | "Legal"
  | "Timebarred"
  | "Closed"
  | "Agreed"
  | "Write Off"
  | "Nil Demurrage"
  | "Pending Info"
  | "Calculation Sent"
  | "Claim Filed"
  | "Waiting Response";

/**
 * Normalizes any raw status string (e.g. from dataset "8. Disputed", "9. Legal", "10. Claim Closed")
 * into a clean standard normalized status.
 */
export function normalizeClaimStatus(status?: string | null): string {
  if (!status) return "Submitted";
  const s = status.trim();
  const lower = s.toLowerCase();

  if (lower.includes("disputed")) return "Disputed";
  if (lower.includes("legal")) return "Legal";
  if (lower.includes("review")) return "Review";
  if (lower.includes("settled")) return "Settled";
  if (lower.includes("timebarred") || lower.includes("timebar")) return "Timebarred";
  if (lower.includes("closed") || lower.includes("claim closed")) return "Closed";
  if (lower.includes("write off") || lower.includes("commercial write off")) return "Write Off";
  if (lower.includes("nil demurrage")) return "Nil Demurrage";
  if (lower.includes("pending info")) return "Pending Info";
  if (lower.includes("calculation sent")) return "Calculation Sent";
  if (lower.includes("claim filed")) return "Claim Filed";
  if (lower.includes("waiting")) return "Waiting Response";
  if (lower.includes("agreed")) return "Agreed";
  if (lower.includes("incomplete")) return "Incomplete";
  if (lower.includes("submitted")) return "Submitted";

  return s;
}

/**
 * Determines whether a claim status falls under commercial or legal contention.
 * Per specification: contention = filed amount of Disputed + Legal + Review claims.
 */
export function isStatusUnderContention(status?: string | null): boolean {
  if (!status) return false;
  const norm = normalizeClaimStatus(status);
  return norm === "Disputed" || norm === "Legal" || norm === "Review";
}
