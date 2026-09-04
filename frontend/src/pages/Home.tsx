import { useEffect, useState } from 'react';
import { TripCard } from '@/components/trip/TripCard';
import { Eyebrow } from '@/components/site/Eyebrow';
import { Perf } from '@/components/site/Perf';
import { Reveal } from '@/components/site/Reveal';
import { SEED_IMAGES } from '@/lib/seed-images';
import { listTours } from '@/lib/api/tours';
import {
  formatDuration,
  formatPrice,
  groupTypeLabel,
} from '@/lib/api/format';
import type { TourSummary } from '@/lib/api/types';
import { Link } from 'react-router-dom';

/** Hard cap — the Home grid should never overflow the page. */
const HOME_GRID_LIMIT = 6;

/** Generic ocean fallback when the admin hasn't attached a cover image yet. */
const FALLBACK_COVER = SEED_IMAGES.rasSedr;

/**
 * Home page — visual parity with /Website/index.html.
 *
 * Phase 15B — trip grid is now DB-driven: `GET /api/tours?pageSize=6`.
 * Loading / empty / error states are explicit so the rest of the page
 * (hero, teasers, reviews, FAQs) still renders while we wait on the
 * backend or in offline mode.
 */
export function Home() {
  const [tours, setTours] = useState<TourSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTours({ pageSize: HOME_GRID_LIMIT, sort: 'newest' })
      .then((res) => {
        if (!cancelled) setTours(res.items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="hero-frame">
          <img src={SEED_IMAGES.heroAerial} alt="Aerial view of turquoise coastline" />
          <div className="hero-scrim" aria-hidden />
          <span className="hero-corner l">D-TRIPS / HOME</span>
          <span className="hero-corner r">EST. CAIRO</span>
          <div className="hero-content">
            <Eyebrow>D-Trips Presents</Eyebrow>
            <h1 className="hero-title">
              Bespoke Trips,
              <br />
              Unforgettable Premieres.
            </h1>
            <p className="hero-sub">
              A small team of travel directors who believe the best trips are scouted, cast,
              and directed — never templated.
            </p>
          </div>
          <div className="hero-scroll" aria-hidden>
            <span>Scroll</span>
            <span className="dot" />
          </div>
        </div>
      </div>

      <Perf />

      {/* TRIP GRID */}
      <section className="wrap">
        <div className="row-head reveal">
          <div>
            <Eyebrow>Discover Our Trips</Eyebrow>
            <h2 className="section-title-lg">
              Join a journey already
              <br />
              in motion.
            </h2>
          </div>
          <Link to="/tours" className="see-all">
            See All Tours{' '}
            <svg
              width="14"
              height="14"
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
        </div>
        <div className="trip-grid reveal">
          {tours === null && !error && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading tours…</p>
          )}
          {error && (
            <p role="alert" style={{ color: 'var(--error)', fontSize: 14 }}>
              Could not load tours — please refresh.
            </p>
          )}
          {tours && tours.length === 0 && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
              No published tours yet. Check back soon.
            </p>
          )}
          {tours?.map((t) => (
            <TripCard
              key={t.id}
              tag={t.category.name}
              imageSrc={t.coverImageId ?? FALLBACK_COVER}
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

      <Perf variant="sun" />

      {/* TEASER 1 — Casting Call */}
      <section className="wrap" style={{ paddingTop: 110, paddingBottom: 0 }}>
        <Reveal>
          <div className="teaser-split">
            <div className="teaser-photo">
              <img src={SEED_IMAGES.teaserVan} alt="Van parked on a coastal road, ready for a trip" />
            </div>
            <div className="teaser-copy">
              <Eyebrow>Casting Call</Eyebrow>
              <h3>
                Or write your
                <br />
                own script.
              </h3>
              <p>
                Not feeling any of the scheduled departures? Tell us who's travelling, when, and
                the vibe you're after — we'll storyboard a trip built entirely around you.
              </p>
              <Link to="/build-trip" className="btn-sun" style={{ width: 'fit-content' }}>
                Build My Trip{' '}
                <span className="arrow-dot">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* TEASER 2 — Director */}
      <section className="wrap">
        <Reveal>
          <div className="teaser-split">
            <div className="teaser-copy" style={{ order: 2 }}>
              <Eyebrow>The Director</Eyebrow>
              <h3>
                Every trip we run
                <br />
                has a director.
              </h3>
              <p>
                D-Trips is led by a former film producer who treats every itinerary like a
                production — scouted locations, a cast of local guides, and a pace that knows
                when to linger.
              </p>
              <Link
                to="/about"
                className="btn-sun"
                style={{ width: 'fit-content', background: 'transparent', color: 'var(--ink)' }}
              >
                Our Story{' '}
                <span className="arrow-dot" style={{ background: 'var(--ink)' }}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ stroke: 'var(--sun)' }}
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
            <div className="teaser-photo" style={{ order: 1 }}>
              <img src={SEED_IMAGES.teaserFounder} alt="D-Trips director" />
            </div>
          </div>
        </Reveal>
      </section>

      <Perf />

      {/* REVIEWS */}
      <section className="section-sand">
        <div className="wrap">
          <div className="reviews-head reveal">
            <div className="reviews-stars-big">★★★★★</div>
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              What People Say
            </div>
            <h2 className="section-title-lg" style={{ marginTop: 14 }}>
              Our Reviews
            </h2>
          </div>
          <div className="review-strip reveal">
            <div className="review-card">
              <div className="review-stars">★★★★★</div>
              <p>
                "As a solo traveler I had my doubts — but I felt like home within a day.
                Definitely not my last trip with D-Trips."
              </p>
              <div className="review-name">Sara M.</div>
              <div className="review-when">2 weeks ago</div>
            </div>
            <div className="review-card">
              <div className="review-stars">★★★★★</div>
              <p>
                "Everything was so well organized, and the whole experience was beautiful and
                peaceful from start to finish."
              </p>
              <div className="review-name">Salma K.</div>
              <div className="review-when">1 day ago</div>
            </div>
            <div className="review-card">
              <div className="review-stars">★★★★★</div>
              <p>
                "My guide translated, included me in everything, and made a trip where I knew
                nobody feel like traveling with old friends."
              </p>
              <div className="review-name">Agam R.</div>
              <div className="review-when">1 month ago</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="wrap" id="faqs">
        <div className="row-head reveal">
          <div>
            <Eyebrow>Questions</Eyebrow>
            <h2 className="section-title-lg">
              Frequently Asked
              <br />
              Questions.
            </h2>
          </div>
          <p style={{ maxWidth: 360, fontSize: 14.5, color: 'var(--ink-soft)' }}>
            Questions on booking, payments, or cancellations? Find your answers below, or reach
            out directly.
          </p>
        </div>
        <FaqAccordion
          items={[
            { a: 'D-Trips plans bespoke tours and curated group journeys. Browse scheduled departures, reserve securely, request a fully tailor-made itinerary through Build My Trip, or manage your account — all backed by a real trip director.', q: 'What is D-Trips?', defaultOpen: true },
            { a: 'Choose a trip from the Tours page, select your available date, add traveller details, then complete checkout with the deposit shown on screen. You\'ll get an email confirmation once it\'s booked. For fully custom plans, use Build My Trip instead.', q: 'How do I book a trip?' },
            { a: 'Yes. We hold reservations for up to 48 hours while you finalize your plans — just contact our team to set one up.', q: 'Can I reserve a trip before paying in full?' },
            { a: 'Unless a trip states otherwise: a 50% deposit confirms your booking, with the balance due 30 days before departure. Card payments are processed securely by our certified provider — we never store full card numbers.', q: 'When do I pay, and how are card payments handled?' },
            { a: 'Yes, though your refund depends on timing. Shorter trips are fully refundable 14+ days out and partially refundable at 8–10 days. Longer or international trips are mostly refundable beyond 40 days out. Reach out early if plans change — we\'ll walk you through your options.', q: 'Can I cancel my reservation?' },
          ]}
          className="reveal"
        />
      </section>
    </>
  );
}

// Imported here at the bottom to keep Home() uncluttered.
import { FaqAccordion } from '@/components/ui/FaqAccordion';
