import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { type JwtUser } from '../decorators/current-user.decorator.js';

/**
 * Enforces @Roles(...) on a route handler. MUST be wired AFTER
 * JwtAccessGuard (which populates req.user). Returns 403 on mismatch
 * so the difference between "not logged in" and "wrong role" stays
 * clear in logs and metrics.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Authenticated user not found on request.');
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role.');
    }
    return true;
  }
}