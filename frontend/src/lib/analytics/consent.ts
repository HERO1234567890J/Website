/**
 * §31 — Cookie / tracking consent.
 *
 * Lightweight, non-blocking consent store. The visitor sees the
 * consent banner once and their choice is persisted in localStorage.
 * All non-essential tracking (GA4; and the Sentry performance/trace
 * sampling) is gated behind explicit consent — nothing fires until
 * the visitor opts in.
 *
 * Design notes:
 *   - Uses localStorage (not a cookie) so browsers with third-party
 *     cookie blocking still persist the choice.
 *   - No library, no vendor dependency, ~no bundle cost.
 *   - Consent is a tri-state: `'granted' | 'denied' | null (unknown)`.
 */

const CONSENT_KEY = 'dtrips:analytics-consent';
export type ConsentState = 'granted' | 'denied' | null;

export function readConsent(): ConsentState {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw === 'granted' || raw === 'denied') return raw;
  } catch {
    // localStorage unavailable (private mode / blocked) — default to
    // unknown so we show the banner, never assume consent.
  }
  return null;
}

export function writeConsent(state: 'granted' | 'denied'): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // Best-effort — if storage is blocked we can't persist, but we
    // still apply the choice for the current session in memory.
  }
}

export function hasConsent(): boolean {
  return readConsent() === 'granted';
}
