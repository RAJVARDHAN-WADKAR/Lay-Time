import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.client.findMany({
        include: { _count: { select: { claims: true } } },
        orderBy: { name: 'asc' },
      });
    } catch (e) {
      return [];
    }
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { claims: true },
    }).catch(() => null);
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async create(dto: CreateClientDto) {
    return this.prisma.client.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateClientDto>) {
    await this.findOne(id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.client.delete({ where: { id } });
  }
}