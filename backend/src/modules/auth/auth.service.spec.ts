import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';

const fakeUser: User = {
  id: 'u-1',
  email: 'sara@example.com',
  passwordHash: '$2b$12$0000000000000000000000.0000000000000000000000000000000000',
  role: Role.CUSTOMER,
  name: 'Sara',
  phone: null,
  isBlocked: false,
  blockReason: null,
  blockedAt: null,
  bookingEmails: true,
  marketingEmails: false,
  smsReminders: false,
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function makePrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(async ({ data }) => ({
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      })),
      update: vi.fn(async ({ where, data }) => ({
        id: where.id,
        userId: 'u-1',
        tokenHash: data.tokenHash ?? 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        revokedAt: data.revokedAt ?? null,
        createdAt: new Date(),
      })),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

function makeConfig() {
  return {
    get: vi.fn((key: string, def?: unknown) => {
      const map: Record<string, unknown> = {
        BCRYPT_ROUNDS: 4, // fast for tests
        JWT_SECRET: 'test-access',
        JWT_REFRESH_SECRET: 'test-refresh',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
      };
      return map[key] ?? def;
    }),
  } as unknown as ConfigService;
}

function makeJwt() {
  return {
    signAsync: vi.fn(async (payload: object, opts: { secret: string }) =>
      JSON.stringify({ payload, secret: opts.secret }),
    ),
  } as unknown as JwtService;
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let config: ConfigService;
  let jwt: JwtService;
  let svc: AuthService;

  beforeEach(() => {
    prisma = makePrisma();
    config = makeConfig();
    jwt = makeJwt();
    const email = { sendWelcomeEmail: vi.fn().mockResolvedValue(true) };
    svc = new AuthService(prisma as never, jwt, config, email as never);
  });

  it('register: rejects duplicate email with ConflictException', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(fakeUser);
    await expect(
      svc.register({
        email: 'sara@example.com',
        password: 'correct-horse',
        name: 'Sara',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login: rejects unknown email with UnauthorizedException (constant-ish timing path)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.login({ email: 'nope@example.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout: revokes all non-revoked refresh tokens for the user', async () => {
    prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 3 });
    const result = await svc.logout('u-1');
    expect(result).toEqual({ ok: true });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) as unknown as Date },
    });
  });

  it('rotate: revokes the old refresh row before issuing new tokens', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(fakeUser);
    prisma.refreshToken.update.mockResolvedValueOnce({
      id: 'rt-1',
      userId: 'u-1',
      tokenHash: 'h',
      expiresAt: new Date(),
      revokedAt: new Date(),
      createdAt: new Date(),
    });
    const out = await svc.rotate('rt-1', 'u-1');
    expect(out.user.email).toBe('sara@example.com');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) as unknown as Date },
    });
  });
});