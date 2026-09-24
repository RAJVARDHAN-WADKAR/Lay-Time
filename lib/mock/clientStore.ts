import {
  Claim,
  DocumentRecord,
  NotificationRecord,
  RacCase,
  User,
  CalculationAssumptions,
  OwnerComparison,
  EmailFollowup,
  SoFActivity,
  Port,
  DeductionItem
} from "@/lib/types";
import { SEED_DEMO_CLAIMS, SEED_DEMO_DOCUMENTS } from "./data";
import { MOCK_USERS } from "./users";

const STORAGE_KEY = "laytime_client_store_v2";

export interface StoreState {
  claims: Claim[];
  documents: DocumentRecord[];
  notifications: NotificationRecord[];
  racCases: RacCase[];
  users: User[];
  settings: CalculationAssumptions;
  ownerComparisons: Record<string, OwnerComparison>;
  claimChasers: Record<string, EmailFollowup[]>;
}

const DEFAULT_SETTINGS: CalculationAssumptions = {
  laytimeRule: "OOD_AOD",
  weekendRule: "SHEX",
  noticeGracePeriodHours: 6,
  currency: "USD",
  roundingPrecisionMinutes: 1,
  ocrConfidenceThreshold: 0.8,
  applyWeatherWorkingDay24CH: true,
  defaultDemurrageRate: 25000,
  defaultDespatchRate: 12500,
  workingHours: "24 Hours SHINC",
  companyName: "Global Maritime Logistics & Laytime Management",
  companyAddress: "Marine Square, Port District, Rotterdam",
  companyContact: "claims@maritime-ops.com",
  companyPhone: "+31 10 555 0199"
};

const DEFAULT_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: "notif-1",
    title: "Time-Bar Approaching (15 Days)",
    message: "Claim CLM-2024-001 (MV Ocean Titan) has 15 days remaining before notice time-bar expiration.",
    type: "timebar",
    claimId: "CLM-2024-001",
    claimName: "MV Ocean Titan",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "notif-2",
    title: "Supervisor Review Required",
    message: "Claim CLM-2024-002 (MV Nordic Voyager) has been submitted and requires supervisor approval.",
    type: "claim",
    claimId: "CLM-2024-002",
    claimName: "MV Nordic Voyager",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "notif-3",
    title: "Supporting Document Missing",
    message: "Notice of Readiness (NOR) is missing for MT Pacific Glory (CLM-2024-003).",
    type: "document",
    claimId: "CLM-2024-003",
    claimName: "MT Pacific Glory",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "notif-4",
    title: "RAC Finding: Deductions Discrepancy",
    message: "RAC engine detected $17,400 variation between Owner calculation and internal calculation.",
    type: "rac",
    claimId: "CLM-2024-002",
    claimName: "MV Nordic Voyager",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: "notif-5",
    title: "Payment Pending Reminder",
    message: "Settled claim payment of $92,000 for Shell Global Eastern is now 18 days awaiting receipt.",
    type: "claim",
    claimId: "CLM-2024-003",
    claimName: "MT Pacific Glory",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: "notif-6",
    title: "OCR Extraction Complete",
    message: "Antwerp Grain Terminal Statement of Facts parsed with 5 activities and 2 confidence flags.",
    type: "document",
    claimId: "CLM-2024-004",
    claimName: "MV Baltic Trader",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
  }
];

