import assert from "assert";
import { Claim, MaritimeHoliday } from "@/lib/types";
import {
  calculateClaimLaytime,
  DEFAULT_ASSUMPTIONS,
  splitIntervalByPortLocalDay
} from "@/lib/calculations/laytime";

function makeBaseClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "TEST-DAYRULE-1",
    claimName: "DayRule Test",
    accountName: "Test Charterers",
    brokerName: "Broker",
    claimStatus: "Submitted",
    claimType: "Discharge Port Demurrage",
    shipName: "MV Rule Tester",
    cpType: "BPVOY4",
    assignedTo: "tester",
    daysOpen: 1,
    claimClosed: false,
    demurrageRatePerDay: 24000, // $1000/hour -> $16.6667/min
    claimFiledAmount: 0,
    layday: "2024-07-10",
    cancellingDate: "2024-07-15",
    voyageEndDate: "2024-07-15",
    instructionReceivedDate: "2024-07-16",
    noticeReceivedDate: "2024-07-16",
    claimReceivedDate: "2024-07-16",
    noticeTimebarDays: 30,
    claimTimebarDays: 90,
    timebarred: false,
    onceOnDemurrage: true,
    noticeGracePeriodHours: 0,
    applyWeatherWorkingDay24CH: true,
    portTimezone: "UTC",
    countryCode: "GB",
    ports: [
      {
        id: "p-1",
        claimId: "TEST-DAYRULE-1",
        name: "Test Port",
        portType: "Discharge Port",
        loadRate: 24000,
        countryCode: "GB",
        timezone: "UTC",
        berths: [
          {
            id: "b-1",
            portId: "p-1",
            name: "Berth 1",
            quantity: 72000, // 72000 / 24000 = 3.0 days = 4320 minutes allowed
            prorataShare: 100,
            loadRate: 24000
          }
        ]
      }
    ],
    activities: [],
    deductions: [],
    createdAt: "2024-07-16T00:00:00Z",
    updatedAt: "2024-07-16T00:00:00Z",
    ...overrides
  };
}

