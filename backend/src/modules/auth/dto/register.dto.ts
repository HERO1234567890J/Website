import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * POST /api/auth/register — payload.
 *
 * §13 — Customers self-register. Email is the natural unique key.
 * §28 — guest checkout is supported, so registration is NOT required
 * to book; this endpoint is for users who choose to create an account
 * (or for admins seeding customer accounts).
 *
 * Password rules are deliberately minimal here so the API surface is
 * unambiguous; enforcement (length, complexity) belongs in a single
 * shared password validator in the future. Phone is optional.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'A valid email is required.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}