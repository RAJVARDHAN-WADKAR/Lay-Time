export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi, isClaimAssignedToUser } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getClaimById, saveActivitiesForClaim, getActivitiesForClaim } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";
import { SoFActivity } from "@/lib/types";
import { calculateGrossMinutes, formatMinutes } from "@/lib/calculations/deductions";

export const POST = withApi({
  permission: "sof:edit",
  handler: async ({ user, body }) => {
    const { claimId, fileName, action, parsedRows } = body || {};

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    const claim = getClaimById(claimId);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (normalizeRole(user.role) === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(claim, user)) {
      return NextResponse.json(
        { error: "Forbidden: Claim Processors may only import timesheets on assigned claims." },
        { status: 403 }
      );
    }

    if (action === "preview") {
      const defaultRows = [
        {
          activityName: "Commenced Discharging Cargo",
          startTime: "2024-07-11T14:00:00Z",
          stopTime: "2024-07-12T10:00:00Z",
          durationMinutes: 1200,
          durationFormatted: "20h 00m",
          category: "Other",
          percentageCounted: 100,
          remarks: "Timesheet log Sheet #1"
        },
        {
          activityName: "Rain Stoppage (Hatch Covers Closed)",
          startTime: "2024-07-12T10:00:00Z",
          stopTime: "2024-07-12T18:00:00Z",
          durationMinutes: 480,
          durationFormatted: "08h 00m",
          category: "Rain",
          percentageCounted: 50,
          remarks: "Port Weather Observation Report attached"
        }
      ];

      return NextResponse.json({
        success: true,
        previewRows: parsedRows || defaultRows,
        fileName: fileName || "Port_Timesheet_Import.csv"
      });
    }

    if (action === "approve") {
      const rowsToImport = parsedRows || [];
      const currentActivities = getActivitiesForClaim(claimId);
      const portId = claim.ports?.[0]?.id || "port-1";
      const berthId = claim.ports?.[0]?.berths?.[0]?.id || "berth-1-1";

      const newActivities: SoFActivity[] = rowsToImport.map((row: any, i: number) => {
        const grossMinutes = calculateGrossMinutes(row.startTime, row.stopTime);
        const durationMinutes = grossMinutes > 0 ? grossMinutes : 60;
        const durationFormatted = formatMinutes(durationMinutes);
        return {
          id: `ts-${Date.now()}-${i + 1}`,
          claimId,
          portId,
          berthId,
          activityName: row.activityName,
          startTime: row.startTime,
          stopTime: row.stopTime,
          durationMinutes,
          durationFormatted,
          percentageCounted: row.percentageCounted !== undefined ? row.percentageCounted : 100,
          prorata: 100,
          deductionCategory: row.category || "Other",
          remarks: row.remarks || "Imported from Timesheet",
          isOcrExtracted: false,
          isCorrected: true,
          ocrConfidence: 1.0
        };
      });

      const merged = [...currentActivities, ...newActivities];
      saveActivitiesForClaim(claimId, merged);

      const db = getDatabase();
      db.prepare(`
        INSERT INTO timesheet_imports (id, claim_id, file_name, uploaded_by, uploaded_at, parsed_rows_json, is_approved, approved_by, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        `ts-imp-${Date.now()}`,
        claimId,
        fileName || "Timesheet.csv",
        user.name || user.email || "System",
        new Date().toISOString(),
        JSON.stringify(rowsToImport),
        user.name || user.email || "System",
        new Date().toISOString()
      );

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${newActivities.length} events into Statement of Facts.`,
        activitiesCount: merged.length
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'preview' or 'approve'." }, { status: 400 });
  }
});
