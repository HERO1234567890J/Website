import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser, type JwtUser } from './decorators/current-user.decorator.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';

/**
 * /api/auth — register, login, logout, refresh.
 *
 * §13 — public + customer roles only here. Admin login lives behind
 * /api/admin/auth (a separate flow per the spec's emphasis on admin
 * isolation). Each route declares its own guards; nothing is global
 * yet — the global JwtAccessGuard is wired in AuthModule forRoot.
 *
 * Phase 15A — refresh tokens are set as httpOnly secure cookies by
 * the controller (the service still owns the TTL/options via
 * `refreshCookieOptions()`). The cookie's source of truth on the
 * server side is the `RefreshToken` table; the cookie is just a
 * transport. The JWT body never reaches the JSON response — clients
 * see only accessToken + expiresIn + user.
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return this.strip(result);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return this.strip(result);
  }

  @UseGuards(JwtAccessGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const out = await this.auth.logout(user.id);
    this.clearRefreshCookie(res);
    return out;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request & { refreshTokenId: string; user: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
    const result = await this.auth.rotate(req.refreshTokenId, req.user.id);
    this.setRefreshCookie(res, result.refreshToken);
    return this.strip(result);
  }

  // ─── private helpers ────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(AuthService.REFRESH_COOKIE, token, this.auth.refreshCookieOptions());
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(AuthService.REFRESH_COOKIE, {
      path: '/',
      sameSite: 'lax',
      secure: this.auth.refreshCookieOptions().secure,
    });
  }

  private strip(result: AuthResponseDto): Omit<AuthResponseDto, 'refreshToken'> {
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }
}