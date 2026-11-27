import { DeductionCategory, OcrDraftEvent, OcrFieldConfidences } from "@/lib/types";

export interface OcrWordToken {
  text: string;
  confidence: number; // 0 - 100
}

export interface OcrExtractedLine {
  text: string;
  confidence: number; // 0 - 100
  words?: OcrWordToken[];
}

export interface OcrExtractedPage {
  pageNumber: number;
  text: string;
  averageConfidence: number; // 0 - 100
  lines?: OcrExtractedLine[];
}

interface VocabEntry {
  canonical: string;
  deductionCategory: DeductionCategory;
  percentageCounted: number;
  keywords: string[];
}

export const CONTROLLED_SOF_VOCABULARY: readonly VocabEntry[] = [
  {
    canonical: "Vessel arrived",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: ["vessel arrived", "arrived", "eosp", "end of sea passage", "anchored", "dropped anchor", "arrival"]
  },
  {
    canonical: "NOR tendered",
    deductionCategory: "Waiting for berth",
    percentageCounted: 0,
    keywords: ["nor tendered", "notice of readiness tendered", "tendered nor", "nor served", "notice of readiness served"]
  },
  {
    canonical: "NOR accepted",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: ["nor accepted", "notice of readiness accepted", "accepted nor", "nor valid", "turn time expired"]
  },
  {
    canonical: "Pilot on board",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: ["pilot on board", "pob", "pilot boarded", "pilot embarked", "harbour pilot"]
  },
  {
    canonical: "All fast",
    deductionCategory: "Shifting",
    percentageCounted: 100,
    keywords: ["all fast", "berthed", "made fast", "moored", "lines secured", "berth all fast"]
  },
  {
    canonical: "Hoses connected",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: ["hoses connected", "arms connected", "loading arms connected", "manifold connected", "hose connected"]
  },
  {
    canonical: "Commenced loading/discharging",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: [
      "commenced loading",
      "commenced discharging",
      "commenced discharge",
      "loading started",
      "discharging started",
      "discharge started",
      "started pumping",
      "commenced cargo operations"
    ]
  },
  {
    canonical: "Completed loading/discharging",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: [
      "completed loading",
      "completed discharging",
      "completed discharge",
      "loading completed",
      "discharging completed",
      "discharge completed",
      "finished loading",
      "finished discharging",
      "hoses disconnected"
    ]
  },
  {
    canonical: "Rain",
    deductionCategory: "Rain",
    percentageCounted: 0,
    keywords: ["rain", "raining", "heavy rain", "monsoon", "squall", "inclement weather", "bad weather", "storm", "weather delay"]
  },
  {
    canonical: "Shifting",
    deductionCategory: "Shifting",
    percentageCounted: 0,
    keywords: ["shifting", "shifted", "berth shift", "shifting from anchorage", "unberthed", "warping"]
  },
  {
    canonical: "Waiting for berth",
    deductionCategory: "Waiting for berth",
    percentageCounted: 100,
    keywords: ["waiting for berth", "awaiting berth", "berth congestion", "at anchorage awaiting berth", "waiting berth"]
  },
  {
    canonical: "Crane/equipment breakdown",
    deductionCategory: "Equipment breakdown",
    percentageCounted: 0,
    keywords: [
      "crane breakdown",
      "equipment breakdown",
      "crane failure",
      "shore crane breakdown",
      "manifold breakdown",
      "pump breakdown",
      "machinery breakdown",
      "shore breakdown"
    ]
  },
  {
    canonical: "Strike",
    deductionCategory: "Strike",
    percentageCounted: 0,
    keywords: ["strike", "tug strike", "pilot strike", "labour strike", "stevedore strike", "industrial action"]
  },
  {
    canonical: "Documents on board",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: ["documents on board", "docs on board", "cargo documents", "bill of lading signed", "clearance completed", "customs clearance"]
  },
  {
    canonical: "Sailed",
    deductionCategory: "Other",
    percentageCounted: 100,
    keywords: ["sailed", "vessel sailed", "departed", "cast off", "away", "cosp", "commenced sea passage"]
  }
] as const;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = tmp;
    }
  }
  return dp[n];
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchControlledVocabulary(rawDescription: string): {
  activityName: string;
  deductionCategory: DeductionCategory;
  percentageCounted: number;
  parseCertainty: number; // 0 - 1
  isUnclassified: boolean;
} {
  const norm = normalizeText(rawDescription);
  if (!norm) {
    return {
      activityName: "Unclassified",
      deductionCategory: "Other",
      percentageCounted: 100,
      parseCertainty: 0.4,
      isUnclassified: true
    };
  }

  // Handle "Commenced loading" / "Commenced discharging" specificity while keeping controlled label clear
  if (norm.includes("commenc") && (norm.includes("discharg") || norm.includes("load") || norm.includes("pump"))) {
    const label = norm.includes("discharg") ? "Commenced discharging" : "Commenced loading";
    return {
      activityName: label,
      deductionCategory: "Other",
      percentageCounted: 100,
      parseCertainty: 0.98,
      isUnclassified: false
    };
  }
  if ((norm.includes("complet") || norm.includes("finish")) && (norm.includes("discharg") || norm.includes("load"))) {
    const label = norm.includes("discharg") ? "Completed discharging" : "Completed loading";
    return {
      activityName: label,
      deductionCategory: "Other",
      percentageCounted: 100,
      parseCertainty: 0.98,
      isUnclassified: false
    };
  }

  // 1. Exact/substring keyword match
  let bestEntry: VocabEntry | null = null;
  let bestScore = 0;

  for (const entry of CONTROLLED_SOF_VOCABULARY) {
    for (const kw of entry.keywords) {
      if (norm === kw) {
        return {
          activityName: entry.canonical,
          deductionCategory: entry.deductionCategory,
          percentageCounted: entry.percentageCounted,
          parseCertainty: 1.0,
          isUnclassified: false
        };
      }
      if (norm.includes(kw)) {
        const specificity = kw.length / Math.max(norm.length, kw.length);
        const score = 0.9 + Math.min(0.09, specificity * 0.1);
        if (score > bestScore) {
          bestScore = score;
          bestEntry = entry;
        }
      }
    }
  }

  if (bestEntry && bestScore >= 0.9) {
    return {
      activityName: bestEntry.canonical,
      deductionCategory: bestEntry.deductionCategory,
      percentageCounted: bestEntry.percentageCounted,
      parseCertainty: Number(bestScore.toFixed(2)),
      isUnclassified: false
    };
  }

  // 2. Fuzzy similarity (handles OCR typos like "Equipmnt brkdwn" or "Vessl arived")
  const normTokens = norm.split(" ").filter((t) => t.length >= 2);
  for (const entry of CONTROLLED_SOF_VOCABULARY) {
    for (const kw of entry.keywords) {
      const kwTokens = kw.split(" ");
      let matchedTokens = 0;
      let totalSim = 0;
      for (const kt of kwTokens) {
        let maxTokenSim = 0;
        for (const nt of normTokens) {
          const maxLen = Math.max(kt.length, nt.length);
          const dist = levenshtein(kt, nt);
          const sim = maxLen > 0 ? 1 - dist / maxLen : 0;
          if (sim > maxTokenSim) maxTokenSim = sim;
        }
        if (maxTokenSim >= 0.68) {
          matchedTokens++;
          totalSim += maxTokenSim;
        }
      }
      if (matchedTokens === kwTokens.length && kwTokens.length > 0) {
        const avgSim = totalSim / kwTokens.length;
        const fuzzyScore = Math.min(0.88, avgSim * 0.9);
        if (fuzzyScore > bestScore) {
          bestScore = fuzzyScore;
          bestEntry = entry;
        }
      }
    }
  }

  if (bestEntry && bestScore >= 0.72) {
    return {
      activityName: bestEntry.canonical,
      deductionCategory: bestEntry.deductionCategory,
      percentageCounted: bestEntry.percentageCounted,
      parseCertainty: Number(bestScore.toFixed(2)),
      isUnclassified: false
    };
  }

  return {
    activityName: "Unclassified",
    deductionCategory: "Other",
    percentageCounted: 100,
    parseCertainty: 0.55,
    isUnclassified: true
  };
}

function buildIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1980 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractDateFromLine(line: string): {
  isoDate: string | null;
  matchedText: string;
  certainty: number;
} {
  // 1. YYYY-MM-DD
  const ymd = line.match(/\b(20\d{2}|19\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (ymd) {
    const iso = buildIsoDate(parseInt(ymd[1], 10), parseInt(ymd[2], 10), parseInt(ymd[3], 10));
    if (iso) return { isoDate: iso, matchedText: ymd[0], certainty: 1.0 };
  }

  // 2. dd-MMM-yyyy / dd MMM yyyy / dd-MMM-yy
  const dmyAlpha = line.match(/\b(\d{1,2})[\s\-./]+([A-Za-z]{3,9})[\s\-./]+(\d{2,4})\b/);
  if (dmyAlpha) {
    const day = parseInt(dmyAlpha[1], 10);
    const mon = MONTHS[dmyAlpha[2].toLowerCase()];
    let yr = parseInt(dmyAlpha[3], 10);
    if (yr < 100) yr += 2000;
    if (mon) {
      const iso = buildIsoDate(yr, mon, day);
      if (iso) return { isoDate: iso, matchedText: dmyAlpha[0], certainty: 0.98 };
    }
  }

  // 3. dd/mm/yyyy or dd.mm.yyyy or dd.mm.yy or dd-mm-yyyy
  const dmyNum = line.match(/\b(\d{1,2})([./-])(\d{1,2})\2(\d{2,4})\b/);
  if (dmyNum) {
    const day = parseInt(dmyNum[1], 10);
    const mon = parseInt(dmyNum[3], 10);
    let yr = parseInt(dmyNum[4], 10);
    if (yr < 100) yr += 2000;
    const iso = buildIsoDate(yr, mon, day);
    if (iso) {
      return { isoDate: iso, matchedText: dmyNum[0], certainty: dmyNum[4].length === 4 ? 1.0 : 0.94 };
    }
  }

  return { isoDate: null, matchedText: "", certainty: 0 };
}

function parseClockToken(token: string): { hours: number; minutes: number; is24?: boolean; certainty: number } | null {
  const cleaned = token
    .toLowerCase()
    .replace(/hrs?\.?/g, "")
    .trim()
    .replace(/o/g, "0");

  const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (h === 24 && m === 0) return { hours: 24, minutes: 0, is24: true, certainty: 0.98 };
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hours: h, minutes: m, certainty: 1.0 };
    return null;
  }

  const compactMatch = cleaned.match(/^(\d{4})$/);
  if (compactMatch) {
    const h = parseInt(compactMatch[1].slice(0, 2), 10);
    const m = parseInt(compactMatch[1].slice(2, 4), 10);
    if (h === 24 && m === 0) return { hours: 24, minutes: 0, is24: true, certainty: 0.95 };
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hours: h, minutes: m, certainty: 0.96 };
  }

  return null;
}

