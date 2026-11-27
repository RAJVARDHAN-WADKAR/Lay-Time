/**
 * Central Maritime Date & Time Rules for Demurrage Management
 * Enforced on client forms and server APIs.
 */

export interface DateChainInputs {
  charterpartyDate?: string | null;
  voyageEndDate?: string | null;
  instructionReceivedDate?: string | null;
  noticeReceivedDate?: string | null;
  claimReceivedDate?: string | null;
  claimFiledDate?: string | null;
  agreedDate?: string | null;
  paymentReceivedDate?: string | null;
}

export interface DateChainValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface SofEventInput {
  id?: string;
  activityName?: string;
  berthId?: string;
  startTime: string;
  stopTime: string;
  voyageStartDate?: string | null;
  voyageEndDate?: string | null;
  existingEvents?: Array<{
    id?: string;
    berthId?: string;
    startTime: string;
    stopTime: string;
  }>;
}

/**
 * Returns today's ISO date string (YYYY-MM-DD) based on server/local clock.
 */
export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns current UTC datetime formatted for <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
 */
export function getNowDatetimeLocalIso(): string {
  return new Date().toISOString().slice(0, 16);
}

/**
 * Checks whether a date string is in the future.
 */
export function isFutureDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  // Compare date components or timestamps with 1-minute buffer for clock skew
  const now = new Date();
  return d.getTime() > now.getTime() + 60 * 1000;
}

/**
 * Parses any date string safely into a comparable timestamp.
 */
export function parseDateSafe(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === "13/02/1900" || trimmed.endsWith("1900")) return null;

  // Handle dd/mm/yyyy
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) - 1;
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      const parsed = new Date(y, m, d).getTime();
      return isNaN(parsed) ? null : parsed;
    }
  }

  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Validates the chronological milestone chain:
 * Instruction Received <= Claim Filed <= Agreed Date <= Payment Received
 * C/P date <= Instruction Received (warning if violated)
 * None of the operational milestones may be in the future.
 */
export function validateDateChain(dates: DateChainInputs): DateChainValidation {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const todayIso = getTodayIso();
  const todayTime = new Date(`${todayIso}T23:59:59.999Z`).getTime();

  const tCp = parseDateSafe(dates.charterpartyDate);
  const tVoyageEnd = parseDateSafe(dates.voyageEndDate);
  const tInstr = parseDateSafe(dates.instructionReceivedDate);
  const tNotice = parseDateSafe(dates.noticeReceivedDate);
  const tClaimRec = parseDateSafe(dates.claimReceivedDate);
  const tFiled = parseDateSafe(dates.claimFiledDate) ?? tNotice ?? tClaimRec;
  const tAgreed = parseDateSafe(dates.agreedDate);
  const tPaid = parseDateSafe(dates.paymentReceivedDate);

  // 1. Future date checks (enforced against server clock)
  if (tCp && tCp > todayTime) {
    errors.charterpartyDate = "Charterparty date cannot be in the future.";
  }
  if (tVoyageEnd && tVoyageEnd > todayTime) {
    errors.voyageEndDate = "Voyage End date cannot be in the future.";
  }
  if (tInstr && tInstr > todayTime) {
    errors.instructionReceivedDate = "Instruction Received date cannot be in the future.";
  }
  if (tNotice && tNotice > todayTime) {
    errors.noticeReceivedDate = "Notice Received date cannot be in the future.";
  }
  if (tClaimRec && tClaimRec > todayTime) {
    errors.claimReceivedDate = "Claim Received date cannot be in the future.";
  }
  if (tFiled && tFiled > todayTime) {
    errors.claimFiledDate = "Claim Filed date cannot be in the future.";
  }
  if (tAgreed && tAgreed > todayTime) {
    errors.agreedDate = "Agreed date cannot be in the future.";
  }
  if (tPaid && tPaid > todayTime) {
    errors.paymentReceivedDate = "Payment Received date cannot be in the future.";
  }

  // 2. Chain order checks
  if (tInstr && tFiled && tInstr > tFiled) {
    errors.claimFiledDate = "Claim Filed date must be on or after Instruction Received date.";
  }

  if (tFiled && tAgreed && tFiled > tAgreed) {
    errors.agreedDate = "Agreed date must be on or after Claim Filed date.";
  } else if (tInstr && tAgreed && !tFiled && tInstr > tAgreed) {
    errors.agreedDate = "Agreed date must be on or after Instruction Received date.";
  }

  if (tAgreed && tPaid && tAgreed > tPaid) {
    errors.paymentReceivedDate = "Payment Received date must be on or after Agreed date.";
  }

  // 3. Charterparty date warning
  if (tCp && tInstr && tCp > tInstr) {
    warnings.charterpartyDate =
      "Warning: Charterparty date is after Instruction Received date. Please verify fixture timing.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a Statement of Facts (SoF) event:
 * - start < stop
 * - duration > 0 and <= 30 days
 * - cannot be in future
 * - inside voyage window (if provided)
 * - no overlap within the same berth
 */
export function validateSofEvent(input: SofEventInput): { isValid: boolean; error?: string } {
  const start = new Date(input.startTime).getTime();
  const stop = new Date(input.stopTime).getTime();

  if (isNaN(start) || isNaN(stop)) {
    return { isValid: false, error: "Invalid date format for SoF event." };
  }

  if (start >= stop) {
    return { isValid: false, error: "Activity start time must be before stop time." };
  }

  const durationMs = stop - start;
  const max30DaysMs = 30 * 24 * 60 * 60 * 1000;

  if (durationMs <= 0) {
    return { isValid: false, error: "Duration must be greater than 0 minutes." };
  }

  if (durationMs > max30DaysMs) {
    return { isValid: false, error: "Activity duration cannot exceed 30 consecutive days." };
  }

  // Future check
  const nowBuffer = Date.now() + 60 * 1000;
  if (start > nowBuffer) {
    return { isValid: false, error: "SoF event start time cannot be in the future." };
  }
  if (stop > nowBuffer) {
    return { isValid: false, error: "SoF event stop time cannot be in the future." };
  }

  // Voyage window checks
  if (input.voyageStartDate) {
    const vStart = new Date(input.voyageStartDate).getTime();
    if (!isNaN(vStart) && start < vStart) {
      return { isValid: false, error: "SoF event starts before the voyage commencement window." };
    }
  }

  if (input.voyageEndDate) {
    const vEnd = new Date(input.voyageEndDate).getTime();
    if (!isNaN(vEnd) && stop > vEnd + 24 * 60 * 60 * 1000) {
      return { isValid: false, error: "SoF event stops after the voyage completion window." };
    }
  }

  // Overlap check within the same berth
  if (input.berthId && input.existingEvents && input.existingEvents.length > 0) {
    for (const other of input.existingEvents) {
      if (other.id && input.id && other.id === input.id) continue;
      if (other.berthId && other.berthId !== input.berthId) continue;

      const oStart = new Date(other.startTime).getTime();
      const oStop = new Date(other.stopTime).getTime();

      if (!isNaN(oStart) && !isNaN(oStop)) {
        // Standard interval overlap: start < oStop AND stop > oStart
        if (start < oStop && stop > oStart) {
          return {
            isValid: false,
            error: `Activity overlaps with an existing event in this berth (${other.startTime} - ${other.stopTime}).`
          };
        }
      }
    }
  }

  return { isValid: true };
}
