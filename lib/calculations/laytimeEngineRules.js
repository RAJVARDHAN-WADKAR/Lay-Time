/**
 * Pure mathematical functions for maritime laytime calculations.
 * Compatible with CommonJS scripts and Next.js / TypeScript.
 */

/**
 * 6.1 SHEX vs SHINC:
 * Exclude Sundays (and local holidays) under SHEX, UNLESS on demurrage
 * ("once on demurrage, always on demurrage", unless contractual clause specifies "unless used").
 * Test case: NOR tendered Friday 14:00, 6h turn time -> laytime begins Friday 20:00.
 * Saturday counts. Sunday 00:00 to 24:00 excluded under SHEX. Laytime resumes Monday 00:00.
 */
function calculateShexWeekendExclusions(startTime, stopTime, weekendRule = "SHEX", isOnDemurrage = false) {
  if (weekendRule === "SHINC" || weekendRule === "FHINC" || isOnDemurrage) {
    return { excludedMinutes: 0, details: [] };
  }

  const start = new Date(startTime).getTime();
  const stop = new Date(stopTime).getTime();
  if (isNaN(start) || isNaN(stop) || stop <= start) {
    return { excludedMinutes: 0, details: [] };
  }

  let excludedMinutes = 0;
  const details = [];

  let curTime = start;
  while (curTime < stop) {
    const curDate = new Date(curTime);
    const dayOfWeek = curDate.getUTCDay(); // 0 = Sunday
    const nextHour = new Date(curTime + 60 * 60 * 1000);
    const stepEnd = Math.min(nextHour.getTime(), stop);
    const stepMinutes = Math.round((stepEnd - curTime) / 60000);

    if (dayOfWeek === 0) {
      excludedMinutes += stepMinutes;
    }
    curTime = stepEnd;
  }

  if (excludedMinutes > 0) {
    details.push(`SHEX Exclusion: ${excludedMinutes} minutes excluded for Sunday periods.`);
  }

  return { excludedMinutes, details };
}

/**
 * 6.2 Weather Working Day (24CH):
 * Deduct weather interruptions in exact 24-consecutive-hour proportion.
 */
function calculateWeatherInterruption(interruptionMinutes, percentageInterrupted = 100, apply24CH = true) {
  if (interruptionMinutes <= 0) return 0;
  const factor = apply24CH ? 1.0 : (8.0 / 24.0);
  const effectivePct = Math.min(Math.max(percentageInterrupted, 0), 100) / 100;
  return Math.round(interruptionMinutes * factor * effectivePct);
}

/**
 * 6.3 Multi-port reversible vs non-reversible:
 * - If Reversible: laytime allowed across all ports is pooled; demurrage/despatch is computed ONCE on total time used minus total time allowed.
 * - If Non-reversible: each port is calculated independently; despatch at load port CANNOT offset demurrage at discharge port.
 */
function calculateMultiPortLaytime(ports, ratePerMinute, rule = "NON_REVERSIBLE") {
  if (rule === "REVERSIBLE") {
    const pooledAllowed = ports.reduce((acc, p) => acc + p.totalAllowedMinutes, 0);
    const pooledUsed = ports.reduce((acc, p) => acc + p.totalNetUsedMinutes, 0);
    const netMinutes = pooledUsed - pooledAllowed;

    let totalDemurrageAmount = 0;
    let totalDespatchAmount = 0;

    if (netMinutes > 0) {
      totalDemurrageAmount = Math.round(netMinutes * ratePerMinute * 100) / 100;
    } else if (netMinutes < 0) {
      totalDespatchAmount = Math.round(Math.abs(netMinutes) * (ratePerMinute / 2) * 100) / 100;
    }

    const finalPayableAmount = Math.max(0, totalDemurrageAmount - totalDespatchAmount);
    return {
      rule,
      ports,
      totalDemurrageAmount,
      totalDespatchAmount,
      finalPayableAmount
    };
  } else {
    let totalDemurrageAmount = 0;
    let totalDespatchAmount = 0;

    for (const p of ports) {
      const netMinutes = p.totalNetUsedMinutes - p.totalAllowedMinutes;
      if (netMinutes > 0) {
        totalDemurrageAmount += Math.round(netMinutes * ratePerMinute * 100) / 100;
      } else if (netMinutes < 0) {
        totalDespatchAmount += Math.round(Math.abs(netMinutes) * (ratePerMinute / 2) * 100) / 100;
      }
    }

    // Despatch at load port CANNOT offset demurrage at discharge port under non-reversible terms
    const finalPayableAmount = Math.round(totalDemurrageAmount * 100) / 100;

    return {
      rule,
      ports,
      totalDemurrageAmount,
      totalDespatchAmount,
      finalPayableAmount
    };
  }
}

/**
 * 6.5 Overlapping SoF events:
 * Returns an error and excludes duplicate minutes from total net time.
 */
function detectAndExcludeSoFOverlaps(activities) {
  const overlapErrors = [];
  let totalOverlappingMinutes = 0;

  const valid = [...activities]
    .filter((a) => a.startTime && a.stopTime && !isNaN(new Date(a.startTime).getTime()) && !isNaN(new Date(a.stopTime).getTime()))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  for (let i = 0; i < valid.length - 1; i++) {
    const a1 = valid[i];
    const a2 = valid[i + 1];

    if ((a1.berthId && a2.berthId && a1.berthId === a2.berthId) || (!a1.berthId && !a2.berthId)) {
      const s1 = new Date(a1.startTime).getTime();
      const e1 = new Date(a1.stopTime).getTime();
      const s2 = new Date(a2.startTime).getTime();
      const e2 = new Date(a2.stopTime).getTime();

      const overlapStart = Math.max(s1, s2);
      const overlapEnd = Math.min(e1, e2);

      if (overlapEnd > overlapStart) {
        const overlapMins = Math.round((overlapEnd - overlapStart) / 60000);
        totalOverlappingMinutes += overlapMins;
        overlapErrors.push(
          `Overlapping SoF activities: "${a1.activityName}" and "${a2.activityName}" overlap by ${overlapMins} minutes. Duplicate minutes excluded.`
        );
      }
    }
  }

  return {
    cleanActivities: valid,
    overlapErrors,
    totalOverlappingMinutes
  };
}

module.exports = {
  calculateShexWeekendExclusions,
  calculateWeatherInterruption,
  calculateMultiPortLaytime,
  detectAndExcludeSoFOverlaps
};
