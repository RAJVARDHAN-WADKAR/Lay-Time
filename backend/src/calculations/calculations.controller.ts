import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalculationsService } from './calculations.service';
import { RunCalculationDto, OverrideRuleDto } from './dto/run-calculation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Laytime & Demurrage Calculation Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CalculationsController {
  constructor(private calculationsService: CalculationsService) {}

  @Get('claims/:claimId/calculations')
  @ApiOperation({ summary: 'List all calculation runs for a claim' })
  async findByClaim(@Param('claimId') claimId: string) {
    return this.calculationsService.findByClaim(claimId);
  }

  @Post('claims/:claimId/calculations')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Execute laytime calculation engine for a claim' })
  async runCalculation(
    @Param('claimId') claimId: string,
    @Body() dto: RunCalculationDto,
  ) {
    return this.calculationsService.runCalculation(claimId, dto);
  }

  @Get('calculations/:id')
  @ApiOperation({ summary: 'Get specific calculation record with all deduction line items' })
  async findOne(@Param('id') id: string) {
    return this.calculationsService.findOne(id);
  }

  @Get('calculations/:id/breakdown')
  @ApiOperation({ summary: 'Get detailed mathematical calculation breakdown' })
  async getBreakdown(@Param('id') id: string) {
    const calc = await this.calculationsService.findOne(id);
    return calc.calculationBreakdown;
  }

  @Post('calculations/:id/recalculate')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Recalculate an existing calculation' })
  async recalculate(@Param('id') id: string, @Body() dto: RunCalculationDto) {
    const calc = await this.calculationsService.findOne(id);
    return this.calculationsService.runCalculation(calc.claimId, dto);
  }

  @Post('calculations/:id/override')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Override a calculation rule with reason and audit trail' })
  async override(
    @Param('id') id: string,
    @Body() dto: OverrideRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.calculationsService.overrideRule(id, dto, user?.id || 'admin');
  }
}