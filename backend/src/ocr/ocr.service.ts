import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MockOcrProvider } from './mock-ocr.provider';
import { UpdateOcrFieldDto } from './dto/ocr.dto';
import { OCRStatus } from '@prisma/client';

@Injectable()
export class OcrService {
  constructor(
    private prisma: PrismaService,
    private ocrProvider: MockOcrProvider,
  ) {}

  async uploadAndProcess(documentId?: string) {
    // 1. Create OCR Document Record
    const ocrDoc = await this.prisma.oCRDocument.create({
      data: {
        documentId,
        status: OCRStatus.PROCESSING,
        confidence: 0.95,
      },
    });

    // 2. Perform Extraction
    const extraction = await this.ocrProvider.extractFromPdf(Buffer.from(''));

    // 3. Create Field Records
    const fieldsData = extraction.events.map((e) => ({
      fieldName: e.activityName,
      extractedValue: `${e.startTime} - ${e.stopTime}`,
      confidence: e.confidence,
      requiresReview: e.confidence < 0.95,
      status: e.confidence < 0.95 ? 'NEEDS_REVIEW' : 'COMPLETED',
    }));

    const updated = await this.prisma.oCRDocument.update({
      where: { id: ocrDoc.id },
      data: {
        status: OCRStatus.COMPLETED,
        extractedText: extraction.rawText,
        confidence: extraction.averageConfidence,
        fields: {
          create: fieldsData,
        },
      },
      include: { fields: true },
    });

    return updated;
  }

  async findOne(id: string) {
    const doc = await this.prisma.oCRDocument.findUnique({
      where: { id },
      include: { fields: true },
    });
    if (!doc) throw new NotFoundException(`OCR Document ${id} not found`);
    return doc;
  }

  async getFields(id: string) {
    return this.prisma.oCRField.findMany({
      where: { ocrDocumentId: id },
    });
  }

  async updateField(id: string, dto: UpdateOcrFieldDto) {
    const field = await this.prisma.oCRField.findUnique({ where: { id } });
    if (!field) throw new NotFoundException(`OCR Field ${id} not found`);

    return this.prisma.oCRField.update({
      where: { id },
      data: {
        verifiedValue: dto.verifiedValue,
        status: 'VERIFIED',
        requiresReview: false,
      },
    });
  }

  async verifyDocument(id: string) {
    return this.prisma.oCRDocument.update({
      where: { id },
      data: { status: OCRStatus.VERIFIED },
    });
  }
}