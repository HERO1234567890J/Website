import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route handler to one or more roles. Combined with the
 * RolesGuard (wired globally after JwtAccessGuard) and the JWT
 * payload's `role` claim.
 *
 * Example:
 *   @Roles(Role.ADMIN)
 *   @UseGuards(JwtAccessGuard, RolesGuard)
 *   ...
 *
 * §13 — Roles are an enum, but the policy check is delegated to a
 * proper guard so future SUPER_ADMIN / STAFF tiers can be added by
 * extending the enum + policy map without rewrites.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);