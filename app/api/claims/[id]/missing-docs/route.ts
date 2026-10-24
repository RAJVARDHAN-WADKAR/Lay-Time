import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { normalizeRole } from "@/app/access/roles";
import { getClaimById, getDocumentsForClaim, createNotificationRecord } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireUser(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const claim = getClaimById(params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Role-based scope enforcement
    const isClient =
      user.role === "Client" ||
      (user.role === "REVIEWER_CLIENT" &&
        Boolean(user.assignedClientId || user.clientId || user.client_id));

    if (isClient) {
      const clientId = user.assignedClientId || user.clientId || user.client_id;
      if (!clientId || claim.clientId !== clientId) {
        return NextResponse.json(
          { error: "Forbidden: External clients may only access their own client claims" },
          { status: 403 }
        );
      }
    }

    const normRole = normalizeRole(user.role);
    if (normRole === "CLAIM_PROCESSOR") {
      const assigned = (claim.assignedTo || "").trim().toLowerCase();
      const userId = (user.id || "").trim().toLowerCase();
      const userName = (user.name || "").trim().toLowerCase();
      const userEmail = (user.email || "").trim().toLowerCase();

      const isAssigned =
        assigned !== "" &&
        (assigned === userId || assigned === userName || assigned === userEmail);

      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: Claim Processors may only access assigned claims" },
          { status: 403 }
        );
      }
    }

    const docs = getDocumentsForClaim(params.id);
    const uploadedCategories = new Set(docs.map((d) => d.category));

    // Mandatory document rules based on Claim Type
    let mandatoryCategories: string[] = ["SOF", "NOR", "Charterparty"];
    if (claim.claimType.includes("Discharge")) {
      mandatoryCategories.push("Pumping Log");
    } else if (claim.claimType.includes("Load")) {
      mandatoryCategories.push("Bill of Lading");
    } else if (claim.claimType === "Despatch" || claim.claimType === "Detention") {
      mandatoryCategories.push("Timesheet");
    }

    const missingDocuments = mandatoryCategories.filter(
      (cat) => !uploadedCategories.has(cat as any)
    );
    const isCompliant = missingDocuments.length === 0;

    if (!isCompliant) {
      // Trigger notification if missing documents
      createNotificationRecord({
        title: "Missing Mandatory Documents",
        message: `Claim ${claim.id} (${claim.shipName}) is missing required documents: ${missingDocuments.join(
          ", "
        )}. Submission is blocked.`,
        type: "document",
        claimId: claim.id,
        claimName: claim.claimName
      });
    }

    return NextResponse.json({
      claimId: claim.id,
      claimType: claim.claimType,
      isCompliant,
      uploadedCount: docs.length,
      uploadedCategories: Array.from(uploadedCategories),
      mandatoryCategories,
      missingDocuments,
      submissionAllowed: isCompliant
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to perform missing document audit" },
      { status: 500 }
    );
  }
}
