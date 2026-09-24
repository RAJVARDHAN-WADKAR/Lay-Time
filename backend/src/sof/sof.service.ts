import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSofDto, UpdateSofDto } from './dto/create-sof.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class SofService {
  constructor(private prisma: PrismaService) {}

  async findByClaim(claimId: string) {
    return this.prisma.statementOfFacts.findMany({
      where: { claimId },
      include: {
        activities: {
          include: { berth: true },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(claimId: string, dto: CreateSofDto) {
    return this.prisma.statementOfFacts.create({
      data: {
        claimId,
        documentId: dto.documentId,
        status: dto.status || 'DRAFT',
        extractionSource: dto.extractionSource || 'MANUAL',
        verified: false,
      },
      include: { activities: true },
    });
  }

  async update(id: string, dto: UpdateSofDto) {
    const sof = await this.prisma.statementOfFacts.findUnique({ where: { id } });
    if (!sof) throw new NotFoundException(`Statement of Facts ${id} not found`);
    return this.prisma.statementOfFacts.update({
      where: { id },
      data: dto,
      include: { activities: true },
    });
  }

  async verify(id: string) {
    const sof = await this.prisma.statementOfFacts.findUnique({ where: { id } });
    if (!sof) throw new NotFoundException(`Statement of Facts ${id} not found`);
    return this.prisma.statementOfFacts.update({
      where: { id },
      data: { verified: true, status: 'VERIFIED' },
      include: { activities: true },
    });
  }

  async addActivity(sofId: string, dto: CreateActivityDto) {
    const sof = await this.prisma.statementOfFacts.findUnique({ where: { id: sofId } });
    if (!sof) throw new NotFoundException(`Statement of Facts ${sofId} not found`);

    const start = new Date(dto.startTime);
    const stop = new Date(dto.stopTime);

    if (stop.getTime() < start.getTime()) {
      throw new BadRequestException('Activity stop time must be greater than or equal to start time');
    }

    const durationMinutes = Math.round((stop.getTime() - start.getTime()) / (1000 * 60));

    return this.prisma.sOFActivity.create({
      data: {
        sofId,
        berthId: dto.berthId,
        activityName: dto.activityName,
        startTime: start,
        stopTime: stop,
        durationMinutes,
        percentageCounted: dto.percentageCounted ?? 100,
        deductionCategory: dto.deductionCategory || 'Others',
        remarks: dto.remarks,
        source: dto.source || 'MANUAL',
        ocrConfidence: dto.ocrConfidence,
        verified: true,
      },
      include: { berth: true },
    });
  }

  async updateActivity(id: string, dto: UpdateActivityDto) {
    const activity = await this.prisma.sOFActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException(`Activity ${id} not found`);

    const start = dto.startTime ? new Date(dto.startTime) : activity.startTime;
    const stop = dto.stopTime ? new Date(dto.stopTime) : activity.stopTime;

    if (stop.getTime() < start.getTime()) {
      throw new BadRequestException('Activity stop time must be greater than or equal to start time');
    }

    const durationMinutes = Math.round((stop.getTime() - start.getTime()) / (1000 * 60));

    return this.prisma.sOFActivity.update({
      where: { id },
      data: {
        ...dto,
        startTime: start,
        stopTime: stop,
        durationMinutes,
        isCorrected: true,
      },
      include: { berth: true },
    });
  }

  async deleteActivity(id: string) {
    const activity = await this.prisma.sOFActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException(`Activity ${id} not found`);
    return this.prisma.sOFActivity.delete({ where: { id } });
  }
}