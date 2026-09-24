import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClaimDto, UpdateClaimDto, ClaimQueryDto, SettleClaimDto, AssignClaimDto } from './dto/create-claim.dto';
import { ClaimStatus, Role } from '@prisma/client';

@Injectable()
export class ClaimsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ClaimQueryDto, user: any) {
    const { search, status, clientId, vesselId, timebarred, page = 1, pageSize = 20 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};

    // Role-based filtering: Claim Processors can only see claims assigned to them
    if (user && user.role === Role.CLAIM_PROCESSOR) {
      where.assignedProcessorId = user.id;
    }

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (vesselId) where.vesselId = vesselId;
    if (timebarred !== undefined) where.timebarred = Boolean(timebarred);

    if (search) {
      where.OR = [
        { claimNumber: { contains: search, mode: 'insensitive' } },
        { claimName: { contains: search, mode: 'insensitive' } },
        { counterpartyName: { contains: search, mode: 'insensitive' } },
        { brokerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [total, items] = await Promise.all([
        this.prisma.claim.count({ where }),
        this.prisma.claim.findMany({
          where,
          include: {
            client: true,
            vessel: true,
            assignedProcessor: { select: { id: true, name: true, email: true } },
            ports: { include: { berths: true } },
            calculations: { take: 1, orderBy: { createdAt: 'desc' } },
            _count: {
              select: {
                statementOfFacts: true,
                documents: true,
                payments: true,
                racAnalyses: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);

      return {
        items,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / take) || 1,
        },
      };
    } catch (err) {
      return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };
    }
  }

  async findOne(id: string, user?: any) {
    const claim = await this.prisma.claim.findUnique({
      where: { id },
      include: {
        client: true,
        vessel: true,
        assignedProcessor: { select: { id: true, name: true, email: true } },
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
          include: { deductions: true },
          orderBy: { createdAt: 'desc' },
        },
        racAnalyses: {
          include: { findings: true },
          orderBy: { createdAt: 'desc' },
        },
        ownerCalculations: true,
        internalCalculations: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!claim) throw new NotFoundException(`Claim with ID ${id} not found`);

    // Access check for processor
    if (user && user.role === Role.CLAIM_PROCESSOR && claim.assignedProcessorId !== user.id) {
      throw new ForbiddenException('Access denied: Claim Processors can only access assigned claims');
    }

    return claim;
  }

  async create(dto: CreateClaimDto, user?: any) {
    const assignedProcessorId = dto.assignedProcessorId || (user?.role === Role.CLAIM_PROCESSOR ? user.id : null);

    // Atomically create claim with initial port, berth, and Statement of Facts
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.create({
        data: {
          claimNumber: dto.claimNumber,
          claimName: dto.claimName,
          clientId: dto.clientId,
          vesselId: dto.vesselId,
          brokerName: dto.brokerName,
          claimType: dto.claimType || 'Load Port Demurrage',
          charterpartyType: dto.charterpartyType || 'GENCON',
          counterpartyName: dto.counterpartyName,
          counterpartyType: dto.counterpartyType,
          demurrageRatePerDay: dto.demurrageRatePerDay || 20000,
          layday: dto.layday ? new Date(dto.layday) : null,
          cancellingDate: dto.cancellingDate ? new Date(dto.cancellingDate) : null,
          voyageEndDate: dto.voyageEndDate ? new Date(dto.voyageEndDate) : null,
          noticeReceivedDate: dto.noticeReceivedDate ? new Date(dto.noticeReceivedDate) : null,
          claimReceivedDate: dto.claimReceivedDate ? new Date(dto.claimReceivedDate) : null,
          noticeTimebarDays: dto.noticeTimebarDays || 30,
          claimTimebarDays: dto.claimTimebarDays || 90,
          assignedProcessorId,
          claimNotes: dto.claimNotes,
          status: ClaimStatus.INCOMPLETE,
        },
      });

      // Default Port & Berth
      const port = await tx.port.create({
        data: {
          claimId: claim.id,
          name: 'Port of Loading',
          loadRate: 5000,
          numberOfBerths: 1,
        },
      });

      await tx.berth.create({
        data: {
          portId: port.id,
          name: 'Berth 1 - Main Terminal',
          quantity: 45000,
          loadRate: 5000,
          prorataPercentage: 100,
        },
      });

      // Default Statement of Facts
      await tx.statementOfFacts.create({
        data: {
          claimId: claim.id,
          status: 'DRAFT',
          extractionSource: 'MANUAL',
        },
      });

      return claim;
    });
  }

  async update(id: string, dto: UpdateClaimDto, user?: any) {
    await this.findOne(id, user);
    return this.prisma.claim.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, user?: any) {
    await this.findOne(id, user);
    return this.prisma.claim.delete({ where: { id } });
  }

  async submit(id: string, user?: any) {
    const claim = await this.findOne(id, user);

    if (claim.status !== ClaimStatus.INCOMPLETE) {
      throw new BadRequestException(`Claim is already in ${claim.status} status`);
    }

    return this.prisma.claim.update({
      where: { id },
      data: { status: ClaimStatus.SUBMITTED },
    });
  }

  async review(id: string, user?: any) {
    const claim = await this.findOne(id, user);

    return this.prisma.claim.update({
      where: { id },
      data: { status: ClaimStatus.REVIEW },
    });
  }

  async settle(id: string, dto: SettleClaimDto, user?: any) {
    const claim = await this.findOne(id, user);

    return this.prisma.claim.update({
      where: { id },
      data: {
        status: ClaimStatus.SETTLED,
        agreedAmount: dto.agreedAmount,
        claimAgreedDate: new Date(),
        claimNotes: dto.settlementNotes ? `${claim.claimNotes || ''}\nSettlement: ${dto.settlementNotes}` : claim.claimNotes,
      },
    });
  }

  async assign(id: string, dto: AssignClaimDto) {
    return this.prisma.claim.update({
      where: { id },
      data: { assignedProcessorId: dto.processorId },
    });
  }

  async getSummary(id: string, user?: any) {
    const claim = await this.findOne(id, user);
    const latestCalc = claim.calculations?.[0];

    return {
      id: claim.id,
      claimNumber: claim.claimNumber,
      claimName: claim.claimName,
      status: claim.status,
      client: claim.client?.name || 'N/A',
      vessel: claim.vessel?.name || 'N/A',
      demurrageRatePerDay: claim.demurrageRatePerDay,
      claimFiledAmount: claim.claimFiledAmount,
      agreedAmount: claim.agreedAmount,
      paymentReceived: claim.paymentReceived,
      paymentConcluded: claim.paymentConcluded,
      timebarred: claim.timebarred,
      assignedProcessor: claim.assignedProcessor?.name || 'Unassigned',
      latestCalculation: latestCalc
        ? {
            netLaytimeUsedDays: +(latestCalc.netLaytimeUsedMinutes / 1440).toFixed(2),
            allowedLaytimeDays: +(latestCalc.allowedLaytimeMinutes / 1440).toFixed(2),
            demurrageAmount: latestCalc.demurrageAmount,
            despatchAmount: latestCalc.despatchAmount,
          }
        : null,
      racScore: claim.racAnalyses?.[0]?.score || 100,
      openRacFindingsCount: claim.racAnalyses?.[0]?.findings?.filter((f) => f.status === 'OPEN').length || 0,
    };
  }
}