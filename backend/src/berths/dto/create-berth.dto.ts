import { IsNotEmpty, IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBerthDto {
  @ApiProperty({ example: 'Berth 1 - Jetty Alpha' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 5000, default: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  loadRate?: number;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  prorataPercentage?: number;

  @ApiPropertyOptional({ example: 'Crude Oil' })
  @IsOptional()
  @IsString()
  cargoType?: string;

  @ApiPropertyOptional({ example: 'TotalEnergies Trading SA' })
  @IsOptional()
  @IsString()
  receiverName?: string;
}

export class UpdateBerthDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  loadRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  prorataPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cargoType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiverName?: string;
}