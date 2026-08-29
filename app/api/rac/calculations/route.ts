import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { computeRacCalculation } from "@/lib/rac/calculations";
import { saveRacCalculationRecord, getRacCaseById, updateRacCase } from "@/lib/db/queries";

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
    const { racCaseId, ...calcInput } = body;

    if (!racCaseId) {
      return NextResponse.json({ error: "racCaseId is required" }, { status: 400 });
    }

    const racCase = getRacCaseById(racCaseId);
    if (!racCase) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    const calculation = computeRacCalculation(racCaseId, {
      ...calcInput,
      reviewedBy: session.name || session.email
    });

    saveRacCalculationRecord(racCaseId, calculation, session.name || session.email);

    // Update RAC total amount
    updateRacCase(
      racCaseId,
      {
        totalAmount: calculation.calculatedResult,
        outstandingAmount: Math.max(0, calculation.calculatedResult - racCase.agreedAmount)
      },
      session.name || session.email
    );

    return NextResponse.json({
      success: true,
      calculation
    });
  } catch (error: any) {
    console.error("POST RAC Calculation Error:", error);
    return NextResponse.json({ error: "Failed to compute RAC calculation" }, { status: 500 });
  }
}
