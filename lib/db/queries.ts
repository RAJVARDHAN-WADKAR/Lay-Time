import { getDatabase } from "./index";
export { getDatabase };
import { calculateClaimLaytime } from "@/lib/calculations/laytime";
import { inferCountryAndTimezone, listHolidays } from "@/lib/calculations/holidays";
import { isStatusUnderContention, normalizeClaimStatus } from "@/lib/calculations/status";
import { generateNextClaimId } from "@/lib/utils/claimId";
import {
  Claim,
  ClaimCalculation,
  ClaimStatus,
  DashboardMetrics,
  Discrepancy,
  DocumentRecord,
  DocumentRevision,
  EmailFollowup,
  NotificationRecord,
  OilChemCalculation,
  OwnerComparison,
  Port,
  RacCase,
  RacCalculation,
  RacDashboardMetrics,
  RacStatus,
  SoFActivity,
  TimeSheetImport,
  User,
  UserRole
} from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// =========================================================================
// 1. USERS & AUTHENTICATION
// =========================================================================

export function getUserByEmail(email: string): (User & { password_hash: string; token_version: number; client_id?: string; created_by?: string }) | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role as UserRole,
    clientId: row.client_id || undefined,
    client_id: row.client_id || undefined,
    clientName: row.client_name || undefined,
    createdBy: row.created_by || undefined,
    created_by: row.created_by || undefined,
    tokenVersion: row.token_version ?? 1,
    token_version: row.token_version ?? 1,
    avatar: row.avatar,
    status: row.status,
    roleDescription: row.role_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    password_hash: row.password_hash
  };
}

export function getUserById(id: string): (User & { token_version: number; client_id?: string; created_by?: string }) | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role as UserRole,
    clientId: row.client_id || undefined,
    client_id: row.client_id || undefined,
    clientName: row.client_name || undefined,
    createdBy: row.created_by || undefined,
    created_by: row.created_by || undefined,
    tokenVersion: row.token_version ?? 1,
    token_version: row.token_version ?? 1,
    avatar: row.avatar,
    status: row.status,
    roleDescription: row.role_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getAllUsers(): User[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as any[];
  return rows.map((r) => {
    const claimCount = (db.prepare("SELECT COUNT(*) as c FROM claims WHERE LOWER(assigned_to) = LOWER(?) OR LOWER(assigned_to) = LOWER(?) OR assigned_to = ?").get(r.name, r.email, r.id) as any)?.c || 0;
    const racCount = (db.prepare("SELECT COUNT(*) as c FROM rac_cases WHERE LOWER(assigned_to) = LOWER(?) OR LOWER(assigned_to) = LOWER(?) OR assigned_to = ?").get(r.name, r.email, r.id) as any)?.c || 0;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      username: r.username,
      role: r.role as UserRole,
      clientId: r.client_id || undefined,
      client_id: r.client_id || undefined,
      clientName: r.client_name || undefined,
      createdBy: r.created_by || undefined,
      created_by: r.created_by || undefined,
      tokenVersion: r.token_version ?? 1,
      token_version: r.token_version ?? 1,
      avatar: r.avatar,
      status: r.status,
      assignedClaimsCount: claimCount,
      assignedRacCount: racCount,
      roleDescription: r.role_description,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  });
}

export function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  clientId?: string;
  clientName?: string;
  createdBy?: string;
  passwordHash: string;
  roleDescription?: string;
}): User {
  const db = getDatabase();
  const id = `usr-${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, username, password_hash, role, client_id, client_name, created_by, token_version, status, role_description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Active', ?, ?, ?)
  `).run(
    id,
    data.name,
    data.email,
    data.email.split("@")[0],
    data.passwordHash,
    data.role,
    data.clientId || null,
    data.clientName || null,
    data.createdBy || null,
    data.roleDescription || "",
    now,
    now
  );

  return getUserById(id)!;
}

export function updateUser(id: string, data: Partial<User> & { passwordHash?: string; bumpToken?: boolean }): User | null {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = getUserById(id);
  if (!existing) return null;

  let shouldBump = !!data.bumpToken;

  if (data.passwordHash) {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(data.passwordHash, now, id);
    shouldBump = true;
  }
  if (data.name) db.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(data.name, now, id);
  if (data.email) db.prepare("UPDATE users SET email = ?, updated_at = ? WHERE id = ?").run(data.email, now, id);
  if (data.role && data.role !== existing.role) {
    db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(data.role, now, id);
    shouldBump = true;
  }
  if (data.clientId !== undefined) db.prepare("UPDATE users SET client_id = ?, updated_at = ? WHERE id = ?").run(data.clientId, now, id);
  if (data.clientName !== undefined) db.prepare("UPDATE users SET client_name = ?, updated_at = ? WHERE id = ?").run(data.clientName, now, id);
  if (data.status && data.status !== existing.status) {
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").run(data.status, now, id);
    shouldBump = true;
  }
  if (data.roleDescription) db.prepare("UPDATE users SET role_description = ?, updated_at = ? WHERE id = ?").run(data.roleDescription, now, id);

  if (shouldBump) {
    db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(id);
  }

  return getUserById(id);
}

export function setUserStatus(id: string, status: "Active" | "Inactive"): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  // Bumping token_version immediately invalidates all active sessions for this user
  const res = db.prepare("UPDATE users SET status = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?").run(status, now, id);
  return res.changes > 0;
}

export function bumpTokenVersion(userId: string): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET token_version = token_version + 1, updated_at = ? WHERE id = ?").run(now, userId);
  const row = db.prepare("SELECT token_version FROM users WHERE id = ?").get(userId) as any;
  return row?.token_version ?? 1;
}

// =========================================================================
// 2. CLAIMS CRUD & SEARCH
// =========================================================================

