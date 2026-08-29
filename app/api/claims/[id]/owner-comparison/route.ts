import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, canEditClaim } from "@/lib/auth/session";
import { getClaimById, getOwnerComparisonForClaim, saveOwnerComparisonForClaim } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comparison = getOwnerComparisonForClaim(params.id);
    return NextResponse.json({ comparison });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch owner comparison" }, { status: 500 });
  }
}

export async function POST(
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

    const claim = getClaimById(params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!canEditClaim(session.role, session.email, claim.assignedTo)) {
      return NextResponse.json({ error: "Forbidden: Access denied to edit this claim." }, { status: 403 });
    }

    const body = await request.json();
    const saved = saveOwnerComparisonForClaim(params.id, body, session.name || session.email);

    return NextResponse.json({ success: true, comparison: saved });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save owner comparison" }, { status: 500 });
  }
}
