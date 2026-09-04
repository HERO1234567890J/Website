import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService, type UserView } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { NotificationPrefsDto } from './dto/notification-prefs.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';

/**
 * /api/users/me — customer-facing self-service.
 *
 *   GET    /api/users/me                     current user view
 *   PATCH  /api/users/me                     update name/phone
 *   POST   /api/users/me/password            change password
 *   PATCH  /api/users/me/notification-prefs  toggle email/sms opts
 *
 * §13 — every endpoint requires a valid JWT (JwtAccessGuard). The
 * user id is taken from the token, NEVER from the request body or
 * query string. There is no "user can edit another user's profile"
 * surface on this controller (admin-side changes live in
 * /api/admin/users).
 *
 * §18 — the password-change endpoint requires the CURRENT password
 * to prove identity. There is no silent password reset via this
 * route; that goes through the email-token flow which isn't wired
 * yet.
 */
@UseGuards(JwtAccessGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: JwtUser): Promise<UserView> {
    const full = await this.users.requireById(user.id);
    return this.users.toView(full);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserView> {
    return this.users.updateProfile(user.id, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    return this.users.changePassword(user.id, dto);
  }

  @Patch('me/notification-preferences')
  @HttpCode(HttpStatus.OK)
  async updatePrefs(
    @CurrentUser() user: JwtUser,
    @Body() dto: NotificationPrefsDto,
  ): Promise<UserView> {
    return this.users.updateNotificationPrefs(user.id, dto);
  }
}
