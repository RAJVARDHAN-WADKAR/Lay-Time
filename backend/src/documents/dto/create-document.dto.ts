import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Statement_of_Facts_Rotterdam.pdf' })
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.SOF })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ example: 1048576 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: './uploads/mock_sof.pdf' })
  @IsOptional()
  @IsString()
  storagePath?: string;
}

export class CreateRevisionDto {
  @ApiProperty({ example: 'Statement_of_Facts_v2.pdf' })
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}