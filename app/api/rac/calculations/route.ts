export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { computeRacCalculation } from "@/lib/rac/calculations";
import { saveRacCalculationRecord, getRacCaseById, updateRacCase } from "@/lib/db/queries";

export const POST = withApi({
  permission: "rac:edit",
  handler: async ({ user, body }) => {
    const { racCaseId, ...calcInput } = body || {};

    if (!racCaseId) {
      return NextResponse.json({ error: "racCaseId is required" }, { status: 400 });
    }

    const racCase = getRacCaseById(racCaseId);
    if (!racCase) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    if (normalizeRole(user.role) === "CLAIM_PROCESSOR") {
      const assigned = String(racCase.assignedTo || "").trim().toLowerCase();
      const isAssigned =
        assigned !== "" &&
        (assigned === user.id.toLowerCase() ||
          assigned === (user.name || "").trim().toLowerCase() ||
          assigned === (user.email || "").trim().toLowerCase());
      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: Claim Processors may only calculate on assigned RAC cases." },
          { status: 403 }
        );
      }
    }

    const reviewerIdentity = user.name || user.email || "System";
    const calculation = computeRacCalculation(racCaseId, {
      ...calcInput,
      reviewedBy: reviewerIdentity
    });

    saveRacCalculationRecord(racCaseId, calculation, reviewerIdentity);

    updateRacCase(
      racCaseId,
      {
        totalAmount: calculation.calculatedResult,
        outstandingAmount: Math.max(0, calculation.calculatedResult - racCase.agreedAmount)
      },
      reviewerIdentity
    );

    return NextResponse.json({
      success: true,
      calculation
    });
  }
});
