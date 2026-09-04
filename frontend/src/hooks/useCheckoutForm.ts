import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createBooking,
  generateIdempotencyKey,
  type BookingResponse,
} from '@/lib/api/bookings';
import { createPaymentIntent, type PaymentIntentResponse } from '@/lib/api/payments';
import { getPricePreview, type PricePreview } from '@/lib/api/tours';
import { ApiError } from '@/lib/api/client';
import { minPhone, validEmail } from '@/lib/validation';

export type CheckoutPaymentMethod = 'card' | 'bank' | 'office';

export interface CheckoutFormValues {
  name: string;
  email: string;
  phone: string;
  notes: string;
  pay: CheckoutPaymentMethod;
}

export interface CheckoutFormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export interface UseCheckoutFormOptions {
  /** Tour slug — used to fetch the price preview and tour detail. */
  slug: string;
  /** Tour UUID — sent to POST /api/bookings. */
  tourId: string;
  /** TourDate UUID — sent to POST /api/bookings. */
  tourDateId: string;
  /** Initial traveler count from URL params. */
  initialTravelers: number;
}

export interface UseCheckoutFormResult {
  values: CheckoutFormValues;
  errors: CheckoutFormErrors;
  isSubmitting: boolean;
  submitError: string | null;

  // §8 — server-computed price preview (NEVER computed client-side)
  price: PricePreview | null;
  priceError: string | null;
  priceLoading: boolean;
  /** Current traveler count — the page can update it (select widget). */
  travelers: number;
  setTravelers: (n: number) => void;

  // §8 — T&C + Privacy consent checkbox state
  consentAccepted: boolean;
  setConsentAccepted: (accepted: boolean) => void;

  // Submission outcome
  booking: BookingResponse | null;
  paymentIntent: PaymentIntentResponse | null;
  /** DT-XXXXXXXX — the human-readable ref shown in the confirm panel. */
  ref: string | null;

  canSubmit: boolean;
  setField: <K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) => void;
  submit: (e?: FormEvent) => Promise<void>;
}

const INITIAL_VALUES: CheckoutFormValues = {
  name: '',
  email: '',
  phone: '',
  notes: '',
  pay: 'card',
};

/**
 * Phase 15D — real checkout wiring.
 *
 * §8 hard rules enforced here:
 *   1. NO client-side price math. `subtotal` / `total` always come
 *      from `GET /api/tours/:slug/price?dateId=&travelers=` — a
 *      server-authoritative preview refreshed whenever the
 *      traveler count changes.
 *   2. T&C + Privacy consent is a HARD requirement before the
 *      submit button activates. The checkbox state sets
 *      `consentAcceptedAt = new Date().toISOString()` on the
 *      Booking row (the server stamps this exact timestamp into
 *      `consentAcceptedAt`, §8 audit trail).
 *
 * Flow:
 *   1. Fetch price preview (server-computed, displayed in OrderSummary).
 *   2. User fills traveler details + ticks consent.
 *   3. POST /api/bookings with Idempotency-Key (UUID) + consent
 *      timestamp. Backend returns the Booking row with authoritative
 *      subtotal/discount/total.
 *   4. If authenticated: POST /api/payments/intent, then redirect to
 *      the gateway's `redirectUrl`. (Phase 10 EasyCash stub returns
 *      a mock URL until the real integration lands.)
 *   5. If a guest (no JWT): skip the intent step. The booking row
 *      sits at PENDING; the confirm panel shows "Sign in to pay" with
 *      a CTA. Payment for guest bookings is a known §28 follow-up
 *      gap (the backend's intent endpoint requires auth today).
 */
export function useCheckoutForm(opts: UseCheckoutFormOptions): UseCheckoutFormResult {
  const { slug, tourId, tourDateId, initialTravelers } = opts;

  const [values, setValues] = useState<CheckoutFormValues>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [travelers, setTravelers] = useState(initialTravelers);

  // §8 — server-computed price preview.
  const [price, setPrice] = useState<PricePreview | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  // Submission outcome
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);

  useEffect(() => {
    if (!tourDateId) {
      setPrice(null);
      setPriceError(null);
      setPriceLoading(false);
      return;
    }
    let cancelled = false;
    setPriceLoading(true);
    setPriceError(null);
    getPricePreview(slug, tourDateId, travelers)
      .then((p) => {
        if (!cancelled) {
          setPrice(p);
          setPriceLoading(false);
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        // 409 = capacity issue; surface inline.
        if (err instanceof ApiError && err.status === 409) {
          setPriceError(err.message);
        } else {
          setPriceError(err.message);
        }
        setPrice(null);
        setPriceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, tourDateId, travelers]);

  const errors = useMemo<CheckoutFormErrors>(() => {
    const e: CheckoutFormErrors = {};
    if (!values.name.trim()) e.name = 'Please tell us your name.';
    if (!validEmail(values.email)) e.email = 'Please enter a valid email.';
    if (!minPhone(values.phone)) e.phone = 'Please enter a phone number.';
    return e;
  }, [values.name, values.email, values.phone]);

  const fieldErrors = Object.keys(errors).length > 0;
  const canSubmit =
    !fieldErrors &&
    consentAccepted &&
    !isSubmitting &&
    !priceLoading &&
    price !== null;

  const setField = useCallback(
    <K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const submit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!canSubmit || !tourId || !tourDateId) return;
      setIsSubmitting(true);
      setSubmitError(null);

      // §8 — capture the consent timestamp at the moment of submit.
      // We send this exact ISO string to the backend; the server
      // stamps it onto the Booking row's `consentAcceptedAt` field
      // for the audit trail.
      const consentAcceptedAt = new Date().toISOString();
      const idempotencyKey = generateIdempotencyKey();

      try {
        const created = await createBooking(
          {
            origin: 'TOUR',
            tourId,
            tourDateId,
            travelerCount: travelers,
            ...(values.notes ? { specialRequests: values.notes } : {}),
            consentAcceptedAt,
            guestName: values.name.trim(),
            guestEmail: values.email.trim(),
            guestPhone: values.phone.trim(),
          },
          idempotencyKey,
        );
        setBooking(created);
        setPaymentIntent(null);

        // §28 / §35 — guest checkout CAN complete payment. The
        // backend's OptionalJwtGuard attaches req.user only when a
        // JWT is present; the service then either checks
        // booking.userId === user.id (registered) or
        // guestEmail === booking.guestEmail (guest). Same code path
        // for both — the ThrottlerModule rate-limits 10/min/IP.
        const intent = await createPaymentIntent(
          created.id,
          `${window.location.origin}/account?ref=${encodeURIComponent(created.id)}`,
          `${window.location.origin}/checkout?cancelled=1`,
          generateIdempotencyKey(),
          // Always send guestEmail as a fallback — the backend
          // ignores it when a JWT user is the booking owner, and
          // requires it when the booking is a guest booking.
          values.email.trim(),
        );
        setPaymentIntent(intent);
        if (intent.redirectUrl) {
          window.location.assign(intent.redirectUrl);
        }
      } catch (err) {
        const msg =
          err instanceof ApiError && err.status >= 500
            ? 'Server error — please try again.'
            : err instanceof Error
              ? err.message
              : 'Could not create your booking.';
        setSubmitError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, tourId, tourDateId, travelers, values],
  );

  const ref = booking ? `DT-${booking.id.slice(0, 8).toUpperCase()}` : null;

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    price,
    priceError,
    priceLoading,
    travelers,
    setTravelers,
    consentAccepted,
    setConsentAccepted,
    booking,
    paymentIntent,
    ref,
    canSubmit,
    setField,
    submit,
  };
}
