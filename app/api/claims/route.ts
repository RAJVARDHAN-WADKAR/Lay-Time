import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, canEditClaim } from "@/lib/auth/session";
import { getClaims, createClaim } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status") || "All";
    const claimType = searchParams.get("claimType") || "All";
    const client = searchParams.get("client") || "All";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = (page - 1) * limit;

    const result = getClaims({
      role: session?.role,
      userEmail: session?.email,
      userName: session?.name,
      status,
      claimType,
      client,
      search,
      limit,
      offset
    });

    return NextResponse.json({
      claims: result.claims,
      total: result.total,
      page,
      limit
    });
  } catch (error: any) {
    console.error("GET Claims API Error:", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    if (session.role === "Reviewer") {
      return NextResponse.json({ error: "Forbidden: Reviewers have read-only access." }, { status: 403 });
    }

    const body = await request.json();
    const newClaim = createClaim(body, session.name || session.email);

    return NextResponse.json({
      success: true,
      claim: newClaim
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Claim API Error:", error);
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  }
}
