import { Module } from '@nestjs/common';
import { SofService } from './sof.service';
import { SofController } from './sof.controller';

@Module({
  providers: [SofService],
  controllers: [SofController],
  exports: [SofService],
})
export class SofModule {}