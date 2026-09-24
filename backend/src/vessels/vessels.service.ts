import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateVesselDto } from './dto/create-vessel.dto';

@Injectable()
export class VesselsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.vessel.findMany({
        include: { _count: { select: { claims: true } } },
        orderBy: { name: 'asc' },
      });
    } catch (e) {
      return [];
    }
  }

  async findOne(id: string) {
    const vessel = await this.prisma.vessel.findUnique({
      where: { id },
      include: { claims: true },
    }).catch(() => null);
    if (!vessel) throw new NotFoundException(`Vessel ${id} not found`);
    return vessel;
  }

  async create(dto: CreateVesselDto) {
    return this.prisma.vessel.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateVesselDto>) {
    await this.findOne(id);
    return this.prisma.vessel.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.vessel.delete({ where: { id } });
  }
}