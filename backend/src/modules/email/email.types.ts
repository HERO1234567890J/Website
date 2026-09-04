/**
 * §12 — Email payload shapes (the contract).
 *
 * One type per spec event. New payload fields land here so the
 * service signatures stay in lock-step with the templates that
 * render them.
 */

export interface TripRequestEmailPayload {
  ref: string;
  tripRequestId: string;
  contactEmail: string;
  contactName: string;
}

export interface WelcomeEmailPayload {
  userId: string;
  email: string;
  name: string;
}

export interface BookingCreatedEmailPayload {
  bookingId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  totalEgp: number;
  origin: 'TOUR' | 'CUSTOM_TRIP';
}

export interface BookingConfirmationEmailPayload {
  bookingId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  tourName?: string;
  startDate?: Date;
}

export interface BookingUpdateEmailPayload {
  bookingId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
}

export interface BookingCancellationEmailPayload {
  bookingId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  cancelledBy: 'CUSTOMER' | 'ADMIN';
  refundStatus: 'PENDING' | 'NOT_APPLICABLE';
}

export interface TourCancelledBulkEmailPayload {
  bookingId: string;
  userId: string;
  tourDateId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  tourName: string;
  startDate: Date;
}

export interface PaymentConfirmationEmailPayload {
  bookingId: string;
  paymentId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  amountEgp: number;
}

export interface PaymentFailedEmailPayload {
  bookingId: string;
  paymentId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface PasswordResetEmailPayload {
  userId: string;
  email: string;
  name: string;
  resetUrl: string;
  // resetToken is included so the caller can store it on the
  // PasswordResetToken table; the email body never inlines it.
  expiresAt: Date;
}

export interface TourReminderEmailPayload {
  bookingId: string;
  ref: string;
  guestEmail: string;
  guestName: string;
  tourName: string;
  startDate: Date;
  pickupLocation?: string;
}

export interface ContactMessageReceivedEmailPayload {
  contactMessageId: string;
  // Recipient is the COMPANY (configured team inbox).
  toEmail: string;
  // Subject prefix echoes the inbound subject for the team.
  subject: string;
  name: string;
  email: string;
  phone?: string;
  body: string;
}

export type EmailEventPayload =
  | { kind: 'WELCOME'; payload: WelcomeEmailPayload; idempotencyKey: string }
  | { kind: 'BOOKING_CREATED'; payload: BookingCreatedEmailPayload; idempotencyKey: string }
  | { kind: 'BOOKING_CONFIRMATION'; payload: BookingConfirmationEmailPayload; idempotencyKey: string }
  | { kind: 'BOOKING_UPDATE'; payload: BookingUpdateEmailPayload; idempotencyKey: string }
  | { kind: 'BOOKING_CANCELLATION'; payload: BookingCancellationEmailPayload; idempotencyKey: string }
  | { kind: 'TOUR_CANCELLED_BULK'; payload: TourCancelledBulkEmailPayload; idempotencyKey: string }
  | { kind: 'PAYMENT_CONFIRMATION'; payload: PaymentConfirmationEmailPayload; idempotencyKey: string }
  | { kind: 'PAYMENT_FAILED'; payload: PaymentFailedEmailPayload; idempotencyKey: string }
  | { kind: 'PASSWORD_RESET'; payload: PasswordResetEmailPayload; idempotencyKey: string }
  | { kind: 'TOUR_REMINDER'; payload: TourReminderEmailPayload; idempotencyKey: string }
  | { kind: 'CONTACT_MESSAGE_RECEIVED'; payload: ContactMessageReceivedEmailPayload; idempotencyKey: string }
  | { kind: 'TRIP_REQUEST_RECEIVED'; payload: TripRequestEmailPayload; idempotencyKey: string };