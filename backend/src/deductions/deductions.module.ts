import { Module } from '@nestjs/common';
import { DeductionsService } from './deductions.service';
import { DeductionsController } from './deductions.controller';

@Module({
  providers: [DeductionsService],
  controllers: [DeductionsController],
  exports: [DeductionsService],
})
export class DeductionsModule {}