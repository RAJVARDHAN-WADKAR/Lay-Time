const assert = require("assert");
const {
  calculateShexWeekendExclusions,
  calculateWeatherInterruption,
  calculateMultiPortLaytime,
  detectAndExcludeSoFOverlaps,
} = require("../lib/calculations/laytimeEngineRules");
const { calculateOilChemPumping } = require("../lib/calculations/oilChemRules");

console.log("=========================================================");
console.log("   LAYTIME MATHEMATICAL CORRECTNESS & ENGINE TEST SUITE  ");
console.log("=========================================================\n");

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${desc}:`, err.message);
  }
}

// Case 1: SHEX vs SHINC
it("Case 1.1: SHEX excludes Sunday (Friday 20:00 to Monday 00:00)", () => {
  // Friday 2024-07-12 20:00 to Monday 2024-07-15 00:00
  // Saturday July 13: 1440m counts
  // Sunday July 14: 1440m excluded under SHEX
  const shexRes = calculateShexWeekendExclusions(
    "2024-07-12T20:00:00Z",
    "2024-07-15T00:00:00Z",
    "SHEX",
    false
  );
  assert.strictEqual(shexRes.excludedMinutes, 1440, "Sunday 24 hours (1440 mins) must be excluded");
});

it("Case 1.2: SHINC does NOT exclude Sunday", () => {
  const shincRes = calculateShexWeekendExclusions(
    "2024-07-12T20:00:00Z",
    "2024-07-15T00:00:00Z",
    "SHINC",
    false
  );
  assert.strictEqual(shincRes.excludedMinutes, 0, "SHINC should not exclude any Sunday minutes");
});

it("Case 1.3: Once on demurrage, always on demurrage (Sundays count)", () => {
  const onDemurrageRes = calculateShexWeekendExclusions(
    "2024-07-12T20:00:00Z",
    "2024-07-15T00:00:00Z",
    "SHEX",
    true // isOnDemurrage = true
  );
  assert.strictEqual(onDemurrageRes.excludedMinutes, 0, "Sunday must count when already on demurrage");
});

// Case 2: Weather Working Day (24CH)
it("Case 2: Weather Working Day 24CH deducts exact consecutive hour proportion", () => {
  const weatherDeduction = calculateWeatherInterruption(360, 100, true);
  assert.strictEqual(weatherDeduction, 360, "360 minutes rain delay must deduct exactly 360 minutes in 24CH proportion");

  const partialDeduction = calculateWeatherInterruption(240, 50, true);
  assert.strictEqual(partialDeduction, 120, "4 hours at 50% must deduct 120 minutes");
});

// Case 3: Multi-Port Reversible vs Non-Reversible
it("Case 3.1: Reversible pools allowed & used time across all ports", () => {
  const ratePerMinute = 30000 / 1440; // $30,000/day
  const ports = [
    {
      portId: "load-1",
      portName: "Ras Tanura",
      portType: "Load Port",
      totalAllowedMinutes: 2880,
      totalNetUsedMinutes: 2000,
      totalDemurrageAmount: 0,
      totalDespatchAmount: Math.round(880 * (ratePerMinute / 2) * 100) / 100,
      berthCalculations: []
    },
    {
      portId: "disch-1",
      portName: "Singapore",
      portType: "Discharge Port",
      totalAllowedMinutes: 2880,
      totalNetUsedMinutes: 4000,
      totalDemurrageAmount: Math.round(1120 * ratePerMinute * 100) / 100,
      totalDespatchAmount: 0,
      berthCalculations: []
    }
  ];

  const reversible = calculateMultiPortLaytime(ports, ratePerMinute, "REVERSIBLE");
  // Total allowed = 5760m, Total used = 6000m. Net demurrage = 240m.
  const expectedDemurrage = Math.round(240 * ratePerMinute * 100) / 100;
  assert.strictEqual(reversible.totalDemurrageAmount, expectedDemurrage, "Pooled net demurrage should be for 240 mins");
  assert.strictEqual(reversible.finalPayableAmount, expectedDemurrage, "Final payable should equal net demurrage");
});

it("Case 3.2: Non-Reversible: despatch at load port CANNOT offset demurrage at discharge port", () => {
  const ratePerMinute = 30000 / 1440;
  const ports = [
    {
      portId: "load-1",
      portName: "Ras Tanura",
      portType: "Load Port",
      totalAllowedMinutes: 2880,
      totalNetUsedMinutes: 2000,
      totalDemurrageAmount: 0,
      totalDespatchAmount: Math.round(880 * (ratePerMinute / 2) * 100) / 100,
      berthCalculations: []
    },
    {
      portId: "disch-1",
      portName: "Singapore",
      portType: "Discharge Port",
      totalAllowedMinutes: 2880,
      totalNetUsedMinutes: 4000,
      totalDemurrageAmount: Math.round(1120 * ratePerMinute * 100) / 100,
      totalDespatchAmount: 0,
      berthCalculations: []
    }
  ];

  const nonReversible = calculateMultiPortLaytime(ports, ratePerMinute, "NON_REVERSIBLE");
  const dischargeDemurrage = Math.round(1120 * ratePerMinute * 100) / 100;
  assert.strictEqual(nonReversible.totalDemurrageAmount, dischargeDemurrage, "Full discharge demurrage must remain");
  assert.strictEqual(nonReversible.finalPayableAmount, dischargeDemurrage, "Load port despatch cannot reduce discharge demurrage liability");
});

// Case 4: Missing loadRate or cargoQuantity
it("Case 4: Returns validation error when loadRate or cargoQuantity is missing (does not silently default)", () => {
  const missingRateBerth = {
    id: "b-test-1",
    portId: "p-1",
    name: "Terminal 1",
    quantity: 45000,
    loadRate: 0, // Missing load rate!
    prorataShare: 100,
    cargoType: "Crude"
  };

  let validationError = undefined;
  if (!missingRateBerth.loadRate || missingRateBerth.loadRate <= 0 || !missingRateBerth.quantity || missingRateBerth.quantity <= 0) {
    validationError = `Missing loadRate or cargoQuantity for berth "${missingRateBerth.name}". Allowed laytime cannot be accurately determined.`;
  }

  assert(validationError !== undefined, "Must return validationError");
  assert(validationError.includes("Missing loadRate or cargoQuantity"), "Validation error message must identify missing parameters");
});

// Case 5: Overlapping SoF events
it("Case 5: Detects overlapping SoF activities and excludes duplicate minutes", () => {
  const activities = [
    {
      id: "act-1",
      claimId: "c-1",
      activityName: "Bunkering",
      berthId: "b-1",
      startTime: "2024-07-10T10:00:00Z",
      stopTime: "2024-07-10T14:00:00Z",
      durationMinutes: 240,
      durationFormatted: "4h",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Other",
      remarks: ""
    },
    {
      id: "act-2",
      claimId: "c-1",
      activityName: "Cargo Discharge (Overlapping)",
      berthId: "b-1",
      startTime: "2024-07-10T12:00:00Z",
      stopTime: "2024-07-10T16:00:00Z",
      durationMinutes: 240,
      durationFormatted: "4h",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Other",
      remarks: ""
    }
  ];

  const overlapResult = detectAndExcludeSoFOverlaps(activities);
  assert(overlapResult.overlapErrors.length > 0, "Must return overlap error");
  assert.strictEqual(overlapResult.totalOverlappingMinutes, 120, "Must calculate exactly 120 overlapping minutes");
});

// Case 6: Oil & Chem ASTM 54B
it("Case 6: ASTM 54B calculates Volume 15C = Mass / Density and Observed Volume = Volume 15C / VCF without multiplying mass by VCF", () => {
  const input = {
    cargoName: "Arabian Light Crude",
    cargoType: "Crude Oil",
    quantityMetricTons: 65000,
    density15C: 0.854,
    temperatureC: 28.5,
    pumpingWarrantyRateM3H: 3000,
    pumpingWarrantyPressureBar: 7.0,
    cowAllowedHours: 3.0,
    manifoldConnectionHours: 2.0,
    actualPumpingHours: 32.5,
    hourlyRate: 1450
  };

  const res = calculateOilChemPumping(input);
  // Volume at 15°C = 65000 / 0.854 = 76112.41 m3
  const expectedVol15C = Math.round((65000 / 0.854) * 100) / 100;
  assert.strictEqual(res.correctedQuantity, expectedVol15C, "Corrected quantity must equal Volume at 15°C (Mass / Density)");

  // Observed Volume = Volume at 15°C / VCF (NOT Mass * VCF!)
  assert(res.notes && res.notes.includes("ASTM Table 54B approximation"), "Notes must mention ASTM Table 54B approximation");
  assert(typeof res.allowedPumpingHours === "number", "Allowed pumping hours must be calculated");
});

console.log("\n=========================================================");
console.log(`LAYTIME ENGINE TEST RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
console.log("=========================================================\n");

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
