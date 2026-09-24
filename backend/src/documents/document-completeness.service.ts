import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DocumentType } from '@prisma/client';

export interface CompletenessResult {
  claimId: string;
  isComplete: boolean;
  canSubmit: boolean;
  requiredDocuments: string[];
  availableDocuments: { type: string; fileName: string; verified: boolean }[];
  missingDocuments: string[];
}

@Injectable()
export class DocumentCompletenessService {
  constructor(private prisma: PrismaService) {}

  readonly MANDATORY_TYPES: DocumentType[] = [
    DocumentType.SOF,
    DocumentType.CHARTERPARTY,
    DocumentType.NOR,
    DocumentType.TIME_SHEET,
  ];

  async checkClaimDocuments(claimId: string): Promise<CompletenessResult> {
    const docs = await this.prisma.document.findMany({
      where: { claimId },
      orderBy: { uploadedAt: 'desc' },
    });

    const availableTypes = docs.map((d) => d.documentType);
    const missingDocuments: string[] = [];

    for (const req of this.MANDATORY_TYPES) {
      if (!availableTypes.includes(req)) {
        missingDocuments.push(req);
      }
    }

    const isComplete = missingDocuments.length === 0;

    return {
      claimId,
      isComplete,
      canSubmit: isComplete, // can allow warning submission if configured
      requiredDocuments: this.MANDATORY_TYPES,
      availableDocuments: docs.map((d) => ({
        type: d.documentType,
        fileName: d.fileName,
        verified: d.status === 'VERIFIED',
      })),
      missingDocuments,
    };
  }
}