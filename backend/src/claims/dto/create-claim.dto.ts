import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClaimStatus } from '@prisma/client';

export class CreateClaimDto {
  @ApiProperty({ example: 'CLM-2024-009' })
  @IsNotEmpty()
  @IsString()
  claimNumber: string;

  @ApiProperty({ example: 'MT Nordic Pollux - Disch Demurrage' })
  @IsNotEmpty()
  @IsString()
  claimName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vesselId?: string;

  @ApiPropertyOptional({ example: 'Clarksons Platou' })
  @IsOptional()
  @IsString()
  brokerName?: string;

  @ApiPropertyOptional({ example: 'Load Port Demurrage', default: 'Load Port Demurrage' })
  @IsOptional()
  @IsString()
  claimType?: string;

  @ApiPropertyOptional({ example: 'ASBATANKVOY', default: 'GENCON' })
  @IsOptional()
  @IsString()
  charterpartyType?: string;

  @ApiPropertyOptional({ example: 'TotalEnergies Trading SA' })
  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @ApiPropertyOptional({ example: 'Charterer' })
  @IsOptional()
  @IsString()
  counterpartyType?: string;

  @ApiPropertyOptional({ example: 24000, default: 20000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  demurrageRatePerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  layday?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  cancellingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  voyageEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  noticeReceivedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  claimReceivedDate?: string;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsNumber()
  noticeTimebarDays?: number;

  @ApiPropertyOptional({ example: 90, default: 90 })
  @IsOptional()
  @IsNumber()
  claimTimebarDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedProcessorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  claimNotes?: string;
}

export class UpdateClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  claimName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brokerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  demurrageRatePerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  agreedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  receivedClaimAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  claimNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentions?: string;
}

export class ClaimQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ClaimStatus })
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vesselId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  timebarred?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number = 20;
}

export class SettleClaimDto {
  @ApiProperty({ example: 18500 })
  @IsNotEmpty()
  @IsNumber()
  agreedAmount: number;

  @ApiPropertyOptional({ example: 'Commercial settlement agreed after reviewing weather allowance' })
  @IsOptional()
  @IsString()
  settlementNotes?: string;
}

export class AssignClaimDto {
  @ApiProperty({ example: 'usr-proc-01' })
  @IsNotEmpty()
  @IsString()
  processorId: string;
}