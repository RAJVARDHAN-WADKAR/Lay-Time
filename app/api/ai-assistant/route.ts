export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { executeMaritimeRag, MARITIME_KNOWLEDGE_CORPUS } from "@/lib/ai/ragEngine";
import { getClaims } from "@/lib/db/queries";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance"],
  handler: async () => {
    const claimsData = getClaims();
    return NextResponse.json({
      active: true,
      engine: "Maritime RAG (Retrieval-Augmented Generation)",
      model: "Maritime-RAG-Grounded-v2.0",
      indexedClauses: MARITIME_KNOWLEDGE_CORPUS.length,
      indexedClaims: claimsData.claims?.length || 0,
      supportedCharters: ["BPVOY4", "ASBATANKVOY", "GENCON 94", "SHELLVOY6", "BIMCO 2013"]
    });
  }
});

export const POST = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance"],
  handler: async ({ body }) => {
    const prompt = body?.prompt || body?.query || "";
    const claimsData = getClaims();
    const response = executeMaritimeRag(prompt, claimsData.claims || []);

    return NextResponse.json({
      success: true,
      answer: response.answer,
      citation: response.citation,
      confidenceScore: response.confidenceScore,
      matchedClaimId: response.matchedClaimId,
      sources: response.sources,
      suggestedActions: response.suggestedActions,
      response
    });
  }
});
