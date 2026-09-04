import { useState } from 'react';
import { BtAction } from '@/components/build-trip/BtAction';
import { BtBack } from '@/components/build-trip/BtBack';
import { BtContentHead } from '@/components/build-trip/BtContentHead';
import { BtHero } from '@/components/build-trip/BtHero';
import { BtnContinue } from '@/components/build-trip/BtnContinue';
import { ConfirmPanel } from '@/components/ui/ConfirmPanel';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { useBuildTrip } from '@/hooks/useBuildTrip';
import { submitTripRequest } from '@/lib/api/trip-requests';
import { ApiError } from '@/lib/api/client';
import { validEmail, minPhone } from '@/lib/validation';

const STEP_ICONS = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="1" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5" /></svg>,
];

/**
 * Phase 15C — Scene 4 submission hits the real backend.
 *
 * `state.vibe` is now the TripTypePreset.slug (changed in 15B),
 * which matches the backend's `tripTypePresetSlug` field directly.
 * Destinations are also slugs (from 15B's destinations fetch).
 *
 * The backend returns `{ id, ref }` where `ref` is the
 * human-friendly "DT-XXXXXXXX" string. We render it in the
 * ConfirmPanel; `id` is kept in state for future programmatic
 * use (Phase 9 booking promotion: `/api/bookings` will accept
 * `tripRequestId` to flip the request to a confirmed booking).
 */
export function BuildTripReview() {
  const {
    state,
    setContactName,
    setContactEmail,
    setContactPhone,
    clear,
  } = useBuildTrip(4);
  const [result, setResult] = useState<{ id: string; ref: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = state.name ?? '';
  const email = state.email ?? '';
  const phone = state.phone ?? '';

  const destList = [
    ...(state.destinations ?? []),
    ...(state.otherDestination ? [state.otherDestination] : []),
  ];
  const dates =
    state.dateFrom || state.dateTo
      ? `${state.dateFrom || '?'} → ${state.dateTo || '?'}`
      : 'Flexible';
  const travelers = state.travelers ?? 2;

  const reviewRows: [string, string][] = [
    ['Trip Type', state.vibe ?? '—'],
    ['Destinations', destList.join(', ') || '—'],
    ['Travel Window', dates],
    ['Duration', state.duration ?? 'Flexible'],
    ['Travelers', `${travelers} ${travelers === 1 ? 'person' : 'people'}`],
    ['Budget / Person', state.budget ?? 'Not sure yet'],
  ];
  if (state.notes) reviewRows.push(['Notes', state.notes]);

  const nameError = name.trim().length === 0;
  const emailError = !validEmail(email);
  const phoneError = !minPhone(phone);
  const canSubmit = !nameError && !emailError && !phoneError && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitTripRequest({
        tripTypePresetSlug: state.vibe ?? '',
        destinations: state.destinations ?? [],
        ...(state.otherDestination ? { otherDestination: state.otherDestination } : {}),
        ...(state.dateFrom ? { dateFrom: state.dateFrom } : {}),
        ...(state.dateTo ? { dateTo: state.dateTo } : {}),
        ...(state.duration ? { duration: state.duration } : {}),
        travelers,
        ...(state.budget ? { budget: state.budget } : {}),
        ...(state.notes ? { notes: state.notes } : {}),
        contactName: name.trim(),
        contactEmail: email.trim(),
        contactPhone: phone.trim(),
      });
      clear();
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status >= 500
          ? 'Server error — please try again.'
          : err instanceof Error
            ? err.message
            : 'Could not send your request.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ConfirmPanel
        eyebrow="Request Sent"
        title="Scene Complete."
        description="Your trip request has been cast. Our trip director is already reading through the brief and will reach out on WhatsApp or email within 24 hours to start shaping your itinerary."
        refLabel={`Request Ref: ${result.ref}`}
        actions={[
          { label: 'Browse More Tours', href: '/tours', variant: 'outline' },
          { label: 'Return Home', href: '/' },
        ]}
        className="wrap show"
      />
    );
  }

  return (
    <>
      <BtHero sceneLabel="Scene 4 of 4" title="Direct Your Perfect Escape" />

      <Stepper
        steps={[
          { num: '01', label: 'Trip Type', description: 'Solo, group, or fully bespoke', icon: STEP_ICONS[0] },
          { num: '02', label: 'Destination(s)', description: 'Where the story takes place', icon: STEP_ICONS[1] },
          { num: '03', label: 'Trip Details', description: 'Dates, budget, the finer print', icon: STEP_ICONS[2] },
          { num: '04', label: 'Review', description: "One last look before it's cast", icon: STEP_ICONS[3] },
        ]}
        currentStep={4}
        fillPercent={100}
      />

      <section className="wrap" style={{ paddingTop: 0 }}>
        <BtBack to="/build-trip/details">Back to Trip Details</BtBack>

        <BtContentHead
          title={
            <>
              The <em>final cut</em> — before we call action
            </>
          }
        />

        <div className="review-wrap reveal">
          <div className="review-card">
            {reviewRows.map(([k, v]) => (
              <div key={k} className="review-row">
                <span className="review-key">{k}</span>
                <span className="review-val">{v}</span>
              </div>
            ))}
          </div>

          <div className="bt-content-head" style={{ marginBottom: 34 }}>
            <h2 style={{ fontSize: 24 }}>
              Who should we <em style={{ fontFamily: 'var(--script)', fontStyle: 'normal', color: 'var(--sun-dark)' }}>reach</em>?
            </h2>
          </div>

          <form
            className="contact-form"
            id="contact-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className={`contact-field ${nameError ? 'error' : ''}`} id="field-name">
              <TextField
                id="c-name"
                label="Full Name"
                value={name}
                onChange={setContactName}
                autoComplete="name"
                error={nameError ? 'Please tell us your name.' : undefined}
              />
            </div>
            <div className={`contact-field ${emailError ? 'error' : ''}`} id="field-email">
              <TextField
                id="c-email"
                label="Email"
                type="email"
                value={email}
                onChange={setContactEmail}
                autoComplete="email"
                error={emailError ? 'Please enter a valid email.' : undefined}
              />
            </div>
            <div className={`contact-field ${phoneError ? 'error' : ''}`} id="field-phone">
              <TextField
                id="c-phone"
                label="Phone / WhatsApp"
                type="tel"
                value={phone}
                onChange={setContactPhone}
                autoComplete="tel"
                error={phoneError ? 'Please enter a phone number.' : undefined}
              />
            </div>
            {error && (
              <p
                role="alert"
                style={{ marginTop: 12, color: 'var(--error)', fontSize: 14 }}
              >
                {error}
              </p>
            )}
          </form>
        </div>

        <BtAction hint="Our trip director replies within 24 hours — usually much sooner.">
          <BtnContinue onClick={submit} disabled={!canSubmit}>
            {submitting ? 'Sending…' : 'Send My Trip Request'}
          </BtnContinue>
        </BtAction>
      </section>
    </>
  );
}
