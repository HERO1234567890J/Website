/**
 * §31 — Google Analytics 4 tracking (isolated service).
 *
 * A thin wrapper around the gtag() global. The ONLY rule here:
 * tracking never sits inside booking/payment business logic — a GA
 * failure or an ad-blocker can never affect a real transaction.
 *
 * Behaviour:
 *   - No-ops entirely unless BOTH `VITE_GA_MEASUREMENT_ID` is set AND
 *     the visitor has granted cookie consent (§31).
 *   - Loads the gtag script lazily on first use (after consent), so
 *     nothing ships to the browser unless the visitor opted in.
 *   - Every callback below is a fire-and-forget: errors never throw.
 *
 * Events tracked per §31: page_view, tour detail view, build-trip
 * wizard stages, checkout_start, and confirmed booking (purchase).
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID ?? '';
import { hasConsent } from './consent';

// Keep a single script injection guard so we never double-load.
let injected = false;

/** gtag global — typed loosely since GA may not be loaded. */
type GtagFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

function enqueue(...args: unknown[]): void {
  const gtag = window.gtag;
  if (typeof gtag === 'function') {
    gtag(...args);
  } else {
    // Script not injected yet — buffer until it loads.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  }
}

/** Inject the gtag bootstrap script (idempotent). Called on consent. */
export function initAnalytics(): void {
  if (!MEASUREMENT_ID) return;
  if (!hasConsent()) return;
  if (injected) return;
  injected = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

/** Track a page view (call on route change). */
export function trackPageView(path: string): void {
  if (!MEASUREMENT_ID || !hasConsent()) return;
  enqueue('event', 'page_view', { page_path: path });
}

/** Track a tour detail view. */
export function trackTourDetail(slug: string, title: string): void {
  if (!MEASUREMENT_ID || !hasConsent()) return;
  enqueue('event', 'view_item', {
    items: [{ item_id: slug, item_name: title, item_category: 'tour' }],
  });
}

/** Track a build-trip wizard step completion. */
export function trackWizardStep(step: number, label: string): void {
  if (!MEASUREMENT_ID || !hasConsent()) return;
  enqueue('event', 'build_trip_step', { step_number: step, step_name: label });
}

/** Track checkout start (not completion). */
export function trackCheckoutStart(tripId?: string, value?: number): void {
  if (!MEASUREMENT_ID || !hasConsent()) return;
  enqueue('event', 'begin_checkout', {
    ...(tripId ? { currency: 'EGP', value, items: itemFor(tripId) } : undefined),
  });
}

/**
 * Track a confirmed booking as a purchase/conversion event.
 *
 * Must be called from a UI success view, NOT from inside booking or
 * payment logic — the conversion is derived from server-confirmed
 * data, and a tracking failure must never affect the booking.
 */
export function trackPurchase(bookingRef: string, tripId: string, value: number, quantity: number): void {
  if (!MEASUREMENT_ID || !hasConsent()) return;
  enqueue('event', 'purchase', {
    currency: 'EGP',
    transaction_id: bookingRef,
    value,
    items: [{ ...itemFor(tripId), quantity }],
  });
}

function itemFor(id: string): Record<string, string | number> {
  return { item_id: id, item_name: id };
}