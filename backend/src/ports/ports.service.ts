import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePortDto, UpdatePortDto } from './dto/create-port.dto';

@Injectable()
export class PortsService {
  constructor(private prisma: PrismaService) {}

  async findByClaim(claimId: string) {
    return this.prisma.port.findMany({
      where: { claimId },
      include: { berths: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(claimId: string, dto: CreatePortDto) {
    return this.prisma.port.create({
      data: {
        claimId,
        name: dto.name,
        numberOfBerths: dto.numberOfBerths || 1,
        loadRate: dto.loadRate || 5000,
        portType: dto.portType || 'Load Port',
      },
      include: { berths: true },
    });
  }

  async update(id: string, dto: UpdatePortDto) {
    const port = await this.prisma.port.findUnique({ where: { id } });
    if (!port) throw new NotFoundException(`Port ${id} not found`);
    return this.prisma.port.update({
      where: { id },
      data: dto,
      include: { berths: true },
    });
  }

  async delete(id: string) {
    const port = await this.prisma.port.findUnique({ where: { id } });
    if (!port) throw new NotFoundException(`Port ${id} not found`);
    return this.prisma.port.delete({ where: { id } });
  }
}