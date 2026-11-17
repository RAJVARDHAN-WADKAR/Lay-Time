import { Claim } from "@/lib/types";
import { executeMaritimeRag, AssistantResponse, MARITIME_KNOWLEDGE_CORPUS } from "@/lib/ai/ragEngine";

export type { AssistantResponse };
export { MARITIME_KNOWLEDGE_CORPUS };

/**
 * Maritime Laytime & Demurrage RAG Query Assistant
 * Performs grounded retrieval over live SQLite claims, Statement of Facts,
 * and Maritime Charterparty clauses (BPVOY4, ASBATANKVOY, GENCON 94, SHELLVOY6, BIMCO 2013).
 */
export function queryAiAssistant(
  prompt: string,
  claims: Claim[] = []
): AssistantResponse {
  return executeMaritimeRag(prompt, claims);
}
