import { Discrepancy, Port, SoFActivity } from "@/lib/types";

/**
 * Deterministic client-side discrepancy detection engine.
 * Scans SoF activities and ports for maritime sequence errors, timestamp conflicts, and data inconsistencies.
 */
export function detectDiscrepancies(
  activities: SoFActivity[],
  ports: Port[],
  confidenceThreshold: number = 0.8
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const berthMap = new Map<string, string>();
  const portMap = new Map<string, string>();

  ports.forEach((p) => {
    portMap.set(p.id, p.name);
    (p.berths || []).forEach((b) => {
      berthMap.set(b.id, b.name);
    });
  });

  // Track seen activities for duplicate detection
  const seenKeys = new Map<string, string>();

  // Sort activities chronologically by start time for sequence checking
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

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
      discrepancies.push({
        id: `disc-conf-${act.id}`,
        claimId: act.claimId,
        activityId: act.id,
        type: "low_confidence",
        severity: "warning",
        title: "Low OCR Extraction Confidence",
        description: `OCR model returned ${Math.round((act.ocrConfidence ?? 0) * 100)}% confidence on "${act.activityName}". Manual verification advised.`,
        field: "ocrConfidence",
        currentValue: `${Math.round((act.ocrConfidence ?? 0) * 100)}%`,
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
