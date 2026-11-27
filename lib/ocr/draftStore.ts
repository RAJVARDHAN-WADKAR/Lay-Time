import { getDatabase } from "@/lib/db";
import { DocumentRecord, OcrDraft, OcrDraftEvent, Discrepancy } from "@/lib/types";
import { getDocumentById, getClaimById, addActivityToClaim } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";

export function getOcrDraftByDocumentId(documentId: string): OcrDraft | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM ocr_drafts WHERE document_id = ? LIMIT 1")
    .get(documentId) as any;
  if (!row) return null;
  return mapRowToDraft(row);
}

export function getOcrDraftsForClaim(claimId: string): OcrDraft[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM ocr_drafts WHERE claim_id = ? ORDER BY updated_at DESC")
    .all(claimId) as any[];
  return rows.map(mapRowToDraft);
}

function mapRowToDraft(r: any): OcrDraft {
  return {
    id: r.id,
    documentId: r.document_id,
    claimId: r.claim_id,
    portId: r.port_id || undefined,
    berthId: r.berth_id || undefined,
    rawText: r.raw_text || "",
    pages: r.pages_json ? JSON.parse(r.pages_json) : [],
    parsedEvents: r.parsed_events_json ? JSON.parse(r.parsed_events_json) : [],
    overallConfidence: Number(r.overall_confidence ?? 0),
    isScanned: Boolean(r.is_scanned),
    isDemo: Boolean(r.is_demo),
    confirmedAt: r.confirmed_at || undefined,
    confirmedBy: r.confirmed_by || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export function tryAcquireDocumentOcrLock(documentId: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `UPDATE documents
       SET status = 'OCR Processing', error_reason = NULL, modified_at = ?
       WHERE id = ? AND status != 'OCR Processing'`
    )
    .run(now, documentId);
  return res.changes > 0;
}

export function markDocumentOcrFailed(documentId: string, reason: string, actor?: string): DocumentRecord | null {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE documents
     SET status = 'OCR Failed', error_reason = ?, modified_by = COALESCE(?, modified_by), modified_at = ?
     WHERE id = ?`
  ).run(reason, actor || null, now, documentId);
  return getDocumentById(documentId);
}

export function deterministicDiscrepancyId(
  claimId: string,
  documentId: string,
  type: string,
  field: string,
  activityKey: string
): string {
  const raw = `${claimId}:${documentId}:${type}:${field}:${activityKey}`
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, "_");
  return `disc-${raw.slice(0, 120)}`;
}

/**
 * Saves OCR draft, updates document record to OCR Completed, and upserts discrepancies
 * in ONE atomic SQLite transaction. Never reopens already-resolved discrepancies.
 */
export function persistOcrDraftAndDiscrepancies(params: {
  documentId: string;
  claimId: string;
  portId?: string;
  berthId?: string;
  rawText: string;
  pages: Array<{ pageNumber: number; text: string; averageConfidence: number }>;
  parsedEvents: OcrDraftEvent[];
  overallConfidencePct: number;
  isScanned: boolean;
  isDemo: boolean;
  discrepancies: Discrepancy[];
  actor: string;
}): OcrDraft {
  const db = getDatabase();
  const now = new Date().toISOString();
  const draftId = `draft-${params.documentId}`;

  const runTx = db.transaction(() => {
    db.prepare(
      `UPDATE documents
       SET status = 'OCR Completed',
           ocr_confidence = ?,
           extracted_items_count = ?,
           error_reason = NULL,
           modified_by = ?,
           modified_at = ?
       WHERE id = ?`
    ).run(
      Number((params.overallConfidencePct / 100).toFixed(2)),
      params.parsedEvents.length,
      params.actor,
      now,
      params.documentId
    );

    db.prepare(
      `INSERT INTO ocr_drafts (
         id, document_id, claim_id, port_id, berth_id, raw_text, pages_json,
         parsed_events_json, overall_confidence, is_scanned, is_demo,
         confirmed_at, confirmed_by, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
       ON CONFLICT(document_id) DO UPDATE SET
         claim_id = excluded.claim_id,
         port_id = excluded.port_id,
         berth_id = excluded.berth_id,
         raw_text = excluded.raw_text,
         pages_json = excluded.pages_json,
         parsed_events_json = excluded.parsed_events_json,
         overall_confidence = excluded.overall_confidence,
         is_scanned = excluded.is_scanned,
         is_demo = excluded.is_demo,
         confirmed_at = NULL,
         confirmed_by = NULL,
         updated_at = excluded.updated_at`
    ).run(
      draftId,
      params.documentId,
      params.claimId,
      params.portId || null,
      params.berthId || null,
      params.rawText,
      JSON.stringify(params.pages),
      JSON.stringify(params.parsedEvents),
      params.overallConfidencePct,
      params.isScanned ? 1 : 0,
      params.isDemo ? 1 : 0,
      now,
      now
    );

    // Deterministic UPSERT on discrepancies: NEVER overwrite/reopen a resolved discrepancy (WHERE is_resolved = 0)
    const upsertDisc = db.prepare(`
      INSERT INTO discrepancies (
        id, claim_id, rac_case_id, activity_id, type, severity, title, description,
        field, current_value, suggested_value, is_resolved, resolved_by, resolved_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)
      ON CONFLICT(id) DO UPDATE SET
        severity = excluded.severity,
        title = excluded.title,
        description = excluded.description,
        current_value = excluded.current_value,
        suggested_value = excluded.suggested_value
      WHERE discrepancies.is_resolved = 0
    `);

    for (const d of params.discrepancies) {
      const detId = deterministicDiscrepancyId(
        params.claimId,
        params.documentId,
        d.type,
        d.field || "SoF",
        d.activityId || d.title || "item"
      );
      upsertDisc.run(
        detId,
        params.claimId,
        d.activityId || null,
        d.type,
        d.severity,
        d.title,
        d.description,
        d.field || "SoF",
        d.currentValue || "",
        d.suggestedValue || ""
      );
    }
  });

  runTx.immediate();
  return getOcrDraftByDocumentId(params.documentId)!;
}

export function confirmOcrDraftEvents(params: {
  documentId: string;
  events: OcrDraftEvent[];
  portId?: string;
  berthId?: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  actorName: string;
}): { savedCount: number; correctionsCount: number; claimId: string } {
  const db = getDatabase();
  const draft = getOcrDraftByDocumentId(params.documentId);
  if (!draft) {
    throw new Error("No OCR draft found for this document.");
  }

  const claim = getClaimById(draft.claimId);
  if (!claim) {
    throw new Error("Associated claim not found.");
  }

  const fallbackPortId = params.portId || draft.portId || claim.ports?.[0]?.id;
  const fallbackBerthId =
    params.berthId ||
    draft.berthId ||
    claim.ports?.find((p) => p.id === fallbackPortId)?.berths?.[0]?.id ||
    claim.ports?.[0]?.berths?.[0]?.id;

  let savedCount = 0;
  let correctionsCount = 0;
  const now = new Date().toISOString();

  const runConfirm = db.transaction(() => {
    for (const evt of params.events) {
      const orig = draft.parsedEvents.find((o) => o.id === evt.id) || evt.originalOcrValues;
      const isCorrected = Boolean(
        evt.isCorrected ||
          (orig &&
            (orig.activityName !== evt.activityName ||
              orig.startTime !== evt.startTime ||
              orig.stopTime !== evt.stopTime ||
              Number(orig.percentageCounted ?? 100) !== Number(evt.percentageCounted ?? 100)))
      );

      if (isCorrected) correctionsCount++;

      const saved = addActivityToClaim(claim.id, {
        portId: evt.portId || fallbackPortId,
        berthId: evt.berthId || fallbackBerthId,
        activityName: evt.activityName,
        startTime: evt.startTime,
        stopTime: evt.stopTime,
        percentageCounted: Number(evt.percentageCounted ?? 100),
        prorata: Number(evt.prorata ?? 100),
        deductionCategory: evt.deductionCategory || "Other",
        remarks: evt.remarks || "",
        isOcrExtracted: true,
        isCorrected,
        ocrConfidence: evt.ocrConfidence,
        originalOcrValues: evt.originalOcrValues
      });
      savedCount++;

      if (isCorrected) {
        logAudit({
          actorId: params.actorId,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: "ocr_draft_correction",
          targetType: "statement_of_facts",
          targetId: saved.id,
          details: {
            documentId: params.documentId,
            claimId: claim.id,
            original: orig || null,
            corrected: {
              activityName: evt.activityName,
              startTime: evt.startTime,
              stopTime: evt.stopTime,
              percentageCounted: evt.percentageCounted,
              deductionCategory: evt.deductionCategory
            }
          }
        });
      }
    }

    db.prepare(
      `UPDATE ocr_drafts
       SET parsed_events_json = ?, confirmed_at = ?, confirmed_by = ?, updated_at = ?
       WHERE document_id = ?`
    ).run(JSON.stringify(params.events), now, params.actorName, now, params.documentId);
  });

  runConfirm.immediate();
  return { savedCount, correctionsCount, claimId: claim.id };
}
