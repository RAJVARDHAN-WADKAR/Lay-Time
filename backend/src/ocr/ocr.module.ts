import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';
import { MockOcrProvider } from './mock-ocr.provider';

@Module({
  providers: [OcrService, MockOcrProvider],
  controllers: [OcrController],
  exports: [OcrService, MockOcrProvider],
})
export class OcrModule {}