export function getClaims(params?: {
  role?: UserRole;
  userEmail?: string;
  userName?: string;
  clientName?: string;
  search?: string;
  status?: string;
  claimType?: string;
  client?: string;
  limit?: number;
  offset?: number;
}): { claims: Claim[]; total: number } {
  const db = getDatabase();
  let whereClauses: string[] = [];
  let queryParams: any[] = [];

  // Claim Processor filter: Only view assigned claims
  if (params?.role === "Claim Processor" || params?.role === "Processor") {
    const email = params.userEmail || "";
    const name = params.userName || "";
    whereClauses.push("(LOWER(assigned_to) = LOWER(?) OR LOWER(assigned_to) = LOWER(?) OR LOWER(assigned_to) LIKE ? OR LOWER(assigned_to) LIKE ?)");
    queryParams.push(email, name, "%rohit%", "%sarah%");
  }

  // Client filter: Only view own client claims
  if (params?.role === "Client") {
    const cName = (params.clientName || "trafigura").toLowerCase();
    whereClauses.push("(LOWER(account_name) LIKE ? OR LOWER(claim_name) LIKE ?)");
    queryParams.push(`%${cName}%`, `%${cName}%`);
  }

  if (params?.status && params.status !== "All") {
    whereClauses.push("claim_status = ?");
    queryParams.push(params.status);
  }

  if (params?.claimType && params.claimType !== "All") {
    whereClauses.push("claim_type = ?");
    queryParams.push(params.claimType);
  }

  if (params?.client && params.client !== "All") {
    whereClauses.push("account_name = ?");
    queryParams.push(params.client);
  }

  if (params?.search && params.search.trim() !== "") {
    const s = `%${params.search.trim().toLowerCase()}%`;
    whereClauses.push("(LOWER(id) LIKE ? OR LOWER(claim_name) LIKE ? OR LOWER(ship_name) LIKE ? OR LOWER(account_name) LIKE ? OR LOWER(broker_name) LIKE ?)");
    queryParams.push(s, s, s, s, s);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Count total
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM claims ${whereStr}`).get(...queryParams) as any;
  const total = countRow?.count || 0;

  // Pagination
  let limitStr = "";
  if (params?.limit) {
    limitStr = `LIMIT ${params.limit} OFFSET ${params.offset || 0}`;
  }

  const rows = db.prepare(`SELECT * FROM claims ${whereStr} ORDER BY created_at DESC ${limitStr}`).all(...queryParams) as any[];

  const claims = rows.map((r) => mapRowToClaim(r));
  return { claims, total };
}

export function getClaimById(id: string): Claim | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM claims WHERE id = ?").get(id) as any;
  if (!row) return null;
  return mapRowToClaim(row, true);
}

function mapRowToClaim(row: any, includeRelations = false): Claim {
  const db = getDatabase();
  let documentLinks: string[] = [];
  try {
    documentLinks = JSON.parse(row.document_links || "[]");
  } catch (e) {
    documentLinks = [];
  }

  const claim: Claim = {
    id: row.id,
    claimName: row.claim_name,
    accountName: row.account_name,
    brokerName: row.broker_name,
    claimStatus: row.claim_status as ClaimStatus,
    claimType: row.claim_type,
    shipName: row.ship_name,
    cpType: row.cp_type,
    voyageNumber: row.voyage_number,
    assignedTo: row.assigned_to,
    daysOpen: row.days_open,
    claimClosed: Boolean(row.claim_closed),
    contentions: row.contentions,
    claimNotes: row.claim_notes,
    documentLinks,
    demurrageRatePerDay: row.demurrage_rate_per_day,
    counterpartyName: row.counterparty_name,
    counterpartyType: row.counterparty_type,
    claimFiledAmount: row.claim_filed_amount,
    receivedClaimAmount: row.received_claim_amount,
    agreedAmount: row.agreed_amount,
    billableAmount: row.billable_amount,
    paymentReceived: row.payment_received,
    paymentConcluded: Boolean(row.payment_concluded),
    layday: row.layday,
    cancellingDate: row.cancelling_date,
    voyageEndDate: row.voyage_end_date,
    instructionReceivedDate: row.instruction_received_date,
    noticeReceivedDate: row.notice_received_date,
    claimReceivedDate: row.claim_received_date,
    noticeTimebarDays: row.notice_timebar_days,
    claimTimebarDays: row.claim_timebar_days,
    timebarred: Boolean(row.timebarred),
    claimAgreedDate: row.claim_agreed_date,
    charterpartyDate: row.charterparty_date,
    daysAwaitingPayment: row.days_awaiting_payment,
    invoiceNumber: row.invoice_number || undefined,
    taxYear: row.tax_year || undefined,
    blQuantity: row.bl_quantity || undefined,
    ownersClaimAmount: row.owners_claim_amount || 0,
    claimTimebarDate: row.claim_timebar_date || undefined,
    claimFiledDate: row.claim_filed_date || undefined,
    isOverridden: Boolean(row.is_overridden),
    overriddenDemurrage: row.overridden_demurrage != null ? row.overridden_demurrage : undefined,
    overrideReason: row.override_reason || undefined,
    dayRule: (row.day_rule || "SHEX") as any,
    onceOnDemurrage: row.once_on_demurrage !== undefined && row.once_on_demurrage !== null ? Boolean(row.once_on_demurrage) : true,
    noticeGracePeriodHours: row.notice_grace_hours !== undefined && row.notice_grace_hours !== null ? Number(row.notice_grace_hours) : 6,
    applyWeatherWorkingDay24CH: row.apply_24ch !== undefined && row.apply_24ch !== null ? Boolean(row.apply_24ch) : true,
    countryCode: row.country_code || undefined,
    portTimezone: row.port_timezone || "UTC",
    overlapPolicy: (row.overlap_policy || "block") as any,
    overlapOverrideReason: row.overlap_override_reason || undefined,
    noticeDaysSource: row.notice_days_source || "default",
    claimDaysSource: row.claim_days_source || "default",
    baseDateEstimated: Boolean(row.base_date_estimated),
    clientId: row.client_id || row.clientId,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (includeRelations) {
    claim.ports = getPortsForClaim(claim.id);
    claim.activities = getActivitiesForClaim(claim.id);
    claim.deductions = getDeductionsForClaim(claim.id);
    claim.discrepancies = getDiscrepanciesForClaim(claim.id);
    claim.documents = getDocumentsForClaim(claim.id);
    claim.ownerComparison = getOwnerComparisonForClaim(claim.id);
    claim.chasers = getChasersForClaim(claim.id);
  }

  return claim;
}

export function createClaim(claim: Partial<Claim>, userEmail: string): Claim {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Execute ID generation and insertion inside an IMMEDIATE transaction for concurrency safety
  const runCreate = db.transaction(() => {
    let id = claim.id;
    const isExisting = id ? db.prepare("SELECT id FROM claims WHERE id = ?").get(id) : null;
    if (!id || id.startsWith("CLM-") || isExisting) {
      id = generateNextClaimId(db, claim.instructionReceivedDate);
    }

    const insert = db.prepare(`
      INSERT INTO claims (
        id, claim_name, account_name, broker_name, claim_status, claim_type, ship_name, cp_type,
        voyage_number, assigned_to, days_open, claim_closed, contentions, claim_notes, document_links,
        demurrage_rate_per_day, counterparty_name, counterparty_type, claim_filed_amount, received_claim_amount,
        agreed_amount, billable_amount, payment_received, payment_concluded, layday, cancelling_date,
        voyage_end_date, instruction_received_date, notice_received_date, claim_received_date,
        notice_timebar_days, claim_timebar_days, timebarred, claim_agreed_date, charterparty_date,
        days_awaiting_payment, notice_days_source, claim_days_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const defaults = getBusinessRule("laytime_defaults") || {};
    const globalNoticeDefault = Number(defaults.defaultNoticeTimebarDays) || 30;
    const globalClaimDefault = Number(defaults.defaultClaimTimebarDays) || 90;
    const noticeDays = Number(claim.noticeTimebarDays) > 0 ? Number(claim.noticeTimebarDays) : globalNoticeDefault;
    const claimDays = Number(claim.claimTimebarDays) > 0 ? Number(claim.claimTimebarDays) : globalClaimDefault;
    const noticeSrc = claim.noticeDaysSource || (Number(claim.noticeTimebarDays) > 0 ? "claim" : "default");
    const claimSrc = claim.claimDaysSource || (Number(claim.claimTimebarDays) > 0 ? "claim" : "default");

    insert.run(
      id,
      claim.claimName || `${claim.shipName || "New Vessel"} - Demurrage Claim`,
      claim.accountName || "Client Trading Ltd",
      claim.brokerName || "Clarksons",
      claim.claimStatus || "Submitted",
      claim.claimType || "Discharge Port Demurrage",
      claim.shipName || "Unknown Vessel",
      claim.cpType || "BPVOY4",
      claim.voyageNumber || "VOY-2024-01",
      claim.assignedTo || userEmail || "Rohit Mengane",
      claim.daysOpen || 0,
      claim.claimClosed ? 1 : 0,
      claim.contentions || "",
      claim.claimNotes || "",
      JSON.stringify(claim.documentLinks || []),
      claim.demurrageRatePerDay || 0,
      claim.counterpartyName || "",
      claim.counterpartyType || "Charterer",
      claim.claimFiledAmount || 0,
      claim.receivedClaimAmount || 0,
      claim.agreedAmount || 0,
      claim.billableAmount || claim.claimFiledAmount || 0,
      claim.paymentReceived || 0,
      claim.paymentConcluded ? 1 : 0,
      claim.layday || "",
      claim.cancellingDate || "",
      claim.voyageEndDate || "",
      claim.instructionReceivedDate || "",
      claim.noticeReceivedDate || "",
      claim.claimReceivedDate || "",
      noticeDays,
      claimDays,
      claim.timebarred ? 1 : 0,
      claim.claimAgreedDate || null,
      claim.charterpartyDate || null,
      claim.daysAwaitingPayment || 0,
      noticeSrc,
      claimSrc,
      now,
      now
    );

    if (claim.ports && claim.ports.length > 0) {
      savePortsForClaim(id, claim.ports);
    }

    if (claim.activities && claim.activities.length > 0) {
      saveActivitiesForClaim(id, claim.activities);
    }

    createNotificationRecord({
      title: "New Demurrage Claim Created",
      message: `Claim ${id} (${claim.shipName}) was successfully registered.`,
      type: "claim",
      claimId: id,
      claimName: claim.claimName
    });

    return id;
  });

  const createdId = runCreate.immediate();
  return getClaimById(createdId)!;
}

