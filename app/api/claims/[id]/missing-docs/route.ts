import { NextRequest, NextResponse } from "next/server";
import { getClaimById, getDocumentsForClaim, createNotificationRecord } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claim = getClaimById(params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
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

    const missingDocuments = mandatoryCategories.filter((cat) => !uploadedCategories.has(cat as any));
    const isCompliant = missingDocuments.length === 0;

    if (!isCompliant) {
      // Trigger notification if not already created
      createNotificationRecord({
        title: "Missing Mandatory Documents",
        message: `Claim ${claim.id} (${claim.shipName}) is missing required documents: ${missingDocuments.join(", ")}. Submission is blocked.`,
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
    return NextResponse.json({ error: "Failed to perform missing document audit" }, { status: 500 });
  }
}
