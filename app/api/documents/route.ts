import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getDocuments, createDocument, createNotificationRecord } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const claimId = searchParams.get("claimId") || undefined;
    const racCaseId = searchParams.get("racCaseId") || undefined;

    const documents = getDocuments({ claimId, racCaseId });
    return NextResponse.json({ documents, total: documents.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
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
    const doc = createDocument(body, session.name || session.email);

    createNotificationRecord({
      title: "Document Uploaded",
      message: `${doc.fileName} (${doc.category}) uploaded for ${doc.claimName || doc.claimId || "case"}.`,
      type: "document",
      claimId: doc.claimId || undefined,
      claimName: doc.claimName || undefined,
      racCaseId: doc.racCaseId || undefined
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
