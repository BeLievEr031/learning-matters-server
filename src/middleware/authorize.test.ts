import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authorize, requireSuperAdmin, requireSchoolScope, isOwnerOrAdmin } from './authorize.js';
import { UnauthorizedError, ForbiddenError } from '../lib/app-error.js';

describe('Authorize Middleware', () => {
  const mockRes = {} as Response;
  const mockNext = vi.fn() as unknown as NextFunction;

  it('throws UnauthorizedError if req.user is undefined', () => {
    const middleware = authorize();
    const req = {} as Request;

    expect(() => middleware(req, mockRes, mockNext)).toThrow(UnauthorizedError);
  });

  it('throws ForbiddenError if req.user role is not in allowed roles', () => {
    const middleware = authorize('super_admin');
    const req = {
      user: { id: 'u1', role: 'student', schoolId: null },
    } as unknown as Request;

    expect(() => middleware(req, mockRes, mockNext)).toThrow(ForbiddenError);
  });

  it('calls next() if user has the required role', () => {
    const middleware = authorize('admin');
    const req = {
      user: { id: 'a1', role: 'admin', schoolId: 'school-1' },
    } as unknown as Request;
    const nextSpy = vi.fn();

    middleware(req, mockRes, nextSpy);
    expect(nextSpy).toHaveBeenCalledWith();
  });

  it('calls next() if user matches any of multiple allowed roles', () => {
    const middleware = authorize('teacher', 'admin', 'principal');
    const req = {
      user: { id: 'u1', role: 'teacher', schoolId: 'school-1' },
    } as unknown as Request;
    const nextSpy = vi.fn();

    middleware(req, mockRes, nextSpy);
    expect(nextSpy).toHaveBeenCalledWith();
  });

  it('calls next() with no roles specified as long as user is authenticated', () => {
    const middleware = authorize();
    const req = {
      user: { id: 'u1', role: 'student', schoolId: null },
    } as unknown as Request;
    const nextSpy = vi.fn();

    middleware(req, mockRes, nextSpy);
    expect(nextSpy).toHaveBeenCalledWith();
  });

  describe('requireSuperAdmin()', () => {
    it('throws ForbiddenError for admin role', () => {
      const middleware = requireSuperAdmin();
      const req = {
        user: { id: 'a1', role: 'admin', schoolId: 'school-1' },
      } as unknown as Request;

      expect(() => middleware(req, mockRes, mockNext)).toThrow(ForbiddenError);
    });

    it('calls next() for super_admin role', () => {
      const middleware = requireSuperAdmin();
      const req = {
        user: { id: 'sa1', role: 'super_admin', schoolId: null },
      } as unknown as Request;
      const nextSpy = vi.fn();

      middleware(req, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith();
    });
  });

  describe('requireSchoolScope()', () => {
    it('allows super_admin to bypass school scope check', () => {
      const middleware = requireSchoolScope();
      const req = {
        user: { id: 'sa1', role: 'super_admin', schoolId: null },
        params: { schoolId: 'any-school-uuid' },
      } as unknown as Request;
      const nextSpy = vi.fn();

      middleware(req, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith();
    });

    it('allows school-scoped user when schoolId matches param', () => {
      const middleware = requireSchoolScope();
      const req = {
        user: { id: 'u1', role: 'admin', schoolId: 'school-abc' },
        params: { schoolId: 'school-abc' },
      } as unknown as Request;
      const nextSpy = vi.fn();

      middleware(req, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith();
    });

    it('throws ForbiddenError when schoolId does not match param', () => {
      const middleware = requireSchoolScope();
      const req = {
        user: { id: 'u1', role: 'admin', schoolId: 'school-abc' },
        params: { schoolId: 'school-xyz' },
      } as unknown as Request;

      expect(() => middleware(req, mockRes, mockNext)).toThrow(ForbiddenError);
    });

    it('throws UnauthorizedError when user is not authenticated', () => {
      const middleware = requireSchoolScope();
      const req = { params: { schoolId: 'school-abc' } } as unknown as Request;

      expect(() => middleware(req, mockRes, mockNext)).toThrow(UnauthorizedError);
    });
  });

  describe('isOwnerOrAdmin helper', () => {
    it('returns false when user is undefined', () => {
      expect(isOwnerOrAdmin('owner-id', undefined)).toBe(false);
    });

    it('returns true when user is super_admin regardless of owner id', () => {
      expect(isOwnerOrAdmin('other-id', { id: 'sa-id', role: 'super_admin' })).toBe(true);
    });

    it('returns true when user is admin regardless of owner id', () => {
      expect(isOwnerOrAdmin('other-id', { id: 'admin-id', role: 'admin' })).toBe(true);
    });

    it('returns true when user is resource owner', () => {
      expect(isOwnerOrAdmin('user-1', { id: 'user-1', role: 'student' })).toBe(true);
    });

    it('returns false when user is neither admin nor owner', () => {
      expect(isOwnerOrAdmin('user-1', { id: 'user-2', role: 'teacher' })).toBe(false);
    });
  });
});
