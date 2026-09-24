import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeductionsService } from './deductions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Deductions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deductions')
export class DeductionsController {
  constructor(private deductionsService: DeductionsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List all standard and contractual deduction categories' })
  getCategories() {
    return this.deductionsService.getCategories();
  }
}