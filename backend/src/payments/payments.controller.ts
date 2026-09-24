import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Payments & Financial Reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('claims/:claimId/payments')
  @ApiOperation({ summary: 'Get all payment ledger records for a claim' })
  async findByClaim(@Param('claimId') claimId: string) {
    return this.paymentsService.findByClaim(claimId);
  }

  @Post('claims/:claimId/payments')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Record a received or pending settlement payment' })
  async create(@Param('claimId') claimId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(claimId, dto);
  }

  @Patch('payments/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Update payment status or wire reference' })
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }
}