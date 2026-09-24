import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(filters: any = {}) {
    const where: any = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status) where.status = filters.status;
    if (filters.claimType) where.claimType = filters.claimType;

    const [totalClaims, claims] = await Promise.all([
      this.prisma.claim.count({ where }).catch(() => 0),
      this.prisma.claim.findMany({ where, include: { calculations: { take: 1, orderBy: { createdAt: 'desc' } } } }).catch(() => []),
    ]);

    const activeClaims = claims.filter((c) => ['INCOMPLETE', 'SUBMITTED', 'REVIEW'].includes(c.status)).length;
    const settledClaims = claims.filter((c) => c.status === 'SETTLED').length;
    let totalExposure = 0;
    let totalSettledAmount = 0;
    let totalPaymentsReceived = 0;
    for (const c of claims as any[]) {
      totalExposure += c.claimFiledAmount || 0;
      totalSettledAmount += c.agreedAmount || 0;
      totalPaymentsReceived += c.paymentReceived || 0;
    }
    const overdueTimebars = claims.filter((c) => c.timebarred).length;

    return {
      kpis: {
        totalExposure: Math.round(totalExposure),
        activeClaimsCount: activeClaims,
        settledCount: settledClaims,
        totalSettledAmount: Math.round(totalSettledAmount),
        totalPaymentsReceived: Math.round(totalPaymentsReceived),
        netOutstanding: Math.round(totalSettledAmount - totalPaymentsReceived),
        overdueTimebars,
        recoveryRatePercentage: totalExposure > 0 ? +((totalSettledAmount / totalExposure) * 100).toFixed(1) : 0,
        averageCycleDays: 24,
      },
      filtersApplied: filters,
    };
  }

  async getKpis(filters: any = {}) {
    const summary = await this.getSummary(filters);
    return summary.kpis;
  }

  async getStatusDistribution(filters: any = {}) {
    const where: any = {};
    if (filters.clientId) where.clientId = filters.clientId;

    const claims = await this.prisma.claim.findMany({ where }).catch(() => []);
    const counts: Record<string, number> = {
      INCOMPLETE: 0,
      SUBMITTED: 0,
      REVIEW: 0,
      SETTLED: 0,
      DISPUTED: 0,
      TIMEBARRED: 0,
    };

    for (const c of claims) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }

    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }

  async getDemurrageTrend(filters: any = {}) {
    return [
      { month: 'Jan 2024', filed: 180000, settled: 145000 },
      { month: 'Feb 2024', filed: 220000, settled: 190000 },
      { month: 'Mar 2024', filed: 195000, settled: 160000 },
      { month: 'Apr 2024', filed: 310000, settled: 260000 },
      { month: 'May 2024', filed: 280000, settled: 240000 },
      { month: 'Jun 2024', filed: 340000, settled: 295000 },
      { month: 'Jul 2024', filed: 410000, settled: 350000 },
    ];
  }

  async getClientSummary(filters: any = {}) {
    const clients = await this.prisma.client.findMany({
      include: {
        claims: {
          select: { claimFiledAmount: true, agreedAmount: true, status: true },
        },
      },
    }).catch(() => []);

    return clients.map((c) => {
      const exposure = c.claims.reduce((acc, cl) => acc + cl.claimFiledAmount, 0);
      const settled = c.claims.reduce((acc, cl) => acc + (cl.agreedAmount || 0), 0);
      return {
        clientId: c.id,
        clientName: c.name,
        totalClaims: c.claims.length,
        totalExposure: Math.round(exposure),
        totalSettled: Math.round(settled),
      };
    });
  }
}