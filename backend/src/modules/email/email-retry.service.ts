import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service.js';
import { NotificationStatus } from '@prisma/client';

/**
 * §12 — simple in-process retry worker.
 *
 * Every RETRY_INTERVAL_MS, scans the Notification table for
 * FAILED rows that still have attempts remaining and re-tries the
 * Resend call. Once `attempts == maxAttempts` the row is left in
 * FAILED for an admin to to to.
 *
 * Limitations (v1)
 *   - In-process setInterval. A multi-instance deployment needs a
 *     shared queue (BullMQ / Cloud Tasks) — see PHASE8_HANDOFF.md
 *     §2.
 *   - Linear backoff (interval). — exponential backoff is a
 *     follow-up.
 *
 * The worker is started in onModuleInit and torn down in
 * onModuleDestroy so the interval handle doesn't leak across
 * hot reloads in dev.
 */
@Injectable()
export class EmailRetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailRetryService.name);
  private interval: NodeJS.Timeout | null = null;
  private readonly retryIntervalMs = 60_000; // 1 minute
  private readonly batchSize = 25;
  private resend: Resend | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY missing — EmailRetryService is a no-op. Failed notifications will pile up until the env is set.',
      );
      return;
    }
    this.resend = new Resend(apiKey);
    this.interval = setInterval(() => {
      void this.tick();
    }, this.retryIntervalMs);
    this.logger.log(`EmailRetryService started (interval=${this.retryIntervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Process one batch. Errors are logged, never thrown — the worker
   * keeps going on the next tick.
   */
  async tick(): Promise<void> {
    if (!this.resend) return;
    let processed = 0;
    try {
      const due = await this.notifications.listDueForRetry(this.batchSize);
      for (const row of due) {
        await this.attemptResend(row.id, row.recipientEmail, row.subject, row.bodyHtml, row.bodyText);
        processed++;
      }
    } catch (err) {
      this.logger.error(`EmailRetryService.tick failed: ${(err as Error).message}`);
    }
    if (processed > 0) {
      this.logger.log(`EmailRetryService.tick processed ${processed} notification(s)`);
    }
  }

  /** Exposed for the EmailService first-attempt path so both
   *  first-attempt and retry share the exact same Resend code. */
  async attemptResend(
    notificationId: string,
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    if (!this.resend) return false;
    const from = this.config.get<string>('EMAIL_FROM', 'bookings@d-trips.com');
    const replyTo = this.config.get<string>('EMAIL_REPLY_TO', 'hello@d-trips.com');
    try {
      const { error } = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
        replyTo,
      });
      if (error) {
        await this.notifications.markFailed(notificationId, error.message);
        return false;
      }
      await this.notifications.markSent(notificationId);
      return true;
    } catch (err) {
      await this.notifications.markFailed(notificationId, (err as Error).message);
      return false;
    }
  }

  /** Used by EmailService on the first attempt — sets the row to
   *  RETRYING while the Resend call is in flight, then SENT or
   *  FAILED. */
  async firstAttempt(
    notificationId: string,
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    await this.notifications.markRetrying(notificationId, 'first attempt');
    const ok = await this.attemptResend(notificationId, to, subject, html, text);
    if (!ok) {
      // attemptResend already moved the row to FAILED on the way out;
      // nothing else to do here. The retry worker picks it up next tick.
    }
    void ok;
  }

  /** For tests / admin overrides. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static _status(_: NotificationStatus): void {
    /* no-op — anchor for explicit symbol import in callers */
  }
}