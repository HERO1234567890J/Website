import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ConfirmPanel } from '@/components/ui/ConfirmPanel';
import { OrderSummary } from '@/components/booking/OrderSummary';
import { PayOption } from '@/components/booking/PayOption';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { Eyebrow } from '@/components/site/Eyebrow';
import { SEED_IMAGES } from '@/lib/seed-images';
import { formatPrice } from '@/lib/api/format';
import { getTourBySlug } from '@/lib/api/tours';
import { useCheckoutForm, type CheckoutPaymentMethod } from '@/hooks/useCheckoutForm';
import { trackCheckoutStart, trackPurchase } from '@/lib/analytics/analytics';
import type { TourDetail as TourDetailModel } from '@/lib/api/types';

const PAY_OPTIONS: { value: CheckoutPaymentMethod; title: string; subtitle: string; icon: JSX.Element }[] = [
  {
    value: 'card',
    title: 'Credit / Debit Card',
    subtitle: 'Visa, Mastercard — processed securely',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    value: 'bank',
    title: 'Bank Transfer',
    subtitle: "We'll send account details by email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 10l9-6 9 6" />
        <path d="M4 10v9M20 10v9M9 10v9M15 10v9" />
        <path d="M2 21h20" />
      </svg>
    ),
  },
  {
    value: 'office',
    title: 'Pay at Our Office',
    subtitle: 'Cairo & Sinai branches — cash or card',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    ),
  },
];

/**
 * Phase 15D — real checkout wiring.
 *
 * URL params (set by BookingWidget):
 *   slug         tour slug for the price-preview + tour-detail fetch
 *   tourId       Tour UUID — sent to POST /api/bookings
 *   tourDateId   TourDate UUID — sent to POST /api/bookings
 *   travelers    initial traveler count
 *
 * §8 enforced end-to-end:
 *   - The OrderSummary's breakdown is built from the server's
 *     price preview response. We never multiply pricePerPerson
 *     × travelers here.
 *   - The T&C + Privacy consent checkbox is REQUIRED — the submit
 *     button stays disabled until it's ticked. The exact moment
 *     of ticking is captured server-side as `consentAcceptedAt`
 *     (ISO-8601) and stored on the Booking row.
 */
