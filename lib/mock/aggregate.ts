import { Claim, ClaimStatus, DashboardMetrics } from "@/lib/types";

export interface DashboardFilters {
  client?: string;
  claimType?: string;
  claimStatus?: string;
  startDate?: string;
  endDate?: string;
  timeRange?: "month" | "last_month" | "3_months" | "year" | "all";
}

export function filterClaims(claims: Claim[], filters: DashboardFilters = {}): Claim[] {
  if (!claims || claims.length === 0) return [];

  return claims.filter((c) => {
    if (filters.client && filters.client !== "ALL" && c.accountName !== filters.client) {
      return false;
    }
    if (filters.claimType && filters.claimType !== "ALL" && c.claimType !== filters.claimType) {
      return false;
    }
    if (filters.claimStatus && filters.claimStatus !== "ALL" && c.claimStatus !== filters.claimStatus) {
      return false;
    }
    if (filters.startDate) {
      const claimDate = new Date(c.createdAt).getTime();
      const filterStart = new Date(filters.startDate).getTime();
      if (!isNaN(claimDate) && !isNaN(filterStart) && claimDate < filterStart) {
        return false;
      }
    }
    if (filters.endDate) {
      const claimDate = new Date(c.createdAt).getTime();
      const filterEnd = new Date(filters.endDate).getTime();
      if (!isNaN(claimDate) && !isNaN(filterEnd) && claimDate > filterEnd) {
        return false;
      }
    }
    return true;
  });
}

