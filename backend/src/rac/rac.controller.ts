import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RacService } from './rac.service';
import { ResolveFindingDto } from './dto/resolve-finding.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('RAC (Root Cause Analysis & Claim Review)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RacController {
  constructor(private racService: RacService) {}

  @Get('claims/:claimId/rac')
  @ApiOperation({ summary: 'Get all RAC inspection runs for a claim' })
  async findByClaim(@Param('claimId') claimId: string) {
    return this.racService.findByClaim(claimId);
  }

  @Post('claims/:claimId/rac/analyze')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Execute deterministic RAC inspection across calculation, SoF, timebar, and documents' })
  async runAnalysis(@Param('claimId') claimId: string) {
    return this.racService.runAnalysis(claimId);
  }

  @Get('claims/:claimId/rac/compare-owner')
  @ApiOperation({ summary: 'Compare Owner Claim vs Internal Calculation with variance indicators' })
  async compareOwner(@Param('claimId') claimId: string) {
    return this.racService.compareOwnerVsInternal(claimId);
  }

  @Get('rac/:id')
  @ApiOperation({ summary: 'Get RAC analysis result by ID' })
  async findOne(@Param('id') id: string) {
    return this.racService.findOne(id);
  }

  @Get('rac/:id/findings')
  @ApiOperation({ summary: 'List all findings for a RAC analysis' })
  async getFindings(@Param('id') id: string) {
    return this.racService.getFindings(id);
  }

  @Post('rac/findings/:id/resolve')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Mark RAC finding as resolved with resolution notes' })
  async resolveFinding(
    @Param('id') id: string,
    @Body() dto: ResolveFindingDto,
    @CurrentUser() user: any,
  ) {
    return this.racService.resolveFinding(id, dto, user?.id || 'admin');
  }

  @Post('rac/findings/:id/ignore')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Mark RAC finding as ignored / accepted risk' })
  async ignoreFinding(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.racService.ignoreFinding(id, user?.id || 'admin');
  }
}