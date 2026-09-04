import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, formatDateRange } from '@/lib/api/format';
import { useLocale } from '@/i18n';
import type { TourDate } from '@/lib/api/types';

interface BookingWidgetProps {
  /** Server-authoritative per-person price (integer piasters, §8). */
  price: number;
  /** Currency code from the tour row ("EGP" default). */
  currency?: string;
  /** Optional small note shown above the date picker. */
  depositNote?: string;
  /**
   * Future-dated availability rows from the backend. The widget
   * shows formatted date strings but tracks the underlying
   * `TourDate.id` so the checkout URL can carry the UUID the
   * bookings endpoint needs.
   */
  tourDates: TourDate[];
  /** Optional initial date (string from `formatDateRange`). */
  defaultDate?: string;
  defaultTravelers?: number;
  minTravelers?: number;
  maxTravelers?: number;
  /** Tour slug (used in the checkout URL). */
  tourSlug: string;
  /** Tour UUID (used in the bookings POST body). */
  tourId: string;
  /** Base checkout route. */
  baseHref?: string;
  ctaLabel?: string;
  className?: string;
}

/**
 * Sticky booking widget — date select + traveler stepper + CTA.
 *
 * §8 — only the per-person price is displayed here, and it's the
 * value the backend returned from `GET /api/tours/:slug` (the tour's
 * `startingPrice`). The widget NEVER multiplies by traveler count
 * to produce a final total — that's the checkout's job, fetching
 * `GET /api/tours/:slug/price?dateId=&travelers=` which is the
 * single source of truth.
 *
 * URL handed to /checkout carries:
 *   slug, tourId, tourDateId, travelers
 * — enough for the checkout page to fetch its own preview and the
 * tour detail without re-deriving anything client-side.
 */
export function BookingWidget({
  price,
  currency = 'EGP',
  depositNote,
  tourDates,
  defaultDate,
  defaultTravelers = 2,
  minTravelers = 1,
  maxTravelers = 16,
  tourSlug,
  tourId,
  baseHref = '/checkout',
  ctaLabel = 'Book This Trip',
  className = '',
}: BookingWidgetProps) {
  const { dateLocale } = useLocale();
  const dateOptions = tourDates.map((d) => ({
    label: formatTourDateRange(d.startDate, d.endDate, dateLocale),
    id: d.id,
  }));
  const initialDate = defaultDate ?? dateOptions[0]?.label ?? '';
  const [dateLabel, setDateLabel] = useState(initialDate);
  const [travelers, setTravelers] = useState(defaultTravelers);

  // Map the currently-selected label back to its TourDate.id (UUID).
  // We key off the label rather than storing the UUID in state
  // directly — keeps the <select> + state binding trivial.
  const selectedDateId =
    tourDates.find(
      (d) => formatTourDateRange(d.startDate, d.endDate, dateLocale) === dateLabel,
    )?.id ?? '';

  const href =
    `${baseHref}` +
    `?slug=${encodeURIComponent(tourSlug)}` +
    `&tourId=${encodeURIComponent(tourId)}` +
    `&tourDateId=${encodeURIComponent(selectedDateId)}` +
    `&travelers=${travelers}`;

  return (
    <div className={`booking-widget ${className}`.trim()}>
      <div className="bw-price">
        <span className="amt">{formatPrice(price, currency)}</span>
        <span>/ Person</span>
      </div>
      {depositNote && <p className="bw-sub">{depositNote}</p>}

      <div className="bw-field">
        <label htmlFor="bw-date">Departure Date</label>
        <select
          id="bw-date"
          value={dateLabel}
          onChange={(e) => setDateLabel(e.target.value)}
          disabled={dateOptions.length === 0}
        >
          {dateOptions.length === 0 && <option>No dates available</option>}
          {dateOptions.map((opt) => (
            <option key={opt.id} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bw-field">
        <label>Travelers</label>
        <div className="bw-stepper">
          <button
            type="button"
            className="bw-stepper-btn"
            onClick={() => setTravelers((t) => Math.max(minTravelers, t - 1))}
            aria-label="Decrease travelers"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="bw-stepper-count">{travelers}</span>
          <button
            type="button"
            className="bw-stepper-btn"
            onClick={() => setTravelers((t) => Math.min(maxTravelers, t + 1))}
            aria-label="Increase travelers"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <p
        style={{
          fontSize: 13,
          color: 'var(--ink-soft)',
          margin: '4px 0 18px',
          textAlign: 'center',
        }}
      >
        Total confirmed at checkout — calculated server-side per §8.
      </p>

      <Link
        to={href}
        className="bw-cta"
        aria-disabled={dateOptions.length === 0 || !selectedDateId}
        onClick={(e) => {
          if (dateOptions.length === 0 || !selectedDateId) e.preventDefault();
        }}
      >
        {ctaLabel}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>

      <div className="bw-trust">
        <div className="bw-trust-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z" />
          </svg>
          Secure booking, no hidden fees
        </div>
        <div className="bw-trust-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
          Free date changes up to 14 days before
        </div>
        <div className="bw-trust-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <path d="M4 4h16v16H4z" />
            <path d="M4 9h16" />
          </svg>
          Confirmation from our team within 24h
        </div>
      </div>
    </div>
  );
}

// Local thin wrapper around formatDateRange so the widget doesn't
// need to import the locale plumbing directly — useLocale() above
// already handles it.
function formatTourDateRange(startIso: string, endIso: string, locale: string): string {
  return formatDateRange(startIso, endIso, locale);
}