export function Checkout() {
  const [params] = useSearchParams();
  const slug = params.get('slug') ?? '';
  const tourId = params.get('tourId') ?? '';
  const tourDateId = params.get('tourDateId') ?? '';
  const initialTravelers = Math.min(
    20,
    Math.max(1, parseInt(params.get('travelers') ?? '2', 10) || 2),
  );

  const {
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
    canSubmit,
    setField,
    submit,
    ref,
  } = useCheckoutForm({ slug, tourId, tourDateId, initialTravelers });

  // §31 — track checkout_start once on mount; track purchase when the
  // server-confirmed booking renders (fire-and-forget, never in booking logic).
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackCheckoutStart(slug || tourId);
    }
  }, [slug, tourId]);
  useEffect(() => {
    if (ref && price && !checkoutTracked.current) {
      checkoutTracked.current = true;
      trackPurchase(ref, slug || tourId, price.total, travelers);
    }
  }, [ref, price, slug, tourId, travelers]);

  // Fetch the tour detail so we can show the trip name + cover
  // image in the OrderSummary (everything else is from the price
  // preview, not the booking yet).
  const [tour, setTour] = useState<TourDetailModel | null>(null);
  const [tourError, setTourError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    getTourBySlug(slug)
      .then((t) => {
        if (!cancelled) setTour(t);
      })
      .catch((err: Error) => {
        if (!cancelled) setTourError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const tripName = tour?.title ?? 'Your trip';
  const tripImageSrc = tour?.coverImageId ?? SEED_IMAGES.orderRas;

  const lines = useMemo(() => {
    if (!price) return [];
    return [
      {
        label: 'Price per person',
        value: formatPrice(price.pricePerPerson, price.currency),
      },
      { label: 'Travelers', value: String(travelers) },
      {
        label: 'Subtotal',
        value: formatPrice(price.subtotal, price.currency),
        bold: true,
      },
      {
        label: 'Discount',
        value: price.discountAmount > 0
          ? `− ${formatPrice(price.discountAmount, price.currency)}`
          : formatPrice(0, price.currency),
      },
    ];
  }, [price, travelers]);

  const totalValue = price ? formatPrice(price.total, price.currency) : '';

  // ─── confirmation states ─────────────────────────────────────────

  if (booking) {
    // §28 / §35 — guests complete payment in the same flow as
    // registered users. The payment intent has fired (or is about
    // to via the redirectUrl in paymentIntent.redirectUrl). Show
    // the confirm panel with the booking ref + the destination
    // page once the gateway redirects back.
    return (
      <ConfirmPanel
        eyebrow="Booking Confirmed"
        title="You're In the Scene."
        description="Your booking is locked in. Complete payment on the next screen — your seats are held for 15 minutes. Our trip director will email confirmation + payment receipt within 24 hours."
        refLabel={ref ? `Booking Ref: ${ref}` : undefined}
        actions={[
          { label: 'Back to Tours', href: '/tours' },
        ]}
        className="wrap show"
      />
    );
  }

  // ─── main form ───────────────────────────────────────────────────

  return (
    <>
      <section className="wrap" style={{ paddingTop: 56, paddingBottom: 0 }}>
        <Link to={slug ? `/tours/${slug}` : '/tours'} className="bt-back" id="back-link">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Back to Trip
        </Link>
        <Eyebrow>Secure Booking</Eyebrow>
        <h1 style={{ fontFamily: 'var(--script)', fontSize: 'clamp(38px, 5.5vw, 60px)', lineHeight: 1, margin: '14px 0 10px' }}>
          Complete Your Booking
        </h1>
        <p style={{ maxWidth: 520, color: 'var(--ink-soft)', fontSize: 15, marginBottom: 20 }}>
          One last take before we lock your seats. The total below is computed by our server per §8 — the price you see is the price you pay.
        </p>
      </section>

      <section className="wrap" id="checkout-section">
        <div className="checkout-wrap">
          <div>
            <form id="checkout-form" onSubmit={submit} noValidate>
              <div className="co-section">
                <h3><span>1</span>Traveler Details</h3>
                <div className={`co-field ${errors.name ? 'error' : ''}`} id="field-name">
                  <TextField
                    id="co-name"
                    label="Full Name"
                    value={values.name}
                    onChange={(v) => setField('name', v)}
                    autoComplete="name"
                    error={errors.name}
                  />
                </div>
                <div className="co-row">
                  <div className={`co-field ${errors.email ? 'error' : ''}`} id="field-email">
                    <TextField
                      id="co-email"
                      label="Email"
                      type="email"
                      value={values.email}
                      onChange={(v) => setField('email', v)}
                      autoComplete="email"
                      error={errors.email}
                    />
                  </div>
                  <div className={`co-field ${errors.phone ? 'error' : ''}`} id="field-phone">
                    <TextField
                      id="co-phone"
                      label="Phone / WhatsApp"
                      type="tel"
                      value={values.phone}
                      onChange={(v) => setField('phone', v)}
                      autoComplete="tel"
                      error={errors.phone}
                    />
                  </div>
                </div>
              </div>

              <div className="co-section">
                <h3><span>2</span>Travelers</h3>
                <div className="co-row">
                  <div className="co-field">
                    <label htmlFor="co-travelers">Travelers</label>
                    <select
                      id="co-travelers"
                      value={String(travelers)}
                      onChange={(e) => setTravelers(parseInt(e.target.value, 10))}
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} Traveler{n > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <TextAreaField
                  id="co-notes"
                  label="Special Requests (optional)"
                  value={values.notes}
                  onChange={(v) => setField('notes', v)}
                  placeholder="Dietary needs, room preferences, celebrating something special…"
                  rows={4}
                />
              </div>

              <div className="co-section" style={{ marginBottom: 8 }}>
                <h3><span>3</span>Payment Method</h3>
                <div className="pay-options" id="pay-options">
                  {PAY_OPTIONS.map((o) => (
                    <PayOption
                      key={o.value}
                      value={o.value}
                      name="pay"
                      selected={values.pay === o.value}
                      onSelect={() => setField('pay', o.value)}
                      icon={o.icon}
                      title={o.title}
                      subtitle={o.subtitle}
                    />
                  ))}
                </div>
              </div>
            </form>
          </div>

          <aside>
            <OrderSummary
              tripName={tripName}
              tripDate={tour ? tour.dates[0]?.startDate ?? '' : ''}
              tripImageSrc={tripImageSrc}
              tripImageAlt={tripName}
              lines={priceLoading && !price ? [] : lines}
              totalLabel="Total Due"
              totalValue={totalValue}
              ctaLabel={isSubmitting ? 'Sending…' : 'Confirm & Book'}
              ctaDisabled={!canSubmit}
              ctaOnClick={() => {
                if (!canSubmit || isSubmitting) return;
                submit();
              }}
              consentControl={
                <ConsentCheckbox
                  checked={consentAccepted}
                  onChange={setConsentAccepted}
                />
              }
              consentError={
                !consentAccepted && submitError ? 'You must accept the terms to continue.' : undefined
              }
              consentText="By confirming, you agree this is a request — our team follows up to finalize payment and documents."
            />
            {(priceError || tourError || submitError) && (
              <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginTop: 12 }}>
                {priceError ?? tourError ?? submitError}
              </p>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

/** §8 — T&C + Privacy consent checkbox. Required before the CTA enables. */
function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        fontSize: 12.5,
        color: 'var(--ink-soft)',
        lineHeight: 1.5,
        cursor: 'pointer',
        marginTop: 16,
        textAlign: 'left',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, flexShrink: 0 }}
        aria-required="true"
      />
      <span>
        I agree to the{' '}
        <Link to="/terms-conditions" target="_blank" rel="noreferrer">
          Terms &amp; Conditions
        </Link>{' '}
        and{' '}
        <Link to="/privacy-policy" target="_blank" rel="noreferrer">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
