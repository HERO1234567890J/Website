import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';

/**
 * Optional JWT auth guard — used on endpoints that accept BOTH
 * authenticated callers and anonymous ones, where the downstream
 * service branches on whether `req.user` was attached.
 *
 *   - No Authorization header   → pass through, `req.user = null`
 *   - Valid Bearer token        → attach `{ id, email, role }`,
 *                                 pass through
 *   - Malformed / expired token → throw 401 (same as JwtAccessGuard)
 *
 * The malformed-token case is intentional: a caller who TRIED to
 * authenticate but failed shouldn't silently get the anonymous
 * path — that hides bugs and confuses clients. An expired token
 * also fails loudly so the api() client's refresh-on-401 cycle
 * gets a chance to run.
 *
 * §28 / §35 — the only current consumer is `/api/payments/intent`
 * which must accept either a JWT (registered user paying their own
 * booking) or an unauthenticated call carrying `bookingId + guestEmail`
 * (guest paying the booking they just created in the same session).
 *
 * §15 / §18 — re-checks the user's `isBlocked` flag, same as
 * JwtAccessGuard. A blocked user must not be able to exercise
 * authenticated paths even via the optional-auth variant.
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  private readonly logger = new Logger(OptionalJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header) {
      // Anonymous path — let the controller/service decide whether
      // the rest of the request has what it needs (bookingId +
      // guestEmail in the body, for example).
      (req as Request & { user: null }).user = null;
      return true;
    }
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Malformed bearer token.');
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
      // Same as JwtAccessGuard — surface 401 so api() client's
      // refresh-on-401 cycle runs.
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isBlocked: true },
    });
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    if (user.isBlocked) {
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
