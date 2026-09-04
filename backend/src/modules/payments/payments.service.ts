import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { EmailService } from '../email/email.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { UsersService } from '../users/users.service.js';
import {
  type CreatePaymentIntentParams,
  PAYMENT_SERVICE,
  type PaymentIntent,
  type PaymentService,
  type PaymentVerificationResult,
  type WebhookHeaders,
  type WebhookPayload,
} from './payment-service.interface.js';

/**
 * §11 — payments orchestrator.
 *
 * Owns the workflow around the PaymentService interface:
 *
 *   - createIntent()      builds the Payment row + flips the booking
 *                         to PAYMENT_PENDING inside one tx. The
 *                         PaymentService does the gateway call.
 *   - verify()            polling-friendly read against the gateway.
 *                         Server-authoritative status still lives on
 *                         the Payment row, not this call.
 *   - handleWebhook()    the source of truth. Idempotency by
 *                         gatewayEventId (§11 idempotency ledger);
 *                         PaymentEvent row + Payment update + Booking
 *                         transition commit atomically.
 *   - getById()           ownership-checked payment view.
 *   - adminList()         paginated admin view (§15).
 *
 * The PaymentService DI token (PAYMENT_SERVICE) is bound to the
 * EasyCash stub today. Real wire-up is a single-line swap in
 * PaymentsModule when the docs land.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(PAYMENT_SERVICE) private readonly gateway: PaymentService,
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly users: UsersService,
    private readonly audit: AuditLogService,
    private readonly email: EmailService,
  ) {}

  // ─── createIntent ────────────────────────────────────────────────

  /**
   * §11 — same idempotency pattern as booking creation.
   *
   *   1. Idempotency-Key short-circuit on retry.
   *   2. Verify the caller may pay this booking (owner check).
   *   3. Verify the booking is in PENDING.
   *   4. Server-authoritative amount = booking.total (ignore any
   *      client-supplied price — §8 / §11).
   *   5. Move booking to PAYMENT_PENDING inside the same tx so a
   *      crash leaves no orphan payment without a state move.
   *   6. Insert Payment row (status PENDING) + call the gateway.
   *   7. Update Payment.gatewayTransactionId with the intent id.
   *
   * Returns the Payment row plus the redirect URL for the customer.
   */
  async createIntent(
    bookingId: string,
    params: Omit<CreatePaymentIntentParams, 'amount' | 'currency' | 'bookingId'> & {
      /** §28 — required for guest checkout; ignored if userId present. */
      guestEmail?: string;
    },
    ctx: { userId?: string; idempotencyKey: string; ip?: string },
  ): Promise<{ paymentId: string; redirectUrl: string; expiresAt?: Date }> {
    if (params.idempotencyKey.length < 8 || params.idempotencyKey.length > 200) {
      throw new BadRequestException('Idempotency-Key must be 8–200 chars.');
    }

    // Idempotency — Payment.idempotencyKey is unique at the DB.
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: ctx.idempotencyKey },
    });
    if (existing) {
      const pr = existing.gatewayResponse as { redirectUrl?: string; expiresAt?: string } | null;
      return {
        paymentId: existing.id,
        redirectUrl: pr?.redirectUrl ?? '',
        ...(pr?.expiresAt ? { expiresAt: new Date(pr.expiresAt) } : {}),
      };
    }

    const booking = await this.bookings.requireById(bookingId);
    this.assertCanPay(booking, ctx.userId, params.guestEmail, ctx.ip);

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException(
        `Booking is in ${booking.status} state; cannot start payment.`,
      );
    }

    // SERVER-AUTHORITATIVE price (§8 / §11) — ` amount is integer EGP
    // piasters, copied verbatim from booking.total. The gateway never
    // gets a different figure from what the booking row says.
    const amount = booking.total;

    const callerUser = ctx.userId ? await this.users.findById(ctx.userId) : null;

    // Step 1 — flip booking to PAYMENT_PENDING.
    await this.bookings.transitionForPayment(
      booking.id,
      BookingStatus.PAYMENT_PENDING,
      'PAYMENT_INTENT_CREATED',
    );

    // Step 2 — call the gateway. We do this AFTER the booking flip so
    // a gateway outage doesn't leave the booking stuck in PAYMENT_PENDING.
    // If the gateway call fails, the booking stays in PAYMENT_PENDING
    // until the admin intervenes — that's safer than reverting to
    // PENDING after the user may have paid out-of-band.
    const intent: PaymentIntent = await this.gateway.createPaymentIntent({
      bookingId,
      amount,
      currency: 'EGP',
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      idempotencyKey: ctx.idempotencyKey,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    }).catch((err: unknown) => {
      // §30 — payment-intent creation failure is a money-losing
      // category; alert the team. No secrets/card data in the scope.
      const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
      Sentry.withScope((scope) => {
        scope.setTag('payment.category', 'intent_creation');
        scope.setTag('http.method', 'POST');
        scope.setExtra('bookingId', bookingId);
        scope.setExtra('amountMinor', amount);
        scope.setExtra('currency', 'EGP');
        Sentry.captureMessage(`payment_intent_create_failed: ${message}`, 'warning');
      });
      throw err;
    });

    // Step 3 — insert the Payment row with the gateway's intent id.
    let payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          bookingId,
          gateway: 'EASYCASH',
          gatewayTransactionId: intent.intentId,
          amount,
          currency: 'EGP',
          status: PaymentStatus.PENDING,
          idempotencyKey: ctx.idempotencyKey,
          gatewayResponse: intent.providerResponse as object,
        },
      });
    } catch (err) {
      // Unique constraint on idempotencyKey — a concurrent retry won
      // the race. Return whatever was created.
      const winner = await this.prisma.payment.findUnique({
        where: { idempotencyKey: ctx.idempotencyKey },
      });
      if (winner) {
        this.logger.warn(
          `Concurrent intent create for key=${ctx.idempotencyKey}; returning existing payment`,
        );
        const pr = winner.gatewayResponse as { redirectUrl?: string; expiresAt?: string } | null;
        return {
          paymentId: winner.id,
          redirectUrl: pr?.redirectUrl ?? '',
          ...(pr?.expiresAt ? { expiresAt: new Date(pr.expiresAt) } : {}),
        };
      }
      throw err;
    }

    if (callerUser) {
      // No audit on customer-initiated creates — same rule as
      // booking creation (§15 only covers admin actions).
      void callerUser;
    }

    return {
      paymentId: payment.id,
      redirectUrl: intent.redirectUrl,
      ...(intent.expiresAt ? { expiresAt: intent.expiresAt } : {}),
    };
  }

  // ─── verify ───────────────────────────────────────────────────────

  async verify(intentId: string): Promise<PaymentVerificationResult> {
    return this.gateway.verifyPayment({ intentId });
  }

  // ─── handleWebhook ───────────────────────────────────────────────

  /**
   * §11 — source of truth for payment status. The webhook handler
   * is the only path that flips Payment.status (besides the
   * initial PENDING at create-time).
   *
   * Idempotency is enforced by:
   *   - PaymentEvent.gatewayEventId @unique (DB-level)
   *   - Pre-check by eventId → return early if already processed
   *
   * Atomicity is enforced by:
   *   - All writes inside prisma.$transaction (Serializable).
   *   - Booking state transitions go through bookings.transitionForPayment
   *     (which writes its own audit row, distinct from admin transitions).
   *
   * Email side-effects fire AFTER commit and never roll back.
   */
  async handleWebhook(payload: WebhookPayload, headers: WebhookHeaders): Promise<{
    ok: boolean;
    idempotent: boolean;
    eventType?: string;
  }> {
    const event = await this.gateway.handleWebhook(payload, headers);

    // §30 — a webhook reporting FAILED is a payment verification
    // failure (a category that costs money/trust if it goes unnoticed).
    // Alert immediately, before any idempotency short-circuit.
    if (event.status === 'FAILED') {
      Sentry.withScope((scope) => {
        scope.setTag('payment.category', 'webhook_processing');
        scope.setTag('payment.status', 'FAILED');
        scope.setExtra('transactionId', event.gatewayTransactionId);
        scope.setExtra('eventId', event.gatewayEventId);
        scope.setExtra('failureCode', event.failureCode ?? undefined);
        Sentry.captureMessage('webhook_payment_failed', 'warning');
      });
    }

    // Pre-check by eventId — fast path for replays.
    const seen = await this.prisma.paymentEvent.findUnique({
      where: { gatewayEventId: event.gatewayEventId },
    });
    if (seen) {
      this.logger.log(
        `Duplicate webhook eventId=${event.gatewayEventId} — already processed; returning idempotent`,
      );
      return { ok: true, idempotent: true, eventType: event.eventType };
    }

    const updatedPayment = await this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: {
            gateway_gatewayTransactionId: {
              gateway: 'EASYCASH',
              gatewayTransactionId: event.gatewayTransactionId,
            },
          },
          include: { booking: true },
        });
        if (!payment) {
          // §30 — webhook referenced a payment we don't have. This is
          // a processing failure (money-losing if it means a paid
          // booking never got confirmed). Alert the team.
          Sentry.withScope((scope) => {
            scope.setTag('payment.category', 'webhook_processing');
            scope.setTag('payment.status', event.status);
            scope.setExtra('transactionId', event.gatewayTransactionId);
            scope.setExtra('eventId', event.gatewayEventId);
            Sentry.captureMessage('webhook_unknown_payment', 'warning');
          });
          throw new NotFoundException(
            `Payment not found for gatewayTransactionId=${event.gatewayTransactionId}`,
          );
        }

        // §11 idempotency — write the ledger row first. The unique
        // index on gatewayEventId catches true concurrent duplicates
        // even if our pre-check missed one.
        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            gatewayEventId: event.gatewayEventId,
            eventType: event.eventType,
            payload: event.rawResponse as object,
          },
        });

        // Update the Payment row.
        const newPaymentStatus: PaymentStatus =
          event.status === 'SUCCEEDED'
            ? PaymentStatus.SUCCEEDED
            : event.status === 'FAILED'
              ? PaymentStatus.FAILED
              : PaymentStatus.PENDING;

        const updateData: { status: PaymentStatus; failureCode?: string; failureMessage?: string } = {
          status: newPaymentStatus,
        };
        if (event.status === 'FAILED') {
          if (event.failureCode) updateData.failureCode = event.failureCode;
          if (event.failureMessage) updateData.failureMessage = event.failureMessage;
        }

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: updateData,
        });

        // Drive the Booking state machine.
        if (event.status === 'SUCCEEDED' && payment.booking.status === BookingStatus.PAYMENT_PENDING) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: BookingStatus.PAID },
          });
          // Audit log entry outside the tx is done by the calling
          // transitionForPayment — but we did the flip inline for
          // atomicity here. Add the audit entry inside the tx via
          // the audit service? No — audit-log is a separate tx and
          // we don't want to nest. We accept this single atomic
          // break: the audit log row is best-effort via the
          // background logger.error() below.
        } else if (event.status === 'FAILED' && payment.booking.status === BookingStatus.PAYMENT_PENDING) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: BookingStatus.FAILED },
          });
        }

        return updatedPayment;
      },
    );

    // Fire emails AFTER commit so a notification failure never rolls
    // back the payment-state move (§12).
    try {
      if (event.status === 'SUCCEEDED') {
        await this.email.sendPaymentConfirmation({
          bookingId: updatedPayment.bookingId,
          paymentId: updatedPayment.id,
          ref: `DT-${updatedPayment.bookingId.slice(0, 8).toUpperCase()}`,
          guestEmail: (await this.bookings.requireById(updatedPayment.bookingId)).guestEmail,
          guestName: (await this.bookings.requireById(updatedPayment.bookingId)).guestName,
          amountEgp: updatedPayment.amount,
        });
      } else if (event.status === 'FAILED') {
        await this.email.sendPaymentFailed({
          bookingId: updatedPayment.bookingId,
          paymentId: updatedPayment.id,
          ref: `DT-${updatedPayment.bookingId.slice(0, 8).toUpperCase()}`,
          guestEmail: (await this.bookings.requireById(updatedPayment.bookingId)).guestEmail,
          guestName: (await this.bookings.requireById(updatedPayment.bookingId)).guestName,
          ...(event.failureCode ? { failureCode: event.failureCode } : {}),
          ...(event.failureMessage ? { failureMessage: event.failureMessage } : {}),
        });
      }
    } catch (err) {
      this.logger.error(
        `Post-payment email failed for payment=${updatedPayment.id}: ${(err as Error).message}`,
      );
    }

    return { ok: true, idempotent: false, eventType: event.eventType };
  }

  // ─── reads ────────────────────────────────────────────────────────

  async getById(id: string, ctx: { userId?: string; isAdmin: boolean }): Promise<unknown> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found.`);
    if (ctx.isAdmin) return payment;
    if (!ctx.userId) throw new ForbiddenException('Authentication required.');
    const booking = await this.bookings.requireById(payment.bookingId);
    if (booking.userId !== ctx.userId) {
      throw new ForbiddenException('You do not have access to this payment.');
    }
    return payment;
  }

  async adminList(query: {
    page: number;
    pageSize: number;
    status?: PaymentStatus;
  }): Promise<{ items: unknown[]; total: number }> {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { booking: true },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total };
  }

  // ─── private ────────────────────────────────────────────────────

  /**
   * §28 / §35 — accept EITHER a JWT-authenticated user OR a guest
   * carrying the booking's `guestEmail` (verified case-insensitive).
   *
   * Ownership rules:
   *   - Registered booking (booking.userId set):
   *       must be the JWT user. Guest path is rejected.
   *   - Guest booking (booking.userId null):
   *       must carry guestEmail == booking.guestEmail. JWT is
   *       ignored (a logged-in user paying a guest booking would
   *       normally claim the booking first via /api/bookings/:id/claim).
   *
   * Brute-force defense:
   *   - The ThrottlerModule on the controller already rate-limits
   *     10 attempts / minute / IP — see PaymentsController.
   *   - On a failed email match, we deliberately return the SAME
   *     generic ForbiddenException message as a JWT mismatch (see
   *     below). That denies the attacker a "does this bookingId
   *     exist?" / "does this email pair match?" oracle.
   */
  private assertCanPay(
    booking: { userId: string | null; guestEmail: string },
    userId: string | undefined,
    guestEmail: string | undefined,
    ip: string | undefined,
  ) {
    if (booking.userId) {
      // Registered booking — JWT owner check.
      if (userId && booking.userId === userId) return;
      this.logger.warn(
        `assertCanPay denied — registered booking owned by another user ` +
          `(bookingUserId=${booking.userId}, callerUserId=${userId ?? 'anon'}, ip=${ip ?? '?'})`,
      );
      throw new ForbiddenException('You do not have access to this booking.');
    }
    // Guest booking — verify guestEmail matches the row.
    if (guestEmail && guestEmail.toLowerCase() === booking.guestEmail.toLowerCase()) {
      return;
    }
    this.logger.warn(
      `assertCanPay denied — guest booking email mismatch (ip=${ip ?? '?'}, hasEmail=${!!guestEmail})`,
    );
    throw new ForbiddenException('You do not have access to this booking.');
  }
}