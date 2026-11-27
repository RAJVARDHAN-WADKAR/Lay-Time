import { Claim, SoFActivity } from "@/lib/types";
import { detectDiscrepancies, findActivityOverlaps } from "@/lib/calculations/discrepancies";
import { calculateClaimLaytime } from "@/lib/calculations/laytime";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

function makeClaim(activities: SoFActivity[], overlapPolicy: "block" | "exception_wins" = "exception_wins"): Claim {
  return {
    id: "CLM-OVL-TEST",
    claimName: "Overlap Test Claim",
    accountName: "Test Account",
    brokerName: "Broker",
    claimStatus: "2. Calculated",
    claimType: "Demurrage",
    shipName: "MT Overlap",
    cpType: "BPVOY4",
    voyageNumber: "V-01",
    assignedTo: "processor@laytime.io",
    daysOpen: 5,
    claimClosed: false,
    contentions: "",
    claimNotes: "",
    demurrageRatePerDay: 24000,
    counterpartyName: "Charterer",
    counterpartyType: "Charterer",
    claimFiledAmount: 0,
    receivedClaimAmount: 0,
    agreedAmount: 0,
    billableAmount: 0,
    paymentReceived: 0,
    paymentConcluded: false,
    dayRule: "SHINC",
    onceOnDemurrage: false,
    noticeGracePeriodHours: 0,
    applyWeatherWorkingDay24CH: true,
    overlapPolicy,
    ports: [
      {
        id: "port-1",
        claimId: "CLM-OVL-TEST",
        name: "Rotterdam",
        portType: "Discharge Port",
        loadRate: 10000,
        timezone: "UTC",
        countryCode: "NL",
        berths: [
          {
            id: "berth-1",
            portId: "port-1",
            name: "Berth 1",
            quantity: 10000,
            loadRate: 10000, // 24h = 1440m allowed
            prorataShare: 100,
            isProrataOverridden: false
          },
          {
            id: "berth-2",
            portId: "port-1",
            name: "Berth 2",
            quantity: 10000,
            loadRate: 10000,
            prorataShare: 100,
            isProrataOverridden: false
          }
        ]
      }
    ],
    activities,
    deductions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function makeAct(
  id: string,
  name: string,
  startIso: string,
  stopIso: string,
  opts: Partial<SoFActivity> = {}
): SoFActivity {
  const s = new Date(startIso).getTime();
  const e = new Date(stopIso).getTime();
  const mins = Math.round((e - s) / 60000);
  return {
    id,
    claimId: "CLM-OVL-TEST",
    portId: "port-1",
    berthId: "berth-1",
    activityName: name,
    startTime: startIso,
    stopTime: stopIso,
    durationMinutes: mins,
    durationFormatted: `${mins}m`,
    percentageCounted: 100,
    prorata: 100,
    deductionCategory: "Other",
    ...opts
  };
}

async function run() {
  console.log("=== SECTION 4: OVERLAPPING SOF EVENTS TESTS ===");

  // 1. 30-minute overlap -> union (180m) != naive sum (210m)
  const acts30 = [
    makeAct("a1", "Commenced loading", "2026-03-04T10:00:00.000Z", "2026-03-04T12:00:00.000Z"),
    makeAct("a2", "Rain delay", "2026-03-04T11:30:00.000Z", "2026-03-04T13:00:00.000Z", {
      percentageCounted: 0,
      deductionCategory: "Weather"
    })
  ];
  const calc30 = calculateClaimLaytime(makeClaim(acts30, "exception_wins"));
  assert(calc30.overlapAffectedMinutes === 30, `Expected 30m overlap, got ${calc30.overlapAffectedMinutes}`);
  assert(calc30.totalGrossMinutes === 180, `Union gross expected 180m, got ${calc30.totalGrossMinutes}`);
  assert(calc30.totalNetLaytimeMinutes === 90, `Counted [10:00,11:30]=90m expected, got ${calc30.totalNetLaytimeMinutes}`);
  assert(calc30.totalDeductionsMinutes === 90, `Rain deduction [11:30,13:00]=90m expected, got ${calc30.totalDeductionsMinutes}`);
  console.log("  [PASS] 1. 30-min overlap union math (exception wins)");

  // 2. Nested event inside longer working window
  const actsNested = [
    makeAct("n1", "Discharging cargo", "2026-03-04T08:00:00.000Z", "2026-03-04T14:00:00.000Z"),
    makeAct("n2", "Crane breakdown", "2026-03-04T09:00:00.000Z", "2026-03-04T11:00:00.000Z", {
      percentageCounted: 0,
      deductionCategory: "Equipment breakdown"
    })
  ];
  const calcNested = calculateClaimLaytime(makeClaim(actsNested, "exception_wins"));
  assert(calcNested.totalGrossMinutes === 360, `Nested gross expected 360m, got ${calcNested.totalGrossMinutes}`);
  assert(calcNested.totalDeductionsMinutes === 120, `Nested breakdown expected 120m, got ${calcNested.totalDeductionsMinutes}`);
  assert(calcNested.totalNetLaytimeMinutes === 240, `Nested net expected 240m, got ${calcNested.totalNetLaytimeMinutes}`);
  console.log("  [PASS] 2. Nested exception inside longer working activity");

  // 3. Touching events (stop == next start) -> ZERO overlaps, even in "block" mode
  const actsTouching = [
    makeAct("t1", "Vessel arrived", "2026-03-04T08:00:00.000Z", "2026-03-04T10:00:00.000Z"),
    makeAct("t2", "Loading commenced", "2026-03-04T10:00:00.000Z", "2026-03-04T12:00:00.000Z")
  ];
  const ovTouch = findActivityOverlaps(actsTouching);
  assert(ovTouch.sameBerthOverlaps.length === 0, "Touching events must NOT be flagged as overlapping");
  const calcTouch = calculateClaimLaytime(makeClaim(actsTouching, "block"));
  assert(!calcTouch.overlapBlocked && calcTouch.totalNetLaytimeMinutes === 240, "Touching events allowed in block mode");
  console.log("  [PASS] 3. Touching events allowed with zero overlap errors");

  // 4. 3-way overlap (2 exceptions overlapping inside 1 working event) -> deducted ONCE, not twice
  const acts3Way = [
    makeAct("w1", "Loading cargo", "2026-03-04T10:00:00.000Z", "2026-03-04T13:00:00.000Z"), // 180m span
    makeAct("w2", "Heavy rain", "2026-03-04T10:30:00.000Z", "2026-03-04T12:00:00.000Z", {
      percentageCounted: 0,
      deductionCategory: "Weather"
    }),
    makeAct("w3", "Stevedore strike", "2026-03-04T11:00:00.000Z", "2026-03-04T12:30:00.000Z", {
      percentageCounted: 0,
      deductionCategory: "Strike"
    })
  ];
  const calc3Way = calculateClaimLaytime(makeClaim(acts3Way, "exception_wins"));
  assert(calc3Way.totalGrossMinutes === 180, `3-way union gross expected 180m, got ${calc3Way.totalGrossMinutes}`);
  assert(calc3Way.totalNetLaytimeMinutes === 60, `3-way net expected 60m ([10:00,10:30]+[12:30,13:00]), got ${calc3Way.totalNetLaytimeMinutes}`);
  assert(calc3Way.totalDeductionsMinutes === 120, `3-way deduction expected 120m, got ${calc3Way.totalDeductionsMinutes}`);
  console.log("  [PASS] 4. 3-way simultaneous overlap counted/deducted at most once");

  // 5. Overlap spanning midnight -> daily breakdown accurately splits days
  const actsMidnight = [
    makeAct("m1", "Discharging", "2026-03-04T23:00:00.000Z", "2026-03-05T02:00:00.000Z"),
    makeAct("m2", "Storm interruption", "2026-03-04T23:30:00.000Z", "2026-03-05T01:00:00.000Z", {
      percentageCounted: 0,
      deductionCategory: "Weather"
    })
  ];
  const calcMid = calculateClaimLaytime(makeClaim(actsMidnight, "exception_wins"));
  const day4 = calcMid.dailyBreakdown?.find((d) => d.date === "2026-03-04");
  const day5 = calcMid.dailyBreakdown?.find((d) => d.date === "2026-03-05");
  assert(day4?.countedMinutes === 30 && day4?.excludedMinutes === 30, `Day 4 expected 30c/30e, got ${JSON.stringify(day4)}`);
  assert(day5?.countedMinutes === 60 && day5?.excludedMinutes === 60, `Day 5 expected 60c/60e, got ${JSON.stringify(day5)}`);
  console.log("  [PASS] 5. Midnight-spanning overlap day breakdown verified");

  // 6. Cross-berth overlap raises WARNING vs intra-berth raises ERROR conflicting_timestamps
  const crossBerthActs = [
    makeAct("cb1", "Loading Berth 1", "2026-03-04T08:00:00.000Z", "2026-03-04T12:00:00.000Z", { berthId: "berth-1" }),
    makeAct("cb2", "Loading Berth 2", "2026-03-04T10:00:00.000Z", "2026-03-04T14:00:00.000Z", { berthId: "berth-2" })
  ];
  const claimCross = makeClaim(crossBerthActs);
  const discCross = detectDiscrepancies(crossBerthActs, claimCross.ports);
  const crossItem = discCross.find((d) => d.type === "overlapping_timestamps");
  assert(crossItem && crossItem.severity === "warning", "Cross-berth overlap should emit warning");

  const intraDisc = detectDiscrepancies(acts30, claimCross.ports);
  const intraErr = intraDisc.find((d) => d.type === "conflicting_timestamps");
  assert(
    intraErr && intraErr.severity === "error" && intraErr.description.includes("30 minutes"),
    `Intra-berth should emit error conflicting_timestamps naming duration, got ${JSON.stringify(intraErr)}`
  );
  console.log("  [PASS] 6. Intra-berth ERROR conflicting_timestamps vs Cross-berth WARNING");

  // 7. Policy "block" refuses calculation when same-berth overlaps exist
  const blocked = calculateClaimLaytime(makeClaim(acts30, "block"));
  assert(blocked.overlapBlocked === true, "Policy 'block' must set overlapBlocked=true");
  assert(blocked.totalNetLaytimeMinutes === 0 && blocked.finalPayableAmount === 0, "Blocked calculation must refuse numbers");
  assert((blocked.validationErrors || []).some((e) => e.toLowerCase().includes("blocked")), "Must emit clear blocking error");
  console.log("  [PASS] 7. Policy 'block' refuses calculation cleanly");

  // 8. Unsorted vs sorted events yield identical discrepancies and identical laytime totals
  const unsorted = [acts3Way[2], acts3Way[0], acts3Way[1]];
  const sorted = [...acts3Way];
  const calcUnsorted = calculateClaimLaytime(makeClaim(unsorted, "exception_wins"));
  const calcSorted = calculateClaimLaytime(makeClaim(sorted, "exception_wins"));
  assert(
    calcUnsorted.totalNetLaytimeMinutes === calcSorted.totalNetLaytimeMinutes &&
      calcUnsorted.totalDeductionsMinutes === calcSorted.totalDeductionsMinutes,
    "Unsorted and sorted inputs must produce identical calculations"
  );
  const dUnsorted = detectDiscrepancies(unsorted, claimCross.ports).map((d) => d.id).sort().join(",");
  const dSorted = detectDiscrepancies(sorted, claimCross.ports).map((d) => d.id).sort().join(",");
  assert(dUnsorted === dSorted, "Unsorted and sorted inputs must produce identical discrepancy IDs");
  console.log("  [PASS] 8. Unsorted vs sorted event equivalence verified");

  console.log("ALL SECTION 4 OVERLAPPING SOF TESTS PASSED!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
