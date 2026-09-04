import { Injectable, Logger } from '@nestjs/common';
import {
  type BookingCancellationEmailPayload,
  type BookingConfirmationEmailPayload,
  type BookingCreatedEmailPayload,
  type BookingUpdateEmailPayload,
  type ContactMessageReceivedEmailPayload,
  type PasswordResetEmailPayload,
  type PaymentConfirmationEmailPayload,
  type PaymentFailedEmailPayload,
  type TourCancelledBulkEmailPayload,
  type TourReminderEmailPayload,
  type TripRequestEmailPayload,
  type WelcomeEmailPayload,
} from './email.types.js';
import { NotificationsService } from './notifications.service.js';
import { EmailRetryService } from './email-retry.service.js';
import { EmailEventType } from '@prisma/client';
import {
  renderBookingCancellation,
  renderBookingConfirmation,
  renderBookingCreated,
  renderBookingUpdate,
  renderContactMessageReceived,
  renderPasswordReset,
  renderPaymentConfirmation,
  renderPaymentFailed,
  renderTourCancelledBulk,
  renderTourReminder,
  renderTripRequestReceived,
  renderWelcome,
} from './templates.js';

/**
 * §12 — full Resend-backed EmailService.
 *
 *   Every public method has the same shape:
 *     1. Render the template (subject + html + text).
 *     2. Upsert a Notification row keyed by the caller's
 *        idempotencyKey — same logical email is never sent twice.
 *     3. If the row is already SENT, return early (idempotency).
 *     4. Fire the Resend call (delegated to EmailRetryService for
 *        shared first-attempt + retry code path).
 *     5. Catch all errors — per §12, no booking / payment state
 *        ever rolls back because of an email failure.
 *
 * The public method signatures are STABLE across the v1 lifetime;
 * callers in BookingsService / PaymentsService / AuthService don't
 * need to change.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly retry: EmailRetryService,
  ) {}

  // ─── per-event methods ────────────────────────────────────────

  async sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.WELCOME,
      idempotencyKey: this.idempotency('welcome', payload.userId),
      recipientEmail: payload.email,
      recipientName: payload.name,
      rendered: renderWelcome(payload),
      userId: payload.userId,
    });
  }

  async sendTripRequestReceived(payload: TripRequestEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.TRIP_REQUEST_RECEIVED,
      idempotencyKey: this.idempotency('trip-request', payload.tripRequestId),
      recipientEmail: this.teamInbox(),
      recipientName: payload.contactName,
      rendered: renderTripRequestReceived(payload),
      tripRequestId: payload.tripRequestId,
    });
  }

  async sendBookingCreated(payload: BookingCreatedEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.BOOKING_CREATED,
      idempotencyKey: this.idempotency('booking-created', payload.bookingId),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderBookingCreated(payload),
      bookingId: payload.bookingId,
    });
  }

  async sendBookingConfirmation(payload: BookingConfirmationEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.BOOKING_CONFIRMATION,
      idempotencyKey: this.idempotency('booking-confirmation', payload.bookingId),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderBookingConfirmation(payload),
      bookingId: payload.bookingId,
    });
  }

  async sendBookingUpdate(payload: BookingUpdateEmailPayload): Promise<void> {
    // Includes the toStatus so a reverse transition PAID → FAILED (via
    // refund) doesn't collide with the original PENDING → PAID
    // update event under the same key.
    await this.dispatch({
      eventType: EmailEventType.BOOKING_UPDATE,
      idempotencyKey: this.idempotency('booking-update', payload.bookingId, payload.toStatus),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderBookingUpdate(payload),
      bookingId: payload.bookingId,
    });
  }

  async sendBookingCancellation(payload: BookingCancellationEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.BOOKING_CANCELLATION,
      idempotencyKey: this.idempotency('booking-cancellation', payload.bookingId),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderBookingCancellation(payload),
      bookingId: payload.bookingId,
    });
  }

  async sendTourCancelledBulk(payload: TourCancelledBulkEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.TOUR_CANCELLED_BULK,
      // Includes tourDateId so a single user with bookings on two
      // different cancelled dates gets both notifications.
      idempotencyKey: this.idempotency(
        'tour-cancelled-bulk',
        payload.tourDateId,
        payload.userId,
      ),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderTourCancelledBulk(payload),
      bookingId: payload.bookingId,
      userId: payload.userId,
    });
  }

  async sendPaymentConfirmation(payload: PaymentConfirmationEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.PAYMENT_CONFIRMATION,
      idempotencyKey: this.idempotency('payment-confirmation', payload.paymentId),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderPaymentConfirmation(payload),
      bookingId: payload.bookingId,
      paymentId: payload.paymentId,
    });
  }

  async sendPaymentFailed(payload: PaymentFailedEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.PAYMENT_FAILED,
      idempotencyKey: this.idempotency('payment-failed', payload.paymentId),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderPaymentFailed(payload),
      bookingId: payload.bookingId,
      paymentId: payload.paymentId,
    });
  }

  async sendPasswordReset(payload: PasswordResetEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.PASSWORD_RESET,
      // The reset token makes this one-shot — re-using the same token
      // sends no duplicate email.
      idempotencyKey: this.idempotency('password-reset', payload.userId, payload.resetUrl),
      recipientEmail: payload.email,
      recipientName: payload.name,
      rendered: renderPasswordReset(payload),
      userId: payload.userId,
    });
  }

  async sendTourReminder(payload: TourReminderEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.TOUR_REMINDER,
      // Date-keyed — fires once per booking per startDate.
      idempotencyKey: this.idempotency('tour-reminder', payload.bookingId, payload.startDate.toISOString().slice(0, 10)),
      recipientEmail: payload.guestEmail,
      recipientName: payload.guestName,
      rendered: renderTourReminder(payload),
      bookingId: payload.bookingId,
    });
  }

  async sendContactMessageReceived(payload: ContactMessageReceivedEmailPayload): Promise<void> {
    await this.dispatch({
      eventType: EmailEventType.CONTACT_MESSAGE_RECEIVED,
      idempotencyKey: this.idempotency(
        'contact-message-received',
        payload.contactMessageId,
      ),
      // Recipient is the COMPANY (configured team inbox).
      recipientEmail: payload.toEmail,
      recipientName: undefined,
      rendered: renderContactMessageReceived(payload),
      contactMessageId: payload.contactMessageId,
    });
  }

  // ─── private helpers ──────────────────────────────────────────

  private async dispatch(args: {
    eventType: EmailEventType;
    idempotencyKey: string;
    recipientEmail: string;
    recipientName?: string;
    rendered: { subject: string; html: string; text: string };
    userId?: string;
    bookingId?: string;
    paymentId?: string;
    tripRequestId?: string;
    contactMessageId?: string;
  }): Promise<void> {
    // Idempotency short-circuit — short-circuit happens before the
    // render call too so we don't waste cycles on already-sent mail.
    const existing = await this.notifications.findByIdempotencyKey(args.idempotencyKey);
    if (existing && existing.status === 'SENT') {
      this.logger.log(
        `Email ${args.eventType} key=${args.idempotencyKey} already SENT; skipping`,
      );
      return;
    }

    const row =
      existing ??
      (await this.notifications.upsert({
        eventType: args.eventType,
        idempotencyKey: args.idempotencyKey,
        recipientEmail: args.recipientEmail,
        recipientName: args.recipientName,
        subject: args.rendered.subject,
        bodyHtml: args.rendered.html,
        bodyText: args.rendered.text,
        userId: args.userId,
        bookingId: args.bookingId,
        paymentId: args.paymentId,
        tripRequestId: args.tripRequestId,
        contactMessageId: args.contactMessageId,
      }));

    // Per §12 — never throw to the caller. The retry worker picks
    // up FAILED rows.
    try {
      await this.retry.firstAttempt(
        row.id,
        args.recipientEmail,
        args.rendered.subject,
        args.rendered.html,
        args.rendered.text,
      );
    } catch (err) {
      this.logger.error(
        `dispatch failed for ${args.eventType} key=${args.idempotencyKey}: ${(err as Error).message}`,
      );
    }
  }

  private idempotency(...parts: string[]): string {
    return parts.join(':');
  }

  private teamInbox(): string {
    // Imported lazily to avoid a circular dep on ConfigService.
    // EmailModule wires this through EmailRetryService.config.
    // Falls back to the well-known default if config is unavailable.
    return process.env.EMAIL_FROM ?? 'bookings@d-trips.com';
  }
}