import { IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiProperty({ example: 'Loading Cargo - Pump 1 & 2' })
  @IsNotEmpty()
  @IsString()
  activityName: string;

  @ApiProperty({ example: '2024-07-24T08:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2024-07-25T14:30:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  stopTime: string;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageCounted?: number;

  @ApiPropertyOptional({ example: 'Others', default: 'Others' })
  @IsOptional()
  @IsString()
  deductionCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  berthId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ example: 'MANUAL', default: 'MANUAL' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 0.98 })
  @IsOptional()
  @IsNumber()
  ocrConfidence?: number;
}

export class UpdateActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  stopTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percentageCounted?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deductionCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  berthId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ocrConfidence?: number;
}