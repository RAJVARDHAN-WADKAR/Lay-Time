import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePortDto {
  @ApiProperty({ example: 'Rotterdam Europort' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfBerths?: number;

  @ApiPropertyOptional({ example: 5000, default: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  loadRate?: number;

  @ApiPropertyOptional({ example: 'Load Port', default: 'Load Port' })
  @IsOptional()
  @IsString()
  portType?: string;
}

export class UpdatePortDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  loadRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  portType?: string;
}