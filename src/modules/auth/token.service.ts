import { randomUUID, randomBytes, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../db/pool.js';
import { refreshTokens } from '../../db/schema/refresh-tokens.js';
import { usersRepository } from '../users/users.repository.js';
import { UnauthorizedError } from '../../lib/app-error.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: 'user' | 'admin';
  jti: string;
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

  const value = parseInt(match[1] ?? '7', 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export class TokenService {
  /**
   * Hashes a raw refresh token with SHA-256 for secure database storage.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a short-lived access JWT and a rotating opaque refresh token stored as SHA-256.
   */
  async generateTokens(
    user: { id: string; role: 'user' | 'admin' },
    familyId: string = randomUUID(),
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const jti = randomUUID();
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      jti,
    };

    // Generate JWT access token
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as NonNullable<jwt.SignOptions['expiresIn']>,
    });

    // Generate cryptographically secure random opaque refresh token
    const rawRefreshToken = randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const refreshTtlMs = parseDurationToMs(env.JWT_REFRESH_TTL);
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    // Store hashed refresh token in database
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Rotates a refresh token with automatic reuse detection.
   * If a revoked token is presented, the entire family is immediately revoked.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const rows = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    const record = rows[0];
    if (!record) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reuse detection: token already revoked indicates a replay attack!
    if (record.revokedAt !== null) {
      // Revoke the entire token family
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, record.familyId));

      throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked.');
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Verify user is active and not soft-deleted
    const user = await usersRepository.findById(record.userId);
    if (!user || !user.isActive || user.deletedAt !== null) {
      throw new UnauthorizedError('User account is inactive or deleted');
    }

    // Revoke the presented token
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, record.id));

    // Issue new tokens maintaining the existing family_id
    return this.generateTokens({ id: user.id, role: user.role }, record.familyId, userAgent, ip);
  }

  /**
   * Revoke a single refresh token by its raw value.
   */
  async revokeToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  /**
   * Revoke all refresh tokens for a user (e.g. logout all devices).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));
  }
}

export const tokenService = new TokenService();
