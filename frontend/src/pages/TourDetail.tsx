import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { Eyebrow } from '@/components/site/Eyebrow';
import { Perf } from '@/components/site/Perf';
import { TripCard } from '@/components/trip/TripCard';
import { SEED_IMAGES } from '@/lib/seed-images';
import { getAvailability, getTourBySlug, listTours } from '@/lib/api/tours';
import {
  formatDuration,
  formatPrice,
  groupTypeLabel,
} from '@/lib/api/format';
import type { TourDate, TourDetail as TourDetailModel, TourSummary } from '@/lib/api/types';

const FALLBACK_HERO = SEED_IMAGES.heroAerial;

/**
 * Phase 15B — DB-driven tour detail.
 *
 * On mount we fire the tour detail + availability in parallel. The
 * tour detail's `dates` field is filtered to "future + remainingCapacity
 * > 0" by the backend (§9), so the booking widget can render its
 * date options straight from the same payload — we keep the
 * separate /availability call wired for refresh on demand.
 *
 * Related tours ("More Journeys") are fetched after the detail
 * resolves, filtered to the same category and excluding the
 * current slug.
 */

interface ItineraryDay {
  day: string;
  title: string;
  body: string;
}

function isItineraryDay(x: unknown): x is ItineraryDay {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as ItineraryDay).day === 'string' &&
    typeof (x as ItineraryDay).title === 'string' &&
    typeof (x as ItineraryDay).body === 'string'
  );
}

function asItinerary(value: unknown): ItineraryDay[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isItineraryDay);
}

