import argon2 from 'argon2';
import { usersRepository, type UserSafe } from '../users/users.repository.js';
import { tokenService, type TokenPair } from './token.service.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';
import { ConflictError, UnauthorizedError } from '../../lib/app-error.js';
import {
  ARGON2_MEMORY_COST,
  ARGON2_TIME_COST,
  ARGON2_PARALLELISM,
} from '../../config/constants.js';

// Precomputed argon2 hash for constant-time dummy verification when user is not found
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$RdescudvJCsgqlfreSaAcw';

export interface AuthResult {
  user: UserSafe;
  tokens: TokenPair;
}

export class AuthService {
  constructor(
    private readonly userRepo = usersRepository,
    private readonly tokens = tokenService,
  ) {}

  /**
   * Register a new user account and generate initial token pair.
   */
  async register(input: RegisterInput, userAgent?: string, ip?: string): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await argon2.hash(input.password, {
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
    });

    const user = await this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      role: input.role,
    });

    const tokens = await this.tokens.generateTokens(
      { id: user.id, role: user.role },
      undefined,
      userAgent,
      ip,
    );

    return { user, tokens };
  }

  /**
   * Authenticate credentials in constant time to prevent user enumeration.
   */
  async login(input: LoginInput, userAgent?: string, ip?: string): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.userRepo.findForAuthByEmail(normalizedEmail);

    let isValid = false;
    if (user) {
      isValid = await argon2.verify(user.passwordHash, input.password);
    } else {
      // Execute dummy argon2 hash verification to prevent timing attacks
      await argon2.verify(DUMMY_HASH, input.password);
    }

    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt !== null) {
      throw new UnauthorizedError('Account is disabled');
    }

    const safeUser: UserSafe = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };

    const tokens = await this.tokens.generateTokens(
      { id: user.id, role: user.role },
      undefined,
      userAgent,
      ip,
    );

    return { user: safeUser, tokens };
  }

  /**
   * Rotate a valid refresh token.
   */
  async refresh(refreshToken: string, userAgent?: string, ip?: string): Promise<TokenPair> {
    return this.tokens.rotateRefreshToken(refreshToken, userAgent, ip);
  }

  /**
   * Logout current session by revoking the refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeToken(refreshToken);
  }

  /**
   * Logout all sessions for the user.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.tokens.revokeAllUserTokens(userId);
  }
}

export const authService = new AuthService();
