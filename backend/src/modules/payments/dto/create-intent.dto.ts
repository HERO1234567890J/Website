import { IsEmail, IsOptional, IsString, IsUrl, IsUUID, Length } from 'class-validator';

/**
 * POST /api/payments/intent body.
 *
 * `amount` and `currency` are NOT accepted from the client — the
 * server reads them off the booking row per §8 / §11.
 *
 * The Idempotency-Key header is required and lives on the request
 * itself, not in this DTO.
 *
 * §28 / §35 — `guestEmail` is REQUIRED when the request is
 * unauthenticated (guest checkout per §28: the visitor can complete
 * a full booking and payment without creating an account). The
 * service verifies the email matches the booking's stored
 * `guestEmail` before allowing the payment intent to proceed. The
 * endpoint's rate limit (ThrottlerModule) makes brute-force
 * enumeration of (bookingId, email) combinations impractical.
 */
export class CreatePaymentIntentDto {
  /** The booking to pay for (read via @Body('bookingId') in the controller). */
  @IsUUID()
  bookingId!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  metadata?: string; // raw JSON string; the service validates before forwarding

  /**
   * Required for guest checkout (§28). Ignored if the request
   * carries a valid JWT — the service uses the authenticated
   * user's identity instead.
   */
  @IsOptional()
  @IsEmail({}, { message: 'guestEmail must be a valid email.' })
  @Length(1, 254)
  guestEmail?: string;
}