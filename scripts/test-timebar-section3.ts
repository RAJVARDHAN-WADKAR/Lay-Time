import fs from "fs";
import path from "path";
import { Claim, CalculationAssumptions } from "@/lib/types";
import {
  addDaysYmd,
  calculatePeriodThresholds,
  calculateTimebarCompliance
} from "@/lib/calculations/timebar";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "CLM-TB-TEST",
    claimName: "Timebar Test Claim",
    accountName: "Default Client",
    brokerName: "Broker",
    claimStatus: "5. Claim Filed",
    claimType: "Demurrage",
    shipName: "MT Timebar",
    cpType: "BPVOY4",
    voyageNumber: "V-01",
    assignedTo: "processor@laytime.io",
    daysOpen: 10,
    claimClosed: false,
    contentions: "",
    claimNotes: "",
    demurrageRatePerDay: 25000,
    counterpartyName: "Charterer",
    counterpartyType: "Charterer",
    claimFiledAmount: 50000,
    receivedClaimAmount: 0,
    agreedAmount: 0,
    billableAmount: 50000,
    paymentReceived: 0,
    paymentConcluded: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function parseCsvFile(csvPath: string): string[][] {
  const txt = fs.readFileSync(csvPath, "utf8");
  let inQ = false;
  let field = "";
  let row: string[] = [];
  const rows: string[][] = [];
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    const n = txt[i + 1];
    if (c === '"' && inQ && n === '"') {
      field += '"';
      i++;
    } else if (c === '"') {
      inQ = !inQ;
    } else if (c === "," && !inQ) {
      row.push(field);
      field = "";
    } else if ((c === "\r" || c === "\n") && !inQ) {
      if (c === "\r" && n === "\n") i++;
      if (field || row.length) {
        row.push(field);
        rows.push(row);
        field = "";
        row = [];
      }
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function run() {
  console.log("=== SECTION 3: TIMEBAR DEFAULTS & THRESHOLDS TESTS ===");

  // Test 1: Global defaults 30/90 & resolution order claim > account > global
  const defaultClaim = makeClaim({ voyageEndDate: "2026-01-10" });
  const rDefault = calculateTimebarCompliance(defaultClaim, {}, { todayYmd: "2026-02-01" });
  assert(rDefault.noticeDaysAllowed === 30, `Expected default notice 30d, got ${rDefault.noticeDaysAllowed}`);
  assert(rDefault.claimDaysAllowed === 90, `Expected default claim 90d, got ${rDefault.claimDaysAllowed}`);
  assert(rDefault.noticeDeadline === "2026-02-09", `Expected notice deadline 2026-02-09, got ${rDefault.noticeDeadline}`);
  assert(rDefault.claimDeadline === "2026-04-10", `Expected claim deadline 2026-04-10, got ${rDefault.claimDeadline}`);
  assert(!rDefault.isBaseDateEstimated, "Voyage end present -> not estimated");
  console.log("  [PASS] 1. Global defaults (30/90) + exact UTC deadlines");

  // Account override + explicit claim override (45d)
  const assumptionsAcct: Partial<CalculationAssumptions> = {
    defaultNoticeTimebarDays: 30,
    defaultClaimTimebarDays: 90,
    accountTimebarDefaults: {
      Sokana3: { noticeDays: 20, claimDays: 60 }
    }
  };
  const acctClaim = makeClaim({ accountName: "Sokana3", voyageEndDate: "2026-01-10" });
  const rAcct = calculateTimebarCompliance(acctClaim, assumptionsAcct, { todayYmd: "2026-01-20" });
  assert(rAcct.noticeDaysAllowed === 20 && rAcct.claimDaysAllowed === 60, "Account override (20/60) should win over global");

  const importedClaim = makeClaim({
    accountName: "Sokana3",
    voyageEndDate: "2026-01-10",
    claimTimebarDays: 45,
    claimDaysSource: "imported"
  });
  const rImported = calculateTimebarCompliance(importedClaim, assumptionsAcct, { todayYmd: "2026-01-20" });
  assert(rImported.noticeDaysAllowed === 20, "Notice falls back to account default 20d");
  assert(rImported.claimDaysAllowed === 45, "Explicit claim override 45d should win");
  assert(rImported.differsFromDefault === true, "Imported 45d differs from global 90d default");
  console.log("  [PASS] 2. Resolution order claim > account > global + 45d differsFromDefault flag");

  // Test 3: Submitted on time vs Submitted late
  const submittedOnTime = makeClaim({
    voyageEndDate: "2026-01-01",
    claimTimebarDays: 90, // deadline 2026-04-01
    claimFiledDate: "2026-03-15",
    noticeReceivedDate: "2026-01-20"
  });
  const rOnTime = calculateTimebarCompliance(submittedOnTime, {}, { todayYmd: "2026-11-27" });
  assert(rOnTime.isSubmittedOnTime === true, "Claim filed before deadline -> isSubmittedOnTime");
  assert(rOnTime.isNoticeSubmittedOnTime === true, "Notice filed before deadline -> isNoticeSubmittedOnTime");
  assert(rOnTime.isTimebarred === false, "Submitted on time must never become timebarred later");
  assert(rOnTime.statusBadgeText === "Submitted on time", `Unexpected badge: ${rOnTime.statusBadgeText}`);
  assert(rOnTime.computedUiStatus === "Safe", `Unexpected UI status: ${rOnTime.computedUiStatus}`);

  const submittedLate = makeClaim({
    voyageEndDate: "2026-01-01",
    claimTimebarDays: 45, // deadline 2026-02-15
    claimFiledDate: "2026-02-20"
  });
  const rLate = calculateTimebarCompliance(submittedLate, {}, { todayYmd: "2026-02-21" });
  assert(rLate.isClaimValid === false && rLate.isTimebarred === true, "Filed after deadline -> Timebarred");
  assert(rLate.computedUiStatus === "Timebarred", "Late claim UI status -> Timebarred");
  console.log("  [PASS] 3. Submitted on time vs Submitted late");

  // Test 4: Unsubmitted claim with blank submission date
  // 4a) 25 days left on 90d window (Approaching <= 27d, NOT Urgent, NOT Expired!)
  const unsubApproaching = makeClaim({
    voyageEndDate: "2026-01-01", // claim deadline 2026-04-01, notice deadline 2026-01-31
    noticeReceivedDate: "2026-01-15",
    claimTimebarDays: 90
  });
  const r25Left = calculateTimebarCompliance(unsubApproaching, {}, { todayYmd: "2026-03-07" });
  assert(r25Left.claimDaysRemaining === 25, `Expected 25d remaining, got ${r25Left.claimDaysRemaining}`);
  assert(r25Left.claimAlarmLevel === "Approaching" && r25Left.computedUiStatus === "Approaching", "25d left on 90d window -> Approaching");

  // 4b) 3 days left -> Urgent/Critical
  const r3Left = calculateTimebarCompliance(unsubApproaching, {}, { todayYmd: "2026-03-29" });
  assert(r3Left.claimDaysRemaining === 3, `Expected 3d remaining, got ${r3Left.claimDaysRemaining}`);
  assert(r3Left.claimAlarmLevel === "Critical" && r3Left.computedUiStatus === "Urgent", "3d left -> Critical/Urgent");

  // 4c) Expired yesterday (-1d)
  const rExpiredYesterday = calculateTimebarCompliance(unsubApproaching, {}, { todayYmd: "2026-04-02" });
  assert(rExpiredYesterday.claimDaysRemaining === -1, `Expected -1d remaining, got ${rExpiredYesterday.claimDaysRemaining}`);
  assert(rExpiredYesterday.isTimebarred === true && rExpiredYesterday.claimAlarmLevel === "Expired", "Expired yesterday -> Expired");

  // 4d) Unsubmitted with plenty of time (> 30%) never flagged Urgent/Expired even though claimFiledDate is blank
  const rPlenty = calculateTimebarCompliance(
    makeClaim({ voyageEndDate: "2026-03-01", claimTimebarDays: 90 }),
    {},
    { todayYmd: "2026-03-10" }
  );
  assert(rPlenty.claimAlarmLevel === "Normal" && !rPlenty.isTimebarred && rPlenty.computedUiStatus === "Safe", "Unsubmitted early claim stays Safe/Normal");
  console.log("  [PASS] 4. Unsubmitted claims (plenty, 25d Approaching, 3d Critical, -1d Expired)");

  // Test 5: Base date fallback order (voyageEnd -> instructionReceived -> charterpartyDate)
  const fallbackInstr = makeClaim({ instructionReceivedDate: "2026-02-01", charterpartyDate: "2026-01-10" });
  const rInstr = calculateTimebarCompliance(fallbackInstr, {}, { todayYmd: "2026-02-15" });
  assert(rInstr.isBaseDateEstimated === true, "Missing voyageEndDate -> isBaseDateEstimated");
  assert(rInstr.noticeDeadline === "2026-03-03", `2026-02-01 + 30d = 2026-03-03, got ${rInstr.noticeDeadline}`);

  const fallbackCp = makeClaim({ charterpartyDate: "2026-01-10" });
  const rCp = calculateTimebarCompliance(fallbackCp, {}, { todayYmd: "2026-01-15" });
  assert(rCp.isBaseDateEstimated === true, "Fallback to C/P date -> isBaseDateEstimated");
  assert(rCp.claimDeadline === "2026-04-10", `2026-01-10 + 90d = 2026-04-10, got ${rCp.claimDeadline}`);
  console.log("  [PASS] 5. Base-date fallback & Base date estimated flag");

  // Test 6: Leap year & month-end boundary dates (2024 leap vs 2025 non-leap)
  assert(addDaysYmd("2024-01-31", 30) === "2024-03-01", "2024-01-31 + 30d in leap year should be 2024-03-01");
  assert(addDaysYmd("2025-01-31", 30) === "2025-03-02", "2025-01-31 + 30d in non-leap year should be 2025-03-02");
  assert(addDaysYmd("2024-02-29", 90) === "2024-05-29", "2024-02-29 + 90d should be 2024-05-29");
  const t30 = calculatePeriodThresholds(30);
  const t90 = calculatePeriodThresholds(90);
  assert(t30.criticalDays === 5 && t30.approachingDays === 9, `Unexpected 30d thresholds: ${JSON.stringify(t30)}`);
  assert(t90.criticalDays === 9 && t90.approachingDays === 27, `Unexpected 90d thresholds: ${JSON.stringify(t90)}`);
  console.log("  [PASS] 6. Leap year / month-end math & proportional thresholds");

  // Test 7: Verify LaytimeServicesTracker.csv ClaimTimebarDays counts (194 with 45, 3 with 90)
  const csvPath = path.join(process.cwd(), "LaytimeServicesTracker.csv");
  if (fs.existsSync(csvPath)) {
    const rows = parseCsvFile(csvPath);
    const header = rows[0] || [];
    const colIdx = header.indexOf("ClaimTimebarDays");
    assert(colIdx >= 0, "CSV must have ClaimTimebarDays column");
    let count45 = 0;
    let count90 = 0;
    let totalData = 0;
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]?.trim()) continue;
      totalData++;
      const val = Number(rows[i][colIdx]?.trim() || 0);
      if (val === 45) count45++;
      else if (val === 90) count90++;
    }
    console.log(`  [INFO] CSV summary: ${totalData} claims -> ${count45} with 45d (differ from 90d default), ${count90} with 90d`);
    assert(count45 === 194 && count90 === 3, `Expected 194x45d and 3x90d in LaytimeServicesTracker.csv, got ${count45} and ${count90}`);
    console.log("  [PASS] 7. LaytimeServicesTracker.csv counts verified (194 with 45d, 3 with 90d)");
  }

  console.log("ALL SECTION 3 TIMEBAR TESTS PASSED!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
