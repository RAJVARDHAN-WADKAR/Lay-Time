import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get comprehensive KPI summary with active filters' })
  async getSummary(@Query() filters: any) {
    return this.dashService.getSummary(filters);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get 8 core financial and operational KPI metrics' })
  async getKpis(@Query() filters: any) {
    return this.dashService.getKpis(filters);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get claims breakdown by status' })
  async getStatus(@Query() filters: any) {
    return this.dashService.getStatusDistribution(filters);
  }

  @Get('demurrage-trend')
  @ApiOperation({ summary: 'Get 7-month historical filed vs settled trend' })
  async getTrend(@Query() filters: any) {
    return this.dashService.getDemurrageTrend(filters);
  }

  @Get('client-summary')
  @ApiOperation({ summary: 'Get financial exposure matrix by client account' })
  async getClientSummary(@Query() filters: any) {
    return this.dashService.getClientSummary(filters);
  }
}