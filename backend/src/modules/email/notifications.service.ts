import { Injectable, Logger } from '@nestjs/common';
import { EmailEventType, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * §12 — Notification row manager.
 *
 * Every send creates (or upserts by idempotencyKey) a Notification
 * row BEFORE the Resend call. Status moves through:
 *
 *   PENDING  → SENT          (delivery succeeded)
 *            → FAILED         (Resend call threw; retry queue picks it up)
 *            → RETRYING       (retry attempt is in flight)
 *
 * Idempotency
 *   The idempotencyKey is UNIQUE in the DB. Two callers racing with
 *   the same logical event (e.g. webhook + polling-confirm firing
 *   PAYMENT_CONFIRMATION simultaneously) end up with one row; the
 *   second caller sees "already sent" and skips.
 *
 * This service is the only writer; the retry worker in
 * `email-retry.service.ts` is the only reader of FAILED rows.
 */
export interface UpsertArgs {
  eventType: EmailEventType;
  idempotencyKey: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  maxAttempts?: number;
  // Optional FKs
  userId?: string;
  bookingId?: string;
  paymentId?: string;
  tripRequestId?: string;
  reviewId?: string;
  contactMessageId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent upsert. Returns the row (existing or new). If an
   * existing row is already SENT, callers MUST short-circuit and
   * not re-send.
   */
  async upsert(args: UpsertArgs) {
    return this.prisma.notification.upsert({
      where: { idempotencyKey: args.idempotencyKey },
      create: {
        eventType: args.eventType,
        idempotencyKey: args.idempotencyKey,
        recipientEmail: args.recipientEmail,
        recipientName: args.recipientName ?? null,
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        bodyText: args.bodyText,
        maxAttempts: args.maxAttempts ?? 5,
        status: NotificationStatus.PENDING,
        userId: args.userId ?? null,
        bookingId: args.bookingId ?? null,
        paymentId: args.paymentId ?? null,
        tripRequestId: args.tripRequestId ?? null,
        reviewId: args.reviewId ?? null,
        contactMessageId: args.contactMessageId ?? null,
      },
      update: {}, // never overwrite an existing row
    });
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        attempts: { increment: 1 },
        lastError: errorMessage.slice(0, 1000),
      },
    });
  }

  async markRetrying(id: string, errorMessage: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.RETRYING,
        attempts: { increment: 1 },
        lastError: errorMessage.slice(0, 1000),
      },
    });
  }

  /**
   * Retry worker entry point — pulls FAILED rows that still have
   * attempts remaining. Returns them sorted by oldest-first so a
   * stuck delivery eventually goes out.
   */
  async listDueForRetry(limit: number): Promise<
    Array<{
      id: string;
      eventType: EmailEventType;
      idempotencyKey: string;
      recipientEmail: string;
      recipientName: string | null;
      subject: string;
      bodyHtml: string;
      bodyText: string;
      attempts: number;
      maxAttempts: number;
      lastError: string | null;
      userId: string | null;
      bookingId: string | null;
      paymentId: string | null;
      tripRequestId: string | null;
      reviewId: string | null;
      contactMessageId: string | null;
      createdAt: Date;
    }>
  > {
    const rows = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
        attempts: { lt: this.prisma.notification.fields ? undefined : undefined },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    // The where above can't express `attempts < maxAttempts` cleanly
    // in a single query — Prisma doesn't yet support column-vs-column
    // comparisons in where. Filter in memory for v1; replace with
    // a raw SQL filter when notifications volume grows.
    return rows.filter((r) => r.attempts < r.maxAttempts);
  }

  /** §12 — payments/bookings must NEVER roll back because of an
   *  email failure. Callers catch any thrown error from send() and
   *  log it; the row stays in PENDING / FAILED for the retry worker. */
  async findByIdempotencyKey(key: string) {
    return this.prisma.notification.findUnique({ where: { idempotencyKey: key } });
  }

  // Re-export Prisma enums so the EmailService doesn't import them
  // directly from @prisma/client (small coupling shield).
  static readonly status = NotificationStatus;
  static readonly event = EmailEventType;
}

/**
 * NOTE on the unused Prisma import below — kept so future
 * `Prisma.NotificationUpdateInput`-typed helpers can be added
 * without re-importing.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _p: typeof Prisma | null = null;