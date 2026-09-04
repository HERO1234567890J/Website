import { SetMetadata } from '@nestjs/common';

/**
 * Mark a route handler as public — bypasses the global JwtAccessGuard.
 *
 * Apply to /auth/register, /auth/login, /auth/refresh, and any future
 * unauthenticated endpoint (e.g. /newsletter/subscribe).
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);