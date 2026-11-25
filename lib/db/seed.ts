import Database from "better-sqlite3";
import { hashPasswordSync } from "@/lib/auth/password";
import { MOCK_CLAIMS, MOCK_DOCUMENTS } from "@/lib/mock/data";

export function seedDatabase(db: Database.Database) {
  // Always ensure benchmark dataset & demo users exist
  seedBenchmarkDataset(db);

  // Check if initial users already seeded
  const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  if (userCount > 4) {
    return; // Already seeded
  }

  console.log("Seeding database with initial production-style dataset...");

  const now = new Date().toISOString();

  // 0. SEED DEFAULT CLIENTS
  const insertClient = db.prepare(`
    INSERT OR IGNORE INTO clients (client_id, name, created_at)
    VALUES (?, ?, ?)
  `);
  insertClient.run("client-trafigura", "Trafigura Trading Pte Ltd", now);
  insertClient.run("client-sokana3", "Sokana3", now);
  insertClient.run("client-eastport", "Eastport USA LLC", now);
  insertClient.run("client-peregrine", "Peregrine Tankers", now);
  insertClient.run("client-norstar", "Norstar", now);

  // 1. SEED USERS WITH BCRYPT HASHED PASSWORDS
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, username, password_hash, role, client_id, client_name, created_by, avatar, status, role_description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    {
      id: "usr-001",
      name: "System Administrator",
      email: "admin@laytime.demo",
      username: "admin.laytime",
      password: process.env.ADMIN_PASSWORD || process.env.DEMO_ADMIN_PASSWORD || "AdminSecurePass@2024!",
      role: "Admin",
      clientId: null,
      clientName: null,
      createdBy: null,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Principal Administrator & Master Mariner. Unrestricted global access."
    },
    {
      id: "usr-002",
      name: "Senior Demurrage Analyst",
      email: "processor1@laytime.demo",
      username: "processor1.laytime",
      password: process.env.PROCESSOR1_PASSWORD || process.env.DEMO_PROCESSOR_PASSWORD || "Proc1SecurePass@2024!",
      role: "Claim Processor",
      clientId: null,
      clientName: null,
      createdBy: "usr-003",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Senior Demurrage Analyst. Manages primary claim and RAC portfolios."
    },
    {
      id: "usr-003",
      name: "Operations Supervisor",
      email: "supervisor@laytime.demo",
      username: "supervisor.laytime",
      password: process.env.SUPERVISOR_PASSWORD || process.env.DEMO_SUPERVISOR_PASSWORD || "SuperSecurePass@2024!",
      role: "Supervisor",
      clientId: null,
      clientName: null,
      createdBy: "usr-001",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Operations Supervisor & Post-Fixture Lead. Full review and authorization authority."
    },
    {
      id: "usr-004",
      name: "Compliance Reviewer",
      email: "reviewer@laytime.demo",
      username: "reviewer.laytime",
      password: process.env.REVIEWER_PASSWORD || process.env.DEMO_REVIEWER_PASSWORD || "ReviewerSecurePass@2024!",
      role: "Reviewer",
      clientId: null,
      clientName: null,
      createdBy: "usr-001",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Legal Counsel & External Auditor. Read-only compliance inspection mode."
    },
    {
      id: "usr-006",
      name: "Trafigura Commercial",
      email: "client1@laytime.demo",
      username: "client1.laytime",
      password: process.env.CLIENT_PASSWORD || process.env.DEMO_CLIENT_PASSWORD || "ClientSecurePass@2024!",
      role: "Client",
      clientId: "client-trafigura",
      clientName: "Trafigura Trading Pte Ltd",
      createdBy: "usr-002",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roleDescription: "External Client Counterparty Portal. View own claims, summaries, and approve final offers."
    },
    {
      id: "usr-client-sokana",
      name: "Sokana Operations",
      email: "client.sokana@laytime.com",
      username: "client.sokana",
      password: "Client@123",
      role: "Client",
      clientId: "client-sokana3",
      clientName: "Sokana3",
      createdBy: "usr-001",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Sokana Client Portal. Access to all Sokana demurrage claims and updates."
    },
    {
      id: "usr-client-eastport",
      name: "Eastport USA Commercial",
      email: "client.eastport@laytime.com",
      username: "client.eastport",
      password: "Client@123",
      role: "Client",
      clientId: "client-eastport",
      clientName: "Eastport USA LLC",
      createdBy: "usr-001",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Eastport USA Client Portal. Access to Eastport voyage claims."
    },
    {
      id: "usr-client-peregrine",
      name: "Peregrine Tankers Commercial",
      email: "client.peregrine@laytime.com",
      username: "client.peregrine",
      password: "Client@123",
      role: "Client",
      clientId: "client-peregrine",
      clientName: "Peregrine Tankers",
      createdBy: "usr-001",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Peregrine Tankers Client Portal. Access to Peregrine claims."
    },
    {
      id: "usr-client-norstar",
      name: "Norstar Shipping Lead",
      email: "client.norstar@laytime.com",
      username: "client.norstar",
      password: "Client@123",
      role: "Client",
      clientId: "client-norstar",
      clientName: "Norstar",
      createdBy: "usr-001",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roleDescription: "Norstar Client Portal. Access to Norstar voyage claims."
    }
  ];

  // Pass 1: Insert users with created_by = null to avoid self-referencing foreign key constraint violations
  for (const u of users) {
    const hash = hashPasswordSync(u.password);
    insertUser.run(u.id, u.name, u.email, u.username, hash, u.role, u.clientId, u.clientName, null, u.avatar, "Active", u.roleDescription, now, now);
  }

  // Pass 2: Set created_by now that all referenced users exist
  const updateUserCreatedBy = db.prepare(`
    UPDATE users SET created_by = ? WHERE id = ?
  `);
  for (const u of users) {
    if (u.createdBy) {
      updateUserCreatedBy.run(u.createdBy, u.id);
    }
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

  // 7. AUTO-INGEST LaytimeServicesTracker.csv
  try {
    const fs = require("fs");
    const path = require("path");
    const csvPath = path.join(process.cwd(), "LaytimeServicesTracker.csv");
    if (fs.existsSync(csvPath)) {
      const text = fs.readFileSync(csvPath, "utf8");
      // Basic CSV parser
      const parseCSV = (t: string) => {
        const rows: string[][] = [];
        let row: string[] = [];
        let token = "";
        let inQ = false;
        for (let i = 0; i < t.length; i++) {
          const c = t[i];
          const next = t[i + 1];
          if (c === '"') {
            if (inQ && next === '"') { token += '"'; i++; } else { inQ = !inQ; }
          } else if (c === ',' && !inQ) {
            row.push(token); token = "";
          } else if ((c === '\r' || c === '\n') && !inQ) {
            if (c === '\r' && next === '\n') i++;
            row.push(token); token = "";
            if (row.some(cell => cell.trim().length > 0)) rows.push(row);
            row = [];
          } else { token += c; }
        }
        if (token.length > 0 || row.length > 0) {
          row.push(token);
          if (row.some(cell => cell.trim().length > 0)) rows.push(row);
        }
        return rows;
      };

      const rows = parseCSV(text);
      const cleanNum = (val: any) => {
        if (!val) return 0;
        const n = parseFloat(String(val).replace(/,/g, "").trim());
        return isNaN(n) ? 0 : n;
      };

      const parseDt = (dStr: string) => {
        if (!dStr) return null;
        const s = dStr.trim();
        if (s === "13/02/1900" || s.endsWith("1900") || s.length < 8) return null;
        const parts = s.split(/[\/\-]/);
        if (parts.length === 3) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          if (day > 0 && day <= 31 && month > 0 && month <= 12) {
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          }
        }
        return s;
      };

      const insertTrackerClaim = db.prepare(`
        INSERT OR REPLACE INTO claims (
          id, client_id, claim_name, account_name, broker_name, claim_status, claim_type, ship_name,
          cp_type, voyage_number, assigned_to, days_open, claim_closed, contentions, claim_notes,
          document_links, demurrage_rate_per_day, counterparty_name, counterparty_type, claim_filed_amount,
          received_claim_amount, agreed_amount, billable_amount, payment_received, payment_concluded,
          layday, cancelling_date, voyage_end_date, instruction_received_date, notice_received_date,
          claim_received_date, notice_timebar_days, claim_timebar_days, timebarred, claim_agreed_date,
          charterparty_date, days_awaiting_payment, invoice_number, tax_year, bl_quantity,
          owners_claim_amount, claim_timebar_date, claim_filed_date, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      const dataRows = rows.slice(1);
      const tx = db.transaction((items: string[][]) => {
        for (const r of items) {
          const claimId = r[0]?.trim();
          if (!claimId) continue;
          const account = r[1]?.trim() || "Sokana3";
          let clientId = "client-sokana3";
          if (account.includes("Eastport")) clientId = "client-eastport";
          else if (account.includes("Peregrine")) clientId = "client-peregrine";
          else if (account.includes("Norstar")) clientId = "client-norstar";

          const openDaysPlus = cleanNum(r[2]);
          const claimStatus = r[3]?.trim() || "Submitted";
          const shipName = r[4]?.trim() || "Unknown Vessel";
          const voyageNo = r[5]?.trim() || "";
          const cpDate = parseDt(r[6]);
          const charterer = r[7]?.trim() || "";
          const broker = r[8]?.trim() || "";
          const claimFiledDate = parseDt(r[9]);
          const filedAmount = cleanNum(r[10]);
          const agreedAmount = cleanNum(r[11]);
          const claimType = r[12]?.trim() || "Demurrage";
          const notes = r[13]?.trim() || "";
          const invoiceNo = r[14]?.trim() || "";
          const agreedDate = parseDt(r[15]);
          const paymentReceived = cleanNum(r[16]);
          const counterparty = r[17]?.trim() || charterer;
          const contractType = r[18]?.trim() || "CP";
          const layday = parseDt(r[19]);
          const cancelling = parseDt(r[20]);
          const instructionReceived = parseDt(r[21]);
          const blQuantity = r[22]?.trim() || "";
          const voyageEnds = parseDt(r[23]);
          const claimReceived = parseDt(r[24]);
          const timebarDays = cleanNum(r[25]) || 45;
          const timebarDate = parseDt(r[26]);
          const timebarred = r[27]?.trim().toLowerCase() === "true" ? 1 : 0;
          const ownersClaim = cleanNum(r[28]);
          const openDays = cleanNum(r[29]) || openDaysPlus;
          const paymentConcluded = r[30]?.trim().toLowerCase() === "true" ? 1 : 0;
          const claimClosed = (r[31]?.trim().toLowerCase() === "true" || claimStatus.includes("Claim Closed") || claimStatus.includes("Write Off")) ? 1 : 0;
          const billableAmount = cleanNum(r[32]);
          const taxYear = r[33]?.trim() || "2024-2025";
          const claimName = `${shipName} - ${charterer || "Voyage"} (${claimId})`;
          const assignedTo = "Rohit Mengane";
          const createdAt = instructionReceived ? `${instructionReceived}T08:00:00.000Z` : (cpDate ? `${cpDate}T08:00:00.000Z` : now);

          insertTrackerClaim.run(
            claimId, clientId, claimName, account, broker, claimStatus, claimType, shipName,
            contractType, voyageNo, assignedTo, openDays, claimClosed, "", notes,
            JSON.stringify([]), 0, counterparty, "Charterer", filedAmount,
            ownersClaim, agreedAmount, billableAmount, paymentReceived, paymentConcluded,
            layday || "", cancelling || "", voyageEnds || "", instructionReceived || "", "",
            claimReceived || "", 30, timebarDays, timebarred, agreedDate || "",
            cpDate || "", 0, invoiceNo, taxYear, blQuantity,
            ownersClaim, timebarDate || "", claimFiledDate || "", createdAt, now
          );
        }
      });
      tx(dataRows);
      console.log(`Auto-seeded ${dataRows.length} claims from LaytimeServicesTracker.csv`);
    }
  } catch (trackerErr) {
    console.warn("Tracker CSV auto-ingestion error:", trackerErr);
  }

  console.log("Database seeded successfully with users, claims, RAC cases, and notifications.");
}

export function seedBenchmarkDataset(db: Database.Database) {
  const now = new Date().toISOString();

  // 0. ENSURE DEFAULT CLIENTS
  const insertClient = db.prepare(`
    INSERT OR IGNORE INTO clients (client_id, name, created_at)
    VALUES (?, ?, ?)
  `);
  insertClient.run("client-trafigura", "Trafigura Trading Pte Ltd", now);
  insertClient.run("client-sokana3", "Sokana3", now);
  insertClient.run("client-eastport", "Eastport USA LLC", now);
  insertClient.run("client-peregrine", "Peregrine Tankers", now);
  insertClient.run("client-norstar", "Norstar", now);

  // 1. SEED 4 DEMO USERS (admin@laytime.io, supervisor@laytime.io, processor@laytime.io, reviewer@laytime.io)
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, name, email, username, password_hash, role, client_id, client_name,
      created_by, avatar, status, role_description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoUsers = [
    {
      id: "usr-io-admin",
      name: "System Administrator",
      email: "admin@laytime.io",
      username: "admin.io",
      password: "Admin@123",
      role: "Admin",
      roleDescription: "Principal Administrator & Master Mariner. Full system & user governance."
    },
    {
      id: "usr-io-supervisor",
      name: "Operations Supervisor",
      email: "supervisor@laytime.io",
      username: "supervisor.io",
      password: "Super@123",
      role: "Supervisor",
      roleDescription: "Operations Supervisor & Post-Fixture Lead. Claim overrides & RAC authorisation."
    },
    {
      id: "usr-io-processor",
      name: "Senior Demurrage Analyst",
      email: "processor@laytime.io",
      username: "processor.io",
      password: "Proc@123",
      role: "Claim Processor",
      roleDescription: "Senior Demurrage Analyst. Manages primary assigned claims, SoF & laytime engine."
    },
    {
      id: "usr-io-reviewer",
      name: "Compliance Reviewer",
      email: "reviewer@laytime.io",
      username: "reviewer.io",
      password: "Review@123",
      role: "Reviewer",
      roleDescription: "Legal Counsel & External Auditor. Read-only compliance inspection mode (HTTP 403 on edits)."
    }
  ];

  for (const u of demoUsers) {
    const hash = hashPasswordSync(u.password);
    insertUser.run(
      u.id, u.name, u.email, u.username, hash, u.role, null, null,
      null, `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      "Active", u.roleDescription, now, now
    );
  }

  // 2. SEED BENCHMARK CLAIMS (CLM-0001 through CLM-0008)
  const insertClaim = db.prepare(`
    INSERT OR IGNORE INTO claims (
      id, client_id, claim_name, account_name, broker_name, claim_status, claim_type, ship_name,
      cp_type, voyage_number, assigned_to, days_open, claim_closed, contentions, claim_notes,
      document_links, demurrage_rate_per_day, counterparty_name, counterparty_type,
      claim_filed_amount, received_claim_amount, agreed_amount, billable_amount,
      payment_received, payment_concluded, layday, cancelling_date, voyage_end_date,
      instruction_received_date, notice_received_date, claim_received_date,
      notice_timebar_days, claim_timebar_days, timebarred, claim_agreed_date,
      charterparty_date, days_awaiting_payment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPort = db.prepare(`
    INSERT OR IGNORE INTO ports (id, claim_id, name, port_type, load_rate, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertBerth = db.prepare(`
    INSERT OR IGNORE INTO berths (id, port_id, name, quantity, prorata_share, is_prorata_overridden, load_rate, cargo_type, receiver_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSoF = db.prepare(`
    INSERT OR IGNORE INTO statement_of_facts (
      id, claim_id, port_id, berth_id, activity_name, start_time, stop_time, duration_minutes,
      duration_formatted, percentage_counted, prorata, deduction_category, remarks, is_ocr_extracted,
      is_corrected, ocr_confidence, original_ocr_values
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDeduction = db.prepare(`
    INSERT OR IGNORE INTO deductions (
      id, claim_id, type, start_time, stop_time, percentage_time, prorata, deduction_hours, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCalc = db.prepare(`
    INSERT OR IGNORE INTO laytime_calculations (
      id, claim_id, demurrage_rate_per_day, total_gross_minutes, total_deductions_minutes,
      total_net_laytime_minutes, total_allowed_minutes, net_demurrage_minutes, net_despatch_minutes,
      calculated_demurrage_amount, calculated_despatch_amount, final_payable_amount,
      port_calculations_json, timebar_compliance_json, assumptions_json, calculated_by, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDiscrepancy = db.prepare(`
    INSERT OR IGNORE INTO discrepancies (
      id, claim_id, rac_case_id, activity_id, type, severity, title, description,
      field, current_value, suggested_value, is_resolved, resolved_by, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // --- CLM-0001: Benchmark Deterministic Engine ---
  // Gross: 96h (5760m) - Deductions: 12h (720m) = 84h net (5040m) vs 72h allowed (4320m) = 12h excess (720m) @ $20,000/day = $10,000 Demurrage
  insertClaim.run(
    "CLM-0001", "client-trafigura", "MT Polar Navigator - Rotterdam Discharging Demurrage",
    "Trafigura Trading Pte Ltd", "Clarksons Platou", "2. Calculated", "Demurrage", "MT Polar Navigator",
    "BPVOY4", "VOY-2026-001", "processor@laytime.io", 14, 0,
    "12 hours excess discharge laytime due to port shifting and storm stoppage.",
    "Benchmark verified file. 96h gross - 12h rain/shifting = 84h net vs 72h allowed = 12h excess @ $20k/day = $10,000 demurrage.",
    JSON.stringify(["/uploads/SOF_PolarNavigator_Rotterdam.pdf"]), 20000.0, "Equinor ASA", "Charterer",
    10000.0, 0, 0, 10000.0, 0, 0,
    "2026-01-08T00:00:00.000Z", "2026-01-10T00:00:00.000Z", "2026-01-14T06:00:00.000Z",
    "2026-01-15T00:00:00.000Z", "2026-01-10T06:00:00.000Z", "2026-01-15T00:00:00.000Z",
    30, 90, 0, "", "2026-01-02T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0001-1", "CLM-0001", "Rotterdam", "Discharge", 10000, now);
  insertBerth.run("berth-clm-0001-1", "port-clm-0001-1", "Vopak Europoort Berth 2", 30000, 100, 0, 10000, "Crude Oil", "Vopak");

  // SoF events for CLM-0001 (total: 5760 mins gross, 720 mins deducted, 5040 mins net)
  insertSoF.run("sof-clm-0001-1", "CLM-0001", "port-clm-0001-1", "berth-clm-0001-1", "NOR Tendered & Accepted", "2026-01-10T06:00:00.000Z", "2026-01-10T08:00:00.000Z", 120, "02h 00m", 100, 100, "Normal Operations", "NOR tendered and acknowledged by Terminal", 0, 0, 1.0, null);
  insertSoF.run("sof-clm-0001-2", "CLM-0001", "port-clm-0001-1", "berth-clm-0001-1", "Discharging operations commenced", "2026-01-10T08:00:00.000Z", "2026-01-11T12:00:00.000Z", 1680, "28h 00m", 100, 100, "Normal Operations", "Initial crude discharge manifold active", 0, 0, 1.0, null);
  insertSoF.run("sof-clm-0001-3", "CLM-0001", "port-clm-0001-1", "berth-clm-0001-1", "Vessel Shifting Berth under Charterer Orders", "2026-01-11T12:00:00.000Z", "2026-01-11T18:00:00.000Z", 360, "06h 00m", 0, 100, "Shifting", "Charterer requested shifting (0% counted)", 0, 0, 1.0, null);
  insertSoF.run("sof-clm-0001-4", "CLM-0001", "port-clm-0001-1", "berth-clm-0001-1", "Discharging operations resumed", "2026-01-11T18:00:00.000Z", "2026-01-12T14:00:00.000Z", 1200, "20h 00m", 100, 100, "Normal Operations", "Second stage discharge rate stabilized", 0, 0, 1.0, null);
  insertSoF.run("sof-clm-0001-5", "CLM-0001", "port-clm-0001-1", "berth-clm-0001-1", "Severe Rain Storm & Cargo Suspension", "2026-01-12T14:00:00.000Z", "2026-01-12T20:00:00.000Z", 360, "06h 00m", 0, 100, "Weather", "Heavy storm rainfall; manifold valves secured (0% counted)", 0, 0, 1.0, null);
  insertSoF.run("sof-clm-0001-6", "CLM-0001", "port-clm-0001-1", "berth-clm-0001-1", "Discharge completed & hoses disconnected", "2026-01-12T20:00:00.000Z", "2026-01-14T06:00:00.000Z", 2040, "34h 00m", 100, 100, "Normal Operations", "Final drainage and ullage sounding verification", 0, 0, 1.0, null);

  // Deductions rows for CLM-0001
  insertDeduction.run("ded-clm-0001-1", "CLM-0001", "Shifting", "2026-01-11T12:00:00.000Z", "2026-01-11T18:00:00.000Z", 100, 100, 6.0, "Shifting berths under charterer instructions");
  insertDeduction.run("ded-clm-0001-2", "CLM-0001", "Weather", "2026-01-12T14:00:00.000Z", "2026-01-12T20:00:00.000Z", 100, 100, 6.0, "Heavy rain storm preventing safe cargo pumping");

  // Calculations row for CLM-0001
  insertCalc.run(
    "calc-clm-0001", "CLM-0001", 20000.0, 5760, 720, 5040, 4320, 720, 0,
    10000.0, 0.0, 10000.0,
    JSON.stringify([{ portName: "Rotterdam", allowedMinutes: 4320, netLaytimeMinutes: 5040 }]),
    JSON.stringify({ isNoticeValid: true, isClaimValid: true, isTimebarred: false }),
    JSON.stringify({ laytimeRule: "OOD_AOD", weekendRule: "SHEX", defaultDemurrageRate: 20000 }),
    "processor@laytime.io", now
  );

  // --- CLM-0002: Calculated Claim ---
  insertClaim.run(
    "CLM-0002", "client-sokana3", "MT Celtic Sea - Le Havre Discharge",
    "Sokana3", "Simpson Spence Young", "2. Calculated", "Demurrage", "MT Celtic Sea",
    "ASBATANKVOY", "VOY-2026-002", "processor@laytime.io", 18, 0,
    "Disputed line displacement deduction.", "Calculated file ready for client review.",
    JSON.stringify([]), 22000.0, "TotalEnergies Trading", "Charterer",
    18500.0, 0, 0, 18500.0, 0, 0,
    "2026-01-12T00:00:00.000Z", "2026-01-14T00:00:00.000Z", "2026-01-18T12:00:00.000Z",
    "2026-01-19T00:00:00.000Z", "2026-01-14T10:00:00.000Z", "2026-01-19T00:00:00.000Z",
    30, 90, 0, "", "2026-01-05T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0002-1", "CLM-0002", "Le Havre", "Discharge", 12000, now);
  insertBerth.run("berth-clm-0002-1", "port-clm-0002-1", "Total Terminal Berth 1", 36000, 100, 0, 12000, "Crude Oil", "Total");

  // --- CLM-0003: In Negotiation ---
  insertClaim.run(
    "CLM-0003", "client-eastport", "MT Nordic Voyager - Singapore Jurong Settlement",
    "Eastport USA LLC", "Braemar ACM", "5. In Negotiation", "Demurrage", "MT Nordic Voyager",
    "SHELLVOY6", "VOY-2026-003", "processor@laytime.io", 42, 0,
    "Counterparty offered $32,000 against original filing of $38,000.", "Active counter-offer round 2.",
    JSON.stringify([]), 25000.0, "Glencore Singapore", "Charterer",
    38000.0, 0, 32000.0, 32000.0, 0, 0,
    "2025-12-15T00:00:00.000Z", "2025-12-18T00:00:00.000Z", "2025-12-24T18:00:00.000Z",
    "2025-12-25T00:00:00.000Z", "2025-12-19T08:00:00.000Z", "2025-12-25T00:00:00.000Z",
    30, 90, 0, "", "2025-12-08T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0003-1", "CLM-0003", "Singapore", "Discharge", 15000, now);
  insertBerth.run("berth-clm-0003-1", "port-clm-0003-1", "Jurong Island Berth 4", 45000, 100, 0, 15000, "Clean Petroleum", "Jurong Port");

  // --- CLM-0004: Disputed Claim ---
  insertClaim.run(
    "CLM-0004", "client-trafigura", "MT Atlantic Breeze - Houston Weather Dispute",
    "Trafigura Trading Pte Ltd", "Clarksons Platou", "8. Disputed", "Demurrage", "MT Atlantic Breeze",
    "BPVOY4", "VOY-2026-004", "processor@laytime.io", 65, 0,
    "Charterer disputes 18 hours fog delay under Force Majeure clause.", "Formal legal contention issued.",
    JSON.stringify([]), 28000.0, "Valero Marketing", "Charterer",
    45000.0, 0, 0, 45000.0, 0, 0,
    "2025-11-20T00:00:00.000Z", "2025-11-23T00:00:00.000Z", "2025-11-30T10:00:00.000Z",
    "2025-12-01T00:00:00.000Z", "2025-11-24T06:00:00.000Z", "2025-12-01T00:00:00.000Z",
    30, 90, 0, "", "2025-11-10T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0004-1", "CLM-0004", "Houston", "Discharge", 14000, now);
  insertBerth.run("berth-clm-0004-1", "port-clm-0004-1", "Houston Fuel Oil Terminal", 42000, 100, 0, 14000, "Fuel Oil", "Valero");

  // --- CLM-0005: Benchmark Timebar Critical (Notice 30-day deadline: Day 28 of 30) ---
  insertClaim.run(
    "CLM-0005", "client-peregrine", "MT Pacific Dawn - Singapore Timebar Notice Alarm",
    "Peregrine Tankers", "Gibson Shipbrokers", "1. Pending Review", "Demurrage", "MT Pacific Dawn",
    "BPVOY4", "VOY-2026-005", "processor@laytime.io", 28, 0,
    "CRITICAL TIMEBAR NOTICE: 28 days elapsed out of 30-day charterparty notice limitation.",
    "Immediate action required: notice chaser must be dispatched within 48 hours to preserve claim validity.",
    JSON.stringify([]), 24000.0, "PetroChina International", "Charterer",
    16500.0, 0, 0, 16500.0, 0, 0,
    "2026-01-02T00:00:00.000Z", "2026-01-04T00:00:00.000Z", "2026-01-26T00:00:00.000Z",
    "2026-01-26T00:00:00.000Z", "2026-01-04T08:00:00.000Z", "2026-01-26T00:00:00.000Z",
    30, 90, 0, "", "2025-12-20T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0005-1", "CLM-0005", "Singapore", "Discharge", 12000, now);
  insertBerth.run("berth-clm-0005-1", "port-clm-0005-1", "Bukom Island Berth 3", 36000, 100, 0, 12000, "Clean Petroleum", "Shell");

  // --- CLM-0006: Benchmark OCR & Discrepancy Detection ---
  // Features: 72% low-confidence OCR badge + Overlapping activity timestamps on ALT 4
  insertClaim.run(
    "CLM-0006", "client-norstar", "MT Baltic Horizon - Antwerp OCR Discrepancy Audit",
    "Norstar", "Clarksons Platou", "1. Pending Review", "Demurrage", "MT Baltic Horizon",
    "GENCON 94", "VOY-2026-006", "processor@laytime.io", 12, 0,
    "OCR anomalies flagged: low-confidence timestamp reading (72%) and overlapping operational events.",
    "Automated OCR scan flagged 2 discrepancy items requiring analyst verification.",
    JSON.stringify(["/uploads/SOF_BalticHorizon_Antwerp_Scanned.pdf"]), 21000.0, "BASF Antwerpen NV", "Charterer",
    22000.0, 0, 0, 22000.0, 0, 0,
    "2026-01-28T00:00:00.000Z", "2026-01-30T00:00:00.000Z", "2026-02-02T12:00:00.000Z",
    "2026-02-03T00:00:00.000Z", "2026-01-30T10:00:00.000Z", "2026-02-03T00:00:00.000Z",
    30, 90, 0, "", "2026-01-15T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0006-1", "CLM-0006", "Antwerp", "Discharge", 10000, now);
  insertBerth.run("berth-clm-0006-1", "port-clm-0006-1", "Antwerp Liquid Terminal 4", 30000, 100, 0, 10000, "Chemical Feedstock", "BASF");

  // SoF for CLM-0006 with low confidence OCR and overlapping timestamps
  insertSoF.run(
    "sof-clm-0006-1", "CLM-0006", "port-clm-0006-1", "berth-clm-0006-1",
    "Discharge crude oil cargo", "2026-02-01T08:00:00.000Z", "2026-02-01T14:00:00.000Z",
    360, "06h 00m", 100, 100, "Normal Operations",
    "Scanned Statement of Facts line 14: blurred numeric ink.", 1, 0, 0.72,
    JSON.stringify({ rawText: "08:00 - 14:00 Discharging", ocrConfidence: 0.72 })
  );
  insertSoF.run(
    "sof-clm-0006-2", "CLM-0006", "port-clm-0006-1", "berth-clm-0006-1",
    "Bunkering alongside tanker", "2026-02-01T12:00:00.000Z", "2026-02-01T16:00:00.000Z",
    240, "04h 00m", 100, 100, "Bunkering",
    "Bunkering barge alongside; overlaps with discharge on same berth.", 1, 0, 0.95, null
  );
  insertSoF.run(
    "sof-clm-0006-3", "CLM-0006", "port-clm-0006-1", "berth-clm-0006-1",
    "Final hose disconnection", "2026-02-01T16:00:00.000Z", "2026-02-02T10:00:00.000Z",
    1080, "18h 00m", 100, 100, "Normal Operations", "Cargo completion certified by surveyor", 1, 0, 0.98, null
  );

  // Discrepancies rows for CLM-0006
  insertDiscrepancy.run(
    "disc-clm-0006-1", "CLM-0006", null, "sof-clm-0006-1", "low_confidence", "warning",
    "Low OCR Extraction Confidence (72%)",
    "OCR model returned 72% confidence on 'Discharge crude oil cargo'. Smudged time character '14:00' detected.",
    "ocrConfidence", "72%", "Verify against original PDF scan", 0, null, null
  );
  insertDiscrepancy.run(
    "disc-clm-0006-2", "CLM-0006", null, "sof-clm-0006-2", "overlapping_timestamps", "error",
    "Overlapping Activity Timestamps",
    "Activity 'Bunkering alongside tanker' (12:00-16:00) overlaps with 'Discharge crude oil cargo' (08:00-14:00) on berth Antwerp Liquid Terminal 4.",
    "startTime", "2026-02-01T12:00:00.000Z", "2026-02-01T14:00:00.000Z", 0, null, null
  );

  // --- CLM-0007: Approved Settlement ---
  insertClaim.run(
    "CLM-0007", "client-trafigura", "MT Mediterranean Star - Augusta Settlement",
    "Trafigura Trading Pte Ltd", "Clarksons Platou", "7. Approved", "Demurrage", "MT Mediterranean Star",
    "BPVOY4", "VOY-2026-007", "processor@laytime.io", 40, 0,
    "Fully approved commercial compromise of $29,000.", "Passed to Finance for final invoice generation.",
    JSON.stringify([]), 26000.0, "Eni Trading & Shipping", "Charterer",
    29000.0, 0, 29000.0, 29000.0, 0, 0,
    "2025-12-01T00:00:00.000Z", "2025-12-03T00:00:00.000Z", "2025-12-10T14:00:00.000Z",
    "2025-12-11T00:00:00.000Z", "2025-12-04T08:00:00.000Z", "2025-12-11T00:00:00.000Z",
    30, 90, 0, "2026-01-10T00:00:00.000Z", "2025-11-20T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0007-1", "CLM-0007", "Augusta", "Discharge", 11000, now);
  insertBerth.run("berth-clm-0007-1", "port-clm-0007-1", "Sonatrach Refineria Jetty 2", 33000, 100, 0, 11000, "Vacuum Gasoil", "Sonatrach");

  // --- CLM-0008: Benchmark Timebar Expired (125 days open / 90-day timebar -> Legal Escalation) ---
  insertClaim.run(
    "CLM-0008", "client-trafigura", "MT Arabian Sea - Fujairah Escalated Claim",
    "Trafigura Trading Pte Ltd", "Clarksons Platou", "9. Legal", "Demurrage", "MT Arabian Sea",
    "BPVOY4", "VOY-2026-008", "processor@laytime.io", 125, 0,
    "CLAIM TIMEBARRED & ESCALATED: 125 days elapsed post-discharge, exceeding the strict 90-day BPVOY4 Clause 20 limitation.",
    "Escalated to External Legal Counsel. Awaiting legal response on bilateral waiver.",
    JSON.stringify([]), 30000.0, "ADNOC Global Trading", "Charterer",
    62000.0, 0, 0, 62000.0, 0, 0,
    "2025-09-10T00:00:00.000Z", "2025-09-12T00:00:00.000Z", "2025-09-20T18:00:00.000Z",
    "2025-09-21T00:00:00.000Z", "2025-09-13T06:00:00.000Z", "2025-09-21T00:00:00.000Z",
    30, 90, 1, "", "2025-09-01T00:00:00.000Z", 0, now, now
  );
  insertPort.run("port-clm-0008-1", "CLM-0008", "Fujairah", "Discharge", 15000, now);
  insertBerth.run("berth-clm-0008-1", "port-clm-0008-1", "VTTI Fujairah Terminal Berth 1", 45000, 100, 0, 15000, "Crude Oil", "ADNOC");

  // 3. SEED BENCHMARK RAC CASES (RAC-0001 through RAC-0004)
  const insertRacCase = db.prepare(`
    INSERT OR IGNORE INTO rac_cases (
      id, rac_reference, client_name, ship_name, voyage_number, counterparty_name,
      rac_type, relevant_date, assigned_to, status, total_amount, agreed_amount,
      outstanding_amount, deadline_date, description, notes, supporting_docs_count,
      claim_id, created_by, created_at, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRacCalc = db.prepare(`
    INSERT OR IGNORE INTO rac_calculations (
      id, rac_case_id, rule_version, parameters_json, inputs_json, adjustments_json,
      calculated_result, formula_breakdown_json, explanation, calculation_status,
      reviewed_by, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const racData = [
    {
      id: "RAC-0001",
      ref: "RAC-0001",
      ship: "MT Polar Navigator",
      client: "Trafigura Trading Pte Ltd",
      counterparty: "Equinor ASA",
      type: "Bunker Deviation",
      date: "2026-01-12",
      status: "Draft",
      total: 14250.0,
      agreed: 0.0,
      desc: "Emergency bunkering deviation cost incurred at English Channel anchorage due to refinery delay."
    },
    {
      id: "RAC-0002",
      ref: "RAC-0002",
      ship: "MT Celtic Sea",
      client: "Sokana3",
      counterparty: "BP Oil International",
      type: "Pilotage Surcharge",
      date: "2026-01-16",
      status: "Under Review",
      total: 26800.0,
      agreed: 0.0,
      desc: "Compulsory pilotage surcharge and tug escort standby fees charged during night transit."
    },
    {
      id: "RAC-0003",
      ref: "RAC-0003",
      ship: "MT Atlantic Breeze",
      client: "Eastport USA LLC",
      counterparty: "Shell Trading",
      type: "Port Disbursement",
      date: "2025-11-28",
      status: "Reviewed",
      total: 38500.0,
      agreed: 35000.0,
      desc: "Additional port agency disbursements, oily sludge disposal, and ballast water treatment surcharges."
    },
    {
      id: "RAC-0004",
      ref: "RAC-0004",
      ship: "MT Mediterranean Star",
      client: "Trafigura Trading Pte Ltd",
      counterparty: "TotalEnergies",
      type: "War Risk Premium",
      date: "2025-12-08",
      status: "Closed",
      total: 45000.0,
      agreed: 45000.0,
      desc: "Additional war risk insurance premium and armed security guard escort incurred for Red Sea transit."
    }
  ];

  for (const r of racData) {
    insertRacCase.run(
      r.id, r.ref, r.client, r.ship, "VOY-2026-BENCH", r.counterparty,
      r.type, r.date, "processor@laytime.io", r.status, r.total, r.agreed,
      r.total - r.agreed, "2026-04-30", r.desc, "Benchmark RAC Case showcasing 6-state approval workflow.",
      2, null, "admin@laytime.io", now, "admin@laytime.io", now
    );
    insertRacCalc.run(
      `calc-${r.id}`, r.id, "1.0",
      JSON.stringify({ hourlyRate: 1500, fuelPricePerMt: 680 }),
      JSON.stringify({ distanceNm: 85, durationHours: 9.5 }),
      JSON.stringify([]),
      r.total,
      JSON.stringify({ formula: "Base Rate + Surcharges", breakdown: [{ label: r.type, amount: r.total }] }),
      "RAC calculation audited against charterparty rider clauses.",
      r.status === "Closed" ? "Final" : "Preliminary",
      r.status === "Reviewed" || r.status === "Closed" ? "supervisor@laytime.io" : null,
      now
    );
  }

  console.log("Benchmark dataset (CLM-0001..CLM-0008, RAC-0001..RAC-0004, @laytime.io users) verified & loaded.");
}
