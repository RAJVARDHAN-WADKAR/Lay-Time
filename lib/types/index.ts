export type UserRole = "Admin" | "Claim Processor" | "Supervisor" | "Viewer" | "Reviewer";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  avatar?: string;
  assignedClaimsCount?: number;
  status: "Active" | "Inactive";
  createdAt: string;
  demoPassword?: string;
  roleDescription?: string;
}

export type ClaimStatus =
  | "Submitted"
  | "Incomplete"
  | "Review"
  | "Settled"
  | "Disputed"
  | "Timebarred";

export type ClaimType =
  | "Load Port Demurrage"
  | "Discharge Port Demurrage"
  | "Combined Demurrage"
  | "Despatch"
  | "Detention";

export type CPType =
  | "GENCON"
  | "ASBATANKVOY"
  | "NYPE"
  | "BIMCO"
  | "BPVOY4"
  | "SHELLVOY6"
  | "Other";

export type CounterpartyType =
  | "Owner"
  | "Charterer"
  | "Trader"
  | "Receiver"
  | "Shipper";

export type DeductionCategory =
  | "Weather Delay"
  | "Weather"
  | "Rain"
  | "Shore Breakdown"
  | "Crew Change"
  | "Idle Time"
  | "Shifting"
  | "Waiting for berth"
  | "Equipment breakdown"
  | "Port closure"
  | "Strike"
  | "Holiday"
  | "Other"
  | "Others"
  | "Custom";

export interface Berth {
  id: string;
  portId: string;
  name: string;
  quantity: number; // metric tons / bbls / cbm
  prorataShare: number; // percentage, e.g. 50 or 100
  isProrataOverridden?: boolean;
  loadRate: number; // MT per day / hour
  cargoType?: string;
}

export interface Port {
  id: string;
  claimId: string;
  name: string;
  portType: "Load Port" | "Discharge Port";
  loadRate: number; // MT per day
  berths: Berth[];
}

export interface SoFActivity {
  id: string;
  claimId: string;
  portId?: string;
  berthId?: string;
  activityName: string;
  startTime: string; // ISO datetime or YYYY-MM-DDTHH:mm
  stopTime: string; // ISO datetime or YYYY-MM-DDTHH:mm
  durationMinutes: number; // computed
  durationFormatted: string; // e.g. "1d 04h 30m"
  percentageCounted: number; // 0 to 100
  prorata: number; // 0 to 100
  deductionCategory: DeductionCategory;
  remarks?: string;
  isOcrExtracted?: boolean;
  isCorrected?: boolean;
  ocrConfidence?: number; // 0.0 - 1.0 (e.g. 0.95 = 95%)
  originalOcrValues?: {
    activityName?: string;
    startTime?: string;
    stopTime?: string;
    percentageCounted?: number;
    deductionCategory?: string;
    berthId?: string;
  };
}

export interface DeductionItem {
  id: string;
  claimId?: string;
  type: string; // Weather Delay, Shore Breakdown, Crew Change, Others, Idle Time, etc.
  startTime: string;
  stopTime: string;
  percentageTime: number; // % Time (0-100)
  prorata: number; // Prorata % (0-100)
  deductionHours: number; // computed deduction (hrs)
  remarks?: string;
}

export interface Discrepancy {
  id: string;
  claimId: string;
  activityId?: string;
  type:
    | "start_after_stop"
    | "missing_activity"
    | "missing_berth"
    | "missing_port"
    | "duplicate_activity"
    | "invalid_date"
    | "impossible_duration"
    | "conflicting_timestamps"
    | "invalid_sequence"
    | "low_confidence";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  field?: string;
  currentValue?: string;
  suggestedValue?: string;
  isResolved: boolean;
  resolvedAt?: string;
}

export interface Claim {
  // Primary Identifiers & General Info
  id: string;
  claimName: string; // "Claim Name"
  accountName: string; // "Account / Client Name"
  brokerName: string; // "Broker Name"
  claimStatus: ClaimStatus; // "Claim Status"
  claimType: ClaimType; // "Claim Type"
  shipName: string; // "Ship Name"
  cpType: CPType; // "CP Type"
  voyageNumber?: string;
  assignedTo: string; // User ID or name

  // Tracking & Notes
  daysOpen: number; // "Days Open"
  claimClosed: boolean; // "Claim Closed"
  contentions?: string; // "Contentions"
  claimNotes?: string; // "Claim Notes"
  documentLinks?: string[]; // "Document Links"

  // Financials
  demurrageRatePerDay: number; // "Demurrage Rate (USD)"
  counterpartyName?: string; // "Counterparty Name"
  counterpartyType?: CounterpartyType; // "Counterparty Type"
  claimFiledAmount: number; // "Claim Filed Amount (USD)"
  receivedClaimAmount?: number; // "Received Claim Amount"
  agreedAmount?: number; // "Agreed Amount"
  billableAmount?: number; // "Billable Amount"
  paymentReceived?: number; // "Payment Received"
  paymentConcluded?: boolean; // "Payment Concluded"