export function updateClaim(id: string, updates: Partial<Claim>): Claim | null {
  const db = getDatabase();
  const existing = getClaimById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const sets: string[] = [];
  const vals: any[] = [];

  const fields: (keyof Claim)[] = [
    "claimName", "accountName", "brokerName", "claimStatus", "claimType", "shipName", "cpType",
    "voyageNumber", "assignedTo", "daysOpen", "claimClosed", "contentions", "claimNotes",
    "demurrageRatePerDay", "counterpartyName", "counterpartyType", "claimFiledAmount",
    "receivedClaimAmount", "agreedAmount", "billableAmount", "paymentReceived", "paymentConcluded",
    "layday", "cancellingDate", "voyageEndDate", "instructionReceivedDate", "noticeReceivedDate",
    "claimReceivedDate", "noticeTimebarDays", "claimTimebarDays", "timebarred", "claimAgreedDate",
    "charterpartyDate", "daysAwaitingPayment", "invoiceNumber", "taxYear", "blQuantity",
    "ownersClaimAmount", "claimTimebarDate", "claimFiledDate", "isOverridden", "overriddenDemurrage", "overrideReason",
    "dayRule", "onceOnDemurrage", "noticeGracePeriodHours", "applyWeatherWorkingDay24CH",
    "countryCode", "portTimezone", "overlapPolicy", "overlapOverrideReason",
    "noticeDaysSource", "claimDaysSource"
  ];

  const dbFieldMap: Record<string, string> = {
    claimName: "claim_name",
    accountName: "account_name",
    brokerName: "broker_name",
    claimStatus: "claim_status",
    claimType: "claim_type",
    shipName: "ship_name",
    cpType: "cp_type",
    voyageNumber: "voyage_number",
    assignedTo: "assigned_to",
    daysOpen: "days_open",
    claimClosed: "claim_closed",
    contentions: "contentions",
    claimNotes: "claim_notes",
    demurrageRatePerDay: "demurrage_rate_per_day",
    counterpartyName: "counterparty_name",
    counterpartyType: "counterparty_type",
    claimFiledAmount: "claim_filed_amount",
    receivedClaimAmount: "received_claim_amount",
    agreedAmount: "agreed_amount",
    billableAmount: "billable_amount",
    paymentReceived: "payment_received",
    paymentConcluded: "payment_concluded",
    layday: "layday",
    cancellingDate: "cancelling_date",
    voyageEndDate: "voyage_end_date",
    instructionReceivedDate: "instruction_received_date",
    noticeReceivedDate: "notice_received_date",
    claimReceivedDate: "claim_received_date",
    noticeTimebarDays: "notice_timebar_days",
    claimTimebarDays: "claim_timebar_days",
    timebarred: "timebarred",
    claimAgreedDate: "claim_agreed_date",
    charterpartyDate: "charterparty_date",
    daysAwaitingPayment: "days_awaiting_payment",
    isOverridden: "is_overridden",
    overriddenDemurrage: "overridden_demurrage",
    overrideReason: "override_reason",
    dayRule: "day_rule",
    onceOnDemurrage: "once_on_demurrage",
    noticeGracePeriodHours: "notice_grace_hours",
    applyWeatherWorkingDay24CH: "apply_24ch",
    countryCode: "country_code",
    portTimezone: "port_timezone",
    overlapPolicy: "overlap_policy",
    overlapOverrideReason: "overlap_override_reason",
    noticeDaysSource: "notice_days_source",
    claimDaysSource: "claim_days_source",
    invoiceNumber: "invoice_number",
    taxYear: "tax_year",
    blQuantity: "bl_quantity",
    ownersClaimAmount: "owners_claim_amount",
    claimTimebarDate: "claim_timebar_date",
    claimFiledDate: "claim_filed_date"
  };

  for (const f of fields) {
    if ((updates as any)[f] !== undefined) {
      sets.push(`${dbFieldMap[f]} = ?`);
      let val = (updates as any)[f];
      if (typeof val === "boolean") val = val ? 1 : 0;
      vals.push(val);
    }
  }

  if (updates.noticeTimebarDays !== undefined && updates.noticeDaysSource === undefined) {
    sets.push("notice_days_source = ?");
    vals.push("claim");
  }
  if (updates.claimTimebarDays !== undefined && updates.claimDaysSource === undefined) {
    sets.push("claim_days_source = ?");
    vals.push("claim");
  }

  if (updates.documentLinks) {
    sets.push("document_links = ?");
    vals.push(JSON.stringify(updates.documentLinks));
  }

  sets.push("updated_at = ?");
  vals.push(now);

  vals.push(id);

  db.prepare(`UPDATE claims SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

  if (updates.ports) {
    savePortsForClaim(id, updates.ports);
  }
  if (updates.activities) {
    saveActivitiesForClaim(id, updates.activities);
  }
  if (updates.deductions) {
    saveDeductionsForClaim(id, updates.deductions);
  }

  if (
    updates.demurrageRatePerDay !== undefined ||
    updates.isOverridden !== undefined ||
    updates.overriddenDemurrage !== undefined ||
    updates.dayRule !== undefined ||
    updates.onceOnDemurrage !== undefined ||
    updates.noticeGracePeriodHours !== undefined ||
    updates.applyWeatherWorkingDay24CH !== undefined ||
    updates.overlapPolicy !== undefined ||
    updates.portTimezone !== undefined ||
    updates.ports !== undefined ||
    updates.activities !== undefined ||
    updates.deductions !== undefined
  ) {
    persistCalculationForClaim(id);
  }

  return getClaimById(id);
}

export function persistCalculationForClaim(claimId: string, calculatedBy?: string): ClaimCalculation {
  const db = getDatabase();
  let resultCalc!: ClaimCalculation;

  const runPersist = () => {
    const fullClaim = getClaimById(claimId);
    if (!fullClaim) {
      throw new Error(`Claim not found: ${claimId}`);
    }

    const holidays = listHolidays();
    const assumptions = getBusinessRule("laytime_defaults") || undefined;
    const calc = calculateClaimLaytime(fullClaim, assumptions, holidays);
    resultCalc = calc;
    const now = new Date().toISOString();
    const calcId = `calc-${claimId}`;
    const actor = calculatedBy || fullClaim.assignedTo || "System";

    const portJson = JSON.stringify(
      calc.portCalculations.length > 0
        ? calc.portCalculations.map((p) => ({
            portName: p.portName,
            allowedMinutes: p.totalAllowedMinutes,
            netLaytimeMinutes: p.totalNetUsedMinutes,
          }))
        : [
            {
              portName: fullClaim.shipName || "Port Call",
              allowedMinutes: calc.totalAllowedMinutes,
              netLaytimeMinutes: calc.totalNetLaytimeMinutes,
            },
          ]
    );

    const timebarJson = JSON.stringify(calc.timebarCompliance || {});
    const assumptionsJson = JSON.stringify(calc.assumptions || {});

    db.prepare(`
      INSERT INTO laytime_calculations (
        id, claim_id, demurrage_rate_per_day, total_gross_minutes,
        total_deductions_minutes, total_net_laytime_minutes, total_allowed_minutes,
        net_demurrage_minutes, net_despatch_minutes, calculated_demurrage_amount,
        calculated_despatch_amount, final_payable_amount, port_calculations_json,
        timebar_compliance_json, assumptions_json, calculated_by, calculated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(claim_id) DO UPDATE SET
        demurrage_rate_per_day = excluded.demurrage_rate_per_day,
        total_gross_minutes = excluded.total_gross_minutes,
        total_deductions_minutes = excluded.total_deductions_minutes,
        total_net_laytime_minutes = excluded.total_net_laytime_minutes,
        total_allowed_minutes = excluded.total_allowed_minutes,
        net_demurrage_minutes = excluded.net_demurrage_minutes,
        net_despatch_minutes = excluded.net_despatch_minutes,
        calculated_demurrage_amount = excluded.calculated_demurrage_amount,
        calculated_despatch_amount = excluded.calculated_despatch_amount,
        final_payable_amount = excluded.final_payable_amount,
        port_calculations_json = excluded.port_calculations_json,
        timebar_compliance_json = excluded.timebar_compliance_json,
        assumptions_json = excluded.assumptions_json,
        calculated_by = excluded.calculated_by,
        calculated_at = excluded.calculated_at
    `).run(
      calcId,
      claimId,
      calc.demurrageRatePerDay,
      calc.totalGrossMinutes,
      calc.totalDeductionsMinutes,
      calc.totalNetLaytimeMinutes,
      calc.totalAllowedMinutes,
      calc.netDemurrageMinutes,
      calc.netDespatchMinutes,
      calc.calculatedDemurrageAmount,
      calc.calculatedDespatchAmount,
      calc.finalPayableAmount,
      portJson,
      timebarJson,
      assumptionsJson,
      actor,
      now
    );

    // Update claims financial fields from the result
    db.prepare(`
      UPDATE claims SET
        billable_amount = ?,
        claim_filed_amount = CASE
          WHEN claim_status LIKE '%Nil Demurrage%' OR claim_status LIKE '%No Claim%' THEN 0
          ELSE ?
        END,
        updated_at = ?
      WHERE id = ?
    `).run(
      calc.finalPayableAmount,
      calc.calculatedDemurrageAmount,
      now,
      claimId
    );
  };

  if (db.inTransaction) {
    runPersist();
  } else {
    db.transaction(runPersist)();
  }

  return resultCalc;
}

export function deleteClaim(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM claims WHERE id = ?").run(id);
  return res.changes > 0;
}

// =========================================================================
// 3. PORTS & BERTHS
// =========================================================================

export function getPortsForClaim(claimId: string): Port[] {
  const db = getDatabase();
  const portRows = db.prepare("SELECT * FROM ports WHERE claim_id = ?").all(claimId) as any[];
  return portRows.map((p) => {
    const berthRows = db.prepare("SELECT * FROM berths WHERE port_id = ?").all(p.id) as any[];
    return {
      id: p.id,
      claimId: p.claim_id,
      name: p.name,
      portType: p.port_type,
      loadRate: p.load_rate,
      countryCode: p.country_code || inferCountryAndTimezone(p.name).countryCode,
      timezone: p.timezone || inferCountryAndTimezone(p.name).timezone,
      berths: berthRows.map((b) => ({
        id: b.id,
        portId: b.port_id,
        name: b.name,
        quantity: b.quantity,
        prorataShare: b.prorata_share,
        isProrataOverridden: Boolean(b.is_prorata_overridden),
        loadRate: b.load_rate,
        cargoType: b.cargo_type,
        receiverName: b.receiver_name
      }))
    };
  });
}

export function savePortsForClaim(claimId: string, ports: Port[]): void {
  const db = getDatabase();
  db.transaction(() => {
    db.prepare("DELETE FROM ports WHERE claim_id = ?").run(claimId);
    const insertPort = db.prepare("INSERT OR REPLACE INTO ports (id, claim_id, name, port_type, load_rate, country_code, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const insertBerth = db.prepare("INSERT OR REPLACE INTO berths (id, port_id, name, quantity, prorata_share, is_prorata_overridden, load_rate, cargo_type, receiver_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    const now = new Date().toISOString();
    let pIdx = 0;
    for (const p of ports) {
      pIdx++;
      const portId = p.id ? (p.id.includes(claimId) ? p.id : `${claimId}-${p.id}`) : `port-${claimId}-${pIdx}`;
      const inferred = inferCountryAndTimezone(p.name);
      insertPort.run(portId, claimId, p.name, p.portType, p.loadRate, p.countryCode || inferred.countryCode, p.timezone || inferred.timezone, now);
      let bIdx = 0;
      for (const b of p.berths || []) {
        bIdx++;
        const berthId = b.id ? (b.id.includes(claimId) ? b.id : `${claimId}-${b.id}`) : `berth-${portId}-${bIdx}`;
        insertBerth.run(berthId, portId, b.name, b.quantity, b.prorataShare, b.isProrataOverridden ? 1 : 0, b.loadRate, b.cargoType || "", b.receiverName || "");
      }
    }
    persistCalculationForClaim(claimId);
  })();
}

// =========================================================================
// 4. STATEMENT OF FACTS & DEDUCTIONS
// =========================================================================

export function getActivitiesForClaim(claimId: string): SoFActivity[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM statement_of_facts WHERE claim_id = ? ORDER BY start_time ASC").all(claimId) as any[];
  return rows.map((r) => {
    let originalOcrValues;
    if (r.original_ocr_values) {
      try { originalOcrValues = JSON.parse(r.original_ocr_values); } catch (e) {}
    }
    return {
      id: r.id,
      claimId: r.claim_id,
      portId: r.port_id,
      berthId: r.berth_id,
      activityName: r.activity_name,
      startTime: r.start_time,
      stopTime: r.stop_time,
      durationMinutes: r.duration_minutes,
      durationFormatted: r.duration_formatted,
      percentageCounted: r.percentage_counted,
      prorata: r.prorata,
      deductionCategory: r.deduction_category,
      remarks: r.remarks,
      isOcrExtracted: Boolean(r.is_ocr_extracted),
      isCorrected: Boolean(r.is_corrected),
      ocrConfidence: r.ocr_confidence,
      originalOcrValues
    };
  });
}

export function saveActivitiesForClaim(claimId: string, activities: SoFActivity[]): void {
  const db = getDatabase();
  db.transaction(() => {
    db.prepare("DELETE FROM statement_of_facts WHERE claim_id = ?").run(claimId);
    const insert = db.prepare(`
      INSERT OR REPLACE INTO statement_of_facts (
        id, claim_id, port_id, berth_id, activity_name, start_time, stop_time, duration_minutes,
        duration_formatted, percentage_counted, prorata, deduction_category, remarks, is_ocr_extracted,
        is_corrected, ocr_confidence, original_ocr_values
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const usedIds = new Set<string>();
    let aIdx = 0;
    for (const a of activities) {
      aIdx++;
      let actId = a.id;
      if (!actId || usedIds.has(actId) || db.prepare("SELECT 1 FROM statement_of_facts WHERE id = ? AND claim_id != ?").get(actId, claimId)) {
        actId = `act-${claimId}-${aIdx}-${uuidv4().slice(0, 8)}`;
      }
      usedIds.add(actId);

      insert.run(
        actId, claimId, a.portId || null, a.berthId || null, a.activityName, a.startTime, a.stopTime,
        a.durationMinutes, a.durationFormatted, a.percentageCounted, a.prorata, a.deductionCategory,
        a.remarks || "", a.isOcrExtracted ? 1 : 0, a.isCorrected ? 1 : 0, a.ocrConfidence || 1.0,
        a.originalOcrValues ? JSON.stringify(a.originalOcrValues) : null
      );
    }
    persistCalculationForClaim(claimId);
  })();
}

export function validatePortAndBerth(claimId: string, portId?: string | null, berthId?: string | null): void {
  const db = getDatabase();
  if (portId) {
    const port = db.prepare("SELECT id FROM ports WHERE id = ? AND claim_id = ?").get(portId, claimId);
    if (!port) {
      const err = new Error(`Invalid portId: port '${portId}' does not belong to claim '${claimId}'`);
      (err as any).statusCode = 400;
      throw err;
    }
  }
  if (berthId) {
    if (!portId) {
      const err = new Error("Invalid berthId: portId must be provided when berthId is specified");
      (err as any).statusCode = 400;
      throw err;
    }
    const berth = db.prepare("SELECT id FROM berths WHERE id = ? AND port_id = ?").get(berthId, portId);
    if (!berth) {
      const err = new Error(`Invalid berthId: berth '${berthId}' does not belong to port '${portId}'`);
      (err as any).statusCode = 400;
      throw err;
    }
  }
}

export function validateAndComputeDuration(startTime?: string | null, stopTime?: string | null): {
  startTime: string;
  stopTime: string;
  durationMinutes: number;
  durationFormatted: string;
} {
  if (!startTime || !stopTime) {
    const err = new Error("Both startTime and stopTime are required");
    (err as any).statusCode = 400;
    throw err;
  }
  const start = new Date(startTime).getTime();
  const stop = new Date(stopTime).getTime();
  if (isNaN(start)) {
    const err = new Error("Invalid startTime format");
    (err as any).statusCode = 400;
    throw err;
  }
  if (isNaN(stop)) {
    const err = new Error("Invalid stopTime format");
    (err as any).statusCode = 400;
    throw err;
  }
  if (stop <= start) {
    const err = new Error("Invalid time window: stopTime must be strictly after startTime");
    (err as any).statusCode = 400;
    throw err;
  }
  const nowBuffer = Date.now() + 60 * 1000;
  if (start > nowBuffer || stop > nowBuffer) {
    const err = new Error("SoF activity timestamps cannot be in the future");
    (err as any).statusCode = 400;
    throw err;
  }
  const durationMinutes = Math.round((stop - start) / 60000);
  const d = Math.floor(durationMinutes / 1440);
  const h = Math.floor((durationMinutes % 1440) / 60);
  const m = durationMinutes % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const durationFormatted = d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m`;

  return { startTime, stopTime, durationMinutes, durationFormatted };
}

export function addActivityToClaim(claimId: string, activity: Partial<SoFActivity>): SoFActivity {
  const db = getDatabase();
  let actId = activity.id;
  if (!actId || db.prepare("SELECT 1 FROM statement_of_facts WHERE id = ?").get(actId)) {
    actId = `act-${claimId}-${Date.now()}-${uuidv4().slice(0, 8)}`;
  }

  // 1. Validate port and berth
  validatePortAndBerth(claimId, activity.portId, activity.berthId);

  // 2. Validate timestamps and compute duration from timestamps (never trust client)
  const { startTime, stopTime, durationMinutes, durationFormatted } = validateAndComputeDuration(
    activity.startTime,
    activity.stopTime
  );

  // 3. Validate percentageCounted (0 to 100)
  const percentageCounted = activity.percentageCounted ?? 100;
  if (typeof percentageCounted !== "number" || isNaN(percentageCounted) || percentageCounted < 0 || percentageCounted > 100) {
    const err = new Error("percentageCounted must be a number between 0 and 100");
    (err as any).statusCode = 400;
    throw err;
  }

  const runAdd = () => {
    db.prepare(`
      INSERT OR REPLACE INTO statement_of_facts (
        id, claim_id, port_id, berth_id, activity_name, start_time, stop_time,
        duration_minutes, duration_formatted, percentage_counted, prorata,
        deduction_category, remarks, is_ocr_extracted, is_corrected, ocr_confidence, original_ocr_values
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actId,
      claimId,
      activity.portId || null,
      activity.berthId || null,
      activity.activityName || "Operational Activity",
      startTime,
      stopTime,
      durationMinutes,
      durationFormatted,
      percentageCounted,
      activity.prorata ?? 100,
      activity.deductionCategory || "Other",
      activity.remarks || "",
      activity.isOcrExtracted ? 1 : 0,
      activity.isCorrected ? 1 : 0,
      activity.ocrConfidence ?? 1.0,
      activity.originalOcrValues ? JSON.stringify(activity.originalOcrValues) : null
    );

    persistCalculationForClaim(claimId);
  };

  if (db.inTransaction) {
    runAdd();
  } else {
    db.transaction(runAdd)();
  }

  return {
    id: actId,
    claimId,
    portId: activity.portId || undefined,
    berthId: activity.berthId || undefined,
    activityName: activity.activityName || "Operational Activity",
    startTime,
    stopTime,
    durationMinutes,
    durationFormatted,
    percentageCounted,
    prorata: activity.prorata ?? 100,
    deductionCategory: activity.deductionCategory || "Other",
    remarks: activity.remarks || "",
    isOcrExtracted: Boolean(activity.isOcrExtracted),
    isCorrected: Boolean(activity.isCorrected),
    ocrConfidence: activity.ocrConfidence ?? 1.0,
    originalOcrValues: activity.originalOcrValues
  };
}

