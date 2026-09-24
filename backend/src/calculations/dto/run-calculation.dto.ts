import { IsOptional, IsNumber, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RunCalculationDto {
  @ApiPropertyOptional({ example: 72, description: 'Allowed laytime in hours (if omitted, computed from cargo quantity / load rate)' })
  @IsOptional()
  @IsNumber()
  allowedLaytimeHours?: number;

  @ApiPropertyOptional({ example: 20000, description: 'Demurrage rate per day in USD' })
  @IsOptional()
  @IsNumber()
  demurrageRatePerDay?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Despatch rate per day in USD (default 50% of demurrage rate)' })
  @IsOptional()
  @IsNumber()
  despatchRatePerDay?: number;

  @ApiPropertyOptional({ example: true, description: 'Once on Demurrage Always on Demurrage' })
  @IsOptional()
  @IsBoolean()
  onceOnDemurrageAlwaysOnDemurrage?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Sundays and Holidays Excluded (SHEX)' })
  @IsOptional()
  @IsBoolean()
  shex?: boolean;

  @ApiPropertyOptional({ example: 6, description: 'Notice of Readiness buffer in hours' })
  @IsOptional()
  @IsNumber()
  norBufferHours?: number;
}

export class OverrideRuleDto {
  @ApiPropertyOptional({ example: 'allowedLaytimeMinutes' })
  @IsString()
  field: string;

  @ApiPropertyOptional({ example: '4320' })
  @IsString()
  originalValue: string;

  @ApiPropertyOptional({ example: '5040' })
  @IsString()
  overriddenValue: string;

  @ApiPropertyOptional({ example: 'Charterparty rider clause 34 agreed 84h total laytime allowance' })
  @IsString()
  reason: string;
}