  // Key Operational Dates
  layday?: string; // "Layday"
  cancellingDate?: string; // "Cancelling Date"
  voyageEndDate?: string; // "Voyage End Date"
  instructionReceivedDate?: string; // "Instruction Received Date"
  noticeReceivedDate?: string; // "Notice Received Date"
  claimReceivedDate?: string; // "Claim Received Date"

  // Timebar Management
  noticeTimebarDays?: number; // "Notice Timebar Days"
  claimTimebarDays?: number; // "Claim Timebar Days"
  timebarred?: boolean; // "Timebarred"
  claimAgreedDate?: string;
  charterpartyDate?: string;
  daysAwaitingPayment?: number;

  // Relational data
  ports?: Port[];
  activities?: SoFActivity[];
  deductions?: DeductionItem[];
  discrepancies?: Discrepancy[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  claimId: string;
  claimName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  type: "SOF" | "Charterparty" | "Timesheet" | "NOR" | "Notice" | "Other";
  version?: string;
  uploadedAt: string;
  status: "Uploaded" | "OCR Processing..." | "OCR Completed" | "OCR Failed";
  ocrConfidence?: number;
  extractedItemsCount?: number;
  errorReason?: string;
  ocrExtractedActivities?: SoFActivity[];
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: "claim" | "document" | "calculation" | "system" | "user" | "timebar";
  claimId?: string;
  claimName?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DeductionRecord {
  category: DeductionCategory;
  durationMinutes: number;
  durationFormatted: string;
  percentageDeducted: number;
  netDeductionMinutes: number;
  proratedDeductionMinutes: number;
}

export interface BerthCalculation {
  berthId: string;
  berthName: string;
  cargoQuantity: number;
  loadRate: number;
  allowedLaytimeMinutes: number;
  allowedLaytimeFormatted: string;
  grossElapsedMinutes: number;
  grossElapsedFormatted: string;
  deductionMinutes: number;
  deductionFormatted: string;
  netLaytimeUsedMinutes: number;
  netLaytimeUsedFormatted: string;
  timeExceededMinutes: number;
  timeSavedMinutes: number;
  demurrageAmount: number;
  despatchAmount: number;
  deductionsByCategory: DeductionRecord[];
  isOverridden?: boolean;
  isProrataOverridden?: boolean;
  overriddenDemurrage?: number;
}

export interface PortCalculation {
  portId: string;
  portName: string;
  portType: "Load Port" | "Discharge Port";
  totalAllowedMinutes: number;
  totalNetUsedMinutes: number;
  totalDemurrageAmount: number;
  totalDespatchAmount: number;
  berthCalculations: BerthCalculation[];
}

export interface ClaimCalculation {
  claimId: string;
  claimName: string;
  demurrageRatePerDay: number;
  totalGrossMinutes: number;
  totalDeductionsMinutes: number;
  totalNetLaytimeMinutes: number;
  totalAllowedMinutes: number;
  netDemurrageMinutes: number;
  netDespatchMinutes: number;
  calculatedDemurrageAmount: number;
  calculatedDespatchAmount: number;
  finalPayableAmount: number;
  portCalculations: PortCalculation[];
  timebarCompliance?: {
    noticeDeadline: string;
    noticeSubmitted: string;
    isNoticeValid: boolean;
    claimDeadline: string;
    claimSubmitted: string;
    isClaimValid: boolean;
    isTimebarred: boolean;
  };
  assumptions?: CalculationAssumptions;
}

export interface CalculationAssumptions {
  laytimeRule: "OOD_AOD" | "ONCE_ON_DEMURRAGE_ALWAYS_ON_DEMURRAGE" | "REVERSIBLE" | "NON_REVERSIBLE";
  weekendRule: "SHEX" | "SHINC" | "FHEX" | "FHINC";
  noticeGracePeriodHours: number; // e.g. 6 hours after NOR tendered
  currency: string;
  roundingPrecisionMinutes: number;
  ocrConfidenceThreshold: number;
  applyWeatherWorkingDay24CH: boolean;
  defaultDemurrageRate?: number;
  defaultDespatchRate?: number;
  workingHours?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  companyPhone?: string;
}

export interface DashboardMetrics {
  totalDemurrageOwed: number;
  totalDemurrageReceived: number;
  totalExposure: number;
  amountUnderContention: number;
  averageProcessingTimeDays: number;
  averageDemurragePerClaim: number;
  totalClaimsCount: number;
  settledClaimsCount: number;
  timebarredClaimsCount: number;
  openClaimsCount: number;
  claimsAwaitingAction: number;
  claimsAwaitingDocs: number;
  unreadNotifications: number;
  pendingActions: number;
  statusDistribution: { status: ClaimStatus; count: number; value: number; color: string }[];
  demurrageTrend: { month: string; filed: number; received: number; agreed: number }[];
  clientExposure: { client: string; exposure: number; claimCount: number }[];
}
