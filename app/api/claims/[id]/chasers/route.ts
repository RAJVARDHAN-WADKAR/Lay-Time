import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, canEditClaim } from "@/lib/auth/session";
import { getChasersForClaim, createChaserRecord, getClaimById } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chasers = getChasersForClaim(params.id);
    return NextResponse.json({ chasers });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch chasers" }, { status: 500 });
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

    const body = await request.json();
    const newChaser = createChaserRecord(
      {
        ...body,
        claimId: params.id
      },
      session.name || session.email
    );

    return NextResponse.json({ success: true, chaser: newChaser });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to send/schedule chaser" }, { status: 500 });
  }
}
