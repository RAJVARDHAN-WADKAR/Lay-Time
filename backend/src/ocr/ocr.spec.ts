import { MockOcrProvider } from './mock-ocr.provider';

describe('OCR Module Unit Tests', () => {
  let provider: MockOcrProvider;

  beforeEach(() => {
    provider = new MockOcrProvider();
  });

  it('should extract structured SoF activities with bounding boxes and confidence ratings', async () => {
    const result = await provider.extractFromPdf(Buffer.from(''));

    expect(result.vesselName).toBe('MT NORDIC POLLUX');
    expect(result.portName).toBe('ROTTERDAM');
    expect(result.averageConfidence).toBeGreaterThan(0.9);
    expect(result.events.length).toBeGreaterThan(0);

    const firstEvent = result.events[0];
    expect(firstEvent.activityName).toBe('Notice of Readiness (NOR) Tendered');
    expect(firstEvent.confidence).toBeGreaterThanOrEqual(0.95);
    expect(firstEvent.boundingBox).toBeDefined();
    expect(firstEvent.boundingBox?.x).toBe(40);
  });
});