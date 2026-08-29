import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { processDocumentOcr } from "@/lib/ocr/processor";
import { getClaimById, createNotificationRecord } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "Reviewer") {
      return NextResponse.json({ error: "Forbidden: Reviewers have read-only access." }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, claimId, portId, berthId, rawContent } = body;

    if (!fileName || !claimId) {
      return NextResponse.json({ error: "fileName and claimId are required" }, { status: 400 });
    }

    const claim = getClaimById(claimId);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const ocrResult = processDocumentOcr(fileName, claimId, portId, berthId, rawContent);

    // Persist OCR Discrepancies into database
    const db = getDatabase();
    for (const disc of ocrResult.flaggedDiscrepancies) {
      db.prepare(`
        INSERT OR REPLACE INTO discrepancies (
          id, claim_id, rac_case_id, activity_id, type, severity, title, description,
          field, current_value, suggested_value, is_resolved, resolved_by, resolved_at
        ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)
      `).run(
        disc.id,
        claimId,
        disc.type,
        disc.severity,
        disc.title,
        disc.description,
        disc.field || "SoF",
        disc.currentValue || "",
        disc.suggestedValue || ""
      );
    }

    if (ocrResult.flaggedDiscrepancies.length > 0) {
      createNotificationRecord({
        title: "OCR Discrepancies Detected",
        message: `${ocrResult.flaggedDiscrepancies.length} discrepancy(ies) flagged in ${fileName} for claim ${claim.shipName}. Manual review required.`,
        type: "document",
        claimId,
        claimName: claim.claimName
      });
    }

    return NextResponse.json({
      success: true,
      result: ocrResult
    });
  } catch (error: any) {
    console.error("OCR API Error:", error);
    return NextResponse.json({ error: "Failed to process OCR" }, { status: 500 });
  }
}
