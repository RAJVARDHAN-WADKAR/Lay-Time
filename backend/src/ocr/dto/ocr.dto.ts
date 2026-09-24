import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOcrFieldDto {
  @ApiProperty({ example: '2024-07-27T02:00:00Z' })
  @IsNotEmpty()
  @IsString()
  verifiedValue: string;
}