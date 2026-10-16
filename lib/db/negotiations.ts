import { getDatabase } from "./index";
import { ScopedUser } from "@/lib/auth/session";
import { getClaimById, updateClaim } from "./queries";
import { NegotiationThread, NegotiationMessage, UserRole } from "@/lib/types";
import { logAudit } from "@/lib/auth/userHierarchy";
import { v4 as uuidv4 } from "uuid";

/**
 * Validates whether the actor has access to a claim's negotiation room.
 * - Client: only if claim.client_id === actor.assignedClientId
 * - Claim Processor: only if assigned to the claim
 * - Supervisor & Admin: read-only oversight
 */
export function canAccessNegotiations(
  user: ScopedUser,
  claimId: string
): { allowed: boolean; roleType: "client" | "processor" | "oversight" | "none"; claim?: any } {
  const db = getDatabase();
  const claim = getClaimById(claimId);
  if (!claim) {
    return { allowed: false, roleType: "none" };
  }

  const role = user.role;
  const isExternalClient =
    role === "Client" ||
    (role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));

  if (isExternalClient) {
    const clientId = user.assignedClientId || user.clientId || user.client_id;
    const claimClientId = (claim as any).clientId || (claim as any).client_id;
    if (clientId && claimClientId && clientId === claimClientId) {
      return { allowed: true, roleType: "client", claim };
    }
    return { allowed: false, roleType: "none", claim };
  }

  if (role === "Claim Processor" || role === "Processor" || role === "CLAIM_PROCESSOR") {
    const isAssigned =
      claim.assignedTo === user.id ||
      claim.assignedTo === user.name ||
      claim.assignedTo.toLowerCase() === user.name.toLowerCase() ||
      claim.assignedTo.toLowerCase() === user.email.toLowerCase() ||
      claim.assignedTo.toLowerCase().includes(user.name.split(" ")[0].toLowerCase());

    if (isAssigned) {
      return { allowed: true, roleType: "processor", claim };
    }
    return { allowed: false, roleType: "none", claim };
  }

  if (
    role === "Admin" ||
    role === "ADMIN" ||
    role === "Supervisor" ||
    role === "SUPERVISOR" ||
    role === "Reviewer" ||
    role === "REVIEWER_CLIENT"
  ) {
    return { allowed: true, roleType: "oversight", claim };
  }

  return { allowed: false, roleType: "none" };
}

/**
 * Gets or creates the negotiation thread for a claim.
 */
export function getOrCreateThread(claimId: string): NegotiationThread {
  const db = getDatabase();
  let row = db.prepare("SELECT * FROM negotiation_threads WHERE claim_id = ?").get(claimId) as any;

  if (!row) {
    const id = `thread-${claimId}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO negotiation_threads (id, claim_id, status, supervisor_confirmed, created_at, updated_at)
      VALUES (?, ?, 'Open', 0, ?, ?)
    `).run(id, claimId, now, now);

    row = db.prepare("SELECT * FROM negotiation_threads WHERE id = ?").get(id) as any;
  }

  return {
    id: row.id,
    claimId: row.claim_id,
    status: row.status,
    proposedAgreedAmount: row.proposed_agreed_amount ?? undefined,
    proposedCurrency: row.proposed_currency ?? "USD",
    proposedBy: row.proposed_by ?? undefined,
    proposedAt: row.proposed_at ?? undefined,
    supervisorConfirmed: Boolean(row.supervisor_confirmed),
    supervisorConfirmedBy: row.supervisor_confirmed_by ?? undefined,
    supervisorConfirmedAt: row.supervisor_confirmed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Retrieves all append-only messages in a negotiation thread.
 */
export function getThreadMessages(threadId: string): NegotiationMessage[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM negotiation_messages WHERE thread_id = ? ORDER BY created_at ASC")
    .all(threadId) as any[];

  return rows.map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    senderId: r.sender_id,
    senderRole: r.sender_role as UserRole,
    senderName: r.sender_name,
    messageType: r.message_type,
    content: r.content,
    counterOfferAmount: r.counter_offer_amount ?? undefined,
    currency: r.currency ?? "USD",
    counterOfferStatus: r.counter_offer_status ?? undefined,
    respondedBy: r.responded_by ?? undefined,
    respondedAt: r.responded_at ?? undefined,
    createdAt: r.created_at
  }));
}