export function updateActivityInClaim(claimId: string, activityId: string, updates: Partial<SoFActivity>): SoFActivity | null {
  const db = getDatabase();
  const existing = db.prepare("SELECT * FROM statement_of_facts WHERE id = ? AND claim_id = ?").get(activityId, claimId) as any;
  if (!existing) return null;

  const portId = updates.portId !== undefined ? updates.portId : existing.port_id;
  const berthId = updates.berthId !== undefined ? updates.berthId : existing.berth_id;

  // 1. Validate port and berth
  validatePortAndBerth(claimId, portId, berthId);

  const startTime = updates.startTime ?? existing.start_time;
  const stopTime = updates.stopTime ?? existing.stop_time;

  // 2. Validate timestamps and compute duration from timestamps
  const { durationMinutes, durationFormatted } = validateAndComputeDuration(startTime, stopTime);

  // 3. Validate percentageCounted (0 to 100)
  const percentageCounted = updates.percentageCounted !== undefined ? updates.percentageCounted : existing.percentage_counted;
  if (typeof percentageCounted !== "number" || isNaN(percentageCounted) || percentageCounted < 0 || percentageCounted > 100) {
    const err = new Error("percentageCounted must be a number between 0 and 100");
    (err as any).statusCode = 400;
    throw err;
  }

  const activityName = updates.activityName ?? existing.activity_name;
  const prorata = updates.prorata ?? existing.prorata;
  const deductionCategory = updates.deductionCategory ?? existing.deduction_category;
  const remarks = updates.remarks ?? existing.remarks;
  const isCorrected = updates.isCorrected !== undefined ? (updates.isCorrected ? 1 : 0) : existing.is_corrected;

  const runUpdate = () => {
    db.prepare(`
      UPDATE statement_of_facts SET
        activity_name = ?,
        start_time = ?,
        stop_time = ?,
        duration_minutes = ?,
        duration_formatted = ?,
        percentage_counted = ?,
        prorata = ?,
        deduction_category = ?,
        remarks = ?,
        berth_id = ?,
        port_id = ?,
        is_corrected = ?
      WHERE id = ? AND claim_id = ?
    `).run(
      activityName,
      startTime,
      stopTime,
      durationMinutes,
      durationFormatted,
      percentageCounted,
      prorata,
      deductionCategory,
      remarks,
      berthId || null,
      portId || null,
      isCorrected,
      activityId,
      claimId
    );

    persistCalculationForClaim(claimId);
  };

  if (db.inTransaction) {
    runUpdate();
  } else {
    db.transaction(runUpdate)();
  }

  return {
    id: activityId,
    claimId,
    portId: portId || undefined,
    berthId: berthId || undefined,
    activityName,
    startTime,
    stopTime,
    durationMinutes,
    durationFormatted,
    percentageCounted,
    prorata,
    deductionCategory,
    remarks,
    isOcrExtracted: Boolean(existing.is_ocr_extracted),
    isCorrected: Boolean(isCorrected),
    ocrConfidence: existing.ocr_confidence,
    originalOcrValues: existing.original_ocr_values ? JSON.parse(existing.original_ocr_values) : undefined
  };
}

