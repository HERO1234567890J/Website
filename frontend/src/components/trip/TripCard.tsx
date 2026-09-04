import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { TripStatus } from '@/types';

interface TripCardProps {
  tag: string;
  imageSrc: string;
  imageAlt: string;
  location: string;
  date: string;
  groupType: string;
  price: string;
  priceSub?: string;
  href: string;
  /** Optional status pill (upcoming/pending/completed) — account + dash use this. */
  status?: TripStatus;
  /** Override the default "Discover Trip" CTA label. */
  ctaLabel?: string;
  /** Extra class for grid placement etc. */
  className?: string;
}

const STATUS_LABEL: Record<TripStatus, string> = {
  upcoming: 'Upcoming',
  pending: 'Request Sent',
  completed: 'Completed',
};

/**
 * Trip card — used on home, tours, tour-detail, account, dashboard.
 * Optional `status` overlay shows a StatusBadge in the top-right corner.
 */
export function TripCard({
  tag,
  imageSrc,
  imageAlt,
  location,
  date,
  groupType,
  price,
  priceSub = 'Per Person',
  href,
  status,
  ctaLabel = 'Discover Trip',
  className = '',
}: TripCardProps) {
  return (
    <div className={`trip-card ${className}`.trim()}>
      <div className="trip-photo">
        <span className="trip-tag">{tag}</span>
        {status && <StatusBadge status={status}>{STATUS_LABEL[status]}</StatusBadge>}
        <img src={imageSrc} alt={imageAlt} loading="lazy" />
      </div>
      <div className="trip-body">
        <div className="trip-loc">
          <span className="ic" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          {location}
        </div>
        <div className="trip-meta">
          <span>
            <span className="ic" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
            </span>
            {date}
          </span>
          <span>
            <span className="ic" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="8" r="3" />
                <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
                <circle cx="18" cy="9" r="2.2" />
                <path d="M15.5 13.2c2.9.3 5.1 2.8 5.5 6.3" />
              </svg>
            </span>
            {groupType}
          </span>
        </div>
        <div className="trip-foot">
          <div className="trip-price">
            {price}
            <span>{priceSub}</span>
          </div>
          <Link to={href} className="trip-link">
            {ctaLabel}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
