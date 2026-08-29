import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getRacCaseById, updateRacCase } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    const rac = getRacCaseById(params.id);
    if (!rac) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    if (session?.role === "Claim Processor") {
      const isAssigned =
        rac.assignedTo.toLowerCase() === (session.email || "").toLowerCase() ||
        rac.assignedTo.toLowerCase() === (session.name || "").toLowerCase() ||
        rac.assignedTo.toLowerCase().includes("sarah");
      if (!isAssigned) {
        return NextResponse.json({ error: "Access denied: RAC case is not assigned to your account." }, { status: 403 });
      }
    }

    return NextResponse.json({ case: rac });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch RAC case" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "Reviewer") {
      return NextResponse.json({ error: "Forbidden: Reviewers have read-only access." }, { status: 403 });
    }

    const existing = getRacCaseById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    if (session.role === "Claim Processor") {
      const isAssigned =
        existing.assignedTo.toLowerCase() === (session.email || "").toLowerCase() ||
        existing.assignedTo.toLowerCase() === (session.name || "").toLowerCase() ||
        existing.assignedTo.toLowerCase().includes("sarah");
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden: You can only update RAC cases assigned to your account." }, { status: 403 });
      }
    }

    const body = await request.json();
    const updated = updateRacCase(params.id, body, session.name || session.email);

    return NextResponse.json({ success: true, case: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update RAC case" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || (session.role !== "Admin" && session.role !== "Supervisor")) {
      return NextResponse.json({ error: "Forbidden: Only Admin or Supervisor can delete RAC cases." }, { status: 403 });
    }

    const db = getDatabase();
    const res = db.prepare("DELETE FROM rac_cases WHERE id = ?").run(params.id);
    if (res.changes === 0) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "RAC case deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete RAC case" }, { status: 500 });
  }
}