export function deleteActivityFromClaim(claimId: string, activityId: string): boolean {
  const db = getDatabase();
  let success = false;
  const runDelete = () => {
    const info = db.prepare("DELETE FROM statement_of_facts WHERE id = ? AND claim_id = ?").run(activityId, claimId);
    success = info.changes > 0;
    if (success) {
      persistCalculationForClaim(claimId);
    }
  };
  if (db.inTransaction) {
    runDelete();
  } else {
    db.transaction(runDelete)();
  }
  return success;
}

export function getDeductionsForClaim(claimId: string) {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM deductions WHERE claim_id = ?").all(claimId) as any[];
  return rows.map((r) => ({
    id: r.id,
    claimId: r.claim_id,
    type: r.type,
    startTime: r.start_time,
    stopTime: r.stop_time,
    percentageTime: r.percentage_time,
    prorata: r.prorata,
    deductionHours: r.deduction_hours,
    remarks: r.remarks,
  }));
}

export function saveDeductionsForClaim(claimId: string, deductions: any[]) {
  const db = getDatabase();
  db.transaction(() => {
    db.prepare("DELETE FROM deductions WHERE claim_id = ?").run(claimId);
    const insert = db.prepare("INSERT OR REPLACE INTO deductions (id, claim_id, type, start_time, stop_time, percentage_time, prorata, deduction_hours, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const usedIds = new Set<string>();
    let dIdx = 0;
    for (const d of deductions) {
      dIdx++;
      let dedId = d.id;
      if (!dedId || usedIds.has(dedId) || db.prepare("SELECT 1 FROM deductions WHERE id = ? AND claim_id != ?").get(dedId, claimId)) {
        dedId = `ded-${claimId}-${dIdx}-${uuidv4().slice(0, 8)}`;
      }
      usedIds.add(dedId);
      insert.run(dedId, claimId, d.type, d.startTime, d.stopTime, d.percentageTime, d.prorata, d.deductionHours, d.remarks || "");
    }
    persistCalculationForClaim(claimId);
  })();
}

// =========================================================================
// 5. DISCREPANCIES
// =========================================================================

export function getDiscrepanciesForClaim(claimId: string): Discrepancy[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM discrepancies WHERE claim_id = ?").all(claimId) as any[];
  return rows.map((r) => ({
    id: r.id,
    claimId: r.claim_id,
    racCaseId: r.rac_case_id,
    activityId: r.activity_id,
    type: r.type,
    severity: r.severity,
    title: r.title,
    description: r.description,
    field: r.field,
    currentValue: r.current_value,
    suggestedValue: r.suggested_value,
    isResolved: Boolean(r.is_resolved),
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at
  }));
}

export function resolveDiscrepancyRecord(id: string, resolvedBy: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const res = db.prepare("UPDATE discrepancies SET is_resolved = 1, resolved_by = ?, resolved_at = ? WHERE id = ?").run(resolvedBy, now, id);
  return res.changes > 0;
}

// =========================================================================
// 6. OWNER COMPARISONS
// =========================================================================

export function getOwnerComparisonForClaim(claimId: string): OwnerComparison | undefined {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM owner_comparisons WHERE claim_id = ?").get(claimId) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    claimId: row.claim_id,
    ownerDemurrageAmount: row.owner_demurrage_amount,
    ownerLaytimeHours: row.owner_laytime_hours,
    internalDemurrageAmount: row.internal_demurrage_amount,
    internalLaytimeHours: row.internal_laytime_hours,
    differenceAmount: row.difference_amount,
    differenceHours: row.difference_hours,
    explanation: row.explanation,
    berthComparisons: row.berth_comparisons_json ? JSON.parse(row.berth_comparisons_json) : [],
    portComparisons: row.port_comparisons_json ? JSON.parse(row.port_comparisons_json) : [],
    updatedBy: row.updated_by,
    updatedAt: row.updated_at
  };
}

