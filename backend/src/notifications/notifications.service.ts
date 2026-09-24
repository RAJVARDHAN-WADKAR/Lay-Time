import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string) {
    const where: any = {};
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        claim: { select: { id: true, claimNumber: true, claimName: true } },
      },
    });
  }

  async markAsRead(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notification ${id} not found`);

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId?: string) {
    const where: any = {};
    if (userId) where.OR = [{ userId }, { userId: null }];
    return this.prisma.notification.updateMany({
      where,
      data: { read: true },
    });
  }

  async create(dto: { claimId?: string; userId?: string; type: NotificationType; title: string; message: string }) {
    return this.prisma.notification.create({
      data: {
        claimId: dto.claimId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        read: false,
      },
    });
  }
}
