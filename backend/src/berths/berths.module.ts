import { Module } from '@nestjs/common';
import { BerthsService } from './berths.service';
import { BerthsController } from './berths.controller';

@Module({
  providers: [BerthsService],
  controllers: [BerthsController],
  exports: [BerthsService],
})
export class BerthsModule {}