import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RolesGuard Unit Tests', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (userRole: string | null): ExecutionContext => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { role: userRole } : null }),
    }),
  } as any);

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext(Role.CLAIM_PROCESSOR);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access if user role matches required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.SUPERVISOR]);
    const ctx = createMockContext(Role.ADMIN);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext(Role.REVIEWER);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});