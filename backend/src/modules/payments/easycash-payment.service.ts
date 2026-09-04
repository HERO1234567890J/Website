import { BadRequestException, Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CreatePaymentIntentParams,
  PaymentIntent,
  PaymentService,
  PaymentVerificationResult,
  RefundParams,
  RefundResult,
  VerifyPaymentParams,
  WebhookHeaders,
  WebhookPayload,
  WebhookResult,
} from './payment-service.interface.js';

/**
 * §11 — EasyCash gateway adapter.
 *
 *   [PENDING: requires real EasyCash API docs]
 *
 *   Everything below is a clearly-flagged placeholder. The interface
 *   in `./payment-service.interface.ts` is the real contract; this
 *   implementation is swapped for a real wire-up when the business
 *   supplies:
 *
 *     - The create-intent endpoint URL
 *     - The create-intent request body field names + types
 *     - The create-intent response shape
 *     - The verify-intent endpoint URL + response shape
 *     - The webhook URL + payload shape
 *     - The webhook signature header name(s algorithm
 *     - The webhook signature HMAC scheme (which bytes, which secret)
 *     - The refund endpoint URL + request/response shapes
 *
 *   Until then, this stub does the minimum needed for the surrounding
 *   booking flow to exercise end-to-end:
 *
 *     - createPaymentIntent returns a deterministic mock redirect URL
 *     - verifyPayment returns a synthetic SUCCEEDED state
 *     - handleWebhook validates shape only — NO signature check,
 *       NO replay-attempt defence. This is marked clearly below.
 *     - refund returns a synthetic PENDING refund
 *
 *   Hard rule from §18: NO card data, NO API keys, NO bearer tokens
 *   in any providerResponse field. The mock returns field names
 *   only.
 */
@Injectable()
export class EasyCashPaymentService implements PaymentService {
  private readonly logger = new Logger(EasyCashPaymentService.name);

  // ─── createPaymentIntent ─────────────────────────────────────────

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    // [PENDING: requires real EasyCash API docs]
    // Real implementation needs:
    //   - POST {baseUrl}/v1/intents       (URL TBD)
    //   - Authorization: Bearer {EASYCASH_API_KEY}
    //   - Body: { amount, currency, return_url, cancel_url,
    //             idempotency_key, metadata }   (field names TBD)
    //   - Response: { intent_id, redirect_url, expires_at, ... }
    //     (field names TBD)
    this.logger.warn(
      `[STUB] EasyCash createPaymentIntent called for booking=${params.bookingId} amount=${params.amount} ${params.currency}. Real wire-up pending API docs.`,
    );

    const intentId = `mock-intent-${randomUUID()}`;
    return {
      intentId,
      redirectUrl: `https://checkout.easycash.example/mock?intent=${intentId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      providerResponse: {
        mock: true,
        intentId,
        // Echo back what we sent (without secrets). Real provider
        // response is structurally different and stored verbatim.
        sentFields: {
          bookingId: params.bookingId,
          amount: params.amount,
          currency: params.currency,
          idempotencyKey: params.idempotencyKey,
          ...(params.metadata ? { metadata: params.metadata } : {}),
        },
      },
    };
  }

  // ─── verifyPayment ───────────────────────────────────────────────

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    // [PENDING: requires real EasyCash API docs]
    // Real implementation: GET {baseUrl}/v1/intents/:intentId, return
    // { status, amount, currency, transaction_id, ... }.
    //
    // §11 — verify is a SECONDARY source of truth. The webhook is the
    // primary one. This stub returns a synthetic SUCCEEDED so the
    // customer-facing redirect-and-poll flow has something to render.
    this.logger.warn(`[STUB] EasyCash verifyPayment called for intent=${params.intentId}`);

    return {
      status: 'SUCCEEDED',
      amount: 0, // Real impl returns the canonical amount; the controller
                 // ignores this and uses Booking.total for the source of
                 // truth per §8 / §11.
      currency: 'EGP',
      gatewayTransactionId: `mock-tx-${randomUUID()}`,
      providerResponse: {
        mock: true,
        intentId: params.intentId,
        // amount/currency omitted — there is no real amount here.
      },
    };
  }

  // ─── handleWebhook ───────────────────────────────────────────────

  async handleWebhook(payload: WebhookPayload, headers: WebhookHeaders): Promise<WebhookResult> {
    // [PENDING: requires real EasyCash API docs]
    //
    // SECURITY-CRITICAL PATH.
    //
    // The real implementation MUST verify the signature header against
    // the rawBody bytes using HMAC with EASYCASH_WEBHOOK_SECRET. None
    // of the following is known right now:
    //
    //   - The signature header name
    //   - The signature algorithm (HMAC-SHA256? RSA? other?)
    //   - Which bytes are signed (entire body? specific field?)
    //   - The timestamp header used for replay defence
    //   - The allowed clock-skew window
    //
    // Until those are known we MUST NOT run this in any environment
    // that takes real money. The stub below validates the parsed shape
    // only — DO NOT trust it in production.

    if (!headers.eventId) {
      throw new BadRequestException('Webhook missing eventId header.');
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(payload.rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Webhook body is not valid JSON.');
    }

    const eventType = typeof body.eventType === 'string' ? body.eventType : headers.eventType;
    const transactionId =
      typeof body.transactionId === 'string' ? body.transactionId : undefined;
    if (!eventType) {
      throw new BadRequestException('Webhook missing eventType (header or body field).');
    }
    if (!transactionId) {
      throw new BadRequestException('Webhook missing transactionId.');
    }

    const statusRaw = typeof body.status === 'string' ? body.status.toUpperCase() : '';
    let status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
    switch (statusRaw) {
      case 'SUCCEEDED':
      case 'PAID':
      case 'CAPTURED':
        status = 'SUCCEEDED';
        break;
      case 'FAILED':
      case 'DECLINED':
      case 'ERROR':
        status = 'FAILED';
        break;
      default:
        status = 'PENDING';
    }

    return {
      eventType,
      gatewayEventId: headers.eventId,
      gatewayTransactionId: transactionId,
      status,
      amount: typeof body.amount === 'number' ? body.amount : 0,
      currency: typeof body.currency === 'string' ? body.currency : 'EGP',
      failureCode: typeof body.failureCode === 'string' ? body.failureCode : undefined,
      failureMessage:
        typeof body.failureMessage === 'string' ? body.failureMessage : undefined,
      rawResponse: body,
    };
  }

  // ─── refund ──────────────────────────────────────────────────────

  async refund(params: RefundParams): Promise<RefundResult> {
    // [PENDING: requires real EasyCash API docs]
    // Real implementation needs:
    //   - POST {baseUrl}/v1/refunds          (URL TBD)
    //   - Body: { payment_id, amount?, reason? }  (field names TBD)
    //   - Response: { refund_id, status, ... }    (field names TBD)
    throw new NotImplementedException(
      `[STUB] EasyCash refund not implemented — pending real API docs. params=${JSON.stringify(params)}`,
    );
  }
}