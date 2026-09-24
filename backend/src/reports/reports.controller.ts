import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('claim-summary')
  @ApiOperation({ summary: 'Generate claim summary audit report' })
  async getClaimSummary(@Body() filters: any) {
    return this.reportsService.generateClaimSummaryReport(filters);
  }

  @Post('financial')
  @ApiOperation({ summary: 'Generate financial reconciliation and exposure report' })
  async getFinancial(@Body() filters: any) {
    return this.reportsService.generateFinancialReport(filters);
  }

  @Post('calculation')
  @ApiOperation({ summary: 'Generate formal Laytime Calculation Statement report' })
  async getCalculation(@Body() filters: any) {
    return this.reportsService.generateCalculationReport(filters);
  }
}