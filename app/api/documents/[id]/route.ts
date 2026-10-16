import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getDocumentById, updateDocument } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = getDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ document: doc });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    const { normalizeRole } = await import("@/app/access/roles");
    const userRoleNorm = session ? normalizeRole(session.role) : null;
    if (!session || session.role === "Reviewer" || userRoleNorm === "REVIEWER_CLIENT") {
      return NextResponse.json({ error: "Forbidden: Reviewers and Clients cannot modify documents." }, { status: 403 });
    }

    const body = await request.json();
    const updated = updateDocument(params.id, body, session.name || session.email || "System");

    return NextResponse.json({ success: true, document: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    const { normalizeRole } = await import("@/app/access/roles");
    const userRoleNorm = session ? normalizeRole(session.role) : null;
    if (!session || (userRoleNorm !== "ADMIN" && userRoleNorm !== "SUPERVISOR")) {
      return NextResponse.json({ error: "Forbidden: Only Admin or Supervisor can delete documents." }, { status: 403 });
    }

    const db = getDatabase();
    const res = db.prepare("DELETE FROM documents WHERE id = ?").run(params.id);
    if (res.changes === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
