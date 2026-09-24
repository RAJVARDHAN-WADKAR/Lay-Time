import { Injectable } from '@nestjs/common';
import { IOcrProvider, OcrExtractionResult } from './ocr-provider.interface';

@Injectable()
export class MockOcrProvider implements IOcrProvider {
  async extractFromPdf(buffer: Buffer): Promise<OcrExtractionResult> {
    return {
      vesselName: 'MT NORDIC POLLUX',
      portName: 'ROTTERDAM',
      cargoQuantity: 45000,
      averageConfidence: 0.96,
      rawText: 'STATEMENT OF FACTS - PORT OF ROTTERDAM - MT NORDIC POLLUX - CARGO: CRUDE OIL 45,000 MT',
      events: [
        {
          activityName: 'Notice of Readiness (NOR) Tendered',
          startTime: '2024-07-24T06:00:00Z',
          stopTime: '2024-07-24T06:00:00Z',
          percentageCounted: 100,
          confidence: 0.99,
          boundingBox: { x: 40, y: 120, width: 480, height: 24 },
        },
        {
          activityName: 'NOR 6-Hour Contractual Buffer Window',
          startTime: '2024-07-24T06:00:00Z',
          stopTime: '2024-07-24T12:00:00Z',
          percentageCounted: 0,
          confidence: 0.98,
          boundingBox: { x: 40, y: 148, width: 480, height: 24 },
        },
        {
          activityName: 'Waiting at Anchor for Congestion',
          startTime: '2024-07-24T12:00:00Z',
          stopTime: '2024-07-25T08:00:00Z',
          percentageCounted: 100,
          confidence: 0.96,
          boundingBox: { x: 40, y: 176, width: 480, height: 24 },
        },
        {
          activityName: 'Pilot Onboard & Inward Shifting to Berth',
          startTime: '2024-07-25T08:00:00Z',
          stopTime: '2024-07-25T11:30:00Z',
          percentageCounted: 0,
          confidence: 0.94,
          boundingBox: { x: 40, y: 204, width: 480, height: 24 },
        },
        {
          activityName: 'All Fast Alongside Berth 1',
          startTime: '2024-07-25T11:30:00Z',
          stopTime: '2024-07-25T12:30:00Z',
          percentageCounted: 100,
          confidence: 0.98,
          boundingBox: { x: 40, y: 232, width: 480, height: 24 },
        },
        {
          activityName: 'Commenced Discharging Crude Cargo',
          startTime: '2024-07-25T12:30:00Z',
          stopTime: '2024-07-27T02:00:00Z',
          percentageCounted: 100,
          confidence: 0.95,
          boundingBox: { x: 40, y: 260, width: 480, height: 24 },
        },
        {
          activityName: 'Heavy Rain & Squall - Discharging Suspended',
          startTime: '2024-07-26T14:00:00Z',
          stopTime: '2024-07-26T18:30:00Z',
          percentageCounted: 0,
          confidence: 0.92,
          boundingBox: { x: 40, y: 288, width: 480, height: 24 },
        },
        {
          activityName: 'Completed Discharging & Hoses Disconnected',
          startTime: '2024-07-27T02:00:00Z',
          stopTime: '2024-07-27T03:30:00Z',
          percentageCounted: 100,
          confidence: 0.97,
          boundingBox: { x: 40, y: 316, width: 480, height: 24 },
        },
      ],
    };
  }
}