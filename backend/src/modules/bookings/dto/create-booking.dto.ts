import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { BookingOrigin } from '@prisma/client';

/**
 * POST /api/bookings
 *
 * Required Idempotency-Key header on the request itself (enforced
 * in the controller, not the DTO). Same key on retry → return the
 * existing booking without recreating it (§11-style idempotency).
 *
 * Origin branches:
 *   origin == TOUR        → tourId + tourDateId required
 *   origin == CUSTOM_TRIP → tripRequestId required
 *
 * Server is authoritative on price (§8). The DTO does NOT carry
 * subtotal/discount/total — those are computed inside the
 * BookingsService from `tour.startingPrice × travelerCount` (TOUR)
 * or left at 0 awaiting an admin quote (CUSTOM_TRIP, Phase 12).
 *
 * §8 — explicit T&C + Privacy consent captured at checkout, with
 * timestamp. The consent value is REQUIRED and the booking row's
 * `consentAcceptedAt` is set server-side from this field. Frontend
 * must send a real ISO timestamp from when the user ticked the
 * checkbox.
 */
export class CreateBookingDto {
  @IsEnum(BookingOrigin)
  origin!: BookingOrigin;

  @ValidateIf((o: CreateBookingDto) => o.origin === BookingOrigin.TOUR)
  @IsUUID()
  tourId?: string;

  @ValidateIf((o: CreateBookingDto) => o.origin === BookingOrigin.TOUR)
  @IsUUID()
  tourDateId?: string;

  @ValidateIf((o: CreateBookingDto) => o.origin === BookingOrigin.CUSTOM_TRIP)
  @IsUUID()
  tripRequestId?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  travelerCount!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  travelerNames?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pickupLocation?: string;

  // §8 — REQUIRED. Server stamps `consentAcceptedAt` on the row.
  @IsISO8601()
  consentAcceptedAt!: string;

  // Promo code is the human-typed identifier; looked up server-side.
  // Optional — when present, BookingsService.validateAndApplyPromo
  // runs and the discount is computed from the validated amount
  // (NOT the client).
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,32}$/i)
  promoCode?: string;

  // Guest fields are required when the request is unauthenticated
  // (§28). When authenticated, the BookingsService prefers the
  // user's own email/name from the JWT context.
  @ValidateIf((o: CreateBookingDto) => !o._isAuthenticated)
  @IsString()
  @Length(1, 254)
  guestEmail?: string;

  @ValidateIf((o: CreateBookingDto) => !o._isAuthenticated)
  @IsString()
  @Length(1, 100)
  guestName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{8,32}$/)
  guestPhone?: string;

  // Sentinel that BookingsService flips on via `plainToInstance`
  // when a JWT was present. Allows guest fields to remain optional
  // for authenticated users without dropping the @ValidateIf
  // completely (which would let anonymous bookings skip them).
  // @IsOptional() keeps it whitelisted so the global ValidationPipe's
  // forbidNonWhitelisted doesn't reject the payload the controller
  // re-adds this field to.
  @IsOptional()
  _isAuthenticated?: boolean;
}

/**
 * POST /api/bookings/:id/cancel — customer self-cancel.
 *
 * No body required; the cancellation reason is optional.
 */
export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * POST /api/bookings/:id/claim — link a guest-checkout booking
 * to the authenticated user (§28). Only callable when the
 * authenticated user's email matches the booking's guestEmail
 * OR when an admin manually invokes it on behalf of the user.
 */
export class ClaimBookingDto {
  @IsOptional()
  @IsString()
  @Length(1, 254)
  @IsEmailSafe()
  matchingEmail?: string;
}

// Local helper — class-validator's @IsEmail is heavy; the matching
// pattern is verified inline. Kept inline to avoid pulling the
// extra decorator into the bundle.
function IsEmailSafe(): (target: object, key: string) => void {
  return IsEmail({}, { message: 'matchingEmail must be a valid email.' });
}

/**
 * PATCH /api/admin/bookings/:id — admin status transition.
 *
 * Note: this ONLY carries the target status; transition legality
 * is enforced inside the service via the state machine. Once
 * Phase 10 lands, /refund lives under payments and bypasses this
 * endpoint (REFUNDED is reached by the payment-side state change,
 * not via booking patch).
 */
export class AdminUpdateBookingDto {
  @IsEnum(
    // STRICT subset — admin cannot directly write terminal-status
    // targets like REFUNDED (Phase 10) or DRAFT (no reason to).
    [
      'PENDING',
      'PAYMENT_PENDING',
      'PAID',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'FAILED',
      'EXPIRED',
    ] as const,
  )
  status!: 'PENDING' | 'PAYMENT_PENDING' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'EXPIRED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  // Used by AdminUpdateBooking to make timestamps visible in audit.
  @IsOptional()
  @IsDateString()
  overrideConsentAt?: string;
}