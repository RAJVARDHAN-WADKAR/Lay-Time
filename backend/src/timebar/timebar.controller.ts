import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimebarService } from './timebar.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Time-Bar Monitoring & Deadlines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TimebarController {
  constructor(private timebarService: TimebarService) {}

  @Get('timebar')
  @ApiOperation({ summary: 'Get live time-bar countdowns, risk categorization, and follow-up intervals for all claims' })
  async getAll() {
    return this.timebarService.getAllTimebars();
  }

  @Get('claims/:claimId/timebar')
  @ApiOperation({ summary: 'Get contractual notice & claim timebar details for a specific claim' })
  async getForClaim(@Param('claimId') claimId: string) {
    return this.timebarService.getTimebarForClaim(claimId);
  }

  @Post('claims/:claimId/timebar/recalculate')
  @ApiOperation({ summary: 'Recalculate timebar days remaining and update timebarred database flag' })
  async recalculate(@Param('claimId') claimId: string) {
    return this.timebarService.recalculateClaimTimebar(claimId);
  }
}