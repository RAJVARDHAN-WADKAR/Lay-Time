import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LaytimeRuleService } from './services/laytime-rule.service';
import { DeductionService, DeductionResult } from './services/deduction.service';
import { ProrataService } from './services/prorata.service';
import { DemurrageService } from './services/demurrage.service';
import { DespatchService } from './services/despatch.service';
import { RunCalculationDto, OverrideRuleDto } from './dto/run-calculation.dto';

@Injectable()
export class CalculationsService {
  constructor(
    private prisma: PrismaService,
    private ruleService: LaytimeRuleService,
    private deductionService: DeductionService,
    private prorataService: ProrataService,
    private demurrageService: DemurrageService,
    private despatchService: DespatchService,
  ) {}

  async findByClaim(claimId: string) {
    return this.prisma.calculation.findMany({
      where: { claimId },
      include: { deductions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const calc = await this.prisma.calculation.findUnique({
      where: { id },
      include: {
        deductions: true,
        claim: {
          include: {
            ports: { include: { berths: true } },
          },
        },
      },
    });
    if (!calc) throw new NotFoundException(`Calculation ${id} not found`);
    return calc;
  }

  async runCalculation(claimId: string, dto: RunCalculationDto = {}) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        ports: { include: { berths: true } },
        statementOfFacts: {
          include: {
            activities: {
              include: { berth: true },
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    if (!claim) throw new NotFoundException(`Claim ${claimId} not found`);

    // 1. Determine Allowed Laytime
    let allowedLaytimeMinutes = (dto.allowedLaytimeHours || 72) * 60;
    const allBerths = claim.ports.flatMap((p) => p.berths);
    const totalCargoQty = allBerths.reduce((acc, b) => acc + (b.quantity || 0), 0);
    const avgLoadRate = allBerths.length > 0 && allBerths[0].loadRate > 0 ? allBerths[0].loadRate : 5000;

    if (!dto.allowedLaytimeHours && totalCargoQty > 0 && avgLoadRate > 0) {
      // Days = Qty / Rate => Minutes = Days * 1440
      allowedLaytimeMinutes = Math.round((totalCargoQty / avgLoadRate) * 1440);
    }

    // 2. Fetch Activities from SoF
    const activities = claim.statementOfFacts.flatMap((sof) => sof.activities);

    // 3. Evaluate Gross Elapsed Time
    let grossElapsedMinutes = 0;
    let laytimeStart: Date | null = null;
    let laytimeEnd: Date | null = null;

    if (activities.length > 0) {
      laytimeStart = activities[0].startTime;
      laytimeEnd = activities[activities.length - 1].stopTime;
      grossElapsedMinutes = Math.max(0, Math.round((laytimeEnd.getTime() - laytimeStart.getTime()) / (1000 * 60)));
    } else {
      grossElapsedMinutes = 84 * 60; // 84h realistic fallback if no activities yet
    }

    // 4. Compute Deductions
    const processedDeductions: DeductionResult[] = [];
    let totalDeductionMinutes = 0;
    let countedDeductionMinutes = 0;

    for (const act of activities) {
      const prorata = act.berth?.prorataPercentage ?? 100;
      const res = this.deductionService.processActivityDeduction(
        act.activityName,
        act.deductionCategory,
        act.startTime,
        act.stopTime,
        act.percentageCounted,
        prorata,
        act.berthId || undefined,
        act.remarks || undefined,
      );

      processedDeductions.push(res);
      totalDeductionMinutes += res.durationMinutes;
      countedDeductionMinutes += res.countedDurationMinutes;
    }

    // 5. Net Laytime Used
    // Net Laytime Used = Counted working time
    const netLaytimeUsedMinutes = countedDeductionMinutes > 0 ? countedDeductionMinutes : grossElapsedMinutes;

    // 6. Demurrage vs Despatch
    const excessLaytimeMinutes = Math.max(0, netLaytimeUsedMinutes - allowedLaytimeMinutes);
    const savedLaytimeMinutes = Math.max(0, allowedLaytimeMinutes - netLaytimeUsedMinutes);

    const demurrageRate = dto.demurrageRatePerDay || claim.demurrageRatePerDay || 20000;
    const despatchRate = dto.despatchRatePerDay || demurrageRate * 0.5;

    const { demurrageDays, demurrageAmount } = this.demurrageService.calculateDemurrage(excessLaytimeMinutes, demurrageRate);
    const { despatchDays, despatchAmount } = this.despatchService.calculateDespatch(savedLaytimeMinutes, despatchRate);

    const finalClaimAmount = demurrageAmount > 0 ? demurrageAmount : -despatchAmount;

    // 7. Assemble Breakdown
    const calculationBreakdown = {
      rules: {
        onceOnDemurrageAlwaysOnDemurrage: dto.onceOnDemurrageAlwaysOnDemurrage ?? true,
        shex: dto.shex ?? false,
        norBufferHours: dto.norBufferHours ?? 6,
      },
      timeSummary: {
        laytimeStart: laytimeStart?.toISOString(),
        laytimeEnd: laytimeEnd?.toISOString(),
        grossElapsedMinutes,
        grossElapsedDays: +(grossElapsedMinutes / 1440).toFixed(4),
        allowedLaytimeMinutes,
        allowedLaytimeDays: +(allowedLaytimeMinutes / 1440).toFixed(4),
        netLaytimeUsedMinutes,
        netLaytimeUsedDays: +(netLaytimeUsedMinutes / 1440).toFixed(4),
        excessLaytimeMinutes,
        excessLaytimeDays: +demurrageDays.toFixed(4),
        savedLaytimeMinutes,
        savedLaytimeDays: +despatchDays.toFixed(4),
      },
      financials: {
        demurrageRatePerDay: demurrageRate,
        despatchRatePerDay: despatchRate,
        demurrageAmount,
        despatchAmount,
        finalClaimAmount,
      },
      itemizedDeductions: processedDeductions,
    };

    // 8. Atomically save calculation and deductions
    const calculation = await this.prisma.calculation.create({
      data: {
        claimId,
        grossElapsedMinutes,
        totalDeductionMinutes,
        countedDeductionMinutes,
        netLaytimeUsedMinutes,
        allowedLaytimeMinutes,
        excessLaytimeMinutes,
        savedLaytimeMinutes,
        demurrageAmount,
        despatchAmount,
        finalClaimAmount,
        calculationBreakdown: JSON.parse(JSON.stringify(calculationBreakdown)),
        deductions: {
          create: processedDeductions.map((d) => ({
            title: d.title,
            category: d.category,
            startTime: d.startTime,
            stopTime: d.stopTime,
            durationMinutes: d.durationMinutes,
            percentageCounted: d.percentageCounted,
            prorataPercentage: d.prorataPercentage,
            countedDurationMinutes: d.countedDurationMinutes,
            berthId: d.berthId,
            remarks: d.remarks,
          })),
        },
      },
      include: { deductions: true },
    });

    // Update claim filed amount
    await this.prisma.claim.update({
      where: { id: claimId },
      data: { claimFiledAmount: finalClaimAmount },
    });

    return calculation;
  }

  async overrideRule(calculationId: string, dto: OverrideRuleDto, userId: string) {
    const calc = await this.prisma.calculation.findUnique({ where: { id: calculationId } });
    if (!calc) throw new NotFoundException(`Calculation ${calculationId} not found`);

    // Record rule override
    await this.prisma.ruleOverride.create({
      data: {
        claimId: calc.claimId,
        entityType: 'Calculation',
        entityId: calculationId,
        originalValue: dto.originalValue,
        overriddenValue: dto.overriddenValue,
        reason: dto.reason,
        userId,
      },
    });

    // Update calculation record with override audit
    return this.prisma.calculation.update({
      where: { id: calculationId },
      data: {
        isOverridden: true,
        overrideReason: dto.reason,
        overriddenBy: userId,
        overriddenAt: new Date(),
      },
      include: { deductions: true },
    });
  }
}