/**
 * §11 — PaymentService interface.
 *
 * Single seam between the booking flow and the payment gateway. The
 * NestJS DI container binds the EasyCash implementation to this
 * token at the module level; if/when a second gateway is needed,
 * add it as another `useClass` provider behind the same token.
 *
 * Every method returns a value or throws. Network errors from the
 * gateway MUST surface as exceptions — never as silent success
 * (the webhook remains the source of truth per §11).
 *
 * Mocked (EasyCash) implementation lives in
 * `./easycash-payment.service.ts`. Real wire-up lands when the
 * business supplies the actual EasyCash documentation; nothing in
 * this interface or its callers needs to change.
 */

export const PAYMENT_SERVICE = Symbol('PaymentService');

// ─── createPaymentIntent ─────────────────────────────────────────

export interface CreatePaymentIntentParams {
  /** D-Trips Booking.id (owning entity). */
  bookingId: string;
  /** EGP piasters — authoritative, NEVER derived from client input. */
  amount: number;
  /** Always "EGP" for v1 — payment always settles in EGP per §26. */
  currency: 'EGP';
  /** Customer-facing URL the gateway redirects to on success. */
  returnUrl: string;
  /** Customer-facing URL on cancel / abandon. */
  cancelUrl: string;
  /** Free-form metadata echoed back in webhook payloads. */
  metadata?: Record<string, unknown>;
  /**
   * §11-style idempotency — caller-supplied UUID. Same key on retry
   * returns the existing Payment row instead of creating a duplicate.
   * The PaymentService implementation MUST persist this key on the
   * Payment row so the controller can enforce uniqueness at the DB.
   */
  idempotencyKey: string;
}

export interface PaymentIntent {
  /** Gateway's ID for this intent — used to look up the intent later. */
  intentId: string;
  /** URL to redirect the customer to (EasyCash-hosted payment page). */
  redirectUrl: string;
  /** When the intent expires (gateway may reject after this). */
  expiresAt?: Date;
  /**
   * Raw provider response — kept on Payment.gatewayResponse for
   * forensics. Must NOT contain card data or bearer tokens.
   */
  providerResponse: unknown;
}

// ─── verifyPayment ───────────────────────────────────────────────

export interface VerifyPaymentParams {
  /** Gateway's intent ID (returned by createPaymentIntent). */
  intentId: string;
}

export interface PaymentVerificationResult {
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  /** Gateway's transaction ID once settled. Null if still pending. */
  gatewayTransactionId: string;
  /** Raw provider response. */
  providerResponse: unknown;
}

// ─── handleWebhook ───────────────────────────────────────────────

/**
 * Headers from the gateway's webhook POST. Field names are opaque
 * placeholders — the real EasyCash header schema arrives with the
 * real API docs.
 */
export interface WebhookHeaders {
  /** Header carrying the signature (real name TBD). */
  signature?: string;
  /** Header carrying the unique event ID (real name TBD). */
  eventId?: string;
  /** Header carrying the event type (real name TBD). */
  eventType?: string;
  /** Header carrying the timestamp (real name TBD). */
  timestamp?: string;
  [header: string]: string | undefined;
}

export interface WebhookPayload {
  /**
   * Raw request bytes — REQUIRED for signature verification.
   * The real gateway signs the raw body, not a re-serialised JSON
   * tree; this is what the gateway implementation HMACs against.
   */
  rawBody: Buffer;
}

export interface WebhookResult {
  eventType: string;
  gatewayEventId: string;
  gatewayTransactionId: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  failureCode?: string;
  failureMessage?: string;
  /** Raw provider payload — stored on PaymentEvent. */
  rawResponse: unknown;
}

// ─── refund ──────────────────────────────────────────────────────

export interface RefundParams {
  paymentId: string;
  /** EGP piasters. Omit for a full refund. */
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  providerResponse: unknown;
}

// ─── interface ──────────────────────────────────────────────────

export interface PaymentService {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  handleWebhook(payload: WebhookPayload, headers: WebhookHeaders): Promise<WebhookResult>;
  refund(params: RefundParams): Promise<RefundResult>;
}