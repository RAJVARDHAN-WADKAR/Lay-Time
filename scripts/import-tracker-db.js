const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// 1. Robust CSV Parser supporting multi-line quoted fields
function parseCSV(text) {
  const rows = [];
  let row = [];
  let token = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        token += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(token);
      token = "";
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && next === "\n") {
        i++;
      }
      row.push(token);
      token = "";
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      token += c;
    }
  }
  if (token.length > 0 || row.length > 0) {
    row.push(token);
    if (row.some((cell) => cell.trim().length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

// 2. Clean numeric strings, stripping thousands separators
function cleanNumber(val) {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// 3. Parse dd/mm/yyyy dates safely into YYYY-MM-DD
function parseDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === "13/02/1900" || s.endsWith("1900") || s.length < 6) return null;

  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1950 && year < 2100) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  // Try YYYY-MM-DD
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    if (year > 1950 && year < 2100) return ymd[0];
  }
  return null;
}

// 4. Parse free text notes into structured entries
function parseStructuredNotes(rawNotes, defaultDate) {
  if (!rawNotes || !rawNotes.trim()) return [];
  const entries = [];
  const lines = rawNotes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-:]?\s*(.*)$/);
    if (dateMatch) {
      entries.push({
        date: dateMatch[1],
        author: "Operations Tracker",
        text: dateMatch[2] || line
      });
    } else {
      entries.push({
        date: defaultDate || "",
        author: "Operations Tracker",
        text: line
      });
    }
  }
  return entries;
}

