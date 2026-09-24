import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LocalStorageService } from './storage.service';
import { DocumentCompletenessService } from './document-completeness.service';
import { CreateDocumentDto, CreateRevisionDto } from './dto/create-document.dto';
import { DocumentType } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: LocalStorageService,
    private completeness: DocumentCompletenessService,
  ) {}

  async findByClaim(claimId: string) {
    return this.prisma.document.findMany({
      where: { claimId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async create(claimId: string, dto: CreateDocumentDto, userId?: string) {
    return this.prisma.document.create({
      data: {
        claimId,
        fileName: dto.fileName,
        fileType: dto.fileType || 'application/pdf',
        fileSize: dto.fileSize || 1024 * 500,
        documentType: dto.documentType || DocumentType.OTHER,
        storagePath: dto.storagePath || `./uploads/${dto.fileName}`,
        uploadedBy: userId || 'System',
        status: 'VERIFIED',
        revision: 1,
      },
    });
  }

  async createRevision(id: string, dto: CreateRevisionDto, userId?: string) {
    const doc = await this.findOne(id);

    return this.prisma.document.create({
      data: {
        claimId: doc.claimId,
        fileName: dto.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        documentType: doc.documentType,
        storagePath: `./uploads/${dto.fileName}`,
        uploadedBy: userId || 'System',
        status: 'VERIFIED',
        revision: doc.revision + 1,
      },
    });
  }

  async delete(id: string) {
    const doc = await this.findOne(id);
    await this.storage.deleteFile(doc.storagePath);
    return this.prisma.document.delete({ where: { id } });
  }

  async checkMissing(claimId: string) {
    return this.completeness.checkClaimDocuments(claimId);
  }
}