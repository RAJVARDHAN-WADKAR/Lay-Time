import { Discrepancy, Port, SoFActivity } from "@/lib/types";

export interface ActivityOverlapPair {
  actA: SoFActivity;
  actB: SoFActivity;
  overlapStartMs: number;
  overlapEndMs: number;
  overlapMinutes: number;
  sameBerth: boolean;
}

export function sortActivitiesChronologically(activities: SoFActivity[]): SoFActivity[] {
  return [...activities].sort((a, b) => {
    const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    if (startDiff !== 0) return startDiff;
    const stopDiff = new Date(a.stopTime).getTime() - new Date(b.stopTime).getTime();
    if (stopDiff !== 0) return stopDiff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

/**
 * Find all overlapping pairs after chronological sorting.
 * Touching events (stopA === startB) are NOT considered overlapping.
 */
export function findActivityOverlaps(activities: SoFActivity[]): {
  sorted: SoFActivity[];
  sameBerthOverlaps: ActivityOverlapPair[];
  crossBerthOverlaps: ActivityOverlapPair[];
  affectedMinutesUnion: number;
} {
  const sorted = sortActivitiesChronologically(
    (activities || []).filter((a) => {
      const s = new Date(a.startTime).getTime();
      const e = new Date(a.stopTime).getTime();
      return !isNaN(s) && !isNaN(e) && e > s;
    })
  );

  const sameBerthOverlaps: ActivityOverlapPair[] = [];
  const crossBerthOverlaps: ActivityOverlapPair[] = [];
  const overlapIntervals: Array<[number, number]> = [];

  for (let i = 0; i < sorted.length; i++) {
    const actA = sorted[i];
    const startA = new Date(actA.startTime).getTime();
    const stopA = new Date(actA.stopTime).getTime();

    for (let j = i + 1; j < sorted.length; j++) {
      const actB = sorted[j];
      const startB = new Date(actB.startTime).getTime();
      const stopB = new Date(actB.stopTime).getTime();

      // Since sorted by startTime ascending, once startB >= stopA no later activity can overlap actA
      if (startB >= stopA) break;

      const overlapStartMs = Math.max(startA, startB);
      const overlapEndMs = Math.min(stopA, stopB);
      if (overlapEndMs > overlapStartMs) {
        const overlapMinutes = Math.round((overlapEndMs - overlapStartMs) / 60000);
        if (overlapMinutes <= 0) continue;

        const sameBerth =
          actA.berthId && actB.berthId
            ? actA.berthId === actB.berthId
            : !actA.berthId && !actB.berthId;

        const pair: ActivityOverlapPair = {
          actA,
          actB,
          overlapStartMs,
          overlapEndMs,
          overlapMinutes,
          sameBerth
        };

        if (sameBerth) {
          sameBerthOverlaps.push(pair);
          overlapIntervals.push([overlapStartMs, overlapEndMs]);
        } else {
          crossBerthOverlaps.push(pair);
        }
      }
    }
  }

  // Merge same-berth overlap intervals to compute exact affected union minutes
  overlapIntervals.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let affectedMinutesUnion = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const [s, e] of overlapIntervals) {
    if (curStart < 0) {
      curStart = s;
      curEnd = e;
    } else if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      affectedMinutesUnion += Math.round((curEnd - curStart) / 60000);
      curStart = s;
      curEnd = e;
    }
  }
  if (curStart >= 0) {
    affectedMinutesUnion += Math.round((curEnd - curStart) / 60000);
  }

  return { sorted, sameBerthOverlaps, crossBerthOverlaps, affectedMinutesUnion };
}

/**
 * Deterministic client-side discrepancy detection engine.
 * Scans SoF activities and ports for maritime sequence errors, timestamp conflicts, and data inconsistencies.
 */
export function detectDiscrepancies(
  activities: SoFActivity[] = [],
  ports: Port[] = [],
  confidenceThreshold: number = 0.8
): Discrepancy[] {
  // Support passing a Claim object directly as first parameter
  const acts: SoFActivity[] = Array.isArray(activities) ? activities : (activities as any)?.activities || [];
  const pts: Port[] = Array.isArray(ports) && ports.length > 0 ? ports : (activities as any)?.ports || [];

  const discrepancies: Discrepancy[] = [];
  const berthMap = new Map<string, string>();
  const portMap = new Map<string, string>();

  (pts || []).forEach((p) => {
    portMap.set(p.id, p.name);
    (p.berths || []).forEach((b) => {
      berthMap.set(b.id, b.name);
    });
  });

  // Track seen activities for duplicate detection
  const seenKeys = new Map<string, string>();

  // Sort activities chronologically before running sequence and overlap checks
  const sortedActivities = sortActivitiesChronologically(acts);

  let hasArrived = false;
  let hasNorTendered = false;
  let hasNorAccepted = false;
  let hasCommenced = false;
  let hasCompleted = false;

  for (let i = 0; i < sortedActivities.length; i++) {
    const act = sortedActivities[i];

    // 1. Missing Berth Check
    if (!act.berthId || !berthMap.has(act.berthId)) {
      discrepancies.push({
        id: `disc-berth-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "missing_berth",
        severity: "error",
        title: "Missing or Unlinked Berth",
        description: `Activity "${act.activityName}" is not assigned to a recognized berth.`,
        field: "berthId",
        currentValue: act.berthId || "None",
        suggestedValue: ports[0]?.berths[0]?.id || "Select Berth",
        isResolved: false,
      });
    }

    // 2. Missing Port Check
    if (!act.portId || !portMap.has(act.portId)) {
      discrepancies.push({
        id: `disc-port-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "missing_port",
        severity: "error",
        title: "Missing Port Association",
        description: `Activity "${act.activityName}" lacks a valid port identifier.`,
        field: "portId",
        currentValue: act.portId || "None",
        suggestedValue: ports[0]?.id || "Select Port",
        isResolved: false,
      });
    }

    // 3. Invalid Dates
    const startTime = new Date(act.startTime).getTime();
    const stopTime = new Date(act.stopTime).getTime();

    if (isNaN(startTime) || isNaN(stopTime)) {
      discrepancies.push({
        id: `disc-date-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "invalid_date",
        severity: "error",
        title: "Invalid ISO Datetime Format",
        description: `Timestamp for "${act.activityName}" cannot be parsed into a valid date.`,
        field: isNaN(startTime) ? "startTime" : "stopTime",
        currentValue: isNaN(startTime) ? act.startTime : act.stopTime,
        suggestedValue: new Date().toISOString(),
        isResolved: false,
      });
      continue;
    }

    // 4. Start time after Stop time
    if (startTime >= stopTime) {
      discrepancies.push({
        id: `disc-time-order-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "start_after_stop",
        severity: "error",
        title: "Start Time Follows Stop Time",
        description: `Activity "${act.activityName}" has a start timestamp (${act.startTime}) equal to or after its stop timestamp (${act.stopTime}).`,
        field: "stopTime",
        currentValue: act.stopTime,
        suggestedValue: new Date(startTime + 2 * 60 * 60 * 1000).toISOString(),
        isResolved: false,
      });
    }

    // 5. Impossible Duration (Duration > 30 days or <= 0)
    const durationMinutes = (stopTime - startTime) / (1000 * 60);
    if (durationMinutes > 30 * 24 * 60) {
      discrepancies.push({
        id: `disc-duration-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "impossible_duration",
        severity: "warning",
        title: "Impossible Activity Duration",
        description: `Duration for "${act.activityName}" is ${Math.round(durationMinutes / 1440)} days, exceeding standard operational limits.`,
        field: "durationMinutes",
        currentValue: `${durationMinutes} mins`,
        suggestedValue: "Review start/stop timestamps",
        isResolved: false,
      });
    }

    // 6. Duplicate Activity
    const duplicateKey = `${act.berthId}-${act.activityName}-${act.startTime}`;
    if (seenKeys.has(duplicateKey)) {
      discrepancies.push({
        id: `disc-dup-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "duplicate_activity",
        severity: "warning",
        title: "Duplicate Operational Entry",
        description: `Duplicate event recorded for "${act.activityName}" starting at ${act.startTime}.`,
        field: "activityName",
        currentValue: act.activityName,
        suggestedValue: "Remove duplicate record",
        isResolved: false,
      });
    } else {
      seenKeys.set(duplicateKey, act.id);
    }

    // 7. Low OCR Confidence
    if (act.isOcrExtracted && (act.ocrConfidence ?? 1.0) < confidenceThreshold) {
      const confPct = Math.round((act.ocrConfidence ?? 0) * 100);
      discrepancies.push({
        id: `disc-conf-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "low_confidence",
        severity: "warning",
        title: `Low OCR Extraction Confidence (${confPct}%)`,
        description: `OCR model returned ${confPct}% confidence on "${act.activityName}". Manual verification advised against original document scan.`,
        field: "ocrConfidence",
        currentValue: `${confPct}%`,
        suggestedValue: "Verify against original PDF scan",
        isResolved: false,
      });
    }

    // 8. Sequence Logic Checks
    const actLower = (act.activityName || "").toLowerCase();
    if (actLower.includes("vessel arrived")) hasArrived = true;
    if (actLower.includes("nor tendered")) {
      if (!hasArrived) {
        discrepancies.push({
          id: `disc-seq-nor-${act.id}`,
          claimId: act.claimId,
          activityId: act.id,
          type: "invalid_sequence",
          severity: "warning",
          title: "NOR Tendered Prior to Vessel Arrival",
          description: `NOR tendered at ${act.startTime} before "Vessel arrived" was logged.`,
          field: "activityName",
          currentValue: act.startTime,
          suggestedValue: "Ensure Vessel Arrived is logged prior to NOR",
          isResolved: false,
        });
      }
      hasNorTendered = true;
    }
    if (actLower.includes("nor accepted")) {
      if (!hasNorTendered) {
        discrepancies.push({
          id: `disc-seq-acc-${act.id}`,
          claimId: act.claimId,
          activityId: act.id,
          type: "invalid_sequence",
          severity: "warning",
          title: "NOR Accepted Prior to NOR Tendered",
          description: `NOR was accepted before being tendered in the event log.`,
          field: "activityName",
          currentValue: act.startTime,
          suggestedValue: "Check NOR tender and acceptance sequence",
          isResolved: false,
        });
      }
      hasNorAccepted = true;
    }
    if (actLower.includes("commenced")) hasCommenced = true;
    if (actLower.includes("completed")) {
      if (!hasCommenced) {
        discrepancies.push({
          id: `disc-seq-comp-${act.id}`,
          claimId: act.claimId,
          activityId: act.id,
          type: "invalid_sequence",
          severity: "error",
          title: "Operation Completed Prior to Commencing",
          description: `"${act.activityName}" logged completion before commencement was registered.`,
          field: "activityName",
          currentValue: act.startTime,
          suggestedValue: "Check commencement timestamp",
          isResolved: false,
        });
      }
      hasCompleted = true;
    }
  }

  // 9. Chronological Intra-Berth (ERROR: conflicting_timestamps) & Cross-Berth (WARNING) Overlaps
  const { sameBerthOverlaps, crossBerthOverlaps } = findActivityOverlaps(sortedActivities);

  for (const pair of sameBerthOverlaps) {
    const startClock = new Date(pair.overlapStartMs).toISOString().substring(11, 16);
    const stopClock = new Date(pair.overlapEndMs).toISOString().substring(11, 16);
    discrepancies.push({
      id: `disc-overlap-${pair.actA.id}-${pair.actB.id}`,
      claimId: pair.actB.claimId || pair.actA.claimId,
      activityId: pair.actB.id,
      type: "conflicting_timestamps",
      severity: "error",
      title: `Overlapping Same-Berth Timestamps (${pair.overlapMinutes}m)`,
      description: `Activity "${pair.actA.activityName}" overlaps with "${pair.actB.activityName}" on the same berth between ${startClock} and ${stopClock} (${pair.overlapMinutes} minutes).`,
      field: "startTime",
      currentValue: pair.actB.startTime,
      suggestedValue: pair.actA.stopTime,
      isResolved: false
    });
  }

  for (const pair of crossBerthOverlaps) {
    const berthA = berthMap.get(pair.actA.berthId || "") || pair.actA.berthId || "Berth A";
    const berthB = berthMap.get(pair.actB.berthId || "") || pair.actB.berthId || "Berth B";
    discrepancies.push({
      id: `disc-xberth-${pair.actA.id}-${pair.actB.id}`,
      claimId: pair.actB.claimId || pair.actA.claimId,
      activityId: pair.actB.id,
      type: "overlapping_timestamps",
      severity: "warning",
      title: `Cross-Berth Concurrent Overlap (${pair.overlapMinutes}m)`,
      description: `Cross-berth overlap (${pair.overlapMinutes} minutes) between "${pair.actA.activityName}" (${berthA}) and "${pair.actB.activityName}" (${berthB}). Acknowledge if simultaneous berth operations occurred.`,
      field: "startTime",
      currentValue: pair.actB.startTime,
      suggestedValue: "Acknowledge concurrent berths or adjust times",
      isResolved: false
    });
  }

  // Check for critical missing steps if loading/discharging took place
  if (hasCompleted && !hasNorTendered && activities.length > 3) {
    discrepancies.push({
      id: `disc-missing-nor-${activities[0]?.claimId || "gen"}`,
      claimId: activities[0]?.claimId || "",
      type: "missing_activity",
      severity: "warning",
      title: "Missing NOR Tendered Record",
      description: "Cargo operations completed without any Notice of Readiness (NOR) entry in Statement of Facts.",
      field: "activityName",
      currentValue: "Missing",
      suggestedValue: "Add NOR Tendered event",
      isResolved: false,
    });
  }

  return discrepancies;
}
