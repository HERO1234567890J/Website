import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthResponseDto, AuthUserView } from './dto/auth-response.dto.js';

/**
 * §13 — hand-rolled JWT auth. No NextAuth / Clerk / Passport.
 *
 * Token model
 *   access  JWT (HS256),  payload { sub, email, role }, short TTL
 *   refresh JWT (HS256), payload { sub, jti, role }, longer TTL,
 *           stored in RefreshToken table; rotated on every refresh.
 *
 * Rotation behaviour (§13)
 *   When a refresh token is presented and the matching RefreshToken
 *   row exists, is not revoked, and is not expired — the row is
 *   marked revoked and a fresh access+refresh pair is issued. A
 *   previously-rotated token that comes back signals possible theft;
 *   JwtRefreshGuard revokes every remaining refresh token for the
 *   user before throwing.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // §18 — generic conflict; do not reveal whether the email is
      // registered (only matters when paired with login enumeration,
      // but consistent responses are cheap and reduce attack surface).
      throw new ConflictException('Could not register with these details.');
    }

    const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name,
        phone: dto.phone ?? null,
        role: Role.CUSTOMER,
      },
    });

    const tokens = await this.issueTokens(user);

    // §12 — welcome email is best-effort; failures never roll back
    // registration. The Notification row stays PENDING/FAILED and
    // the retry worker picks it up.
    try {
      await this.email.sendWelcomeEmail({
        userId: user.id,
        email: user.email,
        name: user.name ?? '',
      });
    } catch (err) {
      this.logger.error(
        `sendWelcomeEmail failed for ${user.id}: ${(err as Error).message}`,
      );
    }

    this.logger.log(`Registered user ${user.id} (${user.email})`);
    return tokens;
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Always run bcrypt.compare, even when the user doesn't exist, to
    // keep login timing roughly constant. Compare against a known dummy
    // hash (cost equivalent) — see AuthService tests.
    const dummy =
      '$2b$12$0000000000000000000000.0000000000000000000000000000000000';
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? dummy);
    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<{ ok: true }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  /**
   * Rotate a refresh token. JwtRefreshGuard has already validated the
   * incoming token and attached its `id` to the request as
   * `refreshTokenId`.
   */
  async rotate(refreshTokenId: string, userId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Should be impossible because the guard verified the token belongs
      // to a real user, but defensive.
      throw new UnauthorizedException('Invalid refresh token.');
    }
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user);
  }

  // ─── public cookie helpers (Phase 15A) ───────────────────────────
  //
  // Refresh tokens are issued as httpOnly secure cookies. The service
  // computes the cookie attributes here so the controller stays thin
  // and so the TTL/source-of-truth lives in one place.

  /**
   * Options applied to every refresh-token cookie we set. `secure`
   * tracks NODE_ENV — http on localhost in dev needs `secure: false`,
   * HTTPS in prod requires `secure: true`. `sameSite: 'lax'` works
   * for top-level navigations and the same-origin proxied dev setup.
   */
  refreshCookieOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax';
    path: '/';
    maxAge: number;
  } {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshCookieMaxAgeMs(),
    };
  }

  /** Cookie name used everywhere — keep in one place. */
  static readonly REFRESH_COOKIE = 'refresh_token';

  /** Cookie max-age in ms, matching JWT_REFRESH_TTL. */
  refreshCookieMaxAgeMs(): number {
    return this.parseTtl(this.config.get<string>('JWT_REFRESH_TTL', '7d')) * 1000;
  }

  // ─── private helpers ────────────────────────────────────────────

  private async issueTokens(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user);

    const expiresIn = this.parseTtl(this.config.get<string>('JWT_ACCESS_TTL', '15m'));

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: this.toView(user),
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    const ttl = this.parseTtl(this.config.get<string>('JWT_ACCESS_TTL', '15m'));
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: ttl,
      },
    );
  }

  private async issueRefreshToken(user: User): Promise<string> {
    const ttl = this.parseTtl(this.config.get<string>('JWT_REFRESH_TTL', '7d'));
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const record = await this.prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        tokenHash: 'pending',
        expiresAt,
      },
    });
    const token = await this.jwtService.signAsync(
      { sub: user.id, jti: record.id, role: user.role },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: ttl,
      },
    );
    // Hash the issued JWT before persistence so a DB leak never
    // exposes a usable refresh token. SHA-256 is enough — JWT
    // signature already proves authenticity; we need only to bind
    // the row to this exact string.
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { tokenHash },
    });
    return token;
  }

  private toView(user: User): AuthUserView {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Parse a duration like "15m", "7d", "30s", "1h" into seconds.
   * Accepts ms (1-3 digit number) too. Throws on unrecognised format
   * — boot-time env validation catches most of these but defence in
   * depth.
   */
  private parseTtl(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) throw new Error(`Invalid duration: ${ttl}`);
    const n = Number(m[1]);
    const unit = m[2];
    const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return n * mult;
  }
}