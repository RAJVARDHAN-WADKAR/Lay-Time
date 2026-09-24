import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSofDto {
  @ApiPropertyOptional({ example: 'DRAFT', default: 'DRAFT' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'MANUAL', default: 'MANUAL' })
  @IsOptional()
  @IsString()
  extractionSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentId?: string;
}

export class UpdateSofDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}