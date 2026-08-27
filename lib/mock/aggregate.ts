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

  const statusMap: Record<ClaimStatus, { count: number; value: number }> = {
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
      totalDemurrageReceived += received;
      totalDaysOpen += Number(c.daysOpen) || 0;

      const remainingExposure = Math.max(billable - received, 0);
      totalExposure += remainingExposure;

      if (c.claimStatus === "Disputed" || c.claimStatus === "Incomplete") {
        amountUnderContention += filed;
      } else if (c.claimStatus === "Review" && agreed > 0 && filed > agreed) {
        amountUnderContention += filed - agreed;
      }

      if (c.claimStatus === "Settled") {
        settledClaimsCount++;
      } else if (c.claimStatus === "Timebarred") {
        timebarredClaimsCount++;
      } else {
        openClaimsCount++;
      }

      if (c.claimStatus === "Review" || c.claimStatus === "Submitted") {
        claimsAwaitingAction++;
        pendingActions++;
      }

      if (c.claimStatus === "Incomplete" || !c.documentLinks || c.documentLinks.length === 0) {
        claimsAwaitingDocs++;
      }

      // Status map
      if (c.claimStatus && statusMap[c.claimStatus]) {
        statusMap[c.claimStatus].count += 1;
        statusMap[c.claimStatus].value += filed;
      }

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
        monthMap[monthKey].received += received;
        monthMap[monthKey].agreed += agreed;
      }
    }
  }

  const averageProcessingTimeDays =
    totalClaimsCount > 0 ? Math.round(totalDaysOpen / totalClaimsCount) : 0;
  const averageDemurragePerClaim =
    totalClaimsCount > 0 ? Math.round(totalDemurrageOwed / totalClaimsCount) : 0;

  const statusColors: Record<ClaimStatus, string> = {
    Submitted: "#3b82f6", // blue
    Incomplete: "#f59e0b", // amber
    Review: "#8b5cf6", // purple
    Settled: "#10b981", // emerald
    Disputed: "#ef4444", // rose/red
    Timebarred: "#6b7280", // gray
  };

  const statusDistribution = (Object.keys(statusMap) as ClaimStatus[])
    .filter((status) => statusMap[status].count > 0)
    .map((status) => ({
      status,
      count: statusMap[status].count,
      value: statusMap[status].value,
      color: statusColors[status],
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
  };
}
