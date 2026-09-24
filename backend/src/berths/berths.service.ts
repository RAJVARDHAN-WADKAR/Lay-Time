import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBerthDto, UpdateBerthDto } from './dto/create-berth.dto';

@Injectable()
export class BerthsService {
  constructor(private prisma: PrismaService) {}

  async findByPort(portId: string) {
    return this.prisma.berth.findMany({
      where: { portId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(portId: string, dto: CreateBerthDto) {
    const port = await this.prisma.port.findUnique({ where: { id: portId } });
    if (!port) throw new NotFoundException(`Port ${portId} not found`);

    return this.prisma.berth.create({
      data: {
        portId,
        name: dto.name,
        quantity: dto.quantity,
        loadRate: dto.loadRate || port.loadRate || 5000,
        prorataPercentage: dto.prorataPercentage ?? 100,
        cargoType: dto.cargoType,
        receiverName: dto.receiverName,
      },
    });
  }

  async update(id: string, dto: UpdateBerthDto) {
    const berth = await this.prisma.berth.findUnique({ where: { id } });
    if (!berth) throw new NotFoundException(`Berth ${id} not found`);

    return this.prisma.berth.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const berth = await this.prisma.berth.findUnique({ where: { id } });
    if (!berth) throw new NotFoundException(`Berth ${id} not found`);
    return this.prisma.berth.delete({ where: { id } });
  }
}