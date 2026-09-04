import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BtAction } from '@/components/build-trip/BtAction';
import { BtContentHead } from '@/components/build-trip/BtContentHead';
import { BtHero } from '@/components/build-trip/BtHero';
import { BtnContinue } from '@/components/build-trip/BtnContinue';
import { Stepper } from '@/components/ui/Stepper';
import { VibeCard } from '@/components/build-trip/VibeCard';
import { SEED_IMAGES } from '@/lib/seed-images';
import { listTripTypePresets } from '@/lib/api/trip-type-presets';
import type { TripTypePreset } from '@/lib/api/types';
import { useBuildTrip } from '@/hooks/useBuildTrip';

const STEP_ICONS = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="1" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5" /></svg>,
];

/**
 * Phase 15B — Build-Trip Scene 1.
 *
 * Presets come from `/api/trip-type-presets` (admin-managed). Until
 * the business seeds the 6 originals (Friends / Family / Honeymoon /
 * Solo / Adventure / University), the grid renders an empty state.
 *
 * Image resolution order:
 *   1. preset.imageId (Bunny Storage or external URL once the
 *      media pipeline lands)
 *   2. slug-keyed SEED_IMAGES.vibe* (preserves the original 6)
 *   3. Generic ocean fallback
 *
 * We store `preset.slug` (not `preset.name`) in the wizard state so
 * the submission in 15C can send the stable identifier the backend
 * expects.
 */
const SLUG_IMAGE_FALLBACK: Record<string, string> = {
  friends: SEED_IMAGES.vibeFriends,
  family: SEED_IMAGES.vibeFamily,
  honeymoon: SEED_IMAGES.vibeHoneymoon,
  solo: SEED_IMAGES.vibeSolo,
  adventure: SEED_IMAGES.vibeAdventure,
  university: SEED_IMAGES.vibeUniversity,
};

const GENERIC_FALLBACK = SEED_IMAGES.heroAerial;

function imageFor(preset: TripTypePreset): string {
  if (preset.imageId) return preset.imageId;
  return SLUG_IMAGE_FALLBACK[preset.slug] ?? GENERIC_FALLBACK;
}

export function BuildTrip() {
  const { state, setVibe, canProceedFromScene1 } = useBuildTrip(1);
  const navigate = useNavigate();
  const [presets, setPresets] = useState<TripTypePreset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTripTypePresets()
      .then((items) => {
        if (!cancelled) setPresets(items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const vibe = state.vibe ?? null;

  function continueTo() {
    if (!vibe) return;
    navigate('/build-trip/destinations');
  }

  return (
    <>
      <BtHero sceneLabel="Scene 1 of 4" title="Direct Your Perfect Escape" />

      <Stepper
        steps={[
          { num: '01', label: 'Trip Type', description: 'Solo, group, or fully bespoke', icon: STEP_ICONS[0] },
          { num: '02', label: 'Destination(s)', description: 'Where the story takes place', icon: STEP_ICONS[1] },
          { num: '03', label: 'Trip Details', description: 'Dates, budget, the finer print', icon: STEP_ICONS[2] },
          { num: '04', label: 'Review', description: "One last look before it's cast", icon: STEP_ICONS[3] },
        ]}
        currentStep={1}
        fillPercent={8.3}
      />

      <section className="wrap" style={{ paddingTop: 0 }}>
        <BtContentHead
          title={
            <>
              Choose the <em>vibe</em> of your journey
            </>
          }
        />

        <div className="vibe-grid reveal">
          {presets === null && !error && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading trip types…</p>
          )}
          {error && (
            <p role="alert" style={{ color: 'var(--error)', fontSize: 14 }}>
              Could not load trip types.
            </p>
          )}
          {presets && presets.length === 0 && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
              No trip types available yet.
            </p>
          )}
          {presets?.map((p) => (
            <VibeCard
              key={p.id}
              dataVibe={p.slug}
              imageSrc={imageFor(p)}
              imageAlt={p.name}
              tag={p.name}
              title={p.name}
              selected={vibe === p.slug}
              onSelect={() => setVibe(p.slug)}
            />
          ))}
        </div>

        <BtAction hint="You can always adjust your selection later.">
          <BtnContinue onClick={continueTo} disabled={!canProceedFromScene1}>
            Continue to Destinations
          </BtnContinue>
        </BtAction>
      </section>
    </>
  );
}
