import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OcrService } from './ocr.service';
import { UpdateOcrFieldDto } from './dto/ocr.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('OCR Ingestion & Discrepancy Parsing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ocr')
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Upload Statement of Facts PDF for OCR parsing and bounding box extraction' })
  async upload() {
    return this.ocrService.uploadAndProcess();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get OCR document extraction status and token confidence' })
  async findOne(@Param('id') id: string) {
    return this.ocrService.findOne(id);
  }

  @Get(':id/fields')
  @ApiOperation({ summary: 'Get extracted OCR event fields and confidence ratings' })
  async getFields(@Param('id') id: string) {
    return this.ocrService.getFields(id);
  }

  @Patch('fields/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Update / verify an OCR field value with manual user correction' })
  async updateField(@Param('id') id: string, @Body() dto: UpdateOcrFieldDto) {
    return this.ocrService.updateField(id, dto);
  }

  @Post(':id/verify')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Mark OCR document verification complete' })
  async verify(@Param('id') id: string) {
    return this.ocrService.verifyDocument(id);
  }
}