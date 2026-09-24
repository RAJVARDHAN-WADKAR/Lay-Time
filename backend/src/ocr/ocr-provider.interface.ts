export interface OcrExtractedEvent {
  activityName: string;
  startTime: string;
  stopTime: string;
  percentageCounted: number;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OcrExtractionResult {
  vesselName?: string;
  portName?: string;
  cargoQuantity?: number;
  rawText: string;
  averageConfidence: number;
  events: OcrExtractedEvent[];
}

export interface IOcrProvider {
  extractFromPdf(buffer: Buffer): Promise<OcrExtractionResult>;
}