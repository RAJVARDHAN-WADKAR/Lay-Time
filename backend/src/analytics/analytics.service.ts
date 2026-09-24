import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getClaimsAnalytics() {
    return {
      monthlyVolume: [
        { month: 'Jan', count: 12, volumeMT: 540000 },
        { month: 'Feb', count: 15, volumeMT: 620000 },
        { month: 'Mar', count: 18, volumeMT: 780000 },
        { month: 'Apr', count: 22, volumeMT: 950000 },
        { month: 'May', count: 19, volumeMT: 840000 },
        { month: 'Jun', count: 25, volumeMT: 1100000 },
      ],
      types: [
        { type: 'Load Port Demurrage', percentage: 48 },
        { type: 'Discharge Port Demurrage', percentage: 38 },
        { type: 'Despatch', percentage: 10 },
        { type: 'Detention', percentage: 4 },
      ],
    };
  }

  async getDemurrageAnalytics() {
    return {
      avgDemurrageRate: 22500,
      totalClaimedYTD: 2450000,
      totalRecoveredYTD: 2010000,
      recoveryRatePct: 82.04,
      disputedAmount: 440000,
    };
  }

  async getProcessingTimeAnalytics() {
    return {
      avgDaysIncompleteToSubmitted: 3.4,
      avgDaysSubmittedToReview: 6.2,
      avgDaysReviewToSettled: 14.8,
      overallAvgCycleDays: 24.4,
    };
  }

  async getClientAnalytics() {
    return [
      { client: 'Trafigura Maritime Pte', claims: 14, totalExposure: 420000, recoveryPct: 88 },
      { client: 'Vitol B.V. Tanker Desk', claims: 11, totalExposure: 340000, recoveryPct: 81 },
      { client: 'Shell Western Supply & Trading', claims: 9, totalExposure: 290000, recoveryPct: 85 },
      { client: 'Glencore Energy UK Ltd', claims: 8, totalExposure: 240000, recoveryPct: 79 },
    ];
  }

  async getTimebarAnalytics() {
    return {
      compliantPct: 94.2,
      timebarredCount: 2,
      urgentCount: 3,
      safeCount: 38,
    };
  }

  async getContentionAnalytics() {
    return [
      { category: 'Weather Stoppage Allowance', occurrencePct: 42 },
      { category: 'Notice of Readiness Buffer Window', occurrencePct: 28 },
      { category: 'Shifting from Anchorage to Berth', occurrencePct: 18 },
      { category: 'Prorata Multi-Berth Allocation', occurrencePct: 12 },
    ];
  }
}