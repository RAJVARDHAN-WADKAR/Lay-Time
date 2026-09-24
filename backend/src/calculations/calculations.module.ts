import { Module } from '@nestjs/common';
import { CalculationsService } from './calculations.service';
import { CalculationsController } from './calculations.controller';
import { LaytimeRuleService } from './services/laytime-rule.service';
import { DeductionService } from './services/deduction.service';
import { ProrataService } from './services/prorata.service';
import { DemurrageService } from './services/demurrage.service';
import { DespatchService } from './services/despatch.service';

@Module({
  providers: [
    CalculationsService,
    LaytimeRuleService,
    DeductionService,
    ProrataService,
    DemurrageService,
    DespatchService,
  ],
  controllers: [CalculationsController],
  exports: [
    CalculationsService,
    LaytimeRuleService,
    DeductionService,
    ProrataService,
    DemurrageService,
    DespatchService,
  ],
})
export class CalculationsModule {}