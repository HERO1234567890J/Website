import { IsString, Length, Matches, MinLength } from 'class-validator';

/**
 * §13 / §18 — POST /api/users/me/password.
 *
 * Requires the current password to prove identity (no "password
 * reset via this endpoint" — that uses the email-token flow which
 * isn't wired yet).
 *
 * `newPassword` length matches AuthService's registration rules
 * so we don't let admins create weaker passwords via the change
 * form than the signup form accepts.
 */
export class ChangePasswordDto {
  @IsString()
  @Length(1, 200)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @Length(1, 200)
  newPassword!: string;

  // Sanity-check the format — same regex the auth register flow uses.
  // We don't enforce uppercase/digits here because the registration
  // flow doesn't either (only bcrypt cost + min length). Keep them
  // aligned.
  @IsString()
  @Matches(/^[\x21-\x7E]+$/)
  confirmPassword!: string;
}
