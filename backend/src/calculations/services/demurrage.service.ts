import { Injectable } from '@nestjs/common';

@Injectable()
export class DemurrageService {
  /**
   * Excess Time = Net Laytime Used - Allowed Laytime
   * If Excess Time > 0: Demurrage = (Excess Time in Days) * Demurrage Rate Per Day
   */
  calculateDemurrage(excessMinutes: number, ratePerDay: number): { demurrageDays: number; demurrageAmount: number } {
    if (excessMinutes <= 0 || ratePerDay <= 0) {
      return { demurrageDays: 0, demurrageAmount: 0 };
    }

    const demurrageDays = excessMinutes / 1440;
    const demurrageAmount = Math.round(demurrageDays * ratePerDay * 100) / 100;

    return { demurrageDays, demurrageAmount };
  }
}