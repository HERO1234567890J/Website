import { IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * §13 — PATCH /api/users/me — customer-facing profile update.
 *
 * Email is intentionally NOT editable here: changing the address
 * requires re-verification (§18 + email-bounces-as-spam prevention).
 * A separate "change email" flow with verification email + token
 * lands later; for now the email column is immutable from the
 * customer's perspective.
 *
 * `city` was in the original mockup; the User model has no `city`
 * field. We're skipping it for v1 — the destination data already
 * lives on `Booking` / `TripRequest`. Add a `city` column later
 * if the business really wants it on the profile.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{8,32}$/, { message: 'phone looks invalid.' })
  phone?: string;
}
