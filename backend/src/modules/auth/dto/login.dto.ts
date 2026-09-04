import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * POST /api/auth/login — payload.
 *
 * §18 — login responses are deliberately identical for "user not found"
 * and "wrong password" so the endpoint never reveals whether an email
 * is registered. The handler returns a single 401 with a generic
 * message; brute-force / credential-stuffing is the job of the
 * rate-limit middleware (§18, §32) layered in front of this route.
 */
export class LoginDto {
  @IsEmail({}, { message: 'A valid email is required.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}