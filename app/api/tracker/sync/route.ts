export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDatabase } from "@/lib/db";
import { getBusinessRule } from "@/lib/db/queries";
import { addDaysYmd } from "@/lib/calculations/timebar";
import fs from "fs";
import path from "path";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
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

function cleanNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === "13/02/1900" || s.endsWith("1900") || s.length < 6) return null;

  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1950 && year < 2100) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    if (year > 1950 && year < 2100) return ymd[0];
  }
  return null;
}

function parseStructuredNotes(rawNotes: string, defaultDate: string | null) {
  if (!rawNotes || !rawNotes.trim()) return [];
  const entries: Array<{ date: string; author: string; text: string }> = [];
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

export const POST = withApi({
  permission: "tracker:sync",
  handler: async () => {
    try {
      const csvPath = path.join(process.cwd(), "LaytimeServicesTracker.csv");
      if (!fs.existsSync(csvPath)) {
        return NextResponse.json({ success: false, error: "LaytimeServicesTracker.csv not found" }, { status: 404 });
      }

      const content = fs.readFileSync(csvPath, "utf8");
      const rows = parseCSV(content);
      if (rows.length <= 1) {
        return NextResponse.json({ success: false, error: "CSV file is empty" }, { status: 400 });
      }

      const db = getDatabase();
      const nowIso = new Date().toISOString();

      const existingCols = new Set(db.prepare("PRAGMA table_info(claims)").all().map((c: any) => c.name));
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

      const insertClient = db.prepare(`
        INSERT OR IGNORE INTO clients (client_id, name, created_at)
        VALUES (?, ?, ?)
      `);
      const clients = [
        { id: "client-sokana3", name: "Sokana3" },
        { id: "client-eastport", name: "Eastport USA LLC" },
        { id: "client-peregrine", name: "Peregrine Tankers" },
        { id: "client-norstar", name: "Norstar" },
        { id: "client-sokana", name: "Sokana Commercial" }
      ];
      for (const c of clients) {
        insertClient.run(c.id, c.name, nowIso);
      }

      const header = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
      const colIdx: Record<string, number> = {};
      header.forEach((name, idx) => {
        colIdx[name] = idx;
      });

      const dataRows = rows.slice(1);
      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];

      const defaults = getBusinessRule("laytime_defaults") || {};
      const globalNoticeDefault = Number(defaults.defaultNoticeTimebarDays) || 30;
      const globalClaimDefault = Number(defaults.defaultClaimTimebarDays) || 90;

      const valueBreakdown: Record<string, number> = {};
      let importedWithExplicitClaimDays = 0;
      let differingFromDefaultCount = 0;
      let matchingDefaultCount = 0;
      const differingClaimIdsSample: string[] = [];

      // Merge by claim id: only insert new rows, never overwrite claims edited in the app.
      const insertOnly = db.prepare(`
        INSERT OR IGNORE INTO claims (
          id, client_id, claim_name, account_name, broker_name, claim_status, claim_type, ship_name,
          cp_type, voyage_number, assigned_to, days_open, claim_closed, contentions, claim_notes,
          document_links, demurrage_rate_per_day, counterparty_name, counterparty_type, claim_filed_amount,
          received_claim_amount, agreed_amount, billable_amount, payment_received, payment_concluded,
          layday, cancelling_date, voyage_end_date, instruction_received_date, notice_received_date,
          claim_received_date, notice_timebar_days, claim_timebar_days, notice_days_source, claim_days_source,
          timebarred, claim_agreed_date, charterparty_date, days_awaiting_payment, invoice_number, tax_year,
          bl_quantity, owners_claim_amount, claim_timebar_date, claim_filed_date, payment_received_date,
          payment_received_amount, is_incomplete, missing_fields, base_date_estimated, notes_structured,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?
        )
      `);

      const tx = db.transaction((items: string[][]) => {
        for (let i = 0; i < items.length; i++) {
          const r = items[i];
          try {
            const getVal = (colName: string) => {
              const idx = colIdx[colName];
              if (idx === undefined || idx >= r.length) return "";
              return r[idx]?.trim() || "";
            };

            const claimId = getVal("CLAIM%23") || getVal("CLAIM#") || getVal("CLAIM NUMBER");
            if (!claimId) {
              skipped++;
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

            const paymentRecRaw = getVal("PaymentReceived");
            const paymentRecDate = parseDate(paymentRecRaw);
            const paymentRecAmount = paymentRecDate
              ? agreedAmount > 0 ? agreedAmount : filedAmount
              : cleanNumber(paymentRecRaw);

            const counterparty = getVal("Counterparty Name") || charterer;
            const contractType = getVal("Contract Type") || "CP";
            const layday = parseDate(getVal("Layday"));
            const cancelling = parseDate(getVal("Cancelling"));
            const instructionReceived = parseDate(getVal("InstructionReceived"));
            const blQuantity = getVal("BLQuantity") || "";
            const voyageEnds = parseDate(getVal("Voyage Ends"));
            const claimReceived = parseDate(getVal("Claim Received"));

            // ClaimTimebarDays in CSV maps ONLY to claim_timebar_days, never to notice_timebar_days
            const rawCsvClaimDays = cleanNumber(getVal("ClaimTimebarDays"));
            const claimDaysSource = rawCsvClaimDays > 0 ? "imported" : "default";
            const claimTimebarDays = rawCsvClaimDays > 0 ? rawCsvClaimDays : globalClaimDefault;
            const noticeTimebarDays = globalNoticeDefault;
            const noticeDaysSource = "default";

            valueBreakdown[String(claimTimebarDays)] = (valueBreakdown[String(claimTimebarDays)] || 0) + 1;
            if (claimDaysSource === "imported") {
              importedWithExplicitClaimDays++;
              if (claimTimebarDays !== globalClaimDefault) {
                differingFromDefaultCount++;
                if (differingClaimIdsSample.length < 15) differingClaimIdsSample.push(claimId);
              } else {
                matchingDefaultCount++;
              }
            }

            let baseDate = voyageEnds;
            let baseDateEstimated = 0;
            if (!baseDate) {
              baseDate = instructionReceived || cpDate;
              baseDateEstimated = 1;
            }

            const computedTimebarDate = baseDate ? addDaysYmd(baseDate, claimTimebarDays) : null;

            let openDays = 0;
            if (instructionReceived) {
              const startMs = new Date(instructionReceived).getTime();
              let endMs = Date.now();
              if (agreedDate && (claimStatusRaw.includes("Closed") || claimStatusRaw.includes("Paid"))) {
                endMs = new Date(agreedDate).getTime();
              } else if (paymentRecDate) {
                endMs = new Date(paymentRecDate).getTime();
              }
              openDays = Math.max(0, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)));
            }

            const paymentConcluded = getVal("Payment Concluded").toLowerCase() === "true" || !!paymentRecDate ? 1 : 0;
            const claimClosed =
              getVal("Claim Concluded").toLowerCase() === "true" ||
              claimStatusRaw.includes("Closed") ||
              claimStatusRaw.includes("Write Off") ||
              claimStatusRaw.includes("Fully Paid")
                ? 1
                : 0;

            const billableAmount = cleanNumber(getVal("Billable($)"));
            const taxYear = getVal("TaxYear") || "2024-2025";
            const ownersClaim = cleanNumber(getVal("Owners Claim"));

            const missing: string[] = [];
            if (!layday) missing.push("Layday");
            if (!blQuantity) missing.push("B/L Quantity");
            if (!ownersClaim) missing.push("Owners Claim");
            if (!counterparty) missing.push("Counterparty");
            const isIncomplete = missing.length > 0 ? 1 : 0;

            const structuredNotes = parseStructuredNotes(notesRaw, instructionReceived);
            const claimName = `${shipName} - ${charterer || "Voyage"} (${claimId})`;
            const assignedTo = "Rohan Patil";
            const createdAt = instructionReceived
              ? `${instructionReceived}T08:00:00.000Z`
              : cpDate
              ? `${cpDate}T08:00:00.000Z`
              : nowIso;

            const res = insertOnly.run(
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
              0,
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
              "",
              claimReceived || "",
              noticeTimebarDays,
              claimTimebarDays,
              noticeDaysSource,
              claimDaysSource,
              0,
              agreedDate || "",
              cpDate || "",
              0,
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
            if (res.changes > 0) inserted++;
            else skipped++;
          } catch (rowErr: any) {
            errors.push(`Row ${i + 2}: ${rowErr?.message || "Invalid row"}`);
          }
        }
      });

      tx(dataRows);

      return NextResponse.json({
        success: true,
        message: `Tracker sync complete: ${inserted} inserted, ${skipped} skipped, ${errors.length} errors.`,
        inserted,
        skipped,
        errors,
        timebarSummaryReport: {
          globalNoticeDefaultDays: globalNoticeDefault,
          globalClaimDefaultDays: globalClaimDefault,
          importedWithExplicitClaimDays,
          matchingDefaultCount,
          differingFromDefaultCount,
          valueBreakdown,
          differingClaimIdsSample,
          openBusinessQuestion:
            differingFromDefaultCount > 0
              ? "Is 45 days a real contractual claim timebar for the Sokana3 account, or a spreadsheet default?"
              : null
        }
      });
    } catch (error: any) {
      console.error("Error synchronizing tracker:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
});

export const GET = withApi({
  permission: "claims:view",
  handler: async () => {
    const db = getDatabase();
    const summary = db.prepare(`
      SELECT claim_status, count(*) as count, sum(claim_filed_amount) as total_demurrage
      FROM claims
      GROUP BY claim_status
    `).all();

    const accountSummary = db.prepare(`
      SELECT account_name, count(*) as count, sum(claim_filed_amount) as total_demurrage
      FROM claims
      GROUP BY account_name
    `).all();

    return NextResponse.json({
      success: true,
      statuses: summary,
      accounts: accountSummary
    });
  }
});
