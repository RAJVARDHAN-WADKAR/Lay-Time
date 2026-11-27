export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import {
  deleteHoliday,
  importHolidaysFromPackage,
  listHolidays,
  upsertHoliday
} from "@/lib/calculations/holidays";
import { logAudit } from "@/lib/db/audit";

const HolidayUpsertSchema = z.object({
  mode: z.enum(["manual", "import"]).optional().default("manual"),
  countryCode: z.string().trim().min(2).max(10),
  portId: z.string().trim().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  name: z.string().trim().min(2).max(150).optional(),
  year: z.number().int().min(2000).max(2100).optional()
});

export const GET = withApi({
  permission: "calculator:view",
  handler: async ({ req }) => {
    const countryCode = req.nextUrl.searchParams.get("countryCode") || undefined;
    const portId = req.nextUrl.searchParams.get("portId") || undefined;
    const year = req.nextUrl.searchParams.get("year") || undefined;

    const holidays = listHolidays({ countryCode, portId, year });
    return NextResponse.json({ holidays, total: holidays.length });
  }
});

export const POST = withApi({
  permission: "settings:manage",
  schema: HolidayUpsertSchema,
  handler: async ({ user, body }) => {
    const data = body as z.infer<typeof HolidayUpsertSchema>;
    const normRole = normalizeRole(user.role);

    if (data.mode === "import") {
      const year = data.year || new Date().getFullYear();
      const inserted = importHolidaysFromPackage(data.countryCode, year, data.portId || null);
      logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: normRole,
        action: "holidays_import",
        targetType: "holidays",
        targetId: `${data.countryCode.toUpperCase()}-${year}`,
        details: { countryCode: data.countryCode, year, portId: data.portId || null, inserted }
      });
      return NextResponse.json({
        success: true,
        inserted,
        holidays: listHolidays({ countryCode: data.countryCode, year: String(year) })
      });
    }

    if (!data.date || !data.name) {
      return NextResponse.json(
        { error: "Both date (YYYY-MM-DD) and name are required for manual holiday." },
        { status: 400 }
      );
    }

    const holiday = upsertHoliday({
      countryCode: data.countryCode,
      portId: data.portId || null,
      date: data.date,
      name: data.name,
      source: "manual"
    });

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normRole,
      action: "holiday_upsert",
      targetType: "holidays",
      targetId: holiday.id,
      details: holiday
    });

    return NextResponse.json({ success: true, holiday }, { status: 201 });
  }
});

export const DELETE = withApi({
  permission: "settings:manage",
  handler: async ({ user, req }) => {
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "Holiday id is required" }, { status: 400 });
    }
    const ok = deleteHoliday(id);
    if (!ok) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }
    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normalizeRole(user.role),
      action: "holiday_delete",
      targetType: "holidays",
      targetId: id
    });
    return NextResponse.json({ success: true });
  }
});
