import { useEffect, useMemo, useState } from 'react';
import { TripCard } from '@/components/trip/TripCard';
import { TripFilterTabs } from '@/components/trip/TripFilterTabs';
import { Eyebrow } from '@/components/site/Eyebrow';
import { Perf } from '@/components/site/Perf';
import { SEED_IMAGES } from '@/lib/seed-images';
import { listTours } from '@/lib/api/tours';
import { listCategories } from '@/lib/api/categories';
import {
  formatDuration,
  formatPrice,
  groupTypeLabel,
} from '@/lib/api/format';
import type { Category, TourSummary } from '@/lib/api/types';

/**
 * Phase 15B — DB-driven catalog.
 *
 * - Categories come from `/api/categories` (active, ordered) and
 *   drive the filter pills. The leading "All" pill is always there.
 * - Tours come from `/api/tours?category=<slug>` (server-side
 *   filter, never client-side) and re-fetch when the active filter
 *   changes.
 * - Loading / error / empty states are explicit so the hero still
 *   renders while we wait on the backend.
 */
const FALLBACK_COVER = SEED_IMAGES.rasSedr;

type FilterKey = 'all' | string; // 'all' or a category slug

export function Tours() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [tours, setTours] = useState<TourSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  // ─── fetch categories once ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── fetch tours when the filter changes ────────────────────────
  useEffect(() => {
    let cancelled = false;
    setTours(null);
    const query = filter === 'all' ? { pageSize: 100, sort: 'newest' as const } : { category: filter, pageSize: 100, sort: 'newest' as const };
    listTours(query)
      .then((res) => {
        if (!cancelled) setTours(res.items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  // Build the tabs once categories are loaded.
  const tabs = useMemo(() => {
    const base = [{ key: 'all', label: 'All' }];
    const fromApi = (categories ?? []).map((c) => ({
      key: c.slug,
      label: c.name,
    }));
    return [...base, ...fromApi];
  }, [categories]);

  return (
    <>
      <div className="hero">
        <div className="hero-frame" style={{ minHeight: '62vh' }}>
          <img src={SEED_IMAGES.aboutCappadocia} alt="Hot air balloons rising at sunrise" />
          <div className="hero-scrim" aria-hidden />
          <span className="hero-corner l">D-TRIPS / TOURS</span>
          <span className="hero-corner r">CATALOG</span>
          <div className="hero-content">
            <Eyebrow>Our Tours</Eyebrow>
            <h1 className="hero-title">Bespoke Tours.</h1>
            <p className="hero-sub">
              Our portfolio now spans every continent worth mentioning. Join a group led by a
              real guide, or let us direct the bespoke trip of your dreams.
            </p>
          </div>
          <div className="hero-scroll" aria-hidden>
            <span>Scroll</span>
            <span className="dot" />
          </div>
        </div>
      </div>

      <Perf />

      <section className="wrap">
        <TripFilterTabs
          tabs={tabs}
          activeKey={filter}
          onChange={(k) => setFilter(k as FilterKey)}
          className="reveal"
        />
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
              No tours match this filter yet.
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
    </>
  );
}
