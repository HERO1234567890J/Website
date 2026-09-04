import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuthService } from '../auth.service.js';

/**
 * Extracts and validates the refresh token from the `refresh_token`
 * httpOnly cookie set by AuthController (Phase 15A). The token is a
 * JWT whose payload includes the RefreshToken.id — used to look up
 * the hashed token row, confirm it has not been revoked, and check
 * the expiry stored alongside it.
 *
 * §13 — refresh-token rotation: on a successful refresh, the handler
 * revokes the old row and issues a fresh access + refresh pair.
 *
 * §15 / §18 — re-checks the user's `isBlocked` flag so a freshly
 * blocked user cannot re-acquire a session even with a still-valid
 * refresh cookie. When blocked, the matching refresh token row is
 * revoked before the guard throws (defence in depth: the access
 * guard would reject the next request anyway, but revoking here
 * keeps the session lifecycle consistent).
 */
@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { cookies: Record<string, string | undefined> }>();
    // Phase 15A — refresh tokens arrive via the httpOnly cookie set by
    // AuthController. The browser sends it automatically on the same
    // (proxied dev) origin. We deliberately do NOT accept the token
    // from the request body anymore — that path is closed.
    const token = req.cookies?.[AuthService.REFRESH_COOKIE];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Refresh token required.');
    }

    let payload: { sub: string; jti: string; role: Role };
    try {
      payload = await this.jwtService.verifyAsync<typeof payload>(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      // §18 — generic message, never leak verification specifics.
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });
    if (!record || record.userId !== payload.sub || record.revokedAt) {
      // Either the token never existed, belongs to another user, or has
      // already been rotated/revoked. Per §13, treat unknown refresh as
      // a possible token-theft signal — revoke ALL of the user's refresh
      // tokens so a leaked token can't keep being used.
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token not recognized.');
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired.');
    }

    // §15 / §18 — block check. Rejects a blocked user even if their
    // refresh token is otherwise valid, and revokes it so the next
    // attempt fails fast.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isBlocked: true },
    });
    if (!user || user.isBlocked) {
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
      // 403 — not 401 — so the frontend's refresh-on-401 path
      // doesn't keep trying.
      throw new ForbiddenException('Account is blocked. Please contact support.');
    }

    (
      req as Request & {
        user: { id: string; email: string; role: Role };
        refreshTokenId: string;
      }
    ).user = { id: payload.sub, email: '', role: payload.role };
    (
      req as Request & { refreshTokenId: string }
    ).refreshTokenId = record.id;
    return true;
  }
}