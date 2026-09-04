import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BtAction } from '@/components/build-trip/BtAction';
import { BtBack } from '@/components/build-trip/BtBack';
import { BtContentHead } from '@/components/build-trip/BtContentHead';
import { BtHero } from '@/components/build-trip/BtHero';
import { BtRecap } from '@/components/build-trip/BtRecap';
import { BtnContinue } from '@/components/build-trip/BtnContinue';
import { DestinationCard } from '@/components/build-trip/DestinationCard';
import { Stepper } from '@/components/ui/Stepper';
import { SEED_IMAGES } from '@/lib/seed-images';
import { listDestinations } from '@/lib/api/destinations';
import type { Destination } from '@/lib/api/types';
import { useBuildTrip } from '@/hooks/useBuildTrip';

const STEP_ICONS = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="1" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5" /></svg>,
];

/**
 * Phase 15B — Build-Trip Scene 2.
 *
 * Destinations come from `/api/destinations`. We persist `slug` in
 * the wizard state (was the human-readable name before) so the
 * Scene 4 submission in 15C can hand stable identifiers to the
 * backend.
 *
 * Destination has no image field yet — fall back to a slug-keyed
 * SEED_IMAGES.dest* so the original 8 destinations keep their
 * photography until the media pipeline ships.
 */
const SLUG_IMAGE_FALLBACK: Record<string, string> = {
  'dahab-egypt': SEED_IMAGES.destDahab,
  'el-gouna-egypt': SEED_IMAGES.destElGouna,
  'marsa-alam-egypt': SEED_IMAGES.destMarsaAlam,
  'ras-mohammed-egypt': SEED_IMAGES.destRas,
  'turkiye': SEED_IMAGES.destTurkiye,
  'greece': SEED_IMAGES.destGreece,
  'zanzibar-tanzania': SEED_IMAGES.destZanzibar,
  'vietnam': SEED_IMAGES.destVietnam,
};

const GENERIC_FALLBACK = SEED_IMAGES.rasSedr;

function imageFor(d: Destination): string {
  return SLUG_IMAGE_FALLBACK[d.slug] ?? GENERIC_FALLBACK;
}

export function BuildTripDestinations() {
  const {
    state,
    toggleDestination,
    isDestinationSelected,
    setOtherDestination,
    canProceedFromScene2,
  } = useBuildTrip(2);
  const navigate = useNavigate();
  const other = state.otherDestination ?? '';

  const [destinations, setDestinations] = useState<Destination[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDestinations()
      .then((items) => {
        if (!cancelled) setDestinations(items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function continueTo() {
    if (!canProceedFromScene2) return;
    navigate('/build-trip/details');
  }

  return (
    <>
      <BtHero sceneLabel="Scene 2 of 4" title="Direct Your Perfect Escape" />

      <Stepper
        steps={[
          { num: '01', label: 'Trip Type', description: 'Solo, group, or fully bespoke', icon: STEP_ICONS[0] },
          { num: '02', label: 'Destination(s)', description: 'Where the story takes place', icon: STEP_ICONS[1] },
          { num: '03', label: 'Trip Details', description: 'Dates, budget, the finer print', icon: STEP_ICONS[2] },
          { num: '04', label: 'Review', description: "One last look before it's cast", icon: STEP_ICONS[3] },
        ]}
        currentStep={2}
        fillPercent={33.3}
      />

      <section className="wrap" style={{ paddingTop: 0 }}>
        <BtBack to="/build-trip">Back to Trip Type</BtBack>
        <BtRecap chips={[{ label: 'Trip type', value: state.vibe ?? '—' }]} />
        <BtContentHead
          title={
            <>
              Where does the <em>story</em> unfold?
            </>
          }
          subtitle="Pick as many destinations as you like — we'll help you thread them into one itinerary."
        />

        <div className="dest-grid reveal" id="dest-grid">
          {destinations === null && !error && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading destinations…</p>
          )}
          {error && (
            <p role="alert" style={{ color: 'var(--error)', fontSize: 14 }}>
              Could not load destinations.
            </p>
          )}
          {destinations && destinations.length === 0 && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
              No destinations available yet.
            </p>
          )}
          {destinations?.map((d) => (
            <DestinationCard
              key={d.id}
              dataDest={d.slug}
              imageSrc={imageFor(d)}
              imageAlt={d.name}
              tag="Destination"
              title={d.name}
              selected={isDestinationSelected(d.slug)}
              onSelect={() => toggleDestination(d.slug)}
            />
          ))}
        </div>

        <div className="dest-other reveal">
          <label htmlFor="dest-other-input">Somewhere else in mind?</label>
          <input
            type="text"
            id="dest-other-input"
            placeholder="Type a destination we haven't listed…"
            value={other}
            onChange={(e) => setOtherDestination(e.target.value)}
          />
        </div>

        <BtAction hint="You can always adjust your selection later.">
          <BtnContinue
            onClick={continueTo}
            disabled={!canProceedFromScene2}
          >
            Continue to Trip Details
          </BtnContinue>
        </BtAction>
      </section>
    </>
  );
}