function main() {
  console.log("=====================================================");
  console.log("   SECTION 2 DAY RULES, HOLIDAYS & TIMEZONE TESTS");
  console.log("=====================================================");

  // Test 1: Event spanning Fri 2024-07-12 00:00 -> Mon 2024-07-15 00:00 (72 hours = 4320 min) under SHINC, SHEX, FHEX, SSHEX
  // Wait: Make activity non-working ("Waiting for berth") so no ambiguity, or 100% counted general ops:
  const friToMonActivity = [
    {
      id: "act-1",
      claimId: "TEST-DAYRULE-1",
      portId: "p-1",
      berthId: "b-1",
      activityName: "Waiting for berth",
      startTime: "2024-07-12T00:00:00Z", // Friday
      stopTime: "2024-07-15T00:00:00Z", // Monday (spans Fri 24h, Sat 24h, Sun 24h = 4320m)
      durationMinutes: 4320,
      durationFormatted: "3d 00h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Waiting for berth" as const
    }
  ];

  // Allowed = 72h (4320m) -> won't hit demurrage before Sun ends except SHINC hits exactly 4320m at end
  const resShinc = calculateClaimLaytime(makeBaseClaim({ dayRule: "SHINC", activities: friToMonActivity }));
  assert.strictEqual(resShinc.totalNetLaytimeMinutes, 4320, "SHINC must count all 72h (4320m)");
  console.log(`[PASS] 1a. Fri-Mon under SHINC = ${resShinc.totalNetLaytimeMinutes}m (expected 4320m)`);

  const resShex = calculateClaimLaytime(makeBaseClaim({ dayRule: "SHEX", activities: friToMonActivity }));
  assert.strictEqual(resShex.totalNetLaytimeMinutes, 2880, "SHEX must exclude Sunday (1440m) -> 2880m");
  console.log(`[PASS] 1b. Fri-Mon under SHEX = ${resShex.totalNetLaytimeMinutes}m (expected 2880m)`);

  const resFhex = calculateClaimLaytime(makeBaseClaim({ dayRule: "FHEX", activities: friToMonActivity }));
  assert.strictEqual(resFhex.totalNetLaytimeMinutes, 2880, "FHEX must exclude Friday (1440m) -> 2880m");
  console.log(`[PASS] 1c. Fri-Mon under FHEX = ${resFhex.totalNetLaytimeMinutes}m (expected 2880m)`);

  const resSshex = calculateClaimLaytime(makeBaseClaim({ dayRule: "SSHEX", activities: friToMonActivity }));
  assert.strictEqual(resSshex.totalNetLaytimeMinutes, 1440, "SSHEX must exclude Sat & Sun (2880m) -> Fri only 1440m");
  console.log(`[PASS] 1d. Fri-Mon under SSHEX = ${resSshex.totalNetLaytimeMinutes}m (expected 1440m)`);

  // Test 2: Holiday mid-event (Thursday 2024-07-11 is a public holiday) during Tue-Thu? Use Wed 00:00 -> Fri 00:00 (48h)
  const holidays: MaritimeHoliday[] = [
    {
      id: "hol-gb-2024-07-11",
      countryCode: "GB",
      portId: null,
      date: "2024-07-11", // Thursday
      name: "Test Bank Holiday",
      source: "manual"
    }
  ];
  const wedToFri = [
    {
      id: "act-hol",
      claimId: "TEST-DAYRULE-1",
      portId: "p-1",
      berthId: "b-1",
      activityName: "Waiting for berth",
      startTime: "2024-07-10T00:00:00Z", // Wed
      stopTime: "2024-07-12T00:00:00Z", // Fri (48h = 2880m; Thu is holiday = 1440m excluded)
      durationMinutes: 2880,
      durationFormatted: "2d 00h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Waiting for berth" as const
    }
  ];
  const resHolShex = calculateClaimLaytime(makeBaseClaim({ dayRule: "SHEX", activities: wedToFri }), undefined, holidays);
  assert.strictEqual(resHolShex.totalNetLaytimeMinutes, 1440, "SHEX must exclude mid-event holiday day (1440m left)");
  assert.strictEqual(resHolShex.holidaysExcludedCount, 1, "holidaysExcludedCount must be 1");
  console.log(`[PASS] 2. Holiday mid-event excluded under SHEX -> ${resHolShex.totalNetLaytimeMinutes}m, holidays=${resHolShex.holidaysExcludedCount}`);

  // Test 3: Unless Used (UU) case: Working event (Commenced discharging) on Sunday under SHEXUU counts!
  const sunMixed = [
    {
      id: "act-sun-idle",
      claimId: "TEST-DAYRULE-1",
      portId: "p-1",
      berthId: "b-1",
      activityName: "Waiting for berth",
      startTime: "2024-07-14T00:00:00Z", // Sunday 00:00-12:00 idle (720m -> excluded)
      stopTime: "2024-07-14T12:00:00Z",
      durationMinutes: 720,
      durationFormatted: "12h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Waiting for berth" as const
    },
    {
      id: "act-sun-work",
      claimId: "TEST-DAYRULE-1",
      portId: "p-1",
      berthId: "b-1",
      activityName: "Commenced discharging",
      startTime: "2024-07-14T12:00:00Z", // Sunday 12:00-18:00 working (360m -> counts under SHEXUU!)
      stopTime: "2024-07-14T18:00:00Z",
      durationMinutes: 360,
      durationFormatted: "06h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Other" as const
    }
  ];
  const resShexUu = calculateClaimLaytime(makeBaseClaim({ dayRule: "SHEXUU", activities: sunMixed }));
  assert.strictEqual(resShexUu.totalNetLaytimeMinutes, 360, "SHEXUU counts 360m working on Sunday, excludes 720m idle");
  console.log(`[PASS] 3. SHEXUU case -> working=360m counted, idle=720m excluded`);

  // Test 4: Event crossing midnight (Sat 20:00 -> Sun 06:00 under SHEX: Sat 240m counts, Sun 360m excluded)
  const crossMidnight = [
    {
      id: "act-mid",
      claimId: "TEST-DAYRULE-1",
      portId: "p-1",
      berthId: "b-1",
      activityName: "Waiting for berth",
      startTime: "2024-07-13T20:00:00Z", // Sat 20:00
      stopTime: "2024-07-14T06:00:00Z", // Sun 06:00
      durationMinutes: 600,
      durationFormatted: "10h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Waiting for berth" as const
    }
  ];
  const resMid = calculateClaimLaytime(makeBaseClaim({ dayRule: "SHEX", activities: crossMidnight }));
  assert.strictEqual(resMid.totalNetLaytimeMinutes, 240, "Sat 20:00-24:00 (240m) counts, Sun 00:00-06:00 (360m) excluded");
  assert.strictEqual(resMid.dailyBreakdown?.length, 2, "Must produce 2 daily breakdown rows across midnight");
  console.log(`[PASS] 4. Midnight split -> Sat=${resMid.dailyBreakdown?.[0].countedMinutes}m, Sun=${resMid.dailyBreakdown?.[1].excludedMinutes}m excl`);

  // Test 5: Once on demurrage, always on demurrage
  // Allowed = 1 day (24000 / 24000 * 1440 = 1440m). Event starts Sat 00:00 -> Mon 00:00 (48h).
  // Under SHEX + onceOnDemurrage=true: Sat fills 1440m (allowed exhausted at Sun 00:00!), so Sun MUST COUNT -> 2880m total, 1440m demurrage!
  // Under SHEX + onceOnDemurrage=false: Sun still excluded -> 1440m total, 0m demurrage!
  const satToMon = [
    {
      id: "act-dem",
      claimId: "TEST-DAYRULE-1",
      portId: "p-1",
      berthId: "b-1",
      activityName: "Waiting for berth",
      startTime: "2024-07-13T00:00:00Z", // Sat
      stopTime: "2024-07-15T00:00:00Z", // Mon (48h = 2880m)
      durationMinutes: 2880,
      durationFormatted: "2d 00h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Waiting for berth" as const
    }
  ];
  const oneDayPorts = [
    {
      id: "p-1",
      claimId: "TEST-DAYRULE-1",
      name: "Test Port",
      portType: "Discharge Port" as const,
      loadRate: 24000,
      countryCode: "GB",
      timezone: "UTC",
      berths: [{ id: "b-1", portId: "p-1", name: "B1", quantity: 24000, prorataShare: 100, loadRate: 24000 }]
    }
  ];
  const resOodOn = calculateClaimLaytime(makeBaseClaim({ dayRule: "SHEX", onceOnDemurrage: true, ports: oneDayPorts, activities: satToMon }));
  assert.strictEqual(resOodOn.netDemurrageMinutes, 1440, "After Sat exhausts 24h allowed, Sun must count when onceOnDemurrage=true");
  const resOodOff = calculateClaimLaytime(makeBaseClaim({ dayRule: "SHEX", onceOnDemurrage: false, ports: oneDayPorts, activities: satToMon }));
  assert.strictEqual(resOodOff.netDemurrageMinutes, 0, "Sun remains excluded when onceOnDemurrage=false");
  console.log(`[PASS] 5. Once on demurrage switch -> ON dem=${resOodOn.netDemurrageMinutes}m, OFF dem=${resOodOff.netDemurrageMinutes}m`);

  // Test 6: Port timezone different from UTC (Asia/Dubai = UTC+4)
  // Event UTC: 2024-07-11T18:00:00Z -> 2024-07-12T02:00:00Z (8 hours = 480m).
  // In UTC, that's Thu 6h (360m) + Fri 2h (120m).
  // In Asia/Dubai (UTC+4), 18:00 UTC = 22:00 local Thu (2h = 120m on Thu), 20:00 UTC = 00:00 Fri local -> 6h (360m) on Fri!!
  // So under FHEX in Dubai timezone, 360m fall on Friday (excluded) and only 120m count on Thursday!
  const dubaiPorts = [
    {
      id: "p-ae",
      claimId: "TEST-DAYRULE-1",
      name: "Fujairah",
      portType: "Discharge Port" as const,
      loadRate: 24000,
      countryCode: "AE",
      timezone: "Asia/Dubai",
      berths: [{ id: "b-ae", portId: "p-ae", name: "B1", quantity: 72000, prorataShare: 100, loadRate: 24000 }]
    }
  ];
  const dubaiEvent = [
    {
      id: "act-ae",
      claimId: "TEST-DAYRULE-1",
      portId: "p-ae",
      berthId: "b-ae",
      activityName: "Waiting for berth",
      startTime: "2024-07-11T18:00:00Z",
      stopTime: "2024-07-12T02:00:00Z",
      durationMinutes: 480,
      durationFormatted: "08h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Waiting for berth" as const
    }
  ];
  const segsDubai = splitIntervalByPortLocalDay(
    new Date("2024-07-11T18:00:00Z").getTime(),
    new Date("2024-07-12T02:00:00Z").getTime(),
    "Asia/Dubai"
  );
  assert.strictEqual(segsDubai.length, 2);
  assert.strictEqual(segsDubai[0].minutes, 120, "First 120m are Thu in Asia/Dubai (22:00-24:00)");
  assert.strictEqual(segsDubai[1].minutes, 360, "Remaining 360m are Fri in Asia/Dubai (00:00-06:00)");
  const resDubai = calculateClaimLaytime(
    makeBaseClaim({ dayRule: "FHEX", portTimezone: "Asia/Dubai", countryCode: "AE", ports: dubaiPorts, activities: dubaiEvent })
  );
  assert.strictEqual(resDubai.totalNetLaytimeMinutes, 120, "FHEX in Asia/Dubai excludes 360m on Friday -> 120m counted");
  console.log(`[PASS] 6. Port timezone (Asia/Dubai UTC+4) -> Thu=120m counted, Fri=360m excluded`);

  // Test 7: Missing required setting validation error (no silent defaults)
  const claimNoRule = makeBaseClaim({
    dayRule: undefined,
    noticeGracePeriodHours: undefined,
    applyWeatherWorkingDay24CH: undefined
  });
  const resMissing = calculateClaimLaytime(claimNoRule, {});
  assert(
    resMissing.validationErrors && resMissing.validationErrors.some((e) => e.includes("dayRule")),
    "Missing dayRule must return validation error naming dayRule"
  );
  assert(
    resMissing.validationErrors && resMissing.validationErrors.some((e) => e.includes("noticeGracePeriodHours")),
    "Missing noticeGracePeriodHours must return validation error"
  );
  console.log(`[PASS] 7. Missing settings validation errors: ${resMissing.validationErrors?.join(" | ")}`);

  console.log("ALL SECTION 2 DAY-RULE & HOLIDAY TESTS PASSED (7/7)!");
}

main();
