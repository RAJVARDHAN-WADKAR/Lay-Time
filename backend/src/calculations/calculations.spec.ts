import { DemurrageService } from './services/demurrage.service';
import { DespatchService } from './services/despatch.service';
import { DeductionService } from './services/deduction.service';
import { ProrataService } from './services/prorata.service';
import { LaytimeRuleService } from './services/laytime-rule.service';

describe('Laytime Calculation Engine Unit Tests', () => {
  let demurrageService: DemurrageService;
  let despatchService: DespatchService;
  let deductionService: DeductionService;
  let prorataService: ProrataService;
  let ruleService: LaytimeRuleService;

  beforeEach(() => {
    demurrageService = new DemurrageService();
    despatchService = new DespatchService();
    deductionService = new DeductionService();
    prorataService = new ProrataService();
    ruleService = new LaytimeRuleService();
  });

  describe('DemurrageService', () => {
    it('should calculate accurate fractional-day demurrage', () => {
      // Example from SRS Section 12:
      // Allowed = 72h, Used = 84h => Excess = 12h
      // Rate = $20,000/day => 12 / 24 * 20,000 = $10,000
      const excessMinutes = 12 * 60; // 720 mins
      const ratePerDay = 20000;

      const { demurrageDays, demurrageAmount } = demurrageService.calculateDemurrage(excessMinutes, ratePerDay);

      expect(demurrageDays).toBe(0.5);
      expect(demurrageAmount).toBe(10000);
    });

    it('should return 0 when excess time is negative or zero', () => {
      const { demurrageDays, demurrageAmount } = demurrageService.calculateDemurrage(0, 25000);
      expect(demurrageDays).toBe(0);
      expect(demurrageAmount).toBe(0);

      const negativeResult = demurrageService.calculateDemurrage(-300, 25000);
      expect(negativeResult.demurrageAmount).toBe(0);
    });
  });

  describe('DespatchService', () => {
    it('should calculate accurate saved laytime and despatch amount', () => {
      // Allowed = 72h, Used = 48h => Saved = 24h (1 day)
      // Rate = $10,000/day => Despatch = $10,000
      const savedMinutes = 24 * 60;
      const ratePerDay = 10000;

      const { despatchDays, despatchAmount } = despatchService.calculateDespatch(savedMinutes, ratePerDay);

      expect(despatchDays).toBe(1.0);
      expect(despatchAmount).toBe(10000);
    });
  });

  describe('DeductionService', () => {
    it('should calculate 100% deduction for weather delay (percentageCounted = 0)', () => {
      const start = new Date('2024-07-24T10:00:00Z');
      const stop = new Date('2024-07-24T14:00:00Z'); // 4 hours = 240 mins

      const result = deductionService.processActivityDeduction(
        'Heavy Swell',
        'Weather Delay',
        start,
        stop,
        0, // 0% counted => 100% deducted
        100, // 100% prorata
      );

      expect(result.durationMinutes).toBe(240);
      expect(result.countedDurationMinutes).toBe(0);
      expect(result.deductedDurationMinutes).toBe(240);
    });

    it('should calculate 50% deduction when percentageCounted is 50', () => {
      const start = new Date('2024-07-24T10:00:00Z');
      const stop = new Date('2024-07-24T12:00:00Z'); // 2 hours = 120 mins

      const result = deductionService.processActivityDeduction(
        'Stevedore Strike',
        'Strike',
        start,
        stop,
        50,
        100,
      );

      expect(result.durationMinutes).toBe(120);
      expect(result.countedDurationMinutes).toBe(60);
      expect(result.deductedDurationMinutes).toBe(60);
    });
  });

  describe('ProrataService', () => {
    it('should calculate proportional multi-berth shares correctly', () => {
      const berths = [
        { id: 'b1', name: 'Berth 1', quantity: 30000, loadRate: 5000 },
        { id: 'b2', name: 'Berth 2', quantity: 20000, loadRate: 5000 },
      ];

      const shares = prorataService.calculateProrataShares(berths);

      expect(shares[0].prorataPercentage).toBe(60);
      expect(shares[1].prorataPercentage).toBe(40);
    });
  });

  describe('LaytimeRuleService', () => {
    it('should calculate laytime commencement after NOR buffer', () => {
      const norTendered = new Date('2024-07-24T06:00:00Z');
      const commenced = ruleService.calculateLaytimeCommencement(norTendered, 6);

      expect(commenced.toISOString()).toBe('2024-07-24T12:00:00.000Z');
    });

    it('should identify Sundays correctly for SHEX clauses', () => {
      const sunday = new Date('2024-07-28T12:00:00Z');
      const monday = new Date('2024-07-29T12:00:00Z');

      expect(ruleService.isSundayOrHoliday(sunday)).toBe(true);
      expect(ruleService.isSundayOrHoliday(monday)).toBe(false);
    });
  });
});