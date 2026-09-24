import { Injectable } from '@nestjs/common';

export interface DeductionResult {
  title: string;
  category: string;
  startTime: Date;
  stopTime: Date;
  durationMinutes: number;
  percentageCounted: number;
  prorataPercentage: number;
  countedDurationMinutes: number;
  deductedDurationMinutes: number;
  remarks?: string;
  berthId?: string;
}

@Injectable()
export class DeductionService {
  readonly PREDEFINED_CATEGORIES = [
    'Weather Delay',
    'Rain',
    'Shore Breakdown',
    'Crew Change',
    'Shifting',
    'Waiting for berth',
    'Equipment breakdown',
    'Port closure',
    'Strike',
    'Holiday',
    'Others',
    'Custom',
  ];

  processActivityDeduction(
    activityName: string,
    category: string,
    startTime: Date,
    stopTime: Date,
    percentageCounted: number,
    prorataPercentage: number = 100,
    berthId?: string,
    remarks?: string,
  ): DeductionResult {
    const durationMinutes = Math.max(0, Math.round((stopTime.getTime() - startTime.getTime()) / (1000 * 60)));
    const prorataFactor = (prorataPercentage || 100) / 100;
    const countedFactor = (percentageCounted ?? 100) / 100;

    const countedDurationMinutes = Math.round(durationMinutes * countedFactor * prorataFactor);
    const deductedDurationMinutes = durationMinutes - countedDurationMinutes;

    return {
      title: activityName,
      category: category || 'Others',
      startTime,
      stopTime,
      durationMinutes,
      percentageCounted: percentageCounted ?? 100,
      prorataPercentage: prorataPercentage || 100,
      countedDurationMinutes,
      deductedDurationMinutes,
      remarks,
      berthId,
    };
  }
}