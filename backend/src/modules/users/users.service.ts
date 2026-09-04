import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Users module — used by both auth (lookup) and the customer-facing
 * profile / password / notification endpoints (Phase 15E).
 *
 * §18 — no raw password hashes leave this service. The view
 * returned to API consumers explicitly omits `passwordHash`.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async requireById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  // ─── §13 / §18 — profile + password + notification prefs ────────

  /**
   * Update profile fields the customer owns. Email is intentionally
   * NOT in the patch set (changing the address requires a separate
   * verification flow). Returns the safe view — never includes
   * `passwordHash`.
   */
  async updateProfile(
    id: string,
    patch: { name?: string | null; phone?: string | null },
  ): Promise<UserView> {
    await this.requireById(id);
    const data: { name?: string | null; phone?: string | null } = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.phone !== undefined) data.phone = patch.phone;
    const updated = await this.prisma.user.update({ where: { id }, data });
    return this.toView(updated);
  }

  /**
   * Change password. Requires the current password to prove identity
   * (no silent password reset via this endpoint — that goes through
   * the email-token flow which isn't wired yet).
   *
   * `newPassword` and `confirmPassword` are checked in the controller
   * layer via class-validator; this method double-checks before
   * hashing in case the DTO order changes.
   *
   * Throws UnauthorizedException on wrong current password — generic
   * message so the endpoint isn't an oracle for "is this the
   * right account?".
   */
  async changePassword(
    id: string,
    args: { currentPassword: string; newPassword: string; confirmPassword: string },
  ): Promise<{ ok: true }> {
    if (args.newPassword !== args.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match.');
    }
    const user = await this.requireById(id);
    const ok = await bcrypt.compare(args.currentPassword, user.passwordHash);
    if (!ok) {
      // Generic message — see auth.service.login for the same pattern.
      throw new UnauthorizedException('Current password is incorrect.');
    }
    const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(args.newPassword, rounds);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    // §13 — best-effort: revoke other refresh tokens so a stolen
    // token from an old device stops working. The current session
    // token isn't tracked here, but if the caller had one it'll
    // get refreshed naturally on its next refresh attempt.
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async updateNotificationPrefs(
    id: string,
    patch: { bookingEmails?: boolean; marketingEmails?: boolean; smsReminders?: boolean },
  ): Promise<UserView> {
    await this.requireById(id);
    const data: {
      bookingEmails?: boolean;
      marketingEmails?: boolean;
      smsReminders?: boolean;
    } = {};
    if (patch.bookingEmails !== undefined) data.bookingEmails = patch.bookingEmails;
    if (patch.marketingEmails !== undefined) data.marketingEmails = patch.marketingEmails;
    if (patch.smsReminders !== undefined) data.smsReminders = patch.smsReminders;
    const updated = await this.prisma.user.update({ where: { id }, data });
    return this.toView(updated);
  }

  // ─── view shape ──────────────────────────────────────────────────

  /**
   * Strip the password hash before returning to API consumers.
   * Includes notification prefs (added in §13 + Phase 15E) so the
   * frontend can render the settings panel without a second round
   * trip.
   */
  toView(user: User): UserView {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      bookingEmails: user.bookingEmails,
      marketingEmails: user.marketingEmails,
      smsReminders: user.smsReminders,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

/**
 * Wire shape for /api/users/me. The frontend's `User` type
 * (auth/AuthContext) only knows id/name/email/role; the wider view
 * here is what /api/users/me returns. The auth context's User type
 * is a strict subset — the wider fields are accessed directly in
 * the Account page from the me() response.
 */
export interface UserView {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  emailVerifiedAt: string | null;
  bookingEmails: boolean;
  marketingEmails: boolean;
  smsReminders: boolean;
  createdAt: string;
  updatedAt: string;
}