import { MaritimeHoliday } from "@/lib/types";

const PORT_LOCALE_HINTS: Array<{
  pattern: RegExp;
  countryCode: string;
  timezone: string;
}> = [
  { pattern: /rotterdam|europoort|amsterdam|vlessingen/i, countryCode: "NL", timezone: "Europe/Amsterdam" },
  { pattern: /antwerp|ghent|zeebrugge/i, countryCode: "BE", timezone: "Europe/Brussels" },
  { pattern: /singapore|jurong/i, countryCode: "SG", timezone: "Asia/Singapore" },
  { pattern: /fujairah|jebel ali|dubai|abu dhabi|khor fakkan|ruwais/i, countryCode: "AE", timezone: "Asia/Dubai" },
  { pattern: /jubail|ras tanura|yanbu|jeddah|dammam/i, countryCode: "SA", timezone: "Asia/Riyadh" },
  { pattern: /houston|galveston|corpus christi|new orleans|louisiana/i, countryCode: "US", timezone: "America/Chicago" },
  { pattern: /new york|philadelphia|savannah/i, countryCode: "US", timezone: "America/New_York" },
  { pattern: /immingham|milford haven|fawley|london|teesside|port talbot/i, countryCode: "GB", timezone: "Europe/London" },
  { pattern: /jamnagar|sikka|mumbai|vadinar|kandla|paradeep/i, countryCode: "IN", timezone: "Asia/Kolkata" },
  { pattern: /qingdao|ningbo|shanghai|tianjin|zhoushan/i, countryCode: "CN", timezone: "Asia/Shanghai" },
  { pattern: /hamburg|wilhelmshaven|bremen/i, countryCode: "DE", timezone: "Europe/Berlin" },
  { pattern: /fos|lavera|le havre|marseille/i, countryCode: "FR", timezone: "Europe/Paris" }
];

export const DEFAULT_SEED_COUNTRIES = ["NL", "BE", "SG", "AE", "SA", "US", "GB", "IN", "CN"] as const;

export function inferCountryAndTimezone(portName?: string | null): {
  countryCode: string;
  timezone: string;
} {
  const name = String(portName || "").trim();
  for (const hint of PORT_LOCALE_HINTS) {
    if (hint.pattern.test(name)) {
      return { countryCode: hint.countryCode, timezone: hint.timezone };
    }
  }
  return { countryCode: "GLOBAL", timezone: "UTC" };
}

/**
 * Pure in-memory lookup used by the laytime calculation engine.
 * Port-specific overrides match before country-wide holidays.
 */
export function findHolidayForDate(
  holidays: MaritimeHoliday[],
  isoDate: string,
  portId?: string | null,
  countryCode?: string | null
): MaritimeHoliday | null {
  if (!holidays || holidays.length === 0) return null;

  if (portId) {
    const portHit = holidays.find((h) => h.date === isoDate && h.portId === portId);
    if (portHit) return portHit;
  }

  const normCountry = countryCode ? countryCode.trim().toUpperCase() : null;
  if (normCountry) {
    const countryHit = holidays.find(
      (h) => h.date === isoDate && h.countryCode.toUpperCase() === normCountry && !h.portId
    );
    if (countryHit) return countryHit;
  }

  if (!normCountry && !portId) {
    const globalHit = holidays.find((h) => h.date === isoDate && !h.portId);
    if (globalHit) return globalHit;
  }

  return null;
}