export function extractTimeRangeFromLine(line: string): {
  start: { hours: number; minutes: number };
  stop: { hours: number; minutes: number } | null;
  matchedText: string;
  startCertainty: number;
  stopCertainty: number;
} | null {
  // Range patterns: "from 0600 to 0800", "0600-0800", "06:00 - 08:00 hrs", "0600 to 0800"
  const rangeRegex =
    /(?:from\s+)?(\d{1,2}:\d{2}|\d{4})(?:\s*hrs?\.?)?\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2}|\d{4})(?:\s*hrs?\.?)?/i;
  const rangeMatch = line.match(rangeRegex);
  if (rangeMatch) {
    const t1 = parseClockToken(rangeMatch[1]);
    const t2 = parseClockToken(rangeMatch[2]);
    if (t1 && t2) {
      return {
        start: { hours: t1.hours, minutes: t1.minutes },
        stop: { hours: t2.hours, minutes: t2.minutes },
        matchedText: rangeMatch[0],
        startCertainty: t1.certainty,
        stopCertainty: t2.certainty
      };
    }
  }

  // Strip date substrings before searching single time so "10.07.24" or "2024" aren't treated as compact HHmm
  const strippedDate = line
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ")
    .replace(/\b\d{1,2}[\s\-./]+[A-Za-z]{3,9}[\s\-./]+\d{2,4}\b/g, " ");

  const singleRegex = /\b(\d{1,2}:\d{2}|\d{4})(?:\s*hrs?\.?)?\b/i;
  const singleMatch = strippedDate.match(singleRegex);
  if (singleMatch) {
    const t1 = parseClockToken(singleMatch[1]);
    if (t1) {
      return {
        start: { hours: t1.hours, minutes: t1.minutes },
        stop: null,
        matchedText: singleMatch[0],
        startCertainty: t1.certainty,
        stopCertainty: 0.78 // stop inferred from next event
      };
    }
  }

  return null;
}

function addClockToIsoDate(isoDate: string, hours: number, minutes: number, extraDays = 0): string {
  const [y, m, d] = isoDate.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + extraDays, hours, minutes, 0));
  return dt.toISOString();
}

