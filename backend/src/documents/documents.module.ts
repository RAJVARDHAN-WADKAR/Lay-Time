import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { LocalStorageService } from './storage.service';
import { DocumentCompletenessService } from './document-completeness.service';

@Module({
  providers: [
    DocumentsService,
    LocalStorageService,
    DocumentCompletenessService,
  ],
  controllers: [DocumentsController],
  exports: [DocumentsService, LocalStorageService, DocumentCompletenessService],
})
export class DocumentsModule {}