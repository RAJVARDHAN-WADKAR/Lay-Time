import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TimebarService } from './timebar.service';
import { TimebarController } from './timebar.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TimebarService],
  controllers: [TimebarController],
  exports: [TimebarService],
})
export class TimebarModule {}