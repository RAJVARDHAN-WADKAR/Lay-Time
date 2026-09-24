import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findByClaim(claimId: string) {
    return this.prisma.payment.findMany({
      where: { claimId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async create(claimId: string, dto: CreatePaymentDto) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException(`Claim ${claimId} not found`);

    const payment = await this.prisma.payment.create({
      data: {
        claimId,
        amount: dto.amount,
        paymentStatus: dto.paymentStatus || PaymentStatus.RECEIVED,
        reference: dto.reference,
        notes: dto.notes,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      },
    });

    // Update claim payment totals
    const allPayments = await this.prisma.payment.findMany({ where: { claimId } });
    const totalReceived = allPayments.reduce((acc, p) => acc + p.amount, 0);
    const isConcluded = claim.agreedAmount ? totalReceived >= claim.agreedAmount : false;

    await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        paymentReceived: totalReceived,
        paymentConcluded: isConcluded,
      },
    });

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);

    return this.prisma.payment.update({
      where: { id },
      data: dto,
    });
  }
}