const DEFAULT_RAC_CASES: RacCase[] = [
  {
    id: "RAC-2024-001",
    racReference: "RAC/ROT/2024/01",
    clientName: "Trafigura Trading Pte Ltd",
    shipName: "MV Ocean Titan",
    voyageNumber: "VOY-2024-01A",
    counterpartyName: "Trafigura Trading SA",
    racType: "Demurrage Review",
    relevantDate: "2024-07-15",
    assignedTo: "Sarah Jenkins",
    status: "Under Review",
    totalAmount: 114500,
    agreedAmount: 0,
    outstandingAmount: 114500,
    deadlineDate: "2024-10-15",
    claimId: "CLM-2024-001",
    description: "Review of rain delay deductions under BPVOY4 Clause 17 and NOR grace period calculation.",
    notes: "Owner claimed 100% time counted during rain; charterer claims 50% deduction.",
    supportingDocsCount: 3,
    createdBy: "Sarah Jenkins",
    createdAt: "2024-07-16T10:00:00Z",
    updatedBy: "Sarah Jenkins",
    updatedAt: "2024-07-20T14:30:00Z"
  },
  {
    id: "RAC-2024-002",
    racReference: "RAC/SGP/2024/02",
    clientName: "Glencore International AG",
    shipName: "MV Nordic Voyager",
    voyageNumber: "VOY-2024-02A",
    counterpartyName: "Glencore Trading SA",
    racType: "Additional Port Costs",
    relevantDate: "2024-07-12",
    assignedTo: "Sarah Jenkins",
    status: "Submitted",
    totalAmount: 182400,
    agreedAmount: 165000,
    outstandingAmount: 17400,
    deadlineDate: "2024-10-10",
    claimId: "CLM-2024-002",
    description: "Multi-berth prorata allocation review across Jurong Island Berth 3 and 4.",
    notes: "Prorata split 60/40 confirmed based on bill of lading cargo volumes.",
    supportingDocsCount: 4,
    createdBy: "Sarah Jenkins",
    createdAt: "2024-07-14T08:00:00Z",
    updatedBy: "Elena Rostova",
    updatedAt: "2024-07-25T11:20:00Z"
  },
  {
    id: "RAC-2024-003",
    racReference: "RAC/HOU/2024/03",
    clientName: "Shell Global Eastern",
    shipName: "MT Pacific Glory",
    voyageNumber: "VOY-2024-03A",
    counterpartyName: "Shell Trading SA",
    racType: "Pumping Warranty Contention",
    relevantDate: "2024-06-25",
    assignedTo: "Marcus Aurelius",
    status: "Reviewed",
    totalAmount: 98400,
    agreedAmount: 92000,
    outstandingAmount: 0,
    deadlineDate: "2024-09-20",
    claimId: "CLM-2024-003",
    description: "Pumping warranty audit: 100 PSI pressure benchmark maintained throughout discharge.",
    notes: "Settled and agreed at $92,000. Full payment processed.",
    supportingDocsCount: 5,
    createdBy: "Marcus Aurelius",
    createdAt: "2024-06-28T09:30:00Z",
    updatedBy: "Elena Rostova",
    updatedAt: "2024-07-28T16:00:00Z"
  },
  {
    id: "RAC-2024-004",
    racReference: "RAC/ANR/2024/04",
    clientName: "Cargill International SA",
    shipName: "MV Baltic Trader",
    voyageNumber: "VOY-2024-04A",
    counterpartyName: "Cargill Trading SA",
    racType: "Berth Allocation Audit",
    relevantDate: "2024-08-01",
    assignedTo: "Sarah Jenkins",
    status: "Correction Required",
    totalAmount: 64200,
    agreedAmount: 0,
    outstandingAmount: 64200,
    deadlineDate: "2024-11-01",
    claimId: "CLM-2024-004",
    description: "OCR discrepancy in Statement of Facts: Stop time precedes start time on 26 July.",
    notes: "Requires manual confirmation of berth timestamps before submitting to charterer.",
    supportingDocsCount: 2,
    createdBy: "Sarah Jenkins",
    createdAt: "2024-08-02T14:15:00Z",
    updatedBy: "Sarah Jenkins",
    updatedAt: "2024-08-05T09:00:00Z"
  },
  {
    id: "RAC-2024-005",
    racReference: "RAC/KSA/2024/05",
    clientName: "BP Maritime",
    shipName: "MT Aegean Horizon",
    voyageNumber: "VOY-2024-05A",
    counterpartyName: "BP Trading SA",
    racType: "Detention / Shifting Dispute",
    relevantDate: "2024-03-15",
    assignedTo: "Marcus Aurelius",
    status: "Closed",
    totalAmount: 215000,
    agreedAmount: 0,
    outstandingAmount: 0,
    deadlineDate: "2024-06-15",
    claimId: "CLM-2024-005",
    description: "Time-bar rejection: Claim submitted on day 104, exceeding 90-day C/P clause limit.",
    notes: "Claim closed as unrecoverable due to charterparty timebar expiration.",
    supportingDocsCount: 3,
    createdBy: "Marcus Aurelius",
    createdAt: "2024-03-20T11:00:00Z",
    updatedBy: "Elena Rostova",
    updatedAt: "2024-06-30T17:00:00Z"
  }
];

