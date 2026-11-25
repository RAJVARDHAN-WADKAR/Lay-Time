import Database from "better-sqlite3";
import { getDatabase } from "@/lib/db";

/**
 * Extracts the 2-digit year from an Instruction Received date string.
 * Defaults to current year if missing or invalid.
 */
export function getInstructionYear(dateStr?: string | null): { fullYear: number; year2: string } {
  let fullYear = new Date().getFullYear();
  if (dateStr) {
    const trimmed = dateStr.trim();
    // Try YYYY-MM-DD
    const matchYmd = trimmed.match(/^(\d{4})/);
    if (matchYmd) {
      fullYear = parseInt(matchYmd[1], 10);
    } else if (trimmed.includes("/")) {
      // dd/mm/yyyy
      const parts = trimmed.split("/");
      if (parts.length === 3) {
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        fullYear = y;
      }
    } else {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        fullYear = d.getFullYear();
      }
    }
  }

  const year2 = String(fullYear).slice(-2);
  return { fullYear, year2 };
}

/**
 * Generates the next sequential claim ID inside an atomic database transaction.
 * Format: DBLS + 2-digit year + sequence (e.g., DBLS24397, DBLS26001).
 * Sequence = max existing sequence for that year + 1.
 */
export function generateNextClaimId(db?: Database.Database, instructionDate?: string | null): string {
  const database = db || getDatabase();
  const { fullYear, year2 } = getInstructionYear(instructionDate);
  const prefix = `DBLS${year2}`;

  // Execute inside an atomic transaction to ensure concurrency safety
  const getNext = database.transaction(() => {
    const rows = database
      .prepare("SELECT id FROM claims WHERE id LIKE ?")
      .all(`${prefix}%`) as { id: string }[];

    let maxSeq = 0;
    for (const r of rows) {
      const numPart = r.id.slice(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }

    // If tracker for 2024 stopped at 397, next is 398. If 2026 has none, start at 1 -> DBLS26001
    let nextSeq = 1;
    if (maxSeq > 0) {
      nextSeq = maxSeq + 1;
    } else if (fullYear === 2024) {
      nextSeq = 398;
    }

    const seqPadded = String(nextSeq).padStart(3, "0");
    return `${prefix}${seqPadded}`;
  });

  return getNext();
}
