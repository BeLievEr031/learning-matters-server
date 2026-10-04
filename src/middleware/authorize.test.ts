import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authorize, isOwnerOrAdmin } from './authorize.js';
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
    const middleware = authorize('admin');
    const req = {
      user: { id: 'u1', role: 'user' },
    } as unknown as Request;

    expect(() => middleware(req, mockRes, mockNext)).toThrow(ForbiddenError);
  });

  it('calls next() if user has the required role', () => {
    const middleware = authorize('admin');
    const req = {
      user: { id: 'a1', role: 'admin' },
    } as unknown as Request;
    const nextSpy = vi.fn();

    middleware(req, mockRes, nextSpy);
    expect(nextSpy).toHaveBeenCalledWith();
  });

  it('calls next() if user matches any of multiple allowed roles', () => {
    const middleware = authorize('user', 'admin');
    const req = {
      user: { id: 'u1', role: 'user' },
    } as unknown as Request;
    const nextSpy = vi.fn();

    middleware(req, mockRes, nextSpy);
    expect(nextSpy).toHaveBeenCalledWith();
  });

  it('calls next() with no roles specified as long as user is authenticated', () => {
    const middleware = authorize();
    const req = {
      user: { id: 'u1', role: 'user' },
    } as unknown as Request;
    const nextSpy = vi.fn();

    middleware(req, mockRes, nextSpy);
    expect(nextSpy).toHaveBeenCalledWith();
  });

  describe('isOwnerOrAdmin helper', () => {
    it('returns false when user is undefined', () => {
      expect(isOwnerOrAdmin('owner-id', undefined)).toBe(false);
    });

    it('returns true when user is admin regardless of owner id', () => {
      expect(isOwnerOrAdmin('other-id', { id: 'admin-id', role: 'admin' })).toBe(true);
    });

    it('returns true when user is resource owner', () => {
      expect(isOwnerOrAdmin('user-1', { id: 'user-1', role: 'user' })).toBe(true);
    });

    it('returns false when user is neither admin nor owner', () => {
      expect(isOwnerOrAdmin('user-1', { id: 'user-2', role: 'user' })).toBe(false);
    });
  });
});
