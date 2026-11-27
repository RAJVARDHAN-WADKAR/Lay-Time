import Holidays from "date-holidays";
import { getDatabase } from "@/lib/db";
import { MaritimeHoliday } from "@/lib/types";
import { DEFAULT_SEED_COUNTRIES, findHolidayForDate, inferCountryAndTimezone } from "./holidayUtils";

export { DEFAULT_SEED_COUNTRIES, findHolidayForDate, inferCountryAndTimezone };

export function listHolidays(filter?: {
  countryCode?: string;
  portId?: string;
  year?: string;
}): MaritimeHoliday[] {
  const db = getDatabase();
  const clauses: string[] = [];
  const params: any[] = [];

  if (filter?.countryCode && filter.countryCode !== "ALL") {
    clauses.push("country_code = ?");
    params.push(filter.countryCode.toUpperCase());
  }
  if (filter?.portId) {
    clauses.push("(port_id = ? OR port_id IS NULL)");
    params.push(filter.portId);
  }
  if (filter?.year) {
    clauses.push("date LIKE ?");
    params.push(`${filter.year}-%`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM holidays ${where} ORDER BY date ASC, country_code ASC`)
    .all(...params) as any[];

  return rows.map((r) => ({
    id: r.id,
    countryCode: r.country_code,
    portId: r.port_id || null,
    date: r.date,
    name: r.name,
    source: r.source,
    createdAt: r.created_at
  }));
}

export function upsertHoliday(input: {
  id?: string;
  countryCode: string;
  portId?: string | null;
  date: string;
  name: string;
  source?: string;
}): MaritimeHoliday {
  const db = getDatabase();
  const now = new Date().toISOString();
  const country = input.countryCode.trim().toUpperCase();
  const cleanDate = input.date.trim().slice(0, 10);
  const portScope = input.portId?.trim() || null;
  const id =
    input.id ||
    `hol-${country}-${portScope ? `${portScope}-` : ""}${cleanDate}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");

  db.prepare(
    `INSERT INTO holidays (id, country_code, port_id, date, name, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       country_code = excluded.country_code,
       port_id = excluded.port_id,
       date = excluded.date,
       name = excluded.name,
       source = excluded.source`
  ).run(id, country, portScope, cleanDate, input.name.trim(), input.source || "manual", now);

  return {
    id,
    countryCode: country,
    portId: portScope,
    date: cleanDate,
    name: input.name.trim(),
    source: input.source || "manual",
    createdAt: now
  };
}

export function deleteHoliday(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM holidays WHERE id = ?").run(id);
  return res.changes > 0;
}

export function importHolidaysFromPackage(
  countryCode: string,
  year: number,
  portId?: string | null,
  dbInstance?: any
): number {
  const db = dbInstance || getDatabase();
  const hd = new Holidays(countryCode.toUpperCase());
  const list = hd.getHolidays(year) || [];
  const publicOnly = list.filter((h) => h.type === "public");
  const now = new Date().toISOString();
  let inserted = 0;

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO holidays (id, country_code, port_id, date, name, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const runImport = db.transaction(() => {
    for (const h of publicOnly) {
      const dateStr = String(h.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      const country = countryCode.toUpperCase();
      const portScope = portId?.trim() || null;
      const id = `hol-${country}-${portScope ? `${portScope}-` : ""}${dateStr}`
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_");
      const r = stmt.run(id, country, portScope, dateStr, h.name || "Public Holiday", "date-holidays", now);
      if (r.changes > 0) inserted++;
    }
  });
  runImport();
  return inserted;
}

export function seedDefaultHolidays(dbInstance?: any): number {
  const db = dbInstance || getDatabase();
  const existing = (db.prepare("SELECT COUNT(*) as count FROM holidays").get() as { count: number }).count;
  if (existing > 0) return 0;

  let total = 0;
  for (const country of DEFAULT_SEED_COUNTRIES) {
    for (const yr of [2024, 2025, 2026]) {
      try {
        total += importHolidaysFromPackage(country, yr, null, db);
      } catch {
        // Ignore unsupported region errors cleanly
      }
    }
  }
  return total;
}
