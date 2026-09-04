import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Extract the authenticated user attached by JwtAccessGuard onto the
 * request. Type-narrowed to the shape the auth layer guarantees is
 * present after JwtAccessGuard has run.
 */
export interface JwtUser {
  id: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    return req.user;
  },
);