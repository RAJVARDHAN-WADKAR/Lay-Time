import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RACSeverity, RACFindingStatus } from '@prisma/client';
import { ResolveFindingDto } from './dto/resolve-finding.dto';

export interface FindingBlueprint {
  severity: RACSeverity;
  category: string;
  title: string;
  description: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  recommendation: string;
}

@Injectable()
export class RacService {
  constructor(private prisma: PrismaService) {}

  async findByClaim(claimId: string) {
    return this.prisma.rACAnalysis.findMany({
      where: { claimId },
      include: {
        findings: {
          include: { resolver: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const analysis = await this.prisma.rACAnalysis.findUnique({
      where: { id },
      include: {
        findings: {
          include: { resolver: { select: { id: true, name: true } } },
        },
      },
    });
    if (!analysis) throw new NotFoundException(`RAC Analysis ${id} not found`);
    return analysis;
  }

  async getFindings(analysisId: string) {
    return this.prisma.rACFinding.findMany({
      where: { racAnalysisId: analysisId },
      orderBy: { severity: 'desc' },
    });
  }

  async runAnalysis(claimId: string) {
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
        calculations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { deductions: true },
        },
        documents: true,
        ownerCalculations: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!claim) throw new NotFoundException(`Claim ${claimId} not found`);

    const findings: FindingBlueprint[] = [];
    const activities = claim.statementOfFacts.flatMap((s) => s.activities);
    const latestCalc = claim.calculations[0];
    const ownerCalc = claim.ownerCalculations[0];

    // 1. Calculation & Activity Sequence Checks
    for (const act of activities) {
      if (act.stopTime.getTime() < act.startTime.getTime()) {
        findings.push({
          severity: RACSeverity.CRITICAL,
          category: 'CALCULATION',
          title: `Inverted Timestamp: ${act.activityName}`,
          description: `Stop time (${act.stopTime.toISOString()}) occurs before start time (${act.startTime.toISOString()}).`,
          relatedEntity: 'SOFActivity',
          relatedEntityId: act.id,
          recommendation: 'Correct the stop timestamp in Statement of Facts review.',
        });
      }

      if (act.durationMinutes > 720 * 60) {
        findings.push({
          severity: RACSeverity.WARNING,
          category: 'CALCULATION',
          title: `Excessive Activity Duration: ${act.activityName}`,
          description: `Activity duration of ${Math.round(act.durationMinutes / 60)} hours exceeds 30-day single event threshold.`,
          relatedEntity: 'SOFActivity',
          relatedEntityId: act.id,
          recommendation: 'Verify date range against physical timesheet.',
        });
      }

      if (!act.berthId) {
        findings.push({
          severity: RACSeverity.WARNING,
          category: 'DATA',
          title: `Unlinked Berth: ${act.activityName}`,
          description: 'Activity is not bound to a port berth, preventing prorata calculation.',
          relatedEntity: 'SOFActivity',
          relatedEntityId: act.id,
          recommendation: 'Assign an official berth ID to this activity.',
        });
      }

      if (act.ocrConfidence && act.ocrConfidence < 0.8) {
        findings.push({
          severity: RACSeverity.INFO,
          category: 'OCR',
          title: `Low OCR Confidence: ${act.activityName}`,
          description: `Extracted with confidence score of ${Math.round(act.ocrConfidence * 100)}%.`,
          relatedEntity: 'SOFActivity',
          relatedEntityId: act.id,
          recommendation: 'Inspect scanned document preview and confirm parsed text.',
        });
      }
    }

    // 2. Data Completeness Checks
    if (!claim.layday || !claim.cancellingDate) {
      findings.push({
        severity: RACSeverity.WARNING,
        category: 'DATA',
        title: 'Missing Laycan Window Dates',
        description: 'Layday or Cancelling date is unrecorded in claim metadata.',
        recommendation: 'Enter laycan dates from Charterparty recap.',
      });
    }

    // 3. Time-Bar Checks
    if (claim.voyageEndDate) {
      const claimDeadline = new Date(claim.voyageEndDate.getTime() + (claim.claimTimebarDays || 90) * 86400000);
      const daysLeft = Math.ceil((claimDeadline.getTime() - Date.now()) / 86400000);

      if (daysLeft < 0) {
        findings.push({
          severity: RACSeverity.CRITICAL,
          category: 'TIMEBAR',
          title: 'Contractual Claim Time-Bar Expired',
          description: `Claim was timebarred ${Math.abs(daysLeft)} days ago on ${claimDeadline.toISOString().substring(0, 10)}.`,
          recommendation: 'Check whether reservation of rights or timebar extension was granted by charterers.',
        });
      } else if (daysLeft <= 7) {
        findings.push({
          severity: RACSeverity.CRITICAL,
          category: 'TIMEBAR',
          title: `Urgent Time-Bar Deadline: ${daysLeft} Days Remaining`,
          description: `Claim must be formally submitted before ${claimDeadline.toISOString().substring(0, 10)}.`,
          recommendation: 'Expedite supervisor review and claim dispatch.',
        });
      } else if (daysLeft <= 15) {
        findings.push({
          severity: RACSeverity.WARNING,
          category: 'TIMEBAR',
          title: `Approaching Time-Bar: ${daysLeft} Days Remaining`,
          description: `Approaching 90-day time-bar threshold (${claimDeadline.toISOString().substring(0, 10)}).`,
          recommendation: 'Gather remaining supporting documentation.',
        });
      }
    }

    // 4. Missing Mandatory Documents Checks
    const docTypes = claim.documents.map((d) => d.documentType);
    const requiredDocs = ['SOF', 'CHARTERPARTY', 'NOR', 'TIME_SHEET'];
    for (const req of requiredDocs) {
      if (!docTypes.includes(req as any)) {
        findings.push({
          severity: RACSeverity.WARNING,
          category: 'DOCUMENT',
          title: `Missing Mandatory Document: ${req}`,
          description: `Claim file lacks uploaded ${req} document required for formal charterer submission.`,
          recommendation: `Upload verified ${req} PDF in Document repository.`,
        });
      }
    }

    // 5. Owner vs Internal Calculation Variance
    if (latestCalc && ownerCalc) {
      const amountDiff = Math.abs(latestCalc.finalClaimAmount - ownerCalc.finalAmount);
      const pctDiff = ownerCalc.finalAmount > 0 ? (amountDiff / ownerCalc.finalAmount) * 100 : 0;

      if (amountDiff > 5000 || pctDiff > 5) {
        findings.push({
          severity: RACSeverity.WARNING,
          category: 'COMPARISON',
          title: `Substantial Owner Variance: $${amountDiff.toLocaleString()} (${pctDiff.toFixed(1)}%)`,
          description: `Internal calculation ($${latestCalc.finalClaimAmount.toLocaleString()}) differs from Owner claim ($${ownerCalc.finalAmount.toLocaleString()}).`,
          recommendation: 'Compare itemized weather deductions and NOR buffer deductions.',
        });
      }
    }

    // Compute Health Score (100 - penalties)
    let score = 100;
    for (const f of findings) {
      if (f.severity === RACSeverity.CRITICAL) score -= 15;
      else if (f.severity === RACSeverity.WARNING) score -= 8;
      else score -= 2;
    }
    score = Math.max(20, Math.min(100, score));

    // Save RAC Analysis Record
    const analysis = await this.prisma.rACAnalysis.create({
      data: {
        claimId,
        calculationId: latestCalc?.id,
        score,
        overallStatus: 'COMPLETED',
        completedAt: new Date(),
        findings: {
          create: findings.map((f) => ({
            severity: f.severity,
            category: f.category,
            title: f.title,
            description: f.description,
            relatedEntity: f.relatedEntity,
            relatedEntityId: f.relatedEntityId,
            recommendation: f.recommendation,
            status: RACFindingStatus.OPEN,
          })),
        },
      },
      include: { findings: true },
    });

    return analysis;
  }

  async resolveFinding(id: string, dto: ResolveFindingDto, userId: string) {
    const finding = await this.prisma.rACFinding.findUnique({ where: { id } });
    if (!finding) throw new NotFoundException(`RAC Finding ${id} not found`);

    return this.prisma.rACFinding.update({
      where: { id },
      data: {
        status: RACFindingStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy: userId,
        description: dto.resolutionNotes ? `${finding.description}\nResolution: ${dto.resolutionNotes}` : finding.description,
      },
    });
  }

  async ignoreFinding(id: string, userId: string) {
    const finding = await this.prisma.rACFinding.findUnique({ where: { id } });
    if (!finding) throw new NotFoundException(`RAC Finding ${id} not found`);

    return this.prisma.rACFinding.update({
      where: { id },
      data: {
        status: RACFindingStatus.IGNORED,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });
  }

  async compareOwnerVsInternal(claimId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        calculations: { take: 1, orderBy: { createdAt: 'desc' } },
        ownerCalculations: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!claim) throw new NotFoundException(`Claim ${claimId} not found`);

    const internal = claim.calculations[0];
    const owner = claim.ownerCalculations[0];

    const internalAmount = internal?.finalClaimAmount || 0;
    const ownerAmount = owner?.finalAmount || 0;
    const amountDiff = internalAmount - ownerAmount;
    const pctDiff = ownerAmount > 0 ? (amountDiff / ownerAmount) * 100 : 0;

    const internalLaytimeDays = internal ? +(internal.netLaytimeUsedMinutes / 1440).toFixed(3) : 0;
    const ownerLaytimeDays = owner ? +(owner.laytimeUsedMinutes / 1440).toFixed(3) : 0;
    const laytimeDaysDiff = +(internalLaytimeDays - ownerLaytimeDays).toFixed(3);

    return {
      claimId,
      internal: {
        laytimeUsedDays: internalLaytimeDays,
        deductionsHours: internal ? +(internal.totalDeductionMinutes / 60).toFixed(1) : 0,
        finalAmount: internalAmount,
      },
      owner: {
        laytimeUsedDays: ownerLaytimeDays,
        deductionsHours: owner ? +(owner.deductionsMinutes / 60).toFixed(1) : 0,
        finalAmount: ownerAmount,
      },
      variance: {
        amountDifference: Math.round(amountDiff * 100) / 100,
        percentageDifference: +pctDiff.toFixed(2),
        laytimeDaysDifference: laytimeDaysDiff,
        isSignificant: Math.abs(amountDiff) > 5000,
        indicators: [
          amountDiff < 0 ? 'Owner claim excludes weather stoppage deductions' : 'Internal calculation counted full NOR buffer',
          Math.abs(laytimeDaysDiff) > 0.5 ? 'Significant duration mismatch on waiting for berth period' : 'Durations closely aligned',
        ],
      },
    };
  }
}