// In-memory rate limiting tracker (max 10 messages per minute per user)
const userMessageRateMap = new Map<string, number[]>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const timestamps = (userMessageRateMap.get(userId) || []).filter((t) => t > oneMinuteAgo);

  if (timestamps.length >= 10) {
    return false; // Rate limit exceeded
  }

  timestamps.push(now);
  userMessageRateMap.set(userId, timestamps);
  return true;
}

/**
 * Appends a message to the negotiation thread. Append-only (cannot edit or delete).
 */
export function postNegotiationMessage(data: {
  threadId: string;
  claimId: string;
  sender: ScopedUser;
  messageType: "text" | "counter_offer";
  content: string;
  counterOfferAmount?: number;
  currency?: string;
  ipAddress?: string;
}): NegotiationMessage {
  const db = getDatabase();
  const id = `msg-${Date.now()}-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const isCounterOffer = data.messageType === "counter_offer";
  const status = isCounterOffer ? "Pending" : null;

  db.prepare(`
    INSERT INTO negotiation_messages (
      id, thread_id, sender_id, sender_role, sender_name,
      message_type, content, counter_offer_amount, currency,
      counter_offer_status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.threadId,
    data.sender.id,
    data.sender.role,
    data.sender.name,
    data.messageType,
    data.content.trim(),
    data.counterOfferAmount || null,
    data.currency || "USD",
    status,
    now
  );

  // Update thread updated_at
  db.prepare("UPDATE negotiation_threads SET updated_at = ? WHERE id = ?").run(now, data.threadId);

  // Notify counterpart
  const notifId = `notif-${Date.now()}`;
  const notifTitle = isCounterOffer ? "New Counter-Offer Received" : "New Negotiation Message";
  const notifMsg = `${data.sender.name} (${data.sender.role}) posted in claim ${data.claimId}: ${data.content.slice(0, 100)}`;
  db.prepare(`
    INSERT INTO notifications (id, title, message, type, claim_id, is_read, created_at)
    VALUES (?, ?, ?, 'Negotiation', ?, 0, ?)
  `).run(notifId, notifTitle, notifMsg, data.claimId, now);

  // Audit log
  logAudit({
    actorId: data.sender.id,
    actorEmail: data.sender.email,
    actorRole: data.sender.role,
    action: isCounterOffer ? "NEGOTIATION_COUNTER_OFFER" : "NEGOTIATION_MESSAGE",
    targetType: "claim",
    targetId: data.claimId,
    details: {
      messageId: id,
      messageType: data.messageType,
      amount: data.counterOfferAmount
    },
    ipAddress: data.ipAddress
  });

  return {
    id,
    threadId: data.threadId,
    senderId: data.sender.id,
    senderRole: data.sender.role,
    senderName: data.sender.name,
    messageType: data.messageType,
    content: data.content,
    counterOfferAmount: data.counterOfferAmount,
    currency: data.currency || "USD",
    counterOfferStatus: status,
    createdAt: now
  };
}

/**
 * Processor responds to counter-offer (Accepted or Rejected).
 * If Accepted, creates a proposed agreed amount (does NOT alter claim yet).
 */
