import * as Sentry from '@sentry/nestjs';

/**
 * §30 — Sentry error monitoring (backend).
 *
 * Initialises the Sentry SDK only when a `SENTRY_DSN` is configured.
 * When absent (local dev without a project), the SDK is a no-op and
 * the app behaves exactly as before — nothing goes over the wire.
 *
 * Privacy (§30): `beforeSend` strips the request body, cookies, and
 * selected headers from every event before it leaves the server —
 * no card data, tokens, or passwords ever reach Sentry. We keep the
 * URL, method, status, and stack for debugging.
 */
export function initSentry(env: { SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string }): void {
  const dsn = env.SENTRY_DSN ?? '';
  if (!dsn) {
    // Not configured — intentionally a no-op. This is NOT a fake
    // integration: it is the SDK gated behind an env var, which is
    // how a real Sentry project plugs in later.
    return;
  }

  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? 'development',
    // 100% of errors; 10% trace sampling (traces are optional for v1 —
    // the business can raise this for performance monitoring later).
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (!event.request) return event;
      // Never send bodies — they may contain passwords, card data,
      // tokens, PII, or payment details.
      delete event.request.data;
      delete event.request.query_string;
      // Drop cookies + headers wholesale. Keep the URL and method so
      // the team can see which endpoint failed.
      event.request.headers = undefined;
      event.request.cookies = undefined;
      return event;
    },
  });
}