export function TourDetail() {
  const { slug } = useParams<{ slug: string }>();

  const [tour, setTour] = useState<TourDetailModel | null | 'loading' | 'notfound'>('loading');
  const [dates, setDates] = useState<TourDate[]>([]);
  const [related, setRelated] = useState<TourSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ─── load the tour + availability in parallel ────────────────────
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setTour('loading');
    setError(null);
    Promise.all([getTourBySlug(slug), getAvailability(slug).catch(() => [])])
      .then(([detail, availability]) => {
        if (cancelled) return;
        setTour(detail);
        setDates(availability);
      })
      .catch((err: Error & { status?: number }) => {
        if (cancelled) return;
        if (err.status === 404) {
          setTour('notfound');
          return;
        }
        setError(err.message);
        setTour(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ─── load related tours (same category, exclude current) ─────────
  useEffect(() => {
    if (!tour || tour === 'loading' || tour === 'notfound') return;
    let cancelled = false;
    listTours({ category: tour.category.slug, pageSize: 4 })
      .then((res) => {
        if (!cancelled) {
          setRelated(res.items.filter((t) => t.slug !== tour.slug).slice(0, 3));
        }
      })
      .catch(() => {
        // Non-critical — section just hides.
      });
    return () => {
      cancelled = true;
    };
  }, [tour]);

  // ─── loading state ──────────────────────────────────────────────
  if (tour === 'loading') {
    return (
      <section className="wrap" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <p style={{ color: 'var(--ink-soft)' }}>Loading tour…</p>
      </section>
    );
  }

  // ─── not found ───────────────────────────────────────────────────
  if (tour === 'notfound') {
    return (
      <section className="wrap" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <Eyebrow>404</Eyebrow>
        <h1 className="section-title-lg" style={{ marginTop: 14 }}>
          We couldn't find that trip.
        </h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 16 }}>
          It may have been unpublished. <a href="/tours">See all tours →</a>
        </p>
      </section>
    );
  }

  // ─── error (not 404) ─────────────────────────────────────────────
  if (!tour) {
    return (
      <section className="wrap" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <p role="alert" style={{ color: 'var(--error)' }}>
          {error ?? 'Could not load this tour.'}
        </p>
      </section>
    );
  }

  const heroImg = tour.coverImageId ?? tour.images[0]?.src ?? FALLBACK_HERO;
  const location = tour.destination?.name ?? '';
  const itinerary = asItinerary(tour.itinerary);

  return (
    <>
      <div className="hero">
        <div className="hero-frame" style={{ minHeight: '64vh' }}>
          <img src={heroImg} alt={tour.title} />
          <div className="hero-scrim" aria-hidden />
          <span className="hero-corner l">D-TRIPS / TOURS</span>
          <span className="hero-corner r">{tour.category.name.toUpperCase()}</span>
          <div className="hero-content">
            <Eyebrow>Featured Journey</Eyebrow>
            <h1 className="hero-title">{tour.title}</h1>
            <p className="hero-sub">{tour.shortDescription}</p>
          </div>
          <div className="hero-scroll" aria-hidden>
            <span>Scroll</span>
            <span className="dot" />
          </div>
        </div>
      </div>

      <Perf />

      <section className="wrap">
        <div className="td-wrap">
          <div>
            <div className="td-eyebrow-row reveal">
              <Eyebrow>The Journey</Eyebrow>
              <a href="/tours" className="bt-back" style={{ margin: 0 }}>
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
                All Tours
              </a>
            </div>
            <h2 className="td-loc reveal">{tour.title}</h2>
            <div className="td-meta-row reveal">
              <span className="td-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.5 2" />
                </svg>
                {formatDuration(tour.durationDays)}
              </span>
              <span className="td-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
                  <circle cx="18" cy="9" r="2.2" />
                  <path d="M15.5 13.2c2.9.3 5.1 2.8 5.5 6.3" />
                </svg>
                {groupTypeLabel(tour.durationDays)}
              </span>
              {location && (
                <span className="td-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {location}
                </span>
              )}
            </div>

            <div className="td-block reveal">
              <h2>Overview</h2>
              <p>{tour.description}</p>
            </div>

            {tour.included.length > 0 && (
              <div className="td-block reveal">
                <h2>Highlights</h2>
                <div className="highlight-grid">
                  {tour.included.slice(0, 6).map((h) => (
                    <div key={h} className="highlight-item">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {itinerary.length > 0 && (
              <div className="td-block reveal">
                <h2>The Itinerary</h2>
                <div className="itin-list">
                  {itinerary.map((d) => (
                    <div key={d.day} className="itin-day">
                      <div className="itin-day-label">{d.day}</div>
                      <h4>{d.title}</h4>
                      <p>{d.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(tour.included.length > 0 || tour.excluded.length > 0) && (
              <div className="td-block reveal">
                <h2>What's Included</h2>
                <div className="incl-grid">
                  {tour.included.length > 0 && (
                    <div className="incl-col yes">
                      <h4>Included</h4>
                      <ul>
                        {tour.included.map((i) => (
                          <li key={i}>
                            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {i}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excluded.length > 0 && (
                    <div className="incl-col no">
                      <h4>Not Included</h4>
                      <ul>
                        {tour.excluded.map((i) => (
                          <li key={i}>
                            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                            {i}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tour.images.length > 0 && (
              <div className="td-block reveal" style={{ marginBottom: 0 }}>
                <h2>Gallery</h2>
                <div className="td-gallery">
                  {tour.images.slice(0, 6).map((img) => (
                    <a key={img.id} href="#">
                      <img src={img.src} alt={img.alt ?? tour.title} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="reveal">
            <BookingWidget
              price={tour.startingPrice}
              currency={tour.currency}
              tourDates={dates}
              tourSlug={tour.slug}
              tourId={tour.id}
              depositNote="Deposit secures your seat."
            />
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="wrap" style={{ paddingTop: 0 }}>
          <div className="gallery-head reveal">
            <div>
              <Eyebrow>More Journeys</Eyebrow>
              <h2 className="section-title">
                You might also <em style={{ fontFamily: 'var(--script)', color: 'var(--sun-dark)' }}>direct</em>
              </h2>
            </div>
            <a href="/tours" className="trip-link" style={{ textDecoration: 'none' }}>
              See All Tours{' '}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
          <div className="trip-grid reveal">
            {related.map((t) => (
              <TripCard
                key={t.id}
                tag={t.category.name}
                imageSrc={t.coverImageId ?? FALLBACK_HERO}
                imageAlt={t.title}
                location={t.destination?.name ?? t.title}
                date={formatDuration(t.durationDays)}
                groupType={groupTypeLabel(t.durationDays)}
                price={formatPrice(t.startingPrice, t.currency)}
                href={`/tours/${t.slug}`}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