export function calculateDashboardMetrics(claims: Claim[], unreadNotifCount: number = 0): DashboardMetrics {
  const totalClaimsCount = claims?.length || 0;

  let totalDemurrageOwed = 0;
  let totalDemurrageReceived = 0;
  let totalExposure = 0;
  let amountUnderContention = 0;
  let totalDaysOpen = 0;
  let settledClaimsCount = 0;
  let timebarredClaimsCount = 0;
  let openClaimsCount = 0;
  let claimsAwaitingAction = 0;
  let claimsAwaitingDocs = 0;
  let pendingActions = 0;

  const statusMap: Record<string, { count: number; value: number }> = {
    "2. Nil Demurrage (No Claim)": { count: 0, value: 0 },
    "3. Pending Info from Owners": { count: 0, value: 0 },
    "4. Calculation Sent to Owners": { count: 0, value: 0 },
    "5. Claim Filed": { count: 0, value: 0 },
    "6. Waiting Charterers Response": { count: 0, value: 0 },
    "7. Agreed": { count: 0, value: 0 },
    "8. Disputed": { count: 0, value: 0 },
    "9. Legal": { count: 0, value: 0 },
    "10. Claim Closed": { count: 0, value: 0 },
    "11. Commercial Write Off": { count: 0, value: 0 },
    Submitted: { count: 0, value: 0 },
    Incomplete: { count: 0, value: 0 },
    Review: { count: 0, value: 0 },
    Settled: { count: 0, value: 0 },
    Disputed: { count: 0, value: 0 },
    Timebarred: { count: 0, value: 0 },
  };

  const clientMap: Record<string, { exposure: number; count: number }> = {};
  const monthMap: Record<string, { filed: number; received: number; agreed: number }> = {};

  if (claims && claims.length > 0) {
    for (const c of claims) {
      const filed = Math.max(Number(c.claimFiledAmount) || 0, 0);
      const received = Math.max(Number(c.paymentReceived) || 0, 0);
      const agreed = Math.max(Number(c.agreedAmount) || 0, 0);
      const billable = Math.max(Number(c.billableAmount) || filed, 0);

      totalDemurrageOwed += filed;
      totalDemurrageReceived += received || agreed;
      totalDaysOpen += Number(c.daysOpen) || 0;

      const remainingExposure = Math.max(filed - (received || agreed), 0);
      totalExposure += remainingExposure;

      const isDisputed = c.claimStatus === "Disputed" || c.claimStatus === "8. Disputed" || c.claimStatus === "9. Legal" || c.claimStatus === "Incomplete";
      const isSettled = c.claimStatus === "Settled" || c.claimStatus === "7. Agreed" || c.claimStatus === "10. Claim Closed";
      const isTimebarred = c.claimStatus === "Timebarred" || Boolean(c.timebarred);

      if (isDisputed) {
        amountUnderContention += filed;
      } else if (c.claimStatus === "Review" && agreed > 0 && filed > agreed) {
        amountUnderContention += filed - agreed;
      }

      if (isSettled) {
        settledClaimsCount++;
      } else if (isTimebarred) {
        timebarredClaimsCount++;
      } else if (c.claimStatus !== "11. Commercial Write Off") {
        openClaimsCount++;
      }

      if (
        c.claimStatus === "Review" ||
        c.claimStatus === "Submitted" ||
        c.claimStatus === "3. Pending Info from Owners" ||
        c.claimStatus === "4. Calculation Sent to Owners" ||
        c.claimStatus === "6. Waiting Charterers Response"
      ) {
        claimsAwaitingAction++;
        pendingActions++;
      }

      if (c.claimStatus === "Incomplete" || c.claimStatus === "3. Pending Info from Owners") {
        claimsAwaitingDocs++;
      }

      // Status map
      const st = c.claimStatus || "Submitted";
      if (!statusMap[st]) {
        statusMap[st] = { count: 0, value: 0 };
      }
      statusMap[st].count += 1;
      statusMap[st].value += filed;

      // Client map
      const clientKey = c.accountName || "Other";
      if (clientKey) {
        if (!clientMap[clientKey]) {
          clientMap[clientKey] = { exposure: 0, count: 0 };
        }
        clientMap[clientKey].exposure += remainingExposure;
        clientMap[clientKey].count += 1;
      }

      // Trend by month
      if (c.createdAt) {
        const monthKey = c.createdAt.substring(0, 7);
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { filed: 0, received: 0, agreed: 0 };
        }
        monthMap[monthKey].filed += filed;
        monthMap[monthKey].received += received || agreed;
        monthMap[monthKey].agreed += agreed;
      }
    }
  }

  const averageProcessingTimeDays =
    totalClaimsCount > 0 ? Math.round(totalDaysOpen / totalClaimsCount) : 0;
  const averageDemurragePerClaim =
    totalClaimsCount > 0 ? Math.round(totalDemurrageOwed / totalClaimsCount) : 0;

  const statusColors: Record<string, string> = {
    "2. Nil Demurrage (No Claim)": "#64748b",
    "3. Pending Info from Owners": "#f59e0b",
    "4. Calculation Sent to Owners": "#6366f1",
    "5. Claim Filed": "#3b82f6",
    "6. Waiting Charterers Response": "#8b5cf6",
    "7. Agreed": "#10b981",
    "8. Disputed": "#ef4444",
    "9. Legal": "#dc2626",
    "10. Claim Closed": "#475569",
    "11. Commercial Write Off": "#94a3b8",
    Submitted: "#3b82f6",
    Incomplete: "#f59e0b",
    Review: "#8b5cf6",
    Settled: "#10b981",
    Disputed: "#ef4444",
    Timebarred: "#6b7280",
  };

  const statusDistribution = Object.keys(statusMap)
    .filter((status) => statusMap[status].count > 0)
    .map((status) => ({
      status: status as ClaimStatus,
      count: statusMap[status].count,
      value: statusMap[status].value,
      color: statusColors[status] || "#3b82f6",
    }));

  const demurrageTrend = Object.keys(monthMap)
    .sort()
    .map((month) => ({
      month,
      filed: Math.round(monthMap[month].filed),
      received: Math.round(monthMap[month].received),
      agreed: Math.round(monthMap[month].agreed),
    }));

  const clientExposure = Object.keys(clientMap).map((client) => ({
    client: client.replace(" Trading Pte Ltd", "").replace(" International SA", "").replace(" Marine Products", "").replace(" Group", ""),
    exposure: Math.round(clientMap[client].exposure),
    claimCount: clientMap[client].count,
  }));

  return {
    totalDemurrageOwed: Math.round(totalDemurrageOwed),
    totalDemurrageReceived: Math.round(totalDemurrageReceived),
    totalExposure: Math.round(totalExposure),
    amountUnderContention: Math.round(amountUnderContention),
    averageProcessingTimeDays,
    averageDemurragePerClaim,
    totalClaimsCount,
    settledClaimsCount,
    timebarredClaimsCount,
    openClaimsCount,
    claimsAwaitingAction,
    claimsAwaitingDocs,
    unreadNotifications: unreadNotifCount,
    pendingActions,
    statusDistribution,
    demurrageTrend,
    clientExposure,
    paymentAging: [
      { bracket: "0-30 Days", amount: Math.round(totalExposure * 0.4), count: Math.round(totalClaimsCount * 0.4) },
      { bracket: "31-60 Days", amount: Math.round(totalExposure * 0.3), count: Math.round(totalClaimsCount * 0.3) },
      { bracket: "61-90 Days", amount: Math.round(totalExposure * 0.2), count: Math.round(totalClaimsCount * 0.2) },
      { bracket: "90+ Days (Overdue)", amount: Math.round(totalExposure * 0.1), count: Math.round(totalClaimsCount * 0.1) }
    ],
  };
}
