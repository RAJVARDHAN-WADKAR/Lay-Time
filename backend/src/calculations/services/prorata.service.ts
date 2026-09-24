import { Injectable } from '@nestjs/common';

export interface BerthShare {
  berthId: string;
  berthName: string;
  quantity: number;
  loadRate: number;
  prorataPercentage: number;
}

@Injectable()
export class ProrataService {
  calculateProrataShares(berths: { id: string; name: string; quantity: number; loadRate: number; prorataPercentage?: number }[]): BerthShare[] {
    const totalQuantity = berths.reduce((acc, b) => acc + (b.quantity || 0), 0);

    return berths.map((b) => {
      let share = b.prorataPercentage;
      if (share === undefined || share === null || totalQuantity > 0) {
        share = totalQuantity > 0 ? (b.quantity / totalQuantity) * 100 : 100;
      }
      return {
        berthId: b.id,
        berthName: b.name,
        quantity: b.quantity,
        loadRate: b.loadRate,
        prorataPercentage: Math.round(share * 100) / 100,
      };
    });
  }
}