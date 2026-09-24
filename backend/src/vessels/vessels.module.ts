import { Module } from '@nestjs/common';
import { VesselsService } from './vessels.service';
import { VesselsController } from './vessels.controller';

@Module({
  providers: [VesselsService],
  controllers: [VesselsController],
  exports: [VesselsService],
})
export class VesselsModule {}