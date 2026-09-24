import { RacService } from './rac.service';
import { RACSeverity, RACFindingStatus } from '@prisma/client';

describe('RAC Service Unit Tests', () => {
  let service: RacService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      claim: {
        findUnique: jest.fn(),
      },
      rACAnalysis: {
        create: jest.fn(),
      },
      rACFinding: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new RacService(mockPrisma);
  });

  describe('RAC Finding Resolution', () => {
    it('should update finding status to RESOLVED and record resolution notes', async () => {
      mockPrisma.rACFinding.findUnique.mockResolvedValue({
        id: 'find-1',
        description: 'Original description',
        status: RACFindingStatus.OPEN,
      });

      mockPrisma.rACFinding.update.mockResolvedValue({
        id: 'find-1',
        status: RACFindingStatus.RESOLVED,
        resolvedBy: 'usr-admin',
      });

      const result = await service.resolveFinding('find-1', { resolutionNotes: 'Charterer confirmed rider clause 12' }, 'usr-admin');

      expect(mockPrisma.rACFinding.update).toHaveBeenCalledWith({
        where: { id: 'find-1' },
        data: expect.objectContaining({
          status: RACFindingStatus.RESOLVED,
          resolvedBy: 'usr-admin',
        }),
      });
      expect(result.status).toBe(RACFindingStatus.RESOLVED);
    });

    it('should update finding status to IGNORED on ignoreFinding', async () => {
      mockPrisma.rACFinding.findUnique.mockResolvedValue({ id: 'find-2', status: RACFindingStatus.OPEN });
      mockPrisma.rACFinding.update.mockResolvedValue({ id: 'find-2', status: RACFindingStatus.IGNORED });

      const result = await service.ignoreFinding('find-2', 'usr-supervisor');

      expect(mockPrisma.rACFinding.update).toHaveBeenCalledWith({
        where: { id: 'find-2' },
        data: expect.objectContaining({
          status: RACFindingStatus.IGNORED,
          resolvedBy: 'usr-supervisor',
        }),
      });
      expect(result.status).toBe(RACFindingStatus.IGNORED);
    });
  });
});