function computeDurationFormatted(mins: number): string {
  const clamped = Math.max(0, Math.round(mins));
  const d = Math.floor(clamped / 1440);
  const h = Math.floor((clamped % 1440) / 60);
  const m = clamped % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m`;
}

function estimateWordConfidence(
  lineObj: OcrExtractedLine,
  snippet: string,
  fallback: number
): number {
  if (!lineObj.words || lineObj.words.length === 0) return fallback;
  const tokens = snippet.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return lineObj.confidence || fallback;

  const matchedConfs: number[] = [];
  for (const w of lineObj.words) {
    const wt = w.text.toLowerCase();
    if (tokens.some((t) => wt.includes(t) || t.includes(wt))) {
      matchedConfs.push(w.confidence);
    }
  }
  if (matchedConfs.length === 0) return lineObj.confidence || fallback;
  const avg = matchedConfs.reduce((a, b) => a + b, 0) / matchedConfs.length;
  return Math.max(0, Math.min(100, Math.round(avg)));
}

function isMetadataOrHeaderLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (!lower || lower.length < 3) return true;
  if (/^(vessel|ship|port|cargo|quantity|agent|charterer|owner|master|c\/p|cp\s*date|voyage|page\s+\d+|statement\s+of\s+facts|date\s+time|===|---)/i.test(lower)) {
    return true;
  }
  return false;
}

export function parseSoFPages(
  pages: OcrExtractedPage[],
  options: { claimId?: string; portId?: string; berthId?: string } = {}
): {
  events: OcrDraftEvent[];
  rawText: string;
  overallConfidence: number; // 0 - 100
} {
  const claimId = options.claimId || "";
  const portId = options.portId || "";
  const berthId = options.berthId || "";

  let activeDate: string | null = null;
  let activeDateCertainty = 0.85;

  interface IntermediateEvent {
    pageNumber: number;
    rawLine: string;
    isoDate: string;
    startHour: number;
    startMinute: number;
    stopHour: number | null;
    stopMinute: number | null;
    description: string;
    dateConf: number;
    startConf: number;
    stopConf: number;
    actConf: number;
    dateCertainty: number;
    startCertainty: number;
    stopCertainty: number;
  }

  const intermediate: IntermediateEvent[] = [];
  const rawChunks: string[] = [];

  for (const page of pages) {
    rawChunks.push(`--- PAGE ${page.pageNumber} ---\n${page.text.trim()}`);
    const pageLines: OcrExtractedLine[] =
      page.lines && page.lines.length > 0
        ? page.lines
        : page.text.split(/\r?\n/).map((t) => ({
            text: t,
            confidence: page.averageConfidence
          }));

    for (const lineObj of pageLines) {
      const rawLine = lineObj.text.trim();
      if (!rawLine || isMetadataOrHeaderLine(rawLine)) continue;

      const dateRes = extractDateFromLine(rawLine);
      if (dateRes.isoDate) {
        activeDate = dateRes.isoDate;
        activeDateCertainty = dateRes.certainty;
      }

      const timeRes = extractTimeRangeFromLine(rawLine);
      if (!timeRes) {
        // Standalone date heading line (sets activeDate cleanly) -> continue
        continue;
      }

      // If no date seen yet in file, cannot anchor without date unless today's year fallback -> mark low certainty
      const effectiveDate = dateRes.isoDate || activeDate || new Date().toISOString().slice(0, 10);
      const effDateCertainty = dateRes.isoDate
        ? dateRes.certainty
        : activeDate
        ? Math.min(0.9, activeDateCertainty)
        : 0.45;

      // Build clean event description by removing matched date & time expressions
      let desc = rawLine;
      if (dateRes.matchedText) desc = desc.replace(dateRes.matchedText, " ");
      desc = desc.replace(timeRes.matchedText, " ");
      desc = desc.replace(/^[\s\-–|:•,;]+|[\s\-–|:•,;]+$/g, "").replace(/\s+/g, " ").trim();

      const lineAvg = lineObj.confidence || page.averageConfidence || 90;
      const dateOcrConf = dateRes.matchedText
        ? estimateWordConfidence(lineObj, dateRes.matchedText, lineAvg)
        : lineAvg;
      const startOcrConf = estimateWordConfidence(lineObj, timeRes.matchedText.split(/[-–to]/i)[0] || timeRes.matchedText, lineAvg);
      const stopOcrConf = timeRes.stop
        ? estimateWordConfidence(lineObj, timeRes.matchedText.split(/[-–to]/i)[1] || timeRes.matchedText, lineAvg)
        : lineAvg;
      const actOcrConf = estimateWordConfidence(lineObj, desc, lineAvg);

      intermediate.push({
        pageNumber: page.pageNumber,
        rawLine,
        isoDate: effectiveDate,
        startHour: timeRes.start.hours,
        startMinute: timeRes.start.minutes,
        stopHour: timeRes.stop ? timeRes.stop.hours : null,
        stopMinute: timeRes.stop ? timeRes.stop.minutes : null,
        description: desc,
        dateConf: dateOcrConf,
        startConf: startOcrConf,
        stopConf: stopOcrConf,
        actConf: actOcrConf,
        dateCertainty: effDateCertainty,
        startCertainty: timeRes.startCertainty,
        stopCertainty: timeRes.stopCertainty
      });
    }
  }

  const events: OcrDraftEvent[] = intermediate.map((item, idx) => {
    const startTimeIso = addClockToIsoDate(item.isoDate, item.startHour, item.startMinute);
    let stopTimeIso: string;

    const vocab = matchControlledVocabulary(item.description);
    let effectiveStopCertainty = item.stopCertainty;

    if (item.stopHour !== null && item.stopMinute !== null) {
      const startTotal = item.startHour * 60 + item.startMinute;
      const stopTotal = item.stopHour * 60 + item.stopMinute;
      const rolloverDay = stopTotal <= startTotal ? 1 : 0;
      stopTimeIso = addClockToIsoDate(item.isoDate, item.stopHour, item.stopMinute, rolloverDay);
    } else if (idx + 1 < intermediate.length) {
      const next = intermediate[idx + 1];
      const nextStartIso = addClockToIsoDate(next.isoDate, next.startHour, next.startMinute);
      const sMs = new Date(startTimeIso).getTime();
      const nMs = new Date(nextStartIso).getTime();
      stopTimeIso = nMs > sMs ? nextStartIso : new Date(sMs + 30 * 60 * 1000).toISOString();
      effectiveStopCertainty = nMs > sMs ? 0.94 : 0.75;
    } else {
      const sMs = new Date(startTimeIso).getTime();
      stopTimeIso = new Date(sMs + 30 * 60 * 1000).toISOString();
      effectiveStopCertainty =
        vocab.activityName === "Sailed" ||
        vocab.activityName === "Documents on board" ||
        vocab.activityName.startsWith("Completed")
          ? 0.92
          : 0.78;
    }

    const durationMinutes = Math.max(
      0,
      Math.round((new Date(stopTimeIso).getTime() - new Date(startTimeIso).getTime()) / 60000)
    );

    const fieldConfidences: OcrFieldConfidences = {
      date: Math.max(0, Math.min(100, Math.round(item.dateConf * item.dateCertainty))),
      startTime: Math.max(0, Math.min(100, Math.round(item.startConf * item.startCertainty))),
      stopTime: Math.max(0, Math.min(100, Math.round(item.stopConf * effectiveStopCertainty))),
      activityName: Math.max(0, Math.min(100, Math.round(item.actConf * vocab.parseCertainty)))
    };

    const overallEventPct = Math.min(
      fieldConfidences.date,
      fieldConfidences.startTime,
      fieldConfidences.stopTime,
      fieldConfidences.activityName
    );

    return {
      id: `ocr-draft-${idx + 1}`,
      claimId,
      portId: portId || undefined,
      berthId: berthId || undefined,
      activityName: vocab.activityName,
      startTime: startTimeIso,
      stopTime: stopTimeIso,
      durationMinutes,
      durationFormatted: computeDurationFormatted(durationMinutes),
      percentageCounted: vocab.percentageCounted,
      prorata: 100,
      deductionCategory: vocab.deductionCategory,
      remarks: vocab.isUnclassified ? `Unclassified raw line: ${item.description}` : item.description,
      isOcrExtracted: true,
      isCorrected: false,
      ocrConfidence: Number((overallEventPct / 100).toFixed(2)),
      originalOcrValues: {
        activityName: item.description || vocab.activityName,
        startTime: startTimeIso,
        stopTime: stopTimeIso,
        percentageCounted: vocab.percentageCounted,
        deductionCategory: vocab.deductionCategory,
        berthId: berthId || undefined
      },
      pageNumber: item.pageNumber,
      rawLine: item.rawLine,
      fieldConfidences,
      overallConfidencePct: overallEventPct,
      isUnclassified: vocab.isUnclassified
    };
  });

  const overallConfidence =
    events.length > 0 ? Math.min(...events.map((e) => e.overallConfidencePct)) : 0;

  return {
    events,
    rawText: rawChunks.join("\n\n"),
    overallConfidence
  };
}