function getInitialState(): StoreState {
  return {
    claims: JSON.parse(JSON.stringify(SEED_DEMO_CLAIMS)),
    documents: JSON.parse(JSON.stringify(SEED_DEMO_DOCUMENTS)),
    notifications: JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS)),
    racCases: JSON.parse(JSON.stringify(DEFAULT_RAC_CASES)),
    users: JSON.parse(JSON.stringify(MOCK_USERS)),
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    ownerComparisons: {
      "CLM-2024-001": {
        claimId: "CLM-2024-001",
        ownerDemurrageAmount: 132000,
        ownerLaytimeHours: 99,
        internalDemurrageAmount: 114500,
        internalLaytimeHours: 85.8,
        differenceAmount: 17500,
        differenceHours: 13.2,
        explanation: "Owner did not deduct 50% rain delay under BPVOY4 Clause 17 and included 6h NOR grace period as laytime used."
      },
      "CLM-2024-002": {
        claimId: "CLM-2024-002",
        ownerDemurrageAmount: 198000,
        ownerLaytimeHours: 166.7,
        internalDemurrageAmount: 182400,
        internalLaytimeHours: 153.6,
        differenceAmount: 15600,
        differenceHours: 13.1,
        explanation: "Owner applied 100% time across both berths instead of 60/40 prorata volume ratio."
      },
      "CLM-2024-003": {
        claimId: "CLM-2024-003",
        ownerDemurrageAmount: 98400,
        ownerLaytimeHours: 98.4,
        internalDemurrageAmount: 92000,
        internalLaytimeHours: 92.0,
        differenceAmount: 6400,
        differenceHours: 6.4,
        explanation: "Reconciled and settled with Shell Global Eastern at $92,000."
      }
    },
    claimChasers: {
      "CLM-2024-001": [
        {
          id: "chaser-1",
          claimId: "CLM-2024-001",
          recipientEmail: "claims@trafigura.com",
          subject: "Demurrage Claim CLM-2024-001 - MV Ocean Titan - Statement of Facts Follow-Up",
          templateType: "30_days_reminder",
          body: "Dear Trafigura Demurrage Desk,\n\nPlease find attached our calculation for MV Ocean Titan. Note that the 90-day time-bar period is active.",
          status: "Sent",
          daysAwaitingPayment: 18,
          scheduledDate: "2024-08-01",
          sentAt: "2024-08-02T10:15:00Z",
          sentBy: "Sarah Jenkins"
        }
      ]
    }
  };
}

let inMemoryState: StoreState | null = null;

function loadState(): StoreState {
  if (typeof window === "undefined") {
    if (!inMemoryState) {
      inMemoryState = getInitialState();
    }
    return inMemoryState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.claims) && parsed.claims.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read localStorage, falling back to defaults:", e);
  }

  const initial = getInitialState();
  saveState(initial);
  return initial;
}

function saveState(state: StoreState): void {
  inMemoryState = state;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new Event("demurrage_storage_change"));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }
}

export function resetClientStore(): StoreState {
  const initial = getInitialState();
  saveState(initial);
  return initial;
}

