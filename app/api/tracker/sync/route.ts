import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
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
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
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
}

export async function POST(req: NextRequest) {
  try {
    const csvPath = path.join(process.cwd(), "LaytimeServicesTracker.csv");
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ success: false, message: "LaytimeServicesTracker.csv not found" }, { status: 404 });
    }

    const content = fs.readFileSync(csvPath, "utf8");
    const rows = parseCSV(content);
    if (rows.length <= 1) {
      return NextResponse.json({ success: false, message: "CSV file is empty" }, { status: 400 });
    }

    const db = getDatabase();
    const nowIso = new Date().toISOString();

    // 1. Seed or ensure clients exist
    const insertClient = db.prepare(`
      INSERT OR IGNORE INTO clients (client_id, name, created_at)
      VALUES (?, ?, ?)
    `);
    const clients = [
      { id: "client-sokana3", name: "Sokana3" },
      { id: "client-eastport", name: "Eastport USA LLC" },
      { id: "client-peregrine", name: "Peregrine Tankers" },
      { id: "client-norstar", name: "Norstar" }
    ];
    for (const c of clients) {
      insertClient.run(c.id, c.name, nowIso);
    }

    // 2. Prepare statement
    const insertClaim = db.prepare(`
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
    let count = 0;

    const tx = db.transaction((items: string[][]) => {
      for (const r of items) {
        const claimId = r[0]?.trim();
        if (!claimId) continue;

        const account = r[1]?.trim() || "Sokana3";
        let clientId = "client-sokana3";
        if (account.includes("Eastport")) clientId = "client-eastport";
        else if (account.includes("Peregrine")) clientId = "client-peregrine";
        else if (account.includes("Norstar")) clientId = "client-norstar";

        const openDaysPlus = cleanNumber(r[2]);
        const claimStatus = r[3]?.trim() || "Submitted";
        const shipName = r[4]?.trim() || "Unknown Vessel";
        const voyageNo = r[5]?.trim() || "";
        const cpDate = parseDate(r[6]);
        const charterer = r[7]?.trim() || "";
        const broker = r[8]?.trim() || "";
        const claimFiledDate = parseDate(r[9]);
        const filedAmount = cleanNumber(r[10]);
        const agreedAmount = cleanNumber(r[11]);
        const claimType = r[12]?.trim() || "Demurrage";
        const notes = r[13]?.trim() || "";
        const invoiceNo = r[14]?.trim() || "";
        const agreedDate = parseDate(r[15]);
        const paymentReceived = cleanNumber(r[16]);
        const counterparty = r[17]?.trim() || charterer;
        const contractType = r[18]?.trim() || "CP";
        const layday = parseDate(r[19]);
        const cancelling = parseDate(r[20]);
        const instructionReceived = parseDate(r[21]);
        const blQuantity = r[22]?.trim() || "";
        const voyageEnds = parseDate(r[23]);
        const claimReceived = parseDate(r[24]);
        const timebarDays = cleanNumber(r[25]) || 45;
        const timebarDate = parseDate(r[26]);
        const timebarred = r[27]?.trim().toLowerCase() === "true" ? 1 : 0;
        const ownersClaim = cleanNumber(r[28]);
        const openDays = cleanNumber(r[29]) || openDaysPlus;
        const paymentConcluded = r[30]?.trim().toLowerCase() === "true" ? 1 : 0;
        const claimClosed = (r[31]?.trim().toLowerCase() === "true" || claimStatus.includes("Claim Closed") || claimStatus.includes("Write Off")) ? 1 : 0;
        const billableAmount = cleanNumber(r[32]);
        const taxYear = r[33]?.trim() || "2024-2025";

        const claimName = `${shipName} - ${charterer || "Voyage"} (${claimId})`;
        const assignedTo = "Rohit Mengane";
        const createdAt = instructionReceived ? `${instructionReceived}T08:00:00.000Z` : (cpDate ? `${cpDate}T08:00:00.000Z` : nowIso);

        insertClaim.run(
          claimId,
          clientId,
          claimName,
          account,
          broker,
          claimStatus,
          claimType,
          shipName,
          contractType,
          voyageNo,
          assignedTo,
          openDays,
          claimClosed,
          "",
          notes,
          JSON.stringify([]),
          0,
          counterparty,
          "Charterer",
          filedAmount,
          ownersClaim,
          agreedAmount,
          billableAmount,
          paymentReceived,
          paymentConcluded,
          layday || "",
          cancelling || "",
          voyageEnds || "",
          instructionReceived || "",
          "",
          claimReceived || "",
          30,
          timebarDays,
          timebarred,
          agreedDate || "",
          cpDate || "",
          0,
          invoiceNo,
          taxYear,
          blQuantity,
          ownersClaim,
          timebarDate || "",
          claimFiledDate || "",
          createdAt,
          nowIso
        );
        count++;
      }
    });

    tx(dataRows);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${count} claims from LaytimeServicesTracker.csv`,
      totalSynced: count
    });
  } catch (error: any) {
    console.error("Error synchronizing tracker:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
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
