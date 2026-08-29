import { SoFActivity, Discrepancy } from "@/lib/types";

export interface OcrProcessingResult {
  fileName: string;
  isScanned: boolean;
  overallConfidence: number;
  extractedActivities: SoFActivity[];
  lowConfidenceCount: number;
  flaggedDiscrepancies: Discrepancy[];
  rawTextPreview: string;
}

export function processDocumentOcr(
  fileName: string,
  claimId: string,
  portId?: string,
  berthId?: string,
  bufferOrText?: string
): OcrProcessingResult {
  const isBadScan = fileName.toLowerCase().includes("bad") || fileName.toLowerCase().includes("antwerp") || fileName.toLowerCase().includes("messy");
  const isRotterdam = fileName.toLowerCase().includes("rotterdam") || fileName.toLowerCase().includes("ocean");
  const isSingapore = fileName.toLowerCase().includes("nordic") || fileName.toLowerCase().includes("sgp");

  let isScanned = true;
  let overallConfidence = 0.94;
  const extractedActivities: SoFActivity[] = [];
  const flaggedDiscrepancies: Discrepancy[] = [];

  if (isBadScan) {
    // Scanned low-DPI messy document demo case
    isScanned = true;
    overallConfidence = 0.68;

    extractedActivities.push(
      {
        id: `ocr-${Date.now()}-1`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Vessel arrived & EOSP",
        startTime: "2024-07-26T04:00:00Z",
        stopTime: "2024-07-26T04:30:00Z",
        durationMinutes: 30,
        durationFormatted: "00h 30m",
        percentageCounted: 100,
        prorata: 100,
        deductionCategory: "Other",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.95
      },
      {
        id: `ocr-${Date.now()}-2`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "NOR tendered",
        startTime: "2024-07-26T04:30:00Z",
        stopTime: "2024-07-26T10:30:00Z",
        durationMinutes: 360,
        durationFormatted: "06h 00m",
        percentageCounted: 0,
        prorata: 100,
        deductionCategory: "Waiting for berth",
        remarks: "6 hours Notice time allowance under Clause 6",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.88
      },
      {
        id: `ocr-${Date.now()}-3`,
        claimId,
        portId: portId || "port-1",
        berthId: "", // flagged missing berth
        activityName: "Equipment breakdown (Shore Crane)",
        startTime: "2024-07-27T08:00:00Z",
        stopTime: "2024-07-27T18:00:00Z",
        durationMinutes: 600,
        durationFormatted: "10h 00m",
        percentageCounted: 0,
        prorata: 100,
        deductionCategory: "Equipment breakdown",
        remarks: "Low confidence extraction on crane mechanical stoppage",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.65,
        originalOcrValues: {
          activityName: "Equipmnt brkdwn (Shre Crne)",
          deductionCategory: "Equipment breakdown"
        }
      },
      {
        id: `ocr-${Date.now()}-4`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Rain (Heavy Downpour)",
        startTime: "2024-07-26T20:00:00Z",
        stopTime: "2024-07-26T14:00:00Z", // flagged start after stop
        durationMinutes: -360,
        durationFormatted: "-06h 00m",
        percentageCounted: 0,
        prorata: 100,
        deductionCategory: "Rain",
        remarks: "OCR inverted PM/AM timestamps",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.62,
        originalOcrValues: {
          startTime: "2024-07-26T20:00:00Z",
          stopTime: "2024-07-26T14:00:00Z"
        }
      },
      {
        id: `ocr-${Date.now()}-5`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Rain (Heavy Downpour)", // duplicate entry
        startTime: "2024-07-26T20:00:00Z",
        stopTime: "2024-07-26T20:30:00Z",
        durationMinutes: 30,
        durationFormatted: "00h 30m",
        percentageCounted: 0,
        prorata: 100,
        deductionCategory: "Rain",
        remarks: "Duplicate logged event in raw scan",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.71
      }
    );

    flaggedDiscrepancies.push(
      {
        id: `disc-ocr-1`,
        claimId,
        type: "start_after_stop",
        severity: "error",
        title: "Start Time Follows Stop Time in OCR",
        description: "Rain event extracted with start timestamp 20:00 and stop timestamp 14:00 (inverted chronological order).",
        field: "stopTime",
        currentValue: "2024-07-26T14:00:00Z",
        suggestedValue: "2024-07-27T02:00:00Z",
        isResolved: false
      },
      {
        id: `disc-ocr-2`,
        claimId,
        type: "missing_berth",
        severity: "error",
        title: "Missing Berth Association",
        description: "Equipment breakdown event is not assigned to an active berth identifier.",
        field: "berthId",
        currentValue: "None",
        suggestedValue: berthId || "Katoen Natie Pier 1",
        isResolved: false
      },
      {
        id: `disc-ocr-3`,
        claimId,
        type: "low_confidence",
        severity: "warning",
        title: "Low OCR Extraction Confidence (62%)",
        description: "OCR engine extracted Rain event with only 62% confidence score. Manual verification required before laytime calculation.",
        field: "ocrConfidence",
        currentValue: "62%",
        suggestedValue: "Verify against original PDF scan",
        isResolved: false
      }
    );
  } else {
    // High-confidence digital vector / clear scan
    isScanned = false;
    overallConfidence = isRotterdam ? 0.96 : (isSingapore ? 0.95 : 0.93);

    extractedActivities.push(
      {
        id: `ocr-${Date.now()}-1`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Vessel arrived & tendered NOR",
        startTime: "2024-07-10T04:00:00Z",
        stopTime: "2024-07-10T04:30:00Z",
        durationMinutes: 30,
        durationFormatted: "00h 30m",
        percentageCounted: 100,
        prorata: 100,
        deductionCategory: "Other",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.98
      },
      {
        id: `ocr-${Date.now()}-2`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Notice of Readiness Grace Period",
        startTime: "2024-07-10T04:30:00Z",
        stopTime: "2024-07-10T10:30:00Z",
        durationMinutes: 360,
        durationFormatted: "06h 00m",
        percentageCounted: 0,
        prorata: 100,
        deductionCategory: "Waiting for berth",
        remarks: "6 hours NOR grace period applied",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.97
      },
      {
        id: `ocr-${Date.now()}-3`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Waiting for berth & Pilot on board",
        startTime: "2024-07-10T10:30:00Z",
        stopTime: "2024-07-11T12:00:00Z",
        durationMinutes: 1530,
        durationFormatted: "1d 01h 30m",
        percentageCounted: 100,
        prorata: 100,
        deductionCategory: "Waiting for berth",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.94
      },
      {
        id: `ocr-${Date.now()}-4`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Rain stoppage (Discharging suspended)",
        startTime: "2024-07-12T16:00:00Z",
        stopTime: "2024-07-13T01:00:00Z",
        durationMinutes: 540,
        durationFormatted: "09h 00m",
        percentageCounted: 50,
        prorata: 100,
        deductionCategory: "Rain",
        remarks: "50% counted under BPVOY4 Clause 17",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.92
      },
      {
        id: `ocr-${Date.now()}-5`,
        claimId,
        portId: portId || "port-1",
        berthId: berthId || "berth-1-1",
        activityName: "Discharging completed & Hoses disconnected",
        startTime: "2024-07-14T02:00:00Z",
        stopTime: "2024-07-14T03:30:00Z",
        durationMinutes: 90,
        durationFormatted: "01h 30m",
        percentageCounted: 100,
        prorata: 100,
        deductionCategory: "Other",
        isOcrExtracted: true,
        isCorrected: false,
        ocrConfidence: 0.99
      }
    );
  }

  const lowConfidenceCount = extractedActivities.filter((a) => (a.ocrConfidence || 1.0) < 0.8).length;

  return {
    fileName,
    isScanned,
    overallConfidence,
    extractedActivities,
    lowConfidenceCount,
    flaggedDiscrepancies,
    rawTextPreview: `[OCR ENGINE TEXT STREAM: ${fileName}]\n` +
      `--------------------------------------------------------\n` +
      `VESSEL STATEMENT OF FACTS / TIME LOG\n` +
      `DOCUMENT TYPE: ${isScanned ? "SCANNED BITMAP IMAGE (OCR APPLIED)" : "NATIVE DIGITAL PDF VECTOR"}\n` +
      `CONFIDENCE INDEX: ${(overallConfidence * 100).toFixed(1)}%\n` +
      `EXTRACTED EVENTS COUNT: ${extractedActivities.length}\n` +
      `FLAGGED DISCREPANCIES: ${flaggedDiscrepancies.length}\n` +
      `--------------------------------------------------------\n` +
      extractedActivities.map((a, i) => `${i + 1}. [${a.startTime.slice(0, 16)}] - [${a.stopTime.slice(0, 16)}] : ${a.activityName} (${a.deductionCategory}, ${a.percentageCounted}% counted, ${(a.ocrConfidence! * 100).toFixed(0)}% conf)`).join("\n")
  };
}
