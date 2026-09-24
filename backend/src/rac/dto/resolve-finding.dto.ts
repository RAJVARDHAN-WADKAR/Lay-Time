import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RACFindingStatus } from '@prisma/client';

export class ResolveFindingDto {
  @ApiPropertyOptional({ example: 'Verified with port agent Statement of Facts signed copy' })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

export class UpdateFindingDto {
  @ApiPropertyOptional({ enum: RACFindingStatus })
  @IsOptional()
  @IsEnum(RACFindingStatus)
  status?: RACFindingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendation?: string;
}