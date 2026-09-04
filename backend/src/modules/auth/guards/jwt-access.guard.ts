import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Validates the `Authorization: Bearer <jwt>` header on every request
 * unless the handler is marked @Public(). On success, attaches a
 * { id, email, role } object to req.user — the only fields downstream
 * code can trust without a DB lookup.
 *
 * §13 — stateless verification of the access token. The refresh
 * token is opaque and validated separately by JwtRefreshGuard.
 *
 * §15 / §18 — after JWT signature verification, this guard also
 * re-checks the user's `isBlocked` flag on every request so a block
 * takes effect immediately (no waiting for access-token TTL). The
 * PK lookup is sub-millisecond — the price of being able to
 * force-logout a bad actor within one request.
 */
@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    let payload: { sub: string; email: string; role: Role };
    try {
      payload = await this.jwtService.verifyAsync<typeof payload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      // §18 — never leak JWT verification details to the client.
      throw new UnauthorizedException('Invalid or expired token.');
    }

    // Re-check the block flag — blocking has to take effect on the
    // next request, not at access-token expiry.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isBlocked: true },
    });
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    if (user.isBlocked) {
      // Use Forbidden (not Unauthorized) so the frontend's
      // refresh-on-401 path doesn't loop trying to recover a
      // session that has been intentionally revoked.
      throw new ForbiddenException('Account is blocked. Please contact support.');
    }

    (req as Request & { user: { id: string; email: string; role: Role } }).user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  }
}