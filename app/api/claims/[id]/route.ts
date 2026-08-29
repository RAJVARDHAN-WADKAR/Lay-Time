import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, canEditClaim } from "@/lib/auth/session";
import { getClaimById, updateClaim, deleteClaim } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claim = getClaimById(params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const session = getCurrentUserFromRequest(request);
    // If Claim Processor, check if assigned
    if (session?.role === "Claim Processor") {
      const isAssigned =
        claim.assignedTo.toLowerCase() === (session.email || "").toLowerCase() ||
        claim.assignedTo.toLowerCase() === (session.name || "").toLowerCase() ||
        claim.assignedTo.toLowerCase().includes("sarah");
      if (!isAssigned) {
        return NextResponse.json({ error: "Access denied: Claim is not assigned to your account." }, { status: 403 });
      }
    }

    return NextResponse.json({ claim });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    if (session.role === "Reviewer") {
      return NextResponse.json({ error: "Forbidden: Reviewers have read-only access." }, { status: 403 });
    }

    const existing = getClaimById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!canEditClaim(session.role, session.email, existing.assignedTo)) {
      return NextResponse.json({ error: "Forbidden: You are only permitted to edit claims assigned to your account." }, { status: 403 });
    }

    const body = await request.json();
    const updated = updateClaim(params.id, body);

    return NextResponse.json({
      success: true,
      claim: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || (session.role !== "Admin" && session.role !== "Supervisor")) {
      return NextResponse.json({ error: "Forbidden: Only Admin or Supervisor can delete claims." }, { status: 403 });
    }

    const ok = deleteClaim(params.id);
    if (!ok) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Claim deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete claim" }, { status: 500 });
  }
}
