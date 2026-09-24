import { Injectable } from '@nestjs/common';

@Injectable()
export class DespatchService {
  /**
   * Saved Time = Allowed Laytime - Net Laytime Used
   * If Saved Time > 0: Despatch = (Saved Time in Days) * Despatch Rate Per Day
   */
  calculateDespatch(savedMinutes: number, ratePerDay: number): { despatchDays: number; despatchAmount: number } {
    if (savedMinutes <= 0 || ratePerDay <= 0) {
      return { despatchDays: 0, despatchAmount: 0 };
    }

    const despatchDays = savedMinutes / 1440;
    const despatchAmount = Math.round(despatchDays * ratePerDay * 100) / 100;

    return { despatchDays, despatchAmount };
  }
}