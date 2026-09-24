import { TimebarService } from './timebar.service';

describe('TimebarService Unit Tests', () => {
  let service: TimebarService;

  beforeEach(() => {
    service = new TimebarService({} as any);
  });

  it('should categorize deadline as SAFE when > 15 days remaining', () => {
    const claim = {
      id: 'c1',
      claimNumber: 'CLM-001',
      claimName: 'Test Claim',
      voyageEndDate: new Date(Date.now() - 30 * 86400000), // 60 days left under 90-day timebar
      claimTimebarDays: 90,
    };

    const result = service.calculateTimebarForClaim(claim);
    expect(result.status).toBe('SAFE');
    expect(result.isTimebarred).toBe(false);
  });

  it('should categorize deadline as APPROACHING when <= 15 days remaining', () => {
    const claim = {
      id: 'c2',
      claimNumber: 'CLM-002',
      claimName: 'Test Claim',
      voyageEndDate: new Date(Date.now() - 78 * 86400000), // 12 days left
      claimTimebarDays: 90,
    };

    const result = service.calculateTimebarForClaim(claim);
    expect(result.status).toBe('APPROACHING');
    expect(result.isTimebarred).toBe(false);
  });

  it('should categorize deadline as URGENT when <= 7 days remaining', () => {
    const claim = {
      id: 'c3',
      claimNumber: 'CLM-003',
      claimName: 'Test Claim',
      voyageEndDate: new Date(Date.now() - 85 * 86400000), // 5 days left
      claimTimebarDays: 90,
    };

    const result = service.calculateTimebarForClaim(claim);
    expect(result.status).toBe('URGENT');
    expect(result.isTimebarred).toBe(false);
  });

  it('should categorize deadline as TIMEBARRED when past deadline', () => {
    const claim = {
      id: 'c4',
      claimNumber: 'CLM-004',
      claimName: 'Test Claim',
      voyageEndDate: new Date(Date.now() - 95 * 86400000), // -5 days left
      claimTimebarDays: 90,
    };

    const result = service.calculateTimebarForClaim(claim);
    expect(result.status).toBe('TIMEBARRED');
    expect(result.isTimebarred).toBe(true);
  });
});