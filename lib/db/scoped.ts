import { getDatabase } from "./index";
import { ScopedUser } from "@/lib/auth/session";
import { Claim, UserRole } from "@/lib/types";

export interface ScopedSqlResult {
  sql: string;
  params: any[];
}

export interface RestrictedClientClaim {
  id: string;
  claimReference: string;
  vessel: string;
  port: string;
  status: string;
  totalDemurrageClaimed: number;
  agreedAmount: number;
  sharedDocuments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    category: string;
    uploadedAt: string;
  }>;
}

/**
 * Returns a SQL WHERE fragment and parameter array for isolating claims by user role.
 * - Admin, Supervisor, Reviewer (and Finance): all claims (1=1)
 * - Claim Processor: assigned_to matches user id or name
 * - Client: client_id matches user assignedClientId
 */
export function claimScope(user: ScopedUser, tableAlias: string = "claims"): ScopedSqlResult {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  const role = user.role;
  const isClientUser =
    role === "Client" ||
    (role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));

  if (isClientUser) {
    const clientId = user.assignedClientId || user.clientId || user.client_id;
    if (!clientId) {
      return { sql: "1=0", params: [] }; // No client assigned -> access nothing
    }
    return {
      sql: `${prefix}client_id = ?`,
      params: [clientId]
    };
  }

  if (role === "Claim Processor" || role === "Processor" || role === "CLAIM_PROCESSOR") {
    // Match assigned_to strictly by exact user ID, user Name, or user Email
    return {
      sql: `(${prefix}assigned_to = ? OR LOWER(${prefix}assigned_to) = LOWER(?) OR LOWER(${prefix}assigned_to) = LOWER(?))`,
      params: [user.id, user.name, user.email]
    };
  }

  // Admin, Supervisor, Reviewer (Internal Reviewer without clientId), Finance
  if (
    role === "Admin" ||
    role === "ADMIN" ||
    role === "Supervisor" ||
    role === "SUPERVISOR" ||
    role === "Reviewer" ||
    role === "REVIEWER_CLIENT" ||
    role === "Finance"
  ) {
    return { sql: "1=1", params: [] };
  }

  return { sql: "1=0", params: [] };
}

// Allow-listed sort columns for claims to prevent SQL injection
const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  created_at: "claims.created_at",
  claim_name: "claims.claim_name",
  ship_name: "claims.ship_name",
  claim_status: "claims.claim_status",
  claim_filed_amount: "claims.claim_filed_amount",
  agreed_amount: "claims.agreed_amount",
  days_open: "claims.days_open"
};

/**
 * Loads claims scoped to the user with parameterized SQL and strict column allow-listing.
 */
