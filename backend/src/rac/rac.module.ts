import { Module } from '@nestjs/common';
import { RacService } from './rac.service';
import { RacController } from './rac.controller';

@Module({
  providers: [RacService],
  controllers: [RacController],
  exports: [RacService],
})
export class RacModule {}