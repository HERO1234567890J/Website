import { IsBoolean, IsOptional } from 'class-validator';

/**
 * §13 — PATCH /api/users/me/notification-preferences.
 *
 * All three fields are optional; missing fields keep their current
 * value (PATCH semantics). Defaults are set in the User model
 * (`bookingEmails: true`, others false) — see schema.prisma.
 *
 * Booking-related emails default to ON (the customer just paid
 * for the trip; we never want them to miss a status change).
 * Marketing/sms default to OFF (opt-in, not opt-out, per §18).
 */
export class NotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  bookingEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  smsReminders?: boolean;
}