export function getScopedClaims(
  user: ScopedUser,
  options: {
    status?: string;
    claimType?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    limit?: number;
    offset?: number;
  } = {}
): { claims: (Claim | RestrictedClientClaim)[]; total: number } {
  const db = getDatabase();
  const scope = claimScope(user, "claims");

  const whereClauses: string[] = [scope.sql];
  const queryParams: any[] = [...scope.params];

  if (options.status && options.status !== "All") {
    whereClauses.push("claims.claim_status = ?");
    queryParams.push(options.status);
  }

  if (options.claimType && options.claimType !== "All") {
    whereClauses.push("claims.claim_type = ?");
    queryParams.push(options.claimType);
  }

  if (options.search && options.search.trim() !== "") {
    const term = `%${options.search.trim().toLowerCase()}%`;
    whereClauses.push(
      "(LOWER(claims.claim_name) LIKE ? OR LOWER(claims.ship_name) LIKE ? OR LOWER(claims.account_name) LIKE ? OR LOWER(claims.id) LIKE ?)"
    );
    queryParams.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Count total matching
  const countSql = `SELECT COUNT(*) as total FROM claims ${whereSql}`;
  const total = (db.prepare(countSql).get(...queryParams) as any)?.total || 0;

  // Safe sorting using allow-list
  const sortCol = (options.sortBy && ALLOWED_SORT_COLUMNS[options.sortBy]) || "claims.created_at";
  const sortDir = options.sortOrder === "ASC" ? "ASC" : "DESC";

  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const offset = Math.max(Number(options.offset) || 0, 0);

  const selectSql = `
    SELECT claims.* 
    FROM claims 
    ${whereSql} 
    ORDER BY ${sortCol} ${sortDir} 
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(selectSql).all(...queryParams, limit, offset) as any[];

  // If External Client, transform rows into restricted DTO
  const isClient =
    user.role === "Client" ||
    (user.role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));

  if (isClient) {
    const clientClaims: RestrictedClientClaim[] = rows.map((r) => {
      // Find primary port from ports table
      const primaryPort = db
        .prepare("SELECT name FROM ports WHERE claim_id = ? LIMIT 1")
        .get(r.id) as any;

      // Find shared documents
      const docs = db
        .prepare("SELECT id, file_name, file_type, category, uploaded_at FROM documents WHERE claim_id = ?")
        .all(r.id) as any[];

      return {
        id: r.id,
        claimReference: r.claim_name,
        vessel: r.ship_name,
        port: primaryPort?.name || "Port Operations",
        status: r.claim_status,
        totalDemurrageClaimed: r.claim_filed_amount || 0,
        agreedAmount: r.agreed_amount || 0,
        sharedDocuments: docs.map((d) => ({
          id: d.id,
          fileName: d.file_name,
          fileType: d.file_type,
          category: d.category,
          uploadedAt: d.uploaded_at
        }))
      };
    });

    return { claims: clientClaims, total };
  }

  // Full claim representation for internal roles
  const fullClaims: Claim[] = rows.map((r) => ({
    id: r.id,
    clientId: r.client_id || undefined,
    claimName: r.claim_name,
    accountName: r.account_name,
    brokerName: r.broker_name,
    claimStatus: r.claim_status,
    claimType: r.claim_type,
    shipName: r.ship_name,
    cpType: r.cp_type,
    voyageNumber: r.voyage_number || undefined,
    assignedTo: r.assigned_to,
    daysOpen: r.days_open,
    claimClosed: Boolean(r.claim_closed),
    contentions: r.contentions || undefined,
    claimNotes: r.claim_notes || undefined,
    documentLinks: r.document_links ? JSON.parse(r.document_links) : [],
    demurrageRatePerDay: r.demurrage_rate_per_day,
    counterpartyName: r.counterparty_name || undefined,
    counterpartyType: r.counterparty_type || undefined,
    claimFiledAmount: r.claim_filed_amount,
    receivedClaimAmount: r.received_claim_amount || 0,
    agreedAmount: r.agreed_amount || 0,
    billableAmount: r.billable_amount || 0,
    paymentReceived: r.payment_received || 0,
    paymentConcluded: Boolean(r.payment_concluded),
    layday: r.layday || undefined,
    cancellingDate: r.cancelling_date || undefined,
    voyageEndDate: r.voyage_end_date || undefined,
    instructionReceivedDate: r.instruction_received_date || undefined,
    noticeReceivedDate: r.notice_received_date || undefined,
    claimReceivedDate: r.claim_received_date || undefined,
    noticeTimebarDays: r.notice_timebar_days || 30,
    claimTimebarDays: r.claim_timebar_days || 90,
    timebarred: Boolean(r.timebarred),
    claimAgreedDate: r.claim_agreed_date || undefined,
    charterpartyDate: r.charterparty_date || undefined,
    daysAwaitingPayment: r.days_awaiting_payment || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  return { claims: fullClaims, total };
}

/**
 * Loads a single claim scoped to the user. Returns null (404) if outside scope.
 */
export function getScopedClaimById(
  user: ScopedUser,
  claimId: string
): (Claim | RestrictedClientClaim) | null {
  const db = getDatabase();
  const scope = claimScope(user, "claims");

  const sql = `
    SELECT claims.* 
    FROM claims 
    WHERE claims.id = ? AND (${scope.sql})
  `;
  const row = db.prepare(sql).get(claimId, ...scope.params) as any;
  if (!row) return null;

  const isClient =
    user.role === "Client" ||
    (user.role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));

  if (isClient) {
    const primaryPort = db
      .prepare("SELECT name FROM ports WHERE claim_id = ? LIMIT 1")
      .get(row.id) as any;

    const docs = db
      .prepare("SELECT id, file_name, file_type, category, uploaded_at FROM documents WHERE claim_id = ?")
      .all(row.id) as any[];

    return {
      id: row.id,
      claimReference: row.claim_name,
      vessel: row.ship_name,
      port: primaryPort?.name || "Port Operations",
      status: row.claim_status,
      totalDemurrageClaimed: row.claim_filed_amount || 0,
      agreedAmount: row.agreed_amount || 0,
      sharedDocuments: docs.map((d) => ({
        id: d.id,
        fileName: d.file_name,
        fileType: d.file_type,
        category: d.category,
        uploadedAt: d.uploaded_at
      }))
    };
  }

  return {
    id: row.id,
    clientId: row.client_id || undefined,
    claimName: row.claim_name,
    accountName: row.account_name,
    brokerName: row.broker_name,
    claimStatus: row.claim_status,
    claimType: row.claim_type,
    shipName: row.ship_name,
    cpType: row.cp_type,
    voyageNumber: row.voyage_number || undefined,
    assignedTo: row.assigned_to,
    daysOpen: row.days_open,
    claimClosed: Boolean(row.claim_closed),
    contentions: row.contentions || undefined,
    claimNotes: row.claim_notes || undefined,
    documentLinks: row.document_links ? JSON.parse(row.document_links) : [],
    demurrageRatePerDay: row.demurrage_rate_per_day,
    counterpartyName: row.counterparty_name || undefined,
    counterpartyType: row.counterparty_type || undefined,
    claimFiledAmount: row.claim_filed_amount,
    receivedClaimAmount: row.received_claim_amount || 0,
    agreedAmount: row.agreed_amount || 0,
    billableAmount: row.billable_amount || 0,
    paymentReceived: row.payment_received || 0,
    paymentConcluded: Boolean(row.payment_concluded),
    layday: row.layday || undefined,
    cancellingDate: row.cancelling_date || undefined,
    voyageEndDate: row.voyage_end_date || undefined,
    instructionReceivedDate: row.instruction_received_date || undefined,
    noticeReceivedDate: row.notice_received_date || undefined,
    claimReceivedDate: row.claim_received_date || undefined,
    noticeTimebarDays: row.notice_timebar_days || 30,
    claimTimebarDays: row.claim_timebar_days || 90,
    timebarred: Boolean(row.timebarred),
    claimAgreedDate: row.claim_agreed_date || undefined,
    charterpartyDate: row.charterparty_date || undefined,
    daysAwaitingPayment: row.days_awaiting_payment || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Scoped access to SoF events. Throws 403 for Client.
 */
export function getScopedSoF(user: ScopedUser, claimId: string): any[] {
  const isClient =
    user.role === "Client" ||
    (user.role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));
  if (isClient) {
    const err = new Error("Forbidden: Client users may not access Statement of Facts");
    (err as any).statusCode = 403;
    throw err;
  }

  const db = getDatabase();
  const scope = claimScope(user, "claims");

  const sql = `
    SELECT statement_of_facts.* 
    FROM statement_of_facts 
    JOIN claims ON statement_of_facts.claim_id = claims.id 
    WHERE statement_of_facts.claim_id = ? AND (${scope.sql})
    ORDER BY statement_of_facts.start_time ASC
  `;
  return db.prepare(sql).all(claimId, ...scope.params);
}

/**
 * Scoped access to Laytime Calculations. Throws 403 for Client.
 */
export function getScopedCalculations(user: ScopedUser, claimId: string): any {
  const isClient =
    user.role === "Client" ||
    (user.role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));
  if (isClient) {
    const err = new Error("Forbidden: Client users may not access internal laytime calculations");
    (err as any).statusCode = 403;
    throw err;
  }

  const db = getDatabase();
  const scope = claimScope(user, "claims");

  const sql = `
    SELECT laytime_calculations.* 
    FROM laytime_calculations 
    JOIN claims ON laytime_calculations.claim_id = claims.id 
    WHERE laytime_calculations.claim_id = ? AND (${scope.sql})
  `;
  return db.prepare(sql).get(claimId, ...scope.params);
}

/**
 * Scoped access to Discrepancies. Throws 403 for Client.
 */
export function getScopedDiscrepancies(user: ScopedUser, claimId: string): any[] {
  const isClient =
    user.role === "Client" ||
    (user.role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));
  if (isClient) {
    const err = new Error("Forbidden: Client users may not access discrepancy reports");
    (err as any).statusCode = 403;
    throw err;
  }

  const db = getDatabase();
  const scope = claimScope(user, "claims");

  const sql = `
    SELECT discrepancies.* 
    FROM discrepancies 
    JOIN claims ON discrepancies.claim_id = claims.id 
    WHERE discrepancies.claim_id = ? AND (${scope.sql})
  `;
  return db.prepare(sql).all(claimId, ...scope.params);
}

/**
 * Scoped access to RAC Cases. Throws 403 for Client.
 */
export function getScopedRacCases(user: ScopedUser, caseId?: string): any {
  const isClient =
    user.role === "Client" ||
    (user.role === "REVIEWER_CLIENT" && Boolean(user.assignedClientId || user.clientId || user.client_id));
  if (isClient) {
    const err = new Error("Forbidden: Client users may not access RAC module");
    (err as any).statusCode = 403;
    throw err;
  }

  const db = getDatabase();
  const isProcessor =
    user.role === "Claim Processor" ||
    user.role === "Processor" ||
    user.role === "CLAIM_PROCESSOR";

  if (caseId) {
    if (isProcessor) {
      const sql = `
        SELECT * FROM rac_cases 
        WHERE id = ? AND (LOWER(assigned_to) = LOWER(?) OR assigned_to = ? OR LOWER(assigned_to) = LOWER(?))
      `;
      return db.prepare(sql).get(caseId, user.name, user.id, user.email);
    }
    return db.prepare("SELECT * FROM rac_cases WHERE id = ?").get(caseId);
  }

  if (isProcessor) {
    const sql = `
      SELECT * FROM rac_cases 
      WHERE (LOWER(assigned_to) = LOWER(?) OR assigned_to = ? OR LOWER(assigned_to) = LOWER(?)) 
      ORDER BY created_at DESC
    `;
    return db.prepare(sql).all(user.name, user.id, user.email);
  }

  return db.prepare("SELECT * FROM rac_cases ORDER BY created_at DESC").all();
}