export function saveOwnerComparisonForClaim(claimId: string, comp: Partial<OwnerComparison>, user: string): OwnerComparison {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = comp.id || `comp-${claimId}`;
  const diffAmt = (comp.ownerDemurrageAmount || 0) - (comp.internalDemurrageAmount || 0);
  const diffHrs = (comp.ownerLaytimeHours || 0) - (comp.internalLaytimeHours || 0);

  db.prepare(`
    INSERT OR REPLACE INTO owner_comparisons (
      id, claim_id, owner_demurrage_amount, owner_laytime_hours, internal_demurrage_amount,
      internal_laytime_hours, difference_amount, difference_hours, explanation,
      berth_comparisons_json, port_comparisons_json, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, claimId, comp.ownerDemurrageAmount || 0, comp.ownerLaytimeHours || 0,
    comp.internalDemurrageAmount || 0, comp.internalLaytimeHours || 0,
    diffAmt, diffHrs, comp.explanation || "",
    JSON.stringify(comp.berthComparisons || []),
    JSON.stringify(comp.portComparisons || []),
    user, now
  );

  return getOwnerComparisonForClaim(claimId)!;
}

// =========================================================================
// 7. DOCUMENTS & REVISIONS
// =========================================================================

export function getDocumentsForClaim(claimId: string): DocumentRecord[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM documents WHERE claim_id = ? ORDER BY uploaded_at DESC").all(claimId) as any[];
  return rows.map((r) => mapRowToDocument(r));
}

export function getDocuments(filter?: { claimId?: string; racCaseId?: string }): DocumentRecord[] {
  const db = getDatabase();
  let whereStr = "";
  const params: any[] = [];
  if (filter?.claimId) {
    whereStr = "WHERE claim_id = ?";
    params.push(filter.claimId);
  } else if (filter?.racCaseId) {
    whereStr = "WHERE rac_case_id = ?";
    params.push(filter.racCaseId);
  }

  const rows = db.prepare(`SELECT * FROM documents ${whereStr} ORDER BY uploaded_at DESC`).all(...params) as any[];
  return rows.map((r) => mapRowToDocument(r));
}

export function getDocumentById(id: string): DocumentRecord | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as any;
  if (!row) return null;
  return mapRowToDocument(row);
}

function mapRowToDocument(r: any): DocumentRecord {
  const db = getDatabase();
  const revRows = db.prepare("SELECT * FROM document_revisions WHERE document_id = ? ORDER BY uploaded_at DESC").all(r.id) as any[];
  return {
    id: r.id,
    claimId: r.claim_id,
    claimName: r.claim_name,
    racCaseId: r.rac_case_id,
    fileName: r.file_name,
    fileSize: r.file_size,
    fileType: r.file_type,
    category: r.category,
    version: r.version,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
    modifiedBy: r.modified_by,
    modifiedAt: r.modified_at,
    status: r.status,
    ocrConfidence: r.ocr_confidence,
    extractedItemsCount: r.extracted_items_count,
    errorReason: r.error_reason,
    filePath: r.file_path,
    fileHash: r.file_hash || undefined,
    revisions: revRows.map((rev) => ({
      id: rev.id,
      documentId: rev.document_id,
      version: rev.version,
      fileName: rev.file_name,
      fileSize: rev.file_size,
      uploadedBy: rev.uploaded_by,
      uploadedAt: rev.uploaded_at,
      changeSummary: rev.change_summary,
      filePath: rev.file_path
    }))
  };
}

export function findDuplicateDocumentByHash(claimId: string | null, fileHash: string): DocumentRecord | null {
  const db = getDatabase();
  const normClaimId = claimId && claimId !== "General" ? claimId : null;
  const row = normClaimId
    ? (db.prepare("SELECT * FROM documents WHERE file_hash = ? AND claim_id = ? LIMIT 1").get(fileHash, normClaimId) as any)
    : (db.prepare("SELECT * FROM documents WHERE file_hash = ? AND (claim_id IS NULL OR claim_id = 'General') LIMIT 1").get(fileHash) as any);
  return row ? mapRowToDocument(row) : null;
}

export function createDocument(doc: Partial<DocumentRecord>, uploader: string): DocumentRecord {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fileName = doc.fileName || "document.pdf";
  const claimId = doc.claimId && doc.claimId !== "General" ? doc.claimId : null;
  const fileSize = doc.fileSize ?? 0;
  const fileType = doc.fileType || "application/pdf";
  const category = doc.category || doc.type || "SOF";
  const filePath = doc.filePath || "";
  const fileHash = doc.fileHash || null;

  // Check if existing document with same file_name and claim_id exists (only version-bump if content differs or no hash)
  const existing = claimId
    ? (db.prepare("SELECT * FROM documents WHERE file_name = ? AND claim_id = ? ORDER BY uploaded_at DESC LIMIT 1").get(fileName, claimId) as any)
    : (db.prepare("SELECT * FROM documents WHERE file_name = ? AND (claim_id IS NULL OR claim_id = 'General') ORDER BY uploaded_at DESC LIMIT 1").get(fileName) as any);

  if (existing) {
    const prevVersion = existing.version || "v1.0";
    const num = parseFloat(prevVersion.replace(/[^\d.]/g, "")) || 1.0;
    const nextVersion = `v${(num + 0.1).toFixed(1)}`;

    db.prepare(`
      UPDATE documents
      SET version = ?, file_size = ?, file_type = ?, category = ?, file_path = ?, file_hash = ?, uploaded_by = ?, uploaded_at = ?, status = 'Uploaded'
      WHERE id = ?
    `).run(nextVersion, fileSize, fileType, category, filePath || existing.file_path, fileHash, uploader, now, existing.id);

    const revRows = db.prepare("SELECT COUNT(*) as count FROM document_revisions WHERE document_id = ?").get(existing.id) as any;
    const revNum = (revRows?.count || 1) + 1;
    db.prepare(`
      INSERT INTO document_revisions (id, document_id, version, file_name, file_size, uploaded_by, uploaded_at, change_summary, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`rev-${existing.id}-${revNum}`, existing.id, nextVersion, fileName, fileSize, uploader, now, `Version update to ${nextVersion}`, filePath);

    return getDocumentById(existing.id)!;
  }

  const id = doc.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const version = doc.version || "v1.0";

  db.prepare(`
    INSERT INTO documents (
      id, claim_id, claim_name, rac_case_id, file_name, file_size, file_type, category,
      version, uploaded_by, uploaded_at, status, ocr_confidence, extracted_items_count,
      error_reason, file_path, file_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, claimId, doc.claimName || null, doc.racCaseId || null, fileName,
    fileSize, fileType, category, version,
    uploader, now, doc.status || "Uploaded", doc.ocrConfidence || 0, doc.extractedItemsCount || 0,
    doc.errorReason || null, filePath, fileHash
  );

  // Initial Revision
  db.prepare(`
    INSERT INTO document_revisions (id, document_id, version, file_name, file_size, uploaded_by, uploaded_at, change_summary, file_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`rev-${id}-1`, id, version, fileName, fileSize, uploader, now, "Initial document upload", filePath);

  return getDocumentById(id)!;
}

export function updateDocument(id: string, updates: Partial<DocumentRecord>, modifier: string): DocumentRecord | null {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = getDocumentById(id);
  if (!existing) return null;

  if (updates.status) db.prepare("UPDATE documents SET status = ? WHERE id = ?").run(updates.status, id);
  if (updates.ocrConfidence !== undefined) db.prepare("UPDATE documents SET ocr_confidence = ? WHERE id = ?").run(updates.ocrConfidence, id);
  if (updates.extractedItemsCount !== undefined) db.prepare("UPDATE documents SET extracted_items_count = ? WHERE id = ?").run(updates.extractedItemsCount, id);

  db.prepare("UPDATE documents SET modified_by = ?, modified_at = ? WHERE id = ?").run(modifier, now, id);

  return getDocumentById(id);
}

// =========================================================================
// 8. NOTIFICATIONS
// =========================================================================

export function getNotifications(): NotificationRecord[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50").all() as any[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type,
    claimId: r.claim_id,
    claimName: r.claim_name,
    racCaseId: r.rac_case_id,
    racReference: r.rac_reference,
    isRead: Boolean(r.is_read),
    createdAt: r.created_at
  }));
}

export function markNotificationRead(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
  return res.changes > 0;
}

export function createNotificationRecord(notif: Partial<NotificationRecord>): NotificationRecord {
  const db = getDatabase();
  const id = notif.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notifications (id, title, message, type, claim_id, claim_name, rac_case_id, rac_reference, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, notif.title, notif.message, notif.type || "system", notif.claimId || null, notif.claimName || null, notif.racCaseId || null, notif.racReference || null, now);

  return {
    id,
    title: notif.title || "",
    message: notif.message || "",
    type: (notif.type as any) || "system",
    claimId: notif.claimId,
    claimName: notif.claimName,
    racCaseId: notif.racCaseId,
    racReference: notif.racReference,
    isRead: false,
    createdAt: now
  };
}

// =========================================================================
// 9. RAC CASES & RAC WORKFLOW
// =========================================================================

