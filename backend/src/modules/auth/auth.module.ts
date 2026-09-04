import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import { OptionalJwtGuard } from './guards/optional-jwt.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { UsersModule } from '../users/users.module.js';

/**
 * AuthModule — §13 hand-rolled JWT.
 *
 * JwtModule is configured with both access + refresh secrets and TTLs
 * so the AuthService can request `signAsync(..., { secret, expiresIn })`
 * explicitly on every call (no shared default — keeps the two token
 * types visually distinct and avoids accidentally signing the wrong
 * secret).
 *
 * Guards exported so feature modules can `@UseGuards(JwtAccessGuard,
 * RolesGuard)` without re-providing them. A future global APP_GUARD
 * wiring belongs in AppModule once the route surface settles.
 */
@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.register({}), // secrets read from ConfigService per call
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessGuard, JwtRefreshGuard, OptionalJwtGuard, RolesGuard],
  exports: [AuthService, JwtAccessGuard, JwtRefreshGuard, OptionalJwtGuard, RolesGuard, JwtModule],
})
export class AuthModule {}