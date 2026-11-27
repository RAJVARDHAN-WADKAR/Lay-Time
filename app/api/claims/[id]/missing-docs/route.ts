export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaimById } from "@/lib/db/scoped";
import { getClaimById, getDocumentsForClaim, createNotificationRecord } from "@/lib/db/queries";

export const GET = withApi({
  permission: "documents:view",
  handler: async ({ user, params }) => {
    const claim = getClaimById(params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const scoped = getScopedClaimById(user, params.id);
    if (!scoped) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this claim" },
        { status: 403 }
      );
    }

    const docs = getDocumentsForClaim(params.id);
    const uploadedCategories = new Set(docs.map((d) => d.category));

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
  }
});
