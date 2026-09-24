import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Analytics & Business Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('claims')
  @ApiOperation({ summary: 'Get claim volume and category distribution' })
  async getClaims() {
    return this.analyticsService.getClaimsAnalytics();
  }

  @Get('demurrage')
  @ApiOperation({ summary: 'Get demurrage financial metrics and recovery rate' })
  async getDemurrage() {
    return this.analyticsService.getDemurrageAnalytics();
  }

  @Get('processing-time')
  @ApiOperation({ summary: 'Get lifecycle processing time metrics across stages' })
  async getProcessingTime() {
    return this.analyticsService.getProcessingTimeAnalytics();
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get client portfolio performance metrics' })
  async getClients() {
    return this.analyticsService.getClientAnalytics();
  }

  @Get('timebar')
  @ApiOperation({ summary: 'Get compliance and time-bar risk distribution' })
  async getTimebar() {
    return this.analyticsService.getTimebarAnalytics();
  }

  @Get('contention')
  @ApiOperation({ summary: 'Get top dispute contention drivers' })
  async getContention() {
    return this.analyticsService.getContentionAnalytics();
  }
}