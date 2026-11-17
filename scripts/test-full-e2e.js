const BASE_URL = "http://localhost:3000";

async function runE2ETests() {
  console.log("=========================================================");
  console.log("      COMPREHENSIVE END-TO-END SYSTEM INTEGRATION SUITE   ");
  console.log("=========================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  function extractCookie(res) {
    const raw = res.headers.get("set-cookie");
    if (!raw) return null;
    const match = raw.match(/laytime_auth_token=([^;]+)/);
    return match ? match[1] : null;
  }

  // 1. AUTHENTICATE AS SUPERVISOR & PROCESSOR
  console.log("--- 1. Authenticating Roles ---");
  let supervisorCookie = "";
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "swayamghatage3839@gmail.com", password: "Swayam@123" })
    });
    assert(res.status === 200, "Supervisor login succeeded");
    supervisorCookie = extractCookie(res);
    assert(!!supervisorCookie, "Supervisor token received");
  }

  let processorCookie = "";
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rohitmengane2975@gmail.com", password: "Rohit@123" })
    });
    assert(res.status === 200, "Claim Processor login succeeded");
    processorCookie = extractCookie(res);
    assert(!!processorCookie, "Processor token received");
  }

  const supHeaders = {
    "Content-Type": "application/json",
    "Cookie": `laytime_auth_token=${supervisorCookie}`
  };

  const procHeaders = {
    "Content-Type": "application/json",
    "Cookie": `laytime_auth_token=${processorCookie}`
  };

  // 2. CLAIMS FULL LIFECYCLE
  console.log("\n--- 2. Claims Management & Lifecycle ---");
  let createdClaimId = "";
  {
    const newClaimPayload = {
      claimName: "MV Starlight Glory - Singapore Crude Discharge",
      accountName: "Trafigura Trading Pte Ltd",
      brokerName: "Braemar ACM",
      claimType: "Discharge Port Demurrage",
      shipName: "MV Starlight Glory",
      cpType: "BPVOY4",
      voyageNumber: "VOY-2024-88A",
      counterpartyName: "Shell Western Supply",
      counterpartyType: "Charterer",
      demurrageRatePerDay: 35000,
      claimFiledAmount: 105000,
      layday: "2024-07-01",
      cancellingDate: "2024-07-08",
      voyageEndDate: "2024-07-15",
      noticeReceivedDate: "2024-07-10",
      claimReceivedDate: "2024-07-20",
      charterpartyDate: "2024-06-15",
      ports: [
        {
          id: "port-sg-1",
          name: "Port of Singapore",
          portType: "Discharge Port",
          loadRate: 30000,
          berths: [
            {
              id: "berth-sg-1",
              name: "Jurong Island Jetty 4",
              quantity: 75000,
              prorataShare: 100,
              loadRate: 30000,
              cargoType: "Arabian Light Crude"
            }
          ]
        }
      ]
    };

    const res = await fetch(`${BASE_URL}/api/claims`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify(newClaimPayload)
    });
    assert(res.status === 201, "Supervisor created new claim successfully");
    const data = await res.json();
    assert(data.success && !!data.claim?.id, "Created claim object returned with ID");
    createdClaimId = data.claim?.id;
  }

  // Fetch created claim
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}`, {
      method: "GET",
      headers: supHeaders
    });
    assert(res.status === 200, `Claim details fetched for ${createdClaimId}`);
    const data = await res.json();
    assert(data.claim.shipName === "MV Starlight Glory", "Verified ship name matches");
    assert(data.claim.demurrageRatePerDay === 35000, "Verified demurrage rate is $35,000/day");
  }

  // 3. STATEMENT OF FACTS (SoF) CRUD
  console.log("\n--- 3. Statement of Facts (SoF) Events & Duration Logic ---");
  let newActId = "";
  {
    // Add activity
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/sof`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        activityName: "Commenced Cargo Discharge",
        startTime: "2024-07-11T08:00:00Z",
        stopTime: "2024-07-14T12:00:00Z",
        durationMinutes: 4560,
        durationFormatted: "3d 04h 00m",
        percentageCounted: 100,
        prorata: 100,
        deductionCategory: "Other",
        remarks: "Discharging Arabian Light crude"
      })
    });
    assert(res.status === 201, "Added SoF activity to claim");
    const data = await res.json();
    assert(data.success && !!data.activity?.id, "SoF activity returned with ID");
    newActId = data.activity?.id;
  }

  // Update activity
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/sof/${newActId}`, {
      method: "PUT",
      headers: supHeaders,
      body: JSON.stringify({
        activityName: "Discharging Operations (Revised)",
        percentageCounted: 90,
        remarks: "10% deduction applied for shore booster pump switch"
      })
    });
    assert(res.status === 200, "Updated SoF activity via PUT");
    const data = await res.json();
    assert(data.activity.percentageCounted === 90, "Verified updated percentageCounted = 90%");
  }

  // Add rain deduction activity
  let rainActId = "";
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/sof`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        activityName: "Heavy Monsoon Rain Delay",
        startTime: "2024-07-12T14:00:00Z",
        stopTime: "2024-07-12T20:00:00Z",
        durationMinutes: 360,
        durationFormatted: "06h 00m",
        percentageCounted: 50,
        prorata: 100,
        deductionCategory: "Rain",
        remarks: "50% counted under BPVOY4 Clause 17"
      })
    });
    assert(res.status === 201, "Added rain deduction activity");
    const data = await res.json();
    rainActId = data.activity?.id;
  }

  // Delete test activity
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/sof/${rainActId}`, {
      method: "DELETE",
      headers: supHeaders
    });
    assert(res.status === 200, "Deleted SoF activity via DELETE");
  }

  // 4. LAYTIME CALCULATIONS & OVERRIDE
  console.log("\n--- 4. Laytime Math Engine & Supervisor Override ---");
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/calculations`, {
      method: "GET",
      headers: supHeaders
    });
    assert(res.status === 200, "Laytime calculations computed");
    const data = await res.json();
    assert(data.calculation !== undefined, "Calculation payload returned");
    assert(typeof data.calculation.finalPayableAmount === "number", "Calculated final payable demurrage is numeric");
  }

  // Supervisor Override
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/override`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        overriddenDemurrage: 88500,
        overrideReason: "Agreed commercial compromise with Charterer regarding Jurong Island tidal constraints."
      })
    });
    assert(res.status === 200, "Supervisor applied calculation override");
    const data = await res.json();
    assert(data.claim.isOverridden === true || data.claim.overriddenDemurrage === 88500, "Claim is marked as overridden");
  }

  // 5. DISCREPANCIES & AUDIT
  console.log("\n--- 5. Discrepancy Detection & Missing Docs Audit ---");
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/missing-docs`, {
      method: "GET",
      headers: supHeaders
    });
    assert(res.status === 200, "Missing documents audit completed");
    const data = await res.json();
    assert(Array.isArray(data.missingDocuments), "Missing documents array returned");
  }

  // 6. OWNER VS INTERNAL COMPARISON
  console.log("\n--- 6. Owner vs Internal Reconciliation ---");
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/owner-comparison`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        ownerDemurrageAmount: 110000,
        ownerLaytimeHours: 75.4,
        internalDemurrageAmount: 88500,
        internalLaytimeHours: 60.7,
        differenceAmount: 21500,
        differenceHours: 14.7,
        explanation: "Owner failed to deduct shore pipeline pressure drops under Clause 21."
      })
    });
    assert(res.status === 200, "Owner comparison saved successfully");
    const data = await res.json();
    assert(data.comparison?.differenceAmount === 21500, "Variance amount stored accurately: $21,500");
  }

  // 7. TIMEBAR ENGINE & FOLLOW-UP CHASERS
  console.log("\n--- 7. Timebar Tracking & Automated Chasers ---");
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}/chasers`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        recipientEmail: "chartering@shell.com",
        subject: `[REMINDER] Outstanding Demurrage Settlement - MV Starlight Glory (${createdClaimId})`,
        templateType: "30_days_reminder",
        body: "Please find attached our demurrage calculation awaiting remittance.",
        scheduledDate: "2024-08-15"
      })
    });
    assert(res.status === 200, "Follow-up email chaser scheduled and logged");
    const data = await res.json();
    assert(data.chaser?.templateType === "30_days_reminder", "Chaser template verified");
  }

  // 8. RAC (RECOVERABLE ADDITIONAL COSTS) FULL LIFECYCLE
  console.log("\n--- 8. RAC Module Lifecycle & Calculation Engine ---");
  let racCaseId = "";
  {
    const res = await fetch(`${BASE_URL}/api/rac/cases`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        clientName: "Trafigura Trading Pte Ltd",
        shipName: "MV Starlight Glory",
        voyageNumber: "VOY-2024-88A",
        counterpartyName: "Jurong Port Terminal",
        racType: "Additional Port Costs",
        relevantDate: "2024-07-12",
        assignedTo: "Rohit Mengane",
        status: "Draft",
        totalAmount: 24500,
        agreedAmount: 0,
        outstandingAmount: 24500,
        deadlineDate: "2024-10-30",
        description: "Standby tug services during berth obstruction.",
        calculation: {
          id: `calc-${Date.now()}`,
          ruleVersion: "1.0",
          parameters: {
            baseRate: 1500,
            unitType: "Hours",
            graceAllowanceHours: 2.0
          },
          inputs: {
            quantityOrDuration: 18,
            counterpartyAllowance: 0,
            taxOrVatPercent: 0
          },
          adjustments: [
            { id: "adj-1", description: "Standard pilotage grace allowance", amount: 3000, isDeduction: true }
          ]
        }
      })
    });
    assert(res.status === 201, "Created new RAC Case");
    const data = await res.json();
    assert(data.success && !!data.case?.id, "RAC Case ID returned");
    racCaseId = data.case?.id;
  }

  // Transition RAC status: Draft -> Submitted -> Reviewed -> Closed
  {
    const res = await fetch(`${BASE_URL}/api/rac/cases/${racCaseId}`, {
      method: "PUT",
      headers: supHeaders,
      body: JSON.stringify({
        status: "Submitted",
        notes: "Case prepared with supporting berth timesheets."
      })
    });
    assert(res.status === 200, "RAC Case transitioned to 'Submitted'");
    const data = await res.json();
    assert(data.case.status === "Submitted", "Status verified: Submitted");
  }

  {
    const res = await fetch(`${BASE_URL}/api/rac/cases/${racCaseId}`, {
      method: "PUT",
      headers: supHeaders,
      body: JSON.stringify({
        status: "Reviewed",
        agreedAmount: 21500,
        outstandingAmount: 3000,
        notes: "Supervisor approved settlement amount: $21,500."
      })
    });
    assert(res.status === 200, "Supervisor authorized RAC case to 'Reviewed'");
    const data = await res.json();
    assert(data.case.status === "Reviewed", "Status verified: Reviewed");
  }

  // 9. OIL & CHEMICAL CALCULATOR (ASTM 54B)
  console.log("\n--- 9. Oil & Chemical Cargo Calculator (ASTM 54B) ---");
  {
    const res = await fetch(`${BASE_URL}/api/oil-chem`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
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
        hourlyRate: 1450,
        notes: "Terminal backpressure exceeded warranty limit."
      })
    });
    assert(res.status === 200 || res.status === 201, "Oil/Chem pumping calculation executed");
    const data = await res.json();
    assert(typeof data.calculation?.vcfFactor === "number", "ASTM 54B VCF factor computed");
    assert(typeof data.calculation?.allowedPumpingHours === "number", "Allowed pumping hours computed");
    assert(typeof data.calculation?.excessPumpingHours === "number", "Excess pumping hours evaluated");
  }

  // 10. TIMESHEET CSV IMPORTER
  console.log("\n--- 10. Timesheet CSV Importer ---");
  {
    const res = await fetch(`${BASE_URL}/api/timesheet/import`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        claimId: createdClaimId,
        action: "preview",
        fileName: "Singapore_Jurong_Timesheet.csv"
      })
    });
    assert(res.status === 200, "Timesheet CSV preview executed");
    const data = await res.json();
    assert(data.success && Array.isArray(data.previewRows), "Preview rows extracted from timesheet");
  }

  // 11. AI MARITIME ASSISTANT
  console.log("\n--- 11. AI Assistant Maritime Clause Query ---");
  {
    const res = await fetch(`${BASE_URL}/api/ai-assistant`, {
      method: "POST",
      headers: supHeaders,
      body: JSON.stringify({
        prompt: "How does Once on Demurrage Always on Demurrage apply under BPVOY4 Clause 18?"
      })
    });
    assert(res.status === 200, "AI Assistant interpreted maritime clause query");
    const data = await res.json();
    assert(typeof data.answer === "string" && data.answer.length > 0, "AI returned structured legal interpretation");
  }

  // 12. DASHBOARD & FINANCIAL REPORTING
  console.log("\n--- 12. Dashboard & Financial Reporting ---");
  {
    const res = await fetch(`${BASE_URL}/api/dashboard`, {
      method: "GET",
      headers: supHeaders
    });
    assert(res.status === 200, "Dashboard KPI metrics fetched");
    const data = await res.json();
    assert(data.metrics !== undefined, "Dashboard metrics verified");
  }

  {
    const res = await fetch(`${BASE_URL}/api/reports/financial`, {
      method: "GET",
      headers: supHeaders
    });
    assert(res.status === 200, "Executive financial reports generated");
    const data = await res.json();
    assert(data.summary !== undefined, "Financial summary verified");
  }

  // CLEANUP TEST CLAIM
  console.log("\n--- 13. Cleanup Test Claim ---");
  {
    const res = await fetch(`${BASE_URL}/api/claims/${createdClaimId}`, {
      method: "DELETE",
      headers: supHeaders
    });
    assert(res.status === 200, `Test claim ${createdClaimId} deleted cleanly`);
  }

  console.log("\n=========================================================");
  console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round(passedTests/totalTests*100)}%)`);
  console.log("=========================================================");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