export function respondToCounterOffer(data: {
  messageId: string;
  claimId: string;
  user: ScopedUser;
  decision: "Accepted" | "Rejected";
  ipAddress?: string;
}): { success: boolean; thread: NegotiationThread } {
  const db = getDatabase();
  const now = new Date().toISOString();

  const msg = db.prepare("SELECT * FROM negotiation_messages WHERE id = ?").get(data.messageId) as any;
  if (!msg || msg.message_type !== "counter_offer") {
    throw new Error("Counter-offer message not found");
  }

  // Update message status
  db.prepare(`
    UPDATE negotiation_messages 
    SET counter_offer_status = ?, responded_by = ?, responded_at = ? 
    WHERE id = ?
  `).run(data.decision, data.user.name, now, data.messageId);

  const thread = getOrCreateThread(data.claimId);

  if (data.decision === "Accepted") {
    // Only creates a proposed agreed amount; supervisor confirmation required
    db.prepare(`
      UPDATE negotiation_threads 
      SET status = 'Pending Approval', proposed_agreed_amount = ?, proposed_currency = ?, proposed_by = ?, proposed_at = ?, supervisor_confirmed = 0, updated_at = ? 
      WHERE id = ?
    `).run(msg.counter_offer_amount, msg.currency || "USD", data.user.id, now, now, thread.id);

    // Notify Supervisor
    db.prepare(`
      INSERT INTO notifications (id, title, message, type, claim_id, is_read, created_at)
      VALUES (?, 'Counter-Offer Accepted - Approval Required', ?, 'Approval', ?, 0, ?)
    `).run(
      `notif-${Date.now()}`,
      `Processor ${data.user.name} accepted counter-offer of $${msg.counter_offer_amount} for claim ${data.claimId}. Supervisor confirmation needed.`,
      data.claimId,
      now
    );
  } else {
    db.prepare("UPDATE negotiation_threads SET updated_at = ? WHERE id = ?").run(now, thread.id);
  }

  logAudit({
    actorId: data.user.id,
    actorEmail: data.user.email,
    actorRole: data.user.role,
    action: `COUNTER_OFFER_${data.decision.toUpperCase()}`,
    targetType: "claim",
    targetId: data.claimId,
    details: {
      messageId: data.messageId,
      amount: msg.counter_offer_amount
    },
    ipAddress: data.ipAddress
  });

  return { success: true, thread: getOrCreateThread(data.claimId) };
}

/**
 * Supervisor confirms proposed agreed amount -> updates claims.agreed_amount.
 */
export function confirmProposedSettlement(data: {
  claimId: string;
  user: ScopedUser;
  ipAddress?: string;
}): { success: boolean; claim: any } {
  const db = getDatabase();
  const now = new Date().toISOString();

  const thread = getOrCreateThread(data.claimId);
  if (!thread.proposedAgreedAmount) {
    throw new Error("No proposed agreed amount to confirm for this claim");
  }

  // Confirm thread
  db.prepare(`
    UPDATE negotiation_threads 
    SET status = 'Settled', supervisor_confirmed = 1, supervisor_confirmed_by = ?, supervisor_confirmed_at = ?, updated_at = ? 
    WHERE id = ?
  `).run(data.user.id, now, now, thread.id);

  // Commit agreed amount to the claims table
  const updated = updateClaim(data.claimId, {
    agreedAmount: thread.proposedAgreedAmount,
    claimStatus: "Settled",
    claimAgreedDate: now
  });

  // Notify Client & Processor
  db.prepare(`
    INSERT INTO notifications (id, title, message, type, claim_id, is_read, created_at)
    VALUES (?, 'Claim Settlement Confirmed', ?, 'Settlement', ?, 0, ?)
  `).run(
    `notif-${Date.now()}`,
    `Supervisor ${data.user.name} confirmed settlement of $${thread.proposedAgreedAmount} for claim ${data.claimId}.`,
    data.claimId,
    now
  );

  logAudit({
    actorId: data.user.id,
    actorEmail: data.user.email,
    actorRole: data.user.role,
    action: "SUPERVISOR_CONFIRM_SETTLEMENT",
    targetType: "claim",
    targetId: data.claimId,
    details: {
      confirmedAmount: thread.proposedAgreedAmount
    },
    ipAddress: data.ipAddress
  });

  return { success: true, claim: updated };
}