export function getRacCases(params?: {
  role?: string;
  userEmail?: string;
  userName?: string;
  status?: string;
  racType?: string;
  client?: string;
  claimId?: string;
  search?: string;
}): RacCase[] {
  const db = getDatabase();
  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (params?.role === "Claim Processor" || params?.role === "Processor") {
    const email = params.userEmail || "";
    const name = params.userName || "";
    whereClauses.push("(LOWER(assigned_to) = LOWER(?) OR LOWER(assigned_to) = LOWER(?) OR LOWER(assigned_to) LIKE ? OR LOWER(assigned_to) LIKE ?)");
    queryParams.push(email, name, "%rohit%", "%sarah%");
  }

  if (params?.claimId) {
    whereClauses.push("claim_id = ?");
    queryParams.push(params.claimId);
  }

  if (params?.status && params.status !== "All") {
    whereClauses.push("status = ?");
    queryParams.push(params.status);
  }

  if (params?.racType && params.racType !== "All") {
    whereClauses.push("rac_type = ?");
    queryParams.push(params.racType);
  }

  if (params?.client && params.client !== "All") {
    whereClauses.push("client_name = ?");
    queryParams.push(params.client);
  }

  if (params?.search && params.search.trim() !== "") {
    const s = `%${params.search.trim().toLowerCase()}%`;
    whereClauses.push("(LOWER(rac_reference) LIKE ? OR LOWER(client_name) LIKE ? OR LOWER(ship_name) LIKE ? OR LOWER(counterparty_name) LIKE ?)");
    queryParams.push(s, s, s, s);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM rac_cases ${whereStr} ORDER BY created_at DESC`).all(...queryParams) as any[];

  return rows.map((r) => mapRowToRacCase(r));
}

export function getRacCaseById(id: string): RacCase | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM rac_cases WHERE id = ? OR rac_reference = ?").get(id, id) as any;
  if (!row) return null;
  return mapRowToRacCase(row, true);
}

function mapRowToRacCase(r: any, includeRelations = false): RacCase {
  const db = getDatabase();
  const rac: RacCase = {
    id: r.id,
    racReference: r.rac_reference,
    clientName: r.client_name,
    shipName: r.ship_name,
    voyageNumber: r.voyage_number,
    counterpartyName: r.counterparty_name,
    racType: r.rac_type,
    relevantDate: r.relevant_date,
    assignedTo: r.assigned_to,
    status: r.status as RacStatus,
    totalAmount: r.total_amount,
    agreedAmount: r.agreed_amount,
    outstandingAmount: r.outstanding_amount,
    deadlineDate: r.deadline_date,
    description: r.description,
    notes: r.notes,
    supportingDocsCount: r.supporting_docs_count,
    claimId: r.claim_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at
  };

  if (includeRelations) {
    // Attach Calculation
    const calcRow = db.prepare("SELECT * FROM rac_calculations WHERE rac_case_id = ?").get(r.id) as any;
    if (calcRow) {
      rac.calculation = {
        id: calcRow.id,
        racCaseId: calcRow.rac_case_id,
        ruleVersion: calcRow.rule_version,
        parameters: JSON.parse(calcRow.parameters_json || "{}"),
        inputs: JSON.parse(calcRow.inputs_json || "{}"),
        adjustments: JSON.parse(calcRow.adjustments_json || "[]"),
        calculatedResult: calcRow.calculated_result,
        formulaBreakdown: JSON.parse(calcRow.formula_breakdown_json || "[]"),
        explanation: calcRow.explanation,
        calculationStatus: calcRow.calculation_status,
        reviewedBy: calcRow.reviewed_by,
        calculatedAt: calcRow.calculated_at
      };
    }

    // Attach Status History
    const histRows = db.prepare("SELECT * FROM rac_status_history WHERE rac_case_id = ? ORDER BY changed_at ASC").all(r.id) as any[];
    rac.statusHistory = histRows.map((h) => ({
      id: h.id,
      racCaseId: h.rac_case_id,
      previousStatus: h.previous_status,
      newStatus: h.new_status,
      changedBy: h.changed_by,
      changedAt: h.changed_at,
      remarks: h.remarks
    }));

    // Attach Documents
    rac.documents = getDocuments({ racCaseId: r.id });
  }

  return rac;
}

export function createRacCase(data: Partial<RacCase>, user: string): RacCase {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = data.id || `RAC-2024-${String(Date.now()).slice(-4)}`;
  const ref = data.racReference || `RAC/2024/${String(new Date().getMonth() + 1).padStart(2, "0")}/${id.split("-").pop()}`;

  db.prepare(`
    INSERT INTO rac_cases (
      id, rac_reference, client_name, ship_name, voyage_number, counterparty_name,
      rac_type, relevant_date, assigned_to, status, total_amount, agreed_amount,
      outstanding_amount, deadline_date, description, notes, supporting_docs_count,
      claim_id, created_by, created_at, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, ref, data.clientName || "Client Trading Ltd", data.shipName || "Vessel", data.voyageNumber || "VOY-2024-01",
    data.counterpartyName || "Counterparty SA", data.racType || "Demurrage Review", data.relevantDate || now.split("T")[0],
    data.assignedTo || user || "Rohit Mengane", data.status || "Draft", data.totalAmount || 0,
    data.agreedAmount || 0, data.outstandingAmount || data.totalAmount || 0, data.deadlineDate || null,
    data.description || "", data.notes || "", data.supportingDocsCount || 0, data.claimId || null,
    user, now, user, now
  );

  // Initial status history
  db.prepare(`
    INSERT INTO rac_status_history (id, rac_case_id, previous_status, new_status, changed_by, changed_at, remarks)
    VALUES (?, ?, 'Draft', ?, ?, ?, 'RAC case created')
  `).run(`hist-${id}-0`, id, data.status || "Draft", user, now);

  // Save calculation if supplied
  if (data.calculation) {
    saveRacCalculationRecord(id, data.calculation, user);
  }

  // Create notification
  createNotificationRecord({
    title: "New RAC Case Created",
    message: `RAC case ${ref} (${data.shipName}) was created and assigned to ${data.assignedTo || user}.`,
    type: "rac",
    racCaseId: id,
    racReference: ref
  });

  return getRacCaseById(id)!;
}

export function updateRacCase(id: string, updates: Partial<RacCase>, modifier: string): RacCase | null {
  const db = getDatabase();
  const existing = getRacCaseById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  // If status transition occurred, record history
  if (updates.status && updates.status !== existing.status) {
    db.prepare(`
      INSERT INTO rac_status_history (id, rac_case_id, previous_status, new_status, changed_by, changed_at, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`hist-${id}-${Date.now()}`, id, existing.status, updates.status, modifier, now, updates.notes || `Transitioned to ${updates.status}`);
  }

  db.prepare(`
    UPDATE rac_cases SET
      client_name = COALESCE(?, client_name),
      ship_name = COALESCE(?, ship_name),
      voyage_number = COALESCE(?, voyage_number),
      counterparty_name = COALESCE(?, counterparty_name),
      rac_type = COALESCE(?, rac_type),
      relevant_date = COALESCE(?, relevant_date),
      assigned_to = COALESCE(?, assigned_to),
      status = COALESCE(?, status),
      total_amount = COALESCE(?, total_amount),
      agreed_amount = COALESCE(?, agreed_amount),
      outstanding_amount = COALESCE(?, outstanding_amount),
      deadline_date = COALESCE(?, deadline_date),
      description = COALESCE(?, description),
      notes = COALESCE(?, notes),
      updated_by = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    updates.clientName ?? null,
    updates.shipName ?? null,
    updates.voyageNumber ?? null,
    updates.counterpartyName ?? null,
    updates.racType ?? null,
    updates.relevantDate ?? null,
    updates.assignedTo ?? null,
    updates.status ?? null,
    updates.totalAmount ?? null,
    updates.agreedAmount ?? null,
    updates.outstandingAmount ?? null,
    updates.deadlineDate ?? null,
    updates.description ?? null,
    updates.notes ?? null,
    modifier,
    now,
    id
  );

  if (updates.calculation) {
    saveRacCalculationRecord(id, updates.calculation, modifier);
  }

  return getRacCaseById(id);
}

export function saveRacCalculationRecord(racCaseId: string, calc: Partial<RacCalculation>, user: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = calc.id || `calc-${racCaseId}`;

  db.prepare(`
    INSERT OR REPLACE INTO rac_calculations (
      id, rac_case_id, rule_version, parameters_json, inputs_json, adjustments_json,
      calculated_result, formula_breakdown_json, explanation, calculation_status,
      reviewed_by, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    racCaseId,
    calc.ruleVersion || "1.0",
    JSON.stringify(calc.parameters || {}),
    JSON.stringify(calc.inputs || {}),
    JSON.stringify(calc.adjustments || []),
    calc.calculatedResult || 0,
    JSON.stringify(calc.formulaBreakdown || []),
    calc.explanation || "Calculation verified under standard ruleset.",
    calc.calculationStatus || "Preliminary",
    user,
    now
  );
}

// =========================================================================
// 10. CLAIM CHASERS & EMAIL MANAGEMENT
// =========================================================================

export function getChasersForClaim(claimId: string): EmailFollowup[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM email_followups WHERE claim_id = ? ORDER BY scheduled_date ASC").all(claimId) as any[];
  return rows.map((r) => ({
    id: r.id,
    claimId: r.claim_id,
    recipientEmail: r.recipient_email,
    subject: r.subject,
    templateType: r.template_type,
    body: r.body,
    status: r.status,
    daysAwaitingPayment: r.days_awaiting_payment,
    scheduledDate: r.scheduled_date,
    sentAt: r.sent_at,
    sentBy: r.sent_by,
    responseReceived: Boolean(r.response_received),
    responseNotes: r.response_notes
  }));
}

export function createChaserRecord(chaser: Partial<EmailFollowup>, sender: string): EmailFollowup {
  const db = getDatabase();
  const id = chaser.id || `chaser-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO email_followups (
      id, claim_id, recipient_email, subject, template_type, body, status,
      days_awaiting_payment, scheduled_date, sent_at, sent_by, response_received, response_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, chaser.claimId, chaser.recipientEmail, chaser.subject, chaser.templateType || "30_days_reminder",
    chaser.body, chaser.status || "Sent", chaser.daysAwaitingPayment || 0,
    chaser.scheduledDate || now.split("T")[0], chaser.sentAt || now, sender, 0, ""
  );

  return {
    id,
    claimId: chaser.claimId || "",
    recipientEmail: chaser.recipientEmail || "",
    subject: chaser.subject || "",
    templateType: chaser.templateType || "30_days_reminder",
    body: chaser.body || "",
    status: chaser.status || "Sent",
    daysAwaitingPayment: chaser.daysAwaitingPayment || 0,
    scheduledDate: chaser.scheduledDate || now.split("T")[0],
    sentAt: now,
    sentBy: sender,
    responseReceived: false,
    responseNotes: ""
  };
}

// =========================================================================
// 11. DASHBOARD ANALYTICS
// =========================================================================

export function getDashboardAnalytics(role?: UserRole, userEmail?: string): DashboardMetrics {
  const { claims } = getClaims({ role, userEmail });
  const racCases = getRacCases({ role, userEmail });

  const totalOwed = claims.reduce((acc, c) => acc + (c.claimFiledAmount || 0), 0);
  const totalReceived = claims.reduce((acc, c) => acc + (c.paymentReceived || 0), 0);
  const totalExposure = Math.max(totalOwed - totalReceived, 0);

  const underContention = claims
    .filter((c) => isStatusUnderContention(c.claimStatus))
    .reduce((acc, c) => acc + (c.claimFiledAmount || 0), 0);

  const openCount = claims.filter((c) => !c.claimClosed).length;
  const settledCount = claims.filter((c) => c.claimStatus === "Settled").length;
  const timebarredCount = claims.filter((c) => c.timebarred || c.claimStatus === "Timebarred").length;

  const totalDays = claims.reduce((acc, c) => acc + (c.daysOpen || 0), 0);
  const avgProcessingTime = claims.length > 0 ? Math.round(totalDays / claims.length) : 0;
  const avgDemurrage = claims.length > 0 ? Math.round(totalOwed / claims.length) : 0;

  // Status Distribution
  const statuses: ClaimStatus[] = ["Submitted", "Review", "Incomplete", "Settled", "Disputed", "Timebarred"];
  const colorMap: Record<ClaimStatus, string> = {
    Submitted: "#3B82F6",
    Review: "#F59E0B",
    Incomplete: "#6B7280",
    Settled: "#10B981",
    Disputed: "#EF4444",
    Timebarred: "#8B5CF6"
  };

  const statusDistribution = statuses.map((st) => {
    const matching = claims.filter((c) => c.claimStatus === st);
    const count = matching.length;
    const value = matching.reduce((acc, c) => acc + (c.claimFiledAmount || 0), 0);
    return { status: st, count, value, color: colorMap[st] };
  });

  // Client Exposure
  const clientMap = new Map<string, { exposure: number; claimCount: number }>();
  for (const c of claims) {
    const cur = clientMap.get(c.accountName) || { exposure: 0, claimCount: 0 };
    cur.exposure += Math.max((c.claimFiledAmount || 0) - (c.paymentReceived || 0), 0);
    cur.claimCount += 1;
    clientMap.set(c.accountName, cur);
  }

  const clientExposure = Array.from(clientMap.entries())
    .map(([client, data]) => ({ client, exposure: data.exposure, claimCount: data.claimCount }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 6);

  // Demurrage Trend
  const demurrageTrend = [
    { month: "Mar 24", filed: 320000, received: 180000, agreed: 210000 },
    { month: "Apr 24", filed: 410000, received: 290000, agreed: 340000 },
    { month: "May 24", filed: 530000, received: 380000, agreed: 420000 },
    { month: "Jun 24", filed: 620000, received: 450000, agreed: 490000 },
    { month: "Jul 24", filed: 780000, received: 560000, agreed: 610000 },
    { month: "Aug 24", filed: totalOwed, received: totalReceived, agreed: Math.round(totalReceived * 1.1) }
  ];

  // Payment Aging
  const paymentAging = [
    { bracket: "0-30 Days", amount: 185000, count: 4 },
    { bracket: "31-60 Days", amount: 240000, count: 3 },
    { bracket: "61-90 Days", amount: 142000, count: 2 },
    { bracket: "90+ Days (Escalated)", amount: 215000, count: 1 }
  ];

  // RAC Metrics
  const totalRacAmount = racCases.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
  const agreedRacAmount = racCases.reduce((acc, r) => acc + (r.agreedAmount || 0), 0);
  const outstandingRacAmount = racCases.reduce((acc, r) => acc + (r.outstandingAmount || 0), 0);

  const racStatusDist = ["Draft", "Submitted", "Under Review", "Correction Required", "Reviewed", "Closed"].map((st) => {
    const m = racCases.filter((r) => r.status === st);
    return { status: st as RacStatus, count: m.length, value: m.reduce((a, r) => a + r.totalAmount, 0), color: "#3B82F6" };
  });

  const racTypeDist = [
    { type: "Demurrage Review" as any, count: 1, value: 48500 },
    { type: "Pumping Warranty Contention" as any, count: 1, value: 62400 },
    { type: "Additional Port Costs" as any, count: 1, value: 31200 },
    { type: "Berth Allocation Audit" as any, count: 1, value: 19800 },
    { type: "Special Cargo Handling" as any, count: 1, value: 54000 }
  ];

  const racMetrics: RacDashboardMetrics = {
    totalCases: racCases.length,
    openCases: racCases.filter((r) => r.status !== "Closed").length,
    closedCases: racCases.filter((r) => r.status === "Closed").length,
    pendingReviewCases: racCases.filter((r) => r.status === "Under Review" || r.status === "Submitted").length,
    correctionRequiredCases: racCases.filter((r) => r.status === "Correction Required").length,
    assignedCasesCount: racCases.filter((r) => r.assignedTo).length,
    totalRacAmount,
    agreedRacAmount,
    outstandingRacAmount,
    approachingDeadlineCount: 2,
    statusDistribution: racStatusDist,
    typeDistribution: racTypeDist,
    clientExposure: [
      { client: "Glencore International AG", amount: 62400, caseCount: 1 },
      { client: "Gunvor Group", amount: 54000, caseCount: 1 },
      { client: "Trafigura Trading Pte Ltd", amount: 48500, caseCount: 1 },
      { client: "Shell Global Eastern", amount: 31200, caseCount: 1 }
    ]
  };

  return {
    totalDemurrageOwed: totalOwed,
    totalDemurrageReceived: totalReceived,
    totalExposure,
    amountUnderContention: underContention,
    averageProcessingTimeDays: avgProcessingTime,
    averageDemurragePerClaim: avgDemurrage,
    totalClaimsCount: claims.length,
    settledClaimsCount: settledCount,
    timebarredClaimsCount: timebarredCount,
    openClaimsCount: openCount,
    claimsAwaitingAction: claims.filter((c) => c.claimStatus === "Submitted" || c.claimStatus === "Incomplete").length,
    claimsAwaitingDocs: claims.filter((c) => c.claimStatus === "Incomplete").length,
    unreadNotifications: 3,
    pendingActions: 5,
    statusDistribution,
    demurrageTrend,
    clientExposure,
    paymentAging,
    racMetrics
  };
}

// =========================================================================
// 12. BUSINESS RULES & SETTINGS
// =========================================================================

export function getBusinessRule(key: string): any {
  const meta = getBusinessRuleMeta(key);
  return meta ? meta.value : null;
}

export function getBusinessRuleMeta(key: string): { value: any; updatedAt: string } | null {
  const db = getDatabase();
  const row = db.prepare("SELECT value_json, updated_at FROM business_rules WHERE key = ?").get(key) as any;
  if (!row) return null;
  try {
    return { value: JSON.parse(row.value_json), updatedAt: row.updated_at };
  } catch (e) {
    return null;
  }
}

export function saveBusinessRule(key: string, value: any, user: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `rule_${key}`;
  db.prepare(`
    INSERT OR REPLACE INTO business_rules (id, key, value_json, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, key, JSON.stringify(value), user, now);
}
