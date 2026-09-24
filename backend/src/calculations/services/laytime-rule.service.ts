import { Injectable } from '@nestjs/common';

export interface ContractualRules {
  onceOnDemurrageAlwaysOnDemurrage: boolean;
  shex: boolean;
  norBufferHours: number;
  reversible: boolean;
}

@Injectable()
export class LaytimeRuleService {
  getDefaultRules(): ContractualRules {
    return {
      onceOnDemurrageAlwaysOnDemurrage: true,
      shex: false, // Default SHINC for tanker forms
      norBufferHours: 6,
      reversible: false,
    };
  }

  calculateLaytimeCommencement(norTendered: Date, bufferHours: number): Date {
    return new Date(norTendered.getTime() + bufferHours * 3600 * 1000);
  }

  isSundayOrHoliday(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0; // Sunday
  }
}