import Database from "better-sqlite3";
import { hashPasswordSync } from "@/lib/auth/password";
import { MOCK_CLAIMS, MOCK_DOCUMENTS } from "@/lib/mock/data";

export function seedDatabase(db: Database.Database) {
  // Check if users already seeded
  const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log("Seeding database with initial production-style dataset...");

  // 1. SEED USERS WITH BCRYPT HASHED PASSWORDS
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, username, password_hash, role, avatar, status, role_description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  const users = [
    {
      id: "usr-001",
      name: "Captain Alexander Drake",
      email: "admin@laytime.com",
      username: "alexander.drake",
      password: "Admin@123",
      role: "Admin",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Principal Administrator & Master Mariner. Unrestricted global access."
    },
    {
      id: "usr-002",
      name: "Sarah Jenkins",
      email: "processor@laytime.com",
      username: "sarah.jenkins",
      password: "Processor@123",
      role: "Claim Processor",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Senior Demurrage Analyst. Manages primary claim and RAC portfolios."
    },
    {
      id: "usr-003",
      name: "Marcus Aurelius Vance",
      email: "supervisor@laytime.com",
      username: "marcus.vance",
      password: "Supervisor@123",
      role: "Supervisor",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Operations Supervisor & Post-Fixture Lead. Full review and authorization authority."
    },
    {
      id: "usr-004",
      name: "Elena Rostova",
      email: "reviewer@laytime.com",
      username: "elena.rostova",
      password: "Reviewer@123",
      role: "Reviewer",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Legal Counsel & External Auditor. Read-only compliance inspection mode."
    }
  ];

  for (const u of users) {
    const hash = hashPasswordSync(u.password);
    insertUser.run(u.id, u.name, u.email, u.username, hash, u.role, u.avatar, "Active", u.roleDescription, now, now);
  }

  // 2. SEED CLAIMS, PORTS, BERTHS, SOF, DEDUCTIONS, DISCREPANCIES
  const insertClaim = db.prepare(`
    INSERT INTO claims (
      id, claim_name, account_name, broker_name, claim_status, claim_type, ship_name, cp_type,
      voyage_number, assigned_to, days_open, claim_closed, contentions, claim_notes, document_links,
      demurrage_rate_per_day, counterparty_name, counterparty_type, claim_filed_amount, received_claim_amount,
      agreed_amount, billable_amount, payment_received, payment_concluded, layday, cancelling_date,
      voyage_end_date, instruction_received_date, notice_received_date, claim_received_date,
      notice_timebar_days, claim_timebar_days, timebarred, claim_agreed_date, charterparty_date,
      days_awaiting_payment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPort = db.prepare(`
    INSERT INTO ports (id, claim_id, name, port_type, load_rate, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertBerth = db.prepare(`
    INSERT INTO berths (id, port_id, name, quantity, prorata_share, is_prorata_overridden, load_rate, cargo_type, receiver_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSoF = db.prepare(`
    INSERT INTO statement_of_facts (
      id, claim_id, port_id, berth_id, activity_name, start_time, stop_time, duration_minutes,
      duration_formatted, percentage_counted, prorata, deduction_category, remarks, is_ocr_extracted,
      is_corrected, ocr_confidence, original_ocr_values
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDiscrepancy = db.prepare(`
    INSERT INTO discrepancies (
      id, claim_id, rac_case_id, activity_id, type, severity, title, description,
      field, current_value, suggested_value, is_resolved, resolved_by, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOwnerComparison = db.prepare(`
    INSERT INTO owner_comparisons (
      id, claim_id, owner_demurrage_amount, owner_laytime_hours, internal_demurrage_amount,
      internal_laytime_hours, difference_amount, difference_hours, explanation,
      berth_comparisons_json, port_comparisons_json, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertChaser = db.prepare(`
    INSERT INTO email_followups (
      id, claim_id, recipient_email, subject, template_type, body, status,
      days_awaiting_payment, scheduled_date, sent_at, sent_by, response_received, response_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of MOCK_CLAIMS) {
    insertClaim.run(
      c.id, c.claimName, c.accountName, c.brokerName, c.claimStatus, c.claimType, c.shipName, c.cpType,
      c.voyageNumber || "VOY-2024-001", c.assignedTo || "Sarah Jenkins", c.daysOpen || 0, c.claimClosed ? 1 : 0,
      c.contentions || "", c.claimNotes || "", JSON.stringify(c.documentLinks || []),
      c.demurrageRatePerDay || 0, c.counterpartyName || "", c.counterpartyType || "Charterer",
      c.claimFiledAmount || 0, c.receivedClaimAmount || 0, c.agreedAmount || 0, c.billableAmount || 0,
      c.paymentReceived || 0, c.paymentConcluded ? 1 : 0, c.layday || "", c.cancellingDate || "",
      c.voyageEndDate || "", c.instructionReceivedDate || "", c.noticeReceivedDate || "", c.claimReceivedDate || "",
      c.noticeTimebarDays || 30, c.claimTimebarDays || 90, c.timebarred ? 1 : 0, c.claimAgreedDate || "",
      c.charterpartyDate || "", c.daysAwaitingPayment || 0, c.createdAt || now, c.updatedAt || now
    );

    // Insert Ports & Berths
    for (const p of c.ports || []) {
      insertPort.run(p.id, c.id, p.name, p.portType, p.loadRate, now);
      for (const b of p.berths || []) {
        insertBerth.run(b.id, p.id, b.name, b.quantity, b.prorataShare, b.isProrataOverridden ? 1 : 0, b.loadRate, b.cargoType || "", "");
      }
    }

    // Insert SoF Activities
    for (const a of c.activities || []) {
      insertSoF.run(
        a.id, c.id, a.portId || null, a.berthId || null, a.activityName, a.startTime, a.stopTime,
        a.durationMinutes, a.durationFormatted, a.percentageCounted, a.prorata, a.deductionCategory,
        a.remarks || "", a.isOcrExtracted ? 1 : 0, a.isCorrected ? 1 : 0, a.ocrConfidence || 1.0,
        a.originalOcrValues ? JSON.stringify(a.originalOcrValues) : null
      );
    }

    // Owner vs Internal calculation seed
    const ownerAmt = c.claimFiledAmount * 1.12;
    const ownerHrs = 72.5;
    const intAmt = c.claimFiledAmount;
    const intHrs = 64.0;
    insertOwnerComparison.run(
      `comp-${c.id}`,
      c.id,
      Math.round(ownerAmt),
      ownerHrs,
      Math.round(intAmt),
      intHrs,
      Math.round(ownerAmt - intAmt),
      Math.round((ownerHrs - intHrs) * 10) / 10,
      "Owner did not deduct 8.5 hours of documented Shore Crane breakdown under BPVOY4 Clause 18.",
      JSON.stringify([{
        berthName: c.ports?.[0]?.berths?.[0]?.name || "Berth 1",
        ownerHours: ownerHrs,
        internalHours: intHrs,
        diffHours: 8.5,
        ownerAmount: Math.round(ownerAmt),
        internalAmount: Math.round(intAmt),
        diffAmount: Math.round(ownerAmt - intAmt),
        notes: "Shore crane hydraulic pump breakdown deducted at 100% by Charterer."
      }]),
      JSON.stringify([{
        portName: c.ports?.[0]?.name || "Discharge Port",
        ownerAmount: Math.round(ownerAmt),
        internalAmount: Math.round(intAmt),
        diffAmount: Math.round(ownerAmt - intAmt),
        notes: "Net demurrage variance of $12,800 under contention."
      }]),
      "Marcus Aurelius",
      now
    );

    // Seed follow-up chaser if awaiting payment
    if ((c.daysAwaitingPayment || 0) > 25) {
      insertChaser.run(
        `chaser-${c.id}`,
        c.id,
        `claims@${c.accountName.toLowerCase().replace(/[^a-z]/g, "")}.com`,
        `[FOLLOW-UP] Outstanding Demurrage Settlement - ${c.shipName} (${c.id})`,
        (c.daysAwaitingPayment || 0) >= 90 ? "90_days_reminder" : "30_days_reminder",
        `Dear Counterparty,\n\nWe refer to Demurrage Claim ${c.id} for vessel ${c.shipName} in the amount of $${c.claimFiledAmount.toLocaleString()}. This file has been awaiting remittance for ${c.daysAwaitingPayment} days. Kindly provide the payment schedule at your earliest convenience.\n\nBest regards,\nDemurrage Operations`,
        "Sent",
        c.daysAwaitingPayment || 0,
        "2024-08-01",
        "2024-08-02T10:00:00Z",
        "Sarah Jenkins",
        0,
        ""
      );
    }
  }

  // 3. SEED DOCUMENTS & REVISIONS
  const insertDoc = db.prepare(`
    INSERT INTO documents (
      id, claim_id, claim_name, rac_case_id, file_name, file_size, file_type, category,
      version, uploaded_by, uploaded_at, modified_by, modified_at, status, ocr_confidence,
      extracted_items_count, error_reason, file_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDocRev = db.prepare(`
    INSERT INTO document_revisions (
      id, document_id, version, file_name, file_size, uploaded_by, uploaded_at, change_summary, file_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const d of MOCK_DOCUMENTS) {
    insertDoc.run(
      d.id, d.claimId || null, d.claimName || null, null, d.fileName, d.fileSize, d.fileType,
      d.type || "SOF", d.version || "1.0", "Captain Alexander Drake", d.uploadedAt || now,
      null, null, d.status, d.ocrConfidence || 0, d.extractedItemsCount || 0, d.errorReason || null,
      `/uploads/${d.fileName}`
    );

    insertDocRev.run(
      `rev-${d.id}-1`,
      d.id,
      "1.0",
      d.fileName,
      d.fileSize,
      "Captain Alexander Drake",
      d.uploadedAt || now,
      "Initial document upload and automated OCR intake",
      `/uploads/${d.fileName}`
    );
  }

  // 4. SEED RAC CASES, RAC CALCULATIONS, RAC DOCUMENTS, RAC STATUS HISTORY
  const insertRacCase = db.prepare(`
    INSERT INTO rac_cases (
      id, rac_reference, client_name, ship_name, voyage_number, counterparty_name,
      rac_type, relevant_date, assigned_to, status, total_amount, agreed_amount,
      outstanding_amount, deadline_date, description, notes, supporting_docs_count,
      claim_id, created_by, created_at, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRacCalc = db.prepare(`
    INSERT INTO rac_calculations (
      id, rac_case_id, rule_version, parameters_json, inputs_json, adjustments_json,
      calculated_result, formula_breakdown_json, explanation, calculation_status,
      reviewed_by, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRacStatusHistory = db.prepare(`
    INSERT INTO rac_status_history (
      id, rac_case_id, previous_status, new_status, changed_by, changed_at, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const racCases = [
    {
      id: "RAC-2024-001",
      racReference: "RAC/2024/08/001",
      clientName: "Trafigura Trading Pte Ltd",
      shipName: "MV Ocean Titan",
      voyageNumber: "VOY-2024-01A",
      counterpartyName: "Rotterdam Bulk Terminals NV",
      racType: "Demurrage Review",
      relevantDate: "2024-07-22",
      assignedTo: "Sarah Jenkins",
      status: "Under Review",
      totalAmount: 48500,
      agreedAmount: 42000,
      outstandingAmount: 6500,
      deadlineDate: "2024-09-15",
      description: "Excess tug & pilotage standby fees charged during extended Rotterdam anchorage wait.",
      notes: "Awaiting revised invoice from Port Authority with weather delay deductions.",
      supportingDocsCount: 3,
      claimId: "CLM-2024-001"
    },
    {
      id: "RAC-2024-002",
      racReference: "RAC/2024/08/002",
      clientName: "Glencore International AG",
      shipName: "MV Nordic Voyager",
      voyageNumber: "VOY-2024-02A",
      counterpartyName: "Jurong Port Pte Ltd",
      racType: "Pumping Warranty Contention",
      relevantDate: "2024-07-18",
      assignedTo: "Sarah Jenkins",
      status: "Submitted",
      totalAmount: 62400,
      agreedAmount: 0,
      outstandingAmount: 62400,
      deadlineDate: "2024-09-01",
      description: "Counter-claim for shore booster pump failure causing vessel discharge rate to drop below 3,000 MT/hr.",
      notes: "Logbook extracts and pressure gauge recordings provided in evidence bundle.",
      supportingDocsCount: 4,
      claimId: "CLM-2024-002"
    },
    {
      id: "RAC-2024-003",
      racReference: "RAC/2024/08/003",
      clientName: "Shell Global Eastern",
      shipName: "MT Pacific Glory",
      voyageNumber: "VOY-2024-03A",
      counterpartyName: "Enterprise Hydrocarbon Terminal",
      racType: "Additional Port Costs",
      relevantDate: "2024-07-05",
      assignedTo: "Marcus Aurelius Vance",
      status: "Reviewed",
      totalAmount: 31200,
      agreedAmount: 29500,
      outstandingAmount: 0,
      deadlineDate: "2024-08-30",
      description: "Additional shifting and line handling costs incurred due to berth congestion order.",
      notes: "Settlement agreement signed and passed to finance for closing.",
      supportingDocsCount: 2,
      claimId: "CLM-2024-003"
    },
    {
      id: "RAC-2024-004",
      racReference: "RAC/2024/08/004",
      clientName: "Cargill International SA",
      shipName: "MV Baltic Trader",
      voyageNumber: "VOY-2024-04A",
      counterpartyName: "Katoen Natie Grain Pier",
      racType: "Berth Allocation Audit",
      relevantDate: "2024-08-02",
      assignedTo: "Sarah Jenkins",
      status: "Correction Required",
      totalAmount: 19800,
      agreedAmount: 0,
      outstandingAmount: 19800,
      deadlineDate: "2024-09-10",
      description: "Disputed crane standby charges during rain stoppages at Antwerp Pier 1.",
      notes: "OCR discrepancy flagged conflicting timestamp on rain delay commencement.",
      supportingDocsCount: 3,
      claimId: "CLM-2024-004"
    },
    {
      id: "RAC-2024-005",
      racReference: "RAC/2024/08/005",
      clientName: "Gunvor Group",
      shipName: "MV Starlight Ace",
      voyageNumber: "VOY-2024-06A",
      counterpartyName: "Richards Bay Terminal Management",
      racType: "Special Cargo Handling",
      relevantDate: "2024-07-28",
      assignedTo: "Sarah Jenkins",
      status: "Draft",
      totalAmount: 54000,
      agreedAmount: 0,
      outstandingAmount: 54000,
      deadlineDate: "2024-10-01",
      description: "Dust suppression chemical additive charges and extended trimming standby.",
      notes: "Drafting preliminary calculation breakdown based on Richards Bay tariff schedule.",
      supportingDocsCount: 1,
      claimId: "CLM-2024-006"
    }
  ];

  for (const rac of racCases) {
    insertRacCase.run(
      rac.id, rac.racReference, rac.clientName, rac.shipName, rac.voyageNumber,
      rac.counterpartyName, rac.racType, rac.relevantDate, rac.assignedTo, rac.status,
      rac.totalAmount, rac.agreedAmount, rac.outstandingAmount, rac.deadlineDate,
      rac.description, rac.notes, rac.supportingDocsCount, rac.claimId,
      "Captain Alexander Drake", now, "Captain Alexander Drake", now
    );

    // Calculation breakdown for RAC case
    insertRacCalc.run(
      `calc-${rac.id}`,
      rac.id,
      "1.0",
      JSON.stringify({
        baseRate: 2500,
        unitType: "Hours",
        costCategories: [
          { category: "Pilotage Standby", unitCost: 1200, quantity: 14, total: 16800, deductiblePercent: 0 },
          { category: "Tug Standby & Assist", unitCost: 1800, quantity: 12, total: 21600, deductiblePercent: 0 },
          { category: "Port Dues Surcharge", unitCost: 3500, quantity: 2, total: 7000, deductiblePercent: 10 }
        ],
        taxOrVatPercent: 7.0,
        graceAllowanceHours: 2.0,
        prorataFactor: 1.0,
        customRuleDescription: "Port Authority Standard Tariff Clause 14 (Standby Tariffs)"
      }),
      JSON.stringify({
        quantityOrDuration: 28,
        agreedDailyOrHourlyRate: 2500,
        actualIncurredCost: rac.totalAmount,
        counterpartyAllowance: 3500
      }),
      JSON.stringify([
        { id: "adj-1", description: "Contractual 2-hour grace period allowance", amount: 3500, isDeduction: true }
      ]),
      rac.totalAmount,
      JSON.stringify([
        { step: "1. Gross Standby Hours", formula: "28 hours * $2,500/day equivalent", value: rac.totalAmount + 3500 },
        { step: "2. Grace Allowance Deduction", formula: "-2.0 hours allowance", value: -3500 },
        { step: "3. Net Recoverable Claim", formula: "Gross - Allowance", value: rac.totalAmount }
      ]),
      "Configurable RAC rule formula evaluated successfully under Port Tariff Ruleset 1.0.",
      rac.status === "Reviewed" ? "Approved" : "Verified",
      "Marcus Aurelius Vance",
      now
    );

    // Initial status history
    insertRacStatusHistory.run(
      `hist-${rac.id}-1`,
      rac.id,
      "Draft",
      rac.status,
      "Captain Alexander Drake",
      now,
      `RAC case initialized and transitioned to ${rac.status}`
    );
  }

  // 5. SEED NOTIFICATIONS
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, title, message, type, claim_id, claim_name, rac_case_id, rac_reference, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const notifications = [
    { id: "notif-1", title: "Timebar Approaching (14 Days)", message: "Claim CLM-2024-001 notice timebar expires on 2024-09-12. Action required.", type: "timebar", claimId: "CLM-2024-001", claimName: "MV Ocean Titan - Rotterdam Crude Discharge", racCaseId: null, racRef: null, isRead: 0 },
    { id: "notif-2", title: "OCR Discrepancy Flagged", message: "MV Baltic Trader Statement of Facts flagged start time after stop time on Rain entry.", type: "document", claimId: "CLM-2024-004", claimName: "MV Baltic Trader - Antwerp Grain Loading", racCaseId: null, racRef: null, isRead: 0 },
    { id: "notif-3", title: "RAC Case Pending Review", message: "RAC/2024/08/001 submitted by Trafigura requires supervisor approval.", type: "rac", claimId: null, claimName: null, racCaseId: "RAC-2024-001", racRef: "RAC/2024/08/001", isRead: 0 },
    { id: "notif-4", title: "Payment Follow-up (60 Days)", message: "MT Aegean Horizon payment overdue past 60 days. Escalation reminder queued.", type: "claim", claimId: "CLM-2024-005", claimName: "MT Aegean Horizon - Ras Tanura Loading", racCaseId: null, racRef: null, isRead: 1 }
  ];

  for (const n of notifications) {
    insertNotification.run(n.id, n.title, n.message, n.type, n.claimId, n.claimName, n.racCaseId, n.racRef, n.isRead, now);
  }

  // 6. SEED BUSINESS RULES & SETTINGS
  const insertRule = db.prepare(`
    INSERT INTO business_rules (id, key, value_json, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertRule.run(
    "rule_laytime_defaults",
    "laytime_defaults",
    JSON.stringify({
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
      companyName: "Maritime Global Energy Trading SA",
      companyAddress: "12 Marina Boulevard, Marina Bay Financial Centre, Singapore",
      companyContact: "claims@maritime-trading.com",
      companyPhone: "+65 6828 9000"
    }),
    "Captain Alexander Drake",
    now
  );

  console.log("Database seeded successfully with users, claims, RAC cases, and notifications.");
}