function runImport() {
  const dbPath = path.join(process.cwd(), "data", "laytime.db");
  const csvPath = path.join(process.cwd(), "LaytimeServicesTracker.csv");

  if (!fs.existsSync(csvPath)) {
    console.error("LaytimeServicesTracker.csv not found at:", csvPath);
    process.exit(1);
  }

  const db = new Database(dbPath);

  // Ensure new columns exist on claims table if needed
  const existingCols = new Set(db.prepare("PRAGMA table_info(claims)").all().map((c) => c.name));
  const newCols = [
    { name: "payment_received_date", type: "TEXT" },
    { name: "payment_received_amount", type: "REAL DEFAULT 0" },
    { name: "is_incomplete", type: "INTEGER DEFAULT 0" },
    { name: "missing_fields", type: "TEXT" },
    { name: "base_date_estimated", type: "INTEGER DEFAULT 0" },
    { name: "notes_structured", type: "TEXT" }
  ];

  for (const col of newCols) {
    if (!existingCols.has(col.name)) {
      db.prepare(`ALTER TABLE claims ADD COLUMN ${col.name} ${col.type}`).run();
    }
  }

  // Ensure accounts/clients exist
  const insertClient = db.prepare(`
    INSERT OR IGNORE INTO clients (client_id, name, created_at)
    VALUES (?, ?, ?)
  `);
  const nowIso = new Date().toISOString();
  const knownClients = [
    { id: "client-sokana3", name: "Sokana3" },
    { id: "client-eastport", name: "Eastport USA LLC" },
    { id: "client-peregrine", name: "Peregrine Tankers" },
    { id: "client-norstar", name: "Norstar" },
    { id: "client-sokana", name: "Sokana Commercial" }
  ];
  for (const c of knownClients) {
    insertClient.run(c.id, c.name, nowIso);
  }

  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(content);

  if (rows.length <= 1) {
    console.error("CSV is empty or invalid");
    process.exit(1);
  }

  const header = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  const colIdx = {};
  header.forEach((name, idx) => {
    colIdx[name] = idx;
  });

  const dataRows = rows.slice(1);
  console.log(`\n=========================================================`);
  console.log(`IMPORTING LAYTIME SERVICES TRACKER (${dataRows.length} rows)`);
  console.log(`=========================================================\n`);

  let report = {
    totalRows: dataRows.length,
    imported: 0,
    skipped: 0,
    timebarDefaulted45: 0,
    timebar90: 0,
    baseDateEstimated: 0,
    incompleteClaims: 0,
    notesParsed: 0,
    paymentsWithDate: 0
  };

  const insertOrUpdate = db.prepare(`
    INSERT INTO claims (
      id, client_id, claim_name, account_name, broker_name, claim_status, claim_type, ship_name,
      cp_type, voyage_number, assigned_to, days_open, claim_closed, contentions, claim_notes,
      document_links, demurrage_rate_per_day, counterparty_name, counterparty_type, claim_filed_amount,
      received_claim_amount, agreed_amount, billable_amount, payment_received, payment_concluded,
      layday, cancelling_date, voyage_end_date, instruction_received_date, notice_received_date,
      claim_received_date, notice_timebar_days, claim_timebar_days, timebarred, claim_agreed_date,
      charterparty_date, days_awaiting_payment, invoice_number, tax_year, bl_quantity,
      owners_claim_amount, claim_timebar_date, claim_filed_date, payment_received_date,
      payment_received_amount, is_incomplete, missing_fields, base_date_estimated, notes_structured,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      account_name=excluded.account_name,
      broker_name=excluded.broker_name,
      claim_status=excluded.claim_status,
      claim_type=excluded.claim_type,
      ship_name=excluded.ship_name,
      cp_type=excluded.cp_type,
      voyage_number=excluded.voyage_number,
      days_open=excluded.days_open,
      claim_closed=excluded.claim_closed,
      claim_notes=excluded.claim_notes,
      counterparty_name=excluded.counterparty_name,
      claim_filed_amount=excluded.claim_filed_amount,
      agreed_amount=excluded.agreed_amount,
      billable_amount=excluded.billable_amount,
      payment_concluded=excluded.payment_concluded,
      instruction_received_date=excluded.instruction_received_date,
      claim_agreed_date=excluded.claim_agreed_date,
      charterparty_date=excluded.charterparty_date,
      invoice_number=excluded.invoice_number,
      tax_year=excluded.tax_year,
      claim_filed_date=excluded.claim_filed_date,
      claim_timebar_days=excluded.claim_timebar_days,
      claim_timebar_date=excluded.claim_timebar_date,
      payment_received_date=excluded.payment_received_date,
      payment_received_amount=excluded.payment_received_amount,
      is_incomplete=excluded.is_incomplete,
      missing_fields=excluded.missing_fields,
      base_date_estimated=excluded.base_date_estimated,
      notes_structured=excluded.notes_structured,
      updated_at=excluded.updated_at
  `);

  const tx = db.transaction((rowsToImport) => {
    for (const r of rowsToImport) {
      const getVal = (colName) => {
        const idx = colIdx[colName];
        if (idx === undefined || idx >= r.length) return "";
        return r[idx]?.trim() || "";
      };

      const claimId = getVal("CLAIM%23") || getVal("CLAIM#") || getVal("CLAIM NUMBER");
      if (!claimId) {
        report.skipped++;
        continue;
      }

      const account = getVal("Account") || "Sokana3";
      let clientId = "client-sokana3";
      if (account.includes("Eastport")) clientId = "client-eastport";
      else if (account.includes("Peregrine")) clientId = "client-peregrine";
      else if (account.includes("Norstar")) clientId = "client-norstar";

      const claimStatusRaw = getVal("Claim Status") || "2. Nil Demurrage (No Claim)";
      const shipName = getVal("SHIP NAME") || "Unknown Vessel";
      const voyageNo = getVal("Voyage Number") || "";
      const cpDate = parseDate(getVal("C/P DATE"));
      const charterer = getVal("CharterersName") || "";
      const broker = getVal("BROKER") || "";
      const claimFiledDate = parseDate(getVal("Claim Filed Date"));
      const filedAmount = cleanNumber(getVal("ClaimFiledAmount"));
      const agreedAmount = cleanNumber(getVal("Agreed ($)"));
      const claimType = getVal("ClaimType") || "Demurrage";
      const notesRaw = getVal("Notes") || "";
      const invoiceNo = getVal("Invoice Number") || "";
      const agreedDate = parseDate(getVal("Agreed Date"));

      // PaymentReceived column holds DATES in the CSV!
      const paymentRecRaw = getVal("PaymentReceived");
      let paymentRecDate = parseDate(paymentRecRaw);
      let paymentRecAmount = 0;
      if (paymentRecDate) {
        report.paymentsWithDate++;
        paymentRecAmount = agreedAmount > 0 ? agreedAmount : filedAmount;
      } else {
        paymentRecAmount = cleanNumber(paymentRecRaw);
      }

      const counterparty = getVal("Counterparty Name") || charterer;
      const contractType = getVal("Contract Type") || "CP";
      const layday = parseDate(getVal("Layday"));
      const cancelling = parseDate(getVal("Cancelling"));
      const instructionReceived = parseDate(getVal("InstructionReceived"));
      const blQuantity = getVal("BLQuantity") || "";
      const voyageEnds = parseDate(getVal("Voyage Ends"));
      const claimReceived = parseDate(getVal("Claim Received"));

      // Timebar Days (45 default, 90 for selected)
      let timebarDays = cleanNumber(getVal("ClaimTimebarDays")) || 45;
      if (timebarDays === 90) report.timebar90++;
      else report.timebarDefaulted45++;

      // Timebar base date calculation & estimated flag
      let baseDate = voyageEnds || claimReceived;
      let baseDateEstimated = 0;
      if (!baseDate) {
        baseDate = instructionReceived || cpDate;
        baseDateEstimated = 1;
        report.baseDateEstimated++;
      }

      // Compute timebar date (ignore 1900 dates from CSV)
      let computedTimebarDate = null;
      if (baseDate) {
        const bTime = new Date(baseDate).getTime();
        if (!isNaN(bTime)) {
          const deadline = new Date(bTime + timebarDays * 24 * 60 * 60 * 1000);
          computedTimebarDate = deadline.toISOString().split("T")[0];
        }
      }

      // Live Open Days calculation: (closed/paid date or today) - InstructionReceived
      let openDays = 0;
      if (instructionReceived) {
        const startMs = new Date(instructionReceived).getTime();
        let endMs = Date.now();
        if (agreedDate && (claimStatusRaw.includes("Closed") || claimStatusRaw.includes("Paid"))) {
          endMs = new Date(agreedDate).getTime();
        } else if (paymentRecDate) {
          endMs = new Date(paymentRecDate).getTime();
        }
        const diffDays = Math.max(0, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)));
        openDays = diffDays;
      }

      const paymentConcluded = getVal("Payment Concluded").toLowerCase() === "true" || !!paymentRecDate ? 1 : 0;
      const claimClosed = (
        getVal("Claim Concluded").toLowerCase() === "true" ||
        claimStatusRaw.includes("Closed") ||
        claimStatusRaw.includes("Write Off") ||
        claimStatusRaw.includes("Fully Paid")
      ) ? 1 : 0;

      const billableAmount = cleanNumber(getVal("Billable($)"));
      const taxYear = getVal("TaxYear") || "2024-2025";
      const ownersClaim = cleanNumber(getVal("Owners Claim"));

      // Check missing fields for incomplete claim indicator
      const missing = [];
      if (!layday) missing.push("Layday");
      if (!blQuantity) missing.push("B/L Quantity");
      if (!ownersClaim) missing.push("Owners Claim");
      if (!counterparty) missing.push("Counterparty");
      const isIncomplete = missing.length > 0 ? 1 : 0;
      if (isIncomplete) report.incompleteClaims++;

      // Parse structured notes
      const structuredNotes = parseStructuredNotes(notesRaw, instructionReceived);
      if (structuredNotes.length > 0) report.notesParsed++;

      const claimName = `${shipName} - ${charterer || "Voyage"} (${claimId})`;
      const assignedTo = "Rohan Patil"; // Seed processor
      const createdAt = instructionReceived ? `${instructionReceived}T08:00:00.000Z` : (cpDate ? `${cpDate}T08:00:00.000Z` : nowIso);

      insertOrUpdate.run(
        claimId,
        clientId,
        claimName,
        account,
        broker,
        claimStatusRaw,
        claimType,
        shipName,
        contractType,
        voyageNo,
        assignedTo,
        openDays,
        claimClosed,
        "",
        notesRaw,
        JSON.stringify([]),
        0, // demurrage_rate_per_day default
        counterparty,
        "Charterer",
        filedAmount,
        ownersClaim,
        agreedAmount,
        billableAmount,
        paymentRecAmount,
        paymentConcluded,
        layday || "",
        cancelling || "",
        voyageEnds || "",
        instructionReceived || "",
        "", // notice_received_date
        claimReceived || "",
        30, // notice_timebar_days
        timebarDays,
        0, // timebarred flag
        agreedDate || "",
        cpDate || "",
        0, // days_awaiting_payment
        invoiceNo,
        taxYear,
        blQuantity,
        ownersClaim,
        computedTimebarDate || "",
        claimFiledDate || "",
        paymentRecDate || "",
        paymentRecAmount,
        isIncomplete,
        JSON.stringify(missing),
        baseDateEstimated,
        JSON.stringify(structuredNotes),
        createdAt,
        nowIso
      );

      report.imported++;
    }
  });

  tx(dataRows);

  console.log("IMPORT REPORT SUMMARY:");
  console.log(`- Total CSV rows read: ${report.totalRows}`);
  console.log(`- Claims imported/updated: ${report.imported}`);
  console.log(`- Skipped rows (missing ID): ${report.skipped}`);
  console.log(`- Timebar configured (45 days default): ${report.timebarDefaulted45}`);
  console.log(`- Timebar configured (90 days): ${report.timebar90}`);
  console.log(`- Base date estimated (missing voyage end/claim rec): ${report.baseDateEstimated}`);
  console.log(`- Claims flagged incomplete for laytime calculation: ${report.incompleteClaims}`);
  console.log(`- Notes parsed into structured log: ${report.notesParsed}`);
  console.log(`- Payments recorded with payment date: ${report.paymentsWithDate}\n`);
}

runImport();
