import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVesselDto {
  @ApiProperty({ example: 'MT Nordic Pollux' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '9456781' })
  @IsOptional()
  @IsString()
  imoNumber?: string;

  @ApiPropertyOptional({ example: 'Aframax Crude Tanker' })
  @IsOptional()
  @IsString()
  vesselType?: string;
}