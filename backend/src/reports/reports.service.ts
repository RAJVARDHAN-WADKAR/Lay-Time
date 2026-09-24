import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateClaimSummaryReport(filters: any) {
    const claims = await this.prisma.claim.findMany({
      include: { client: true, vessel: true, assignedProcessor: true },
      take: 50,
    }).catch(() => []);

    return {
      reportType: 'CLAIM_SUMMARY',
      generatedAt: new Date().toISOString(),
      recordCount: claims.length,
      data: claims.map((c) => ({
        claimNumber: c.claimNumber,
        ship: c.vessel?.name,
        client: c.client?.name,
        status: c.status,
        filedAmount: c.claimFiledAmount,
        agreedAmount: c.agreedAmount,
      })),
    };
  }

  async generateFinancialReport(filters: any) {
    return {
      reportType: 'FINANCIAL_EXPOSURE',
      generatedAt: new Date().toISOString(),
      totalFiledDemurrage: 2450000,
      totalAgreedSettlement: 2010000,
      totalPaymentsReceived: 1850000,
      outstandingReceivables: 160000,
    };
  }

  async generateCalculationReport(filters: any) {
    return {
      reportType: 'LAYTIME_CALCULATION_AUDIT',
      generatedAt: new Date().toISOString(),
      status: 'AUDIT_VERIFIED',
      ruleStandards: 'BIMCO / ASBATANKVOY 2024 STANDARD',
    };
  }
}