export function getStoreClaims(params?: {
  status?: string;
  claimType?: string;
  client?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Claim[] {
  const state = loadState();
  let result = [...state.claims];

  if (params?.status && params.status !== "ALL" && params.status !== "All") {
    result = result.filter((c) => c.claimStatus === params.status);
  }
  if (params?.claimType && params.claimType !== "ALL" && params.claimType !== "All") {
    result = result.filter((c) => c.claimType === params.claimType);
  }
  if (params?.client && params.client !== "ALL" && params.client !== "All") {
    result = result.filter((c) => c.accountName === params.client);
  }
  if (params?.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    result = result.filter(
      (c) =>
        c.id?.toLowerCase().includes(q) ||
        c.shipName?.toLowerCase().includes(q) ||
        c.claimName?.toLowerCase().includes(q) ||
        c.accountName?.toLowerCase().includes(q)
    );
  }

  return result;
}

export function getStoreClaimById(id: string): Claim | null {
  const state = loadState();
  const found = state.claims.find((c) => c.id === id);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

export function createStoreClaim(data: Partial<Claim>): Claim {
  const state = loadState();
  const nextNum = state.claims.length + 1;
  const newId = `CLM-2024-${String(nextNum).padStart(3, "0")}`;

  const newClaim: Claim = {
    id: newId,
    claimName: data.claimName || `${data.shipName || "Vessel"} Demurrage Claim`,
    accountName: data.accountName || "Charterer Account",
    brokerName: data.brokerName || "Direct",
    claimStatus: data.claimStatus || "Submitted",
    claimType: data.claimType || "Discharge Port Demurrage",
    shipName: data.shipName || "MV New Vessel",
    cpType: data.cpType || "BPVOY4",
    voyageNumber: data.voyageNumber || `VOY-2024-${nextNum}`,
    assignedTo: data.assignedTo || "Sarah Jenkins",
    daysOpen: 0,
    claimClosed: false,
    contentions: data.contentions || "",
    claimNotes: data.claimNotes || "",
    documentLinks: data.documentLinks || ["SOF_Upload.pdf"],
    demurrageRatePerDay: Number(data.demurrageRatePerDay) || 25000,
    counterpartyName: data.counterpartyName || data.accountName || "Counterparty",
    counterpartyType: data.counterpartyType || "Charterer",
    claimFiledAmount: Number(data.claimFiledAmount) || 0,
    receivedClaimAmount: 0,
    agreedAmount: 0,
    billableAmount: Number(data.claimFiledAmount) || 0,
    paymentReceived: 0,
    paymentConcluded: false,
    layday: data.layday || new Date().toISOString().split("T")[0],
    cancellingDate: data.cancellingDate || "",
    voyageEndDate: data.voyageEndDate || "",
    instructionReceivedDate: data.instructionReceivedDate || "",
    noticeReceivedDate: data.noticeReceivedDate || "",
    claimReceivedDate: data.claimReceivedDate || new Date().toISOString().split("T")[0],
    noticeTimebarDays: Number(data.noticeTimebarDays) || 30,
    claimTimebarDays: Number(data.claimTimebarDays) || 90,
    timebarred: false,
    charterpartyDate: data.charterpartyDate || "",
    daysAwaitingPayment: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ports: data.ports || [
      {
        id: `port-${Date.now()}`,
        claimId: newId,
        name: "Discharge Port Terminal",
        portType: "Discharge Port",
        loadRate: 40000,
        berths: [
          {
            id: `berth-${Date.now()}`,
            portId: `port-${Date.now()}`,
            name: "Main Jetty Berth 1",
            quantity: 50000,
            prorataShare: 100,
            loadRate: 40000,
            cargoType: "Crude Oil"
          }
        ]
      }
    ],
    activities: data.activities || [],
    deductions: data.deductions || []
  };

  state.claims.unshift(newClaim);

  state.notifications.unshift({
    id: `notif-${Date.now()}`,
    title: `New Claim Created: ${newClaim.id}`,
    message: `Claim for ${newClaim.shipName} (${newClaim.accountName}) has been created and registered in the ledger.`,
    type: "claim",
    claimId: newClaim.id,
    claimName: newClaim.claimName,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveState(state);
  return newClaim;
}

export function updateStoreClaim(id: string, updates: Partial<Claim>): Claim {
  const state = loadState();
  const idx = state.claims.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Claim ${id} not found`);

  const existing = state.claims[idx];
  const updated: Claim = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  state.claims[idx] = updated;
  saveState(state);
  return updated;
}

export function deleteStoreClaim(id: string): boolean {
  const state = loadState();
  const prevCount = state.claims.length;
  state.claims = state.claims.filter((c) => c.id !== id);
  if (state.claims.length < prevCount) {
    saveState(state);
    return true;
  }
  return false;
}

export function addStoreActivity(claimId: string, activity: Omit<SoFActivity, "id">): Claim {
  const state = loadState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) throw new Error("Claim not found");

  const newAct: SoFActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    claimId
  };

  claim.activities = [...(claim.activities || []), newAct];
  claim.updatedAt = new Date().toISOString();
  saveState(state);
  return claim;
}

export function updateStoreActivity(claimId: string, activityId: string, updates: Partial<SoFActivity>): Claim {
  const state = loadState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) throw new Error("Claim not found");

  claim.activities = (claim.activities || []).map((a) =>
    a.id === activityId ? { ...a, ...updates, isCorrected: true } : a
  );
  claim.updatedAt = new Date().toISOString();
  saveState(state);
  return claim;
}

export function deleteStoreActivity(claimId: string, activityId: string): Claim {
  const state = loadState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) throw new Error("Claim not found");

  claim.activities = (claim.activities || []).filter((a) => a.id !== activityId);
  claim.updatedAt = new Date().toISOString();
  saveState(state);
  return claim;
}

export function getStoreDocuments(filter?: { claimId?: string; racCaseId?: string }): DocumentRecord[] {
  const state = loadState();
  let docs = [...state.documents];
  if (filter?.claimId) {
    docs = docs.filter((d) => d.claimId === filter.claimId);
  }
  if (filter?.racCaseId) {
    docs = docs.filter((d) => d.racCaseId === filter.racCaseId);
  }
  return docs;
}

export function getStoreDocumentById(id: string): DocumentRecord | null {
  const state = loadState();
  const found = state.documents.find((d) => d.id === id);
  return found || null;
}

export function addStoreDocument(doc: Partial<DocumentRecord>): DocumentRecord {
  const state = loadState();
  const newDoc: DocumentRecord = {
    id: `doc-${Date.now()}`,
    fileName: doc.fileName || "Uploaded_Document.pdf",
    fileSize: doc.fileSize || 1024000,
    fileType: doc.fileType || "application/pdf",
    claimId: doc.claimId,
    claimName: doc.claimName,
    racCaseId: doc.racCaseId,
    category: doc.category || "SOF",
    type: doc.type || doc.category || "SOF",
    version: "1.0",
    uploadedBy: doc.uploadedBy || "Current User",
    uploadedAt: new Date().toISOString(),
    status: "Uploaded",
    ocrConfidence: 0.94,
    extractedItemsCount: 6
  };

  state.documents.unshift(newDoc);
  saveState(state);
  return newDoc;
}

export function deleteStoreDocument(id: string): boolean {
  const state = loadState();
  const prevCount = state.documents.length;
  state.documents = state.documents.filter((d) => d.id !== id);
  if (state.documents.length < prevCount) {
    saveState(state);
    return true;
  }
  return false;
}

export function updateStoreDocumentStatus(id: string, status: DocumentRecord["status"]): DocumentRecord {
  const state = loadState();
  const doc = state.documents.find((d) => d.id === id);
  if (!doc) throw new Error("Document not found");
  doc.status = status;
  doc.modifiedAt = new Date().toISOString();
  saveState(state);
  return doc;
}

export function getStoreNotifications(): NotificationRecord[] {
  const state = loadState();
  return state.notifications;
}

export function markStoreAllNotificationsRead(): void {
  const state = loadState();
  state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
  saveState(state);
}

export function markStoreNotificationRead(id: string): void {
  const state = loadState();
  const notif = state.notifications.find((n) => n.id === id);
  if (notif) {
    notif.isRead = true;
    saveState(state);
  }
}

export function deleteStoreNotification(id: string): boolean {
  const state = loadState();
  const prev = state.notifications.length;
  state.notifications = state.notifications.filter((n) => n.id !== id);
  if (state.notifications.length < prev) {
    saveState(state);
    return true;
  }
  return false;
}

export function clearStoreAllNotifications(): boolean {
  const state = loadState();
  state.notifications = [];
  saveState(state);
  return true;
}

export function createStoreNotification(notif: Partial<NotificationRecord>): NotificationRecord {
  const state = loadState();
  const newNotif: NotificationRecord = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: notif.title || "Notification",
    message: notif.message || "",
    type: notif.type || "system",
    claimId: notif.claimId,
    claimName: notif.claimName,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  state.notifications.unshift(newNotif);
  saveState(state);
  return newNotif;
}

export function getStoreRacCases(params?: {
  status?: string;
  racType?: string;
  client?: string;
  claimId?: string;
  search?: string;
}): RacCase[] {
  const state = loadState();
  let cases = [...state.racCases];

  if (params?.status && params.status !== "All" && params.status !== "ALL") {
    cases = cases.filter((c) => c.status === params.status);
  }
  if (params?.racType && params.racType !== "All" && params.racType !== "ALL") {
    cases = cases.filter((c) => c.racType === params.racType);
  }
  if (params?.client && params.client !== "All" && params.client !== "ALL") {
    cases = cases.filter((c) => c.clientName === params.client);
  }
  if (params?.claimId) {
    cases = cases.filter((c) => c.claimId === params.claimId);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    cases = cases.filter(
      (c) =>
        c.racReference.toLowerCase().includes(q) ||
        c.shipName.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q)
    );
  }

  return cases;
}

export function getStoreRacCaseById(id: string): RacCase | null {
  const state = loadState();
  const found = state.racCases.find((c) => c.id === id || c.racReference === id);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

export function createStoreRacCase(data: Partial<RacCase>): RacCase {
  const state = loadState();
  const num = state.racCases.length + 1;
  const newRac: RacCase = {
    id: `RAC-2024-${String(num).padStart(3, "0")}`,
    racReference: data.racReference || `RAC/REF/2024/${num}`,
    clientName: data.clientName || "Charterer Account",
    shipName: data.shipName || "MV Ship",
    voyageNumber: data.voyageNumber || `VOY-2024-${num}`,
    counterpartyName: data.counterpartyName || data.clientName || "Counterparty",
    racType: data.racType || "Demurrage Review",
    relevantDate: data.relevantDate || new Date().toISOString().split("T")[0],
    assignedTo: data.assignedTo || "Sarah Jenkins",
    status: data.status || "Under Review",
    totalAmount: Number(data.totalAmount) || 50000,
    agreedAmount: Number(data.agreedAmount) || 0,
    outstandingAmount: Number(data.totalAmount) || 50000,
    deadlineDate: data.deadlineDate || "",
    description: data.description || "Recoverable Additional Costs Review",
    notes: data.notes || "",
    supportingDocsCount: data.supportingDocsCount || 1,
    claimId: data.claimId,
    createdBy: "Current User",
    createdAt: new Date().toISOString(),
    updatedBy: "Current User",
    updatedAt: new Date().toISOString()
  };

  state.racCases.unshift(newRac);
  saveState(state);
  return newRac;
}

export function updateStoreRacCase(id: string, updates: Partial<RacCase>): RacCase {
  const state = loadState();
  const idx = state.racCases.findIndex((c) => c.id === id || c.racReference === id);
  if (idx === -1) throw new Error("RAC case not found");

  const existing = state.racCases[idx];
  const updated: RacCase = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  state.racCases[idx] = updated;
  saveState(state);
  return updated;
}

export function deleteStoreRacCase(id: string): boolean {
  const state = loadState();
  const prev = state.racCases.length;
  state.racCases = state.racCases.filter((c) => c.id !== id && c.racReference !== id);
  if (state.racCases.length < prev) {
    saveState(state);
    return true;
  }
  return false;
}

export function getStoreUsers(): User[] {
  const state = loadState();
  return state.users;
}

export function updateStoreUser(id: string, updates: Partial<User>): User {
  const state = loadState();
  const idx = state.users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const updated: User = {
    ...state.users[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  state.users[idx] = updated;
  saveState(state);
  return updated;
}

export function getStoreSettings(): CalculationAssumptions {
  const state = loadState();
  return state.settings;
}

export function updateStoreSettings(settings: Partial<CalculationAssumptions>): CalculationAssumptions {
  const state = loadState();
  state.settings = {
    ...state.settings,
    ...settings
  };
  saveState(state);
  return state.settings;
}

export function getStoreOwnerComparison(claimId: string): OwnerComparison | undefined {
  const state = loadState();
  if (state.ownerComparisons[claimId]) {
    return state.ownerComparisons[claimId];
  }

  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return undefined;

  const filed = claim.claimFiledAmount || 50000;
  const ownerDemurrage = Math.round(filed * 1.15);
  const diff = ownerDemurrage - filed;

  return {
    claimId,
    ownerDemurrageAmount: ownerDemurrage,
    ownerLaytimeHours: Math.round((ownerDemurrage / (claim.demurrageRatePerDay || 25000)) * 24),
    internalDemurrageAmount: filed,
    internalLaytimeHours: Math.round((filed / (claim.demurrageRatePerDay || 25000)) * 24),
    differenceAmount: diff,
    differenceHours: Math.round((diff / (claim.demurrageRatePerDay || 25000)) * 24),
    explanation: "Owner did not apply rain deductions and disputed 6h NOR notice allowance clause."
  };
}

export function saveStoreOwnerComparison(claimId: string, comp: Partial<OwnerComparison>): OwnerComparison {
  const state = loadState();
  const existing = state.ownerComparisons[claimId] || {
    claimId,
    ownerDemurrageAmount: 0,
    ownerLaytimeHours: 0,
    internalDemurrageAmount: 0,
    internalLaytimeHours: 0,
    differenceAmount: 0,
    differenceHours: 0,
    explanation: ""
  };

  const updated: OwnerComparison = {
    ...existing,
    ...comp,
    claimId,
    updatedAt: new Date().toISOString()
  };

  state.ownerComparisons[claimId] = updated;
  saveState(state);
  return updated;
}

export function getStoreClaimChasers(claimId: string): EmailFollowup[] {
  const state = loadState();
  return state.claimChasers[claimId] || [];
}

export function sendStoreClaimChaser(claimId: string, chaser: Partial<EmailFollowup>): EmailFollowup {
  const state = loadState();
  const list = state.claimChasers[claimId] || [];

  const newChaser: EmailFollowup = {
    id: `chaser-${Date.now()}`,
    claimId,
    recipientEmail: chaser.recipientEmail || "counterparty@shipping.com",
    subject: chaser.subject || "Laytime Demurrage Claim Follow-Up",
    templateType: chaser.templateType || "30_days_reminder",
    body: chaser.body || "",
    status: "Sent",
    daysAwaitingPayment: chaser.daysAwaitingPayment || 15,
    scheduledDate: new Date().toISOString().split("T")[0],
    sentAt: new Date().toISOString(),
    sentBy: chaser.sentBy || "Sarah Jenkins"
  };

  list.unshift(newChaser);
  state.claimChasers[claimId] = list;
  saveState(state);
  return newChaser;
}
