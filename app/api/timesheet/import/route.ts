import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getClaimById, saveActivitiesForClaim, getActivitiesForClaim } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";
import { SoFActivity } from "@/lib/types";

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
    const { claimId, fileName, action, parsedRows } = body;

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    const claim = getClaimById(claimId);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (action === "preview") {
      // Return simulated/parsed timesheet rows for preview & manual review
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
        },
        {
          activityName: "Resumed Discharging Cargo",
          startTime: "2024-07-12T18:00:00Z",
          stopTime: "2024-07-13T16:00:00Z",
          durationMinutes: 1320,
          durationFormatted: "22h 00m",
          category: "Other",
          percentageCounted: 100,
          remarks: "Terminal shift hand-over"
        },
        {
          activityName: "Discharging Completed",
          startTime: "2024-07-13T16:00:00Z",
          stopTime: "2024-07-13T17:30:00Z",
          durationMinutes: 90,
          durationFormatted: "01h 30m",
          category: "Other",
          percentageCounted: 100,
          remarks: "Hose disconnection completed"
        }
      ];

      return NextResponse.json({
        success: true,
        previewRows: parsedRows || defaultRows,
        fileName: fileName || "Port_Timesheet_Import.csv"
      });
    }

    if (action === "approve") {
      // User approved imported rows -> convert to SoF activities and merge
      const rowsToImport = parsedRows || [];
      const currentActivities = getActivitiesForClaim(claimId);
      const portId = claim.ports?.[0]?.id || "port-1";
      const berthId = claim.ports?.[0]?.berths?.[0]?.id || "berth-1-1";

      const newActivities: SoFActivity[] = rowsToImport.map((row: any, i: number) => ({
        id: `ts-${Date.now()}-${i + 1}`,
        claimId,
        portId,
        berthId,
        activityName: row.activityName,
        startTime: row.startTime,
        stopTime: row.stopTime,
        durationMinutes: row.durationMinutes || 60,
        durationFormatted: row.durationFormatted || "01h 00m",
        percentageCounted: row.percentageCounted !== undefined ? row.percentageCounted : 100,
        prorata: 100,
        deductionCategory: row.category || "Other",
        remarks: row.remarks || "Imported from Timesheet",
        isOcrExtracted: false,
        isCorrected: true,
        ocrConfidence: 1.0
      }));

      const merged = [...currentActivities, ...newActivities];
      saveActivitiesForClaim(claimId, merged);

      // Record import in timesheet_imports table
      const db = getDatabase();
      db.prepare(`
        INSERT INTO timesheet_imports (id, claim_id, file_name, uploaded_by, uploaded_at, parsed_rows_json, is_approved, approved_by, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        `ts-imp-${Date.now()}`,
        claimId,
        fileName || "Timesheet.csv",
        session.name || session.email,
        new Date().toISOString(),
        JSON.stringify(rowsToImport),
        session.name || session.email,
        new Date().toISOString()
      );

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${newActivities.length} events into Statement of Facts.`,
        activitiesCount: merged.length
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'preview' or 'approve'." }, { status: 400 });
  } catch (error: any) {
    console.error("Timesheet Import Error:", error);
    return NextResponse.json({ error: "Failed to process timesheet import" }, { status: 500 });
  }
}
