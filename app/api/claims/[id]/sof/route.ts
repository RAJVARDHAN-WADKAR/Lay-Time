import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedSoF, getScopedClaimById } from "@/lib/db/scoped";
import { getDatabase } from "@/lib/db";
import { z } from "zod";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer"],
  handler: async ({ user, params }) => {
    const isClient = Boolean(user.clientId || user.assignedClientId);
    if (user.role === "Client" || isClient) {
      return NextResponse.json(
        { error: "Forbidden: Client role may not access Statement of Facts" },
        { status: 403 }
      );
    }

    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const activities = getScopedSoF(user, params.id);
    return NextResponse.json({ activities });
  }
});

const SoFActivitySchema = z.object({
  activityName: z.string().min(1, "Activity name is required"),
  startTime: z.string().min(1),
  stopTime: z.string().min(1),
  portId: z.string().optional(),
  berthId: z.string().optional(),
  percentageCounted: z.number().min(0).max(100).optional(),
  prorata: z.number().optional(),
  deductionCategory: z.string().optional(),
  remarks: z.string().optional()
}).passthrough();

export const POST = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
  schema: SoFActivitySchema,
  handler: async ({ user, params, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const db = getDatabase();
    const actId = `act-${Date.now()}`;
    db.prepare(`
      INSERT INTO statement_of_facts (
        id, claim_id, port_id, berth_id, activity_name, start_time, stop_time,
        duration_minutes, duration_formatted, percentage_counted, prorata,
        deduction_category, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actId,
      params.id,
      body.portId || null,
      body.berthId || null,
      body.activityName,
      body.startTime,
      body.stopTime,
      body.durationMinutes || 120,
      body.durationFormatted || "02h 00m",
      body.percentageCounted ?? 100,
      body.prorata ?? 100,
      body.deductionCategory || "Operational",
      body.remarks || ""
    );

    return NextResponse.json({ success: true, activity: { id: actId, ...body } }, { status: 201 });
  }
});
