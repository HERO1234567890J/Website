import { useNavigate } from 'react-router-dom';
import { BtAction } from '@/components/build-trip/BtAction';
import { BtBack } from '@/components/build-trip/BtBack';
import { BtContentHead } from '@/components/build-trip/BtContentHead';
import { BtHero } from '@/components/build-trip/BtHero';
import { BtRecap } from '@/components/build-trip/BtRecap';
import { BtnContinue } from '@/components/build-trip/BtnContinue';
import { ChipOption } from '@/components/ui/ChipOption';
import { Stepper } from '@/components/ui/Stepper';
import { StepperInput } from '@/components/ui/StepperInput';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { useBuildTrip } from '@/hooks/useBuildTrip';

const STEP_ICONS = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="1" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5" /></svg>,
];

const DURATIONS = ['Weekend (2–3 days)', '4–6 days', '1 week', '10+ days'];
const BUDGETS = [
  { label: '< 10K', value: 'Under LE 10,000' },
  { label: '10–20K', value: 'LE 10,000 – 20,000' },
  { label: '20–35K', value: 'LE 20,000 – 35,000' },
  { label: '35K+', value: 'LE 35,000+' },
  { label: 'Not Sure', value: 'Not sure yet' },
];

export function BuildTripDetails() {
  const {
    state,
    setDateFrom,
    setDateTo,
    setDuration,
    setTravelers,
    setBudget,
    setNotes,
  } = useBuildTrip(3);
  const navigate = useNavigate();

  const dateFrom = state.dateFrom ?? '';
  const dateTo = state.dateTo ?? '';
  const duration = state.duration ?? null;
  const travelers = state.travelers ?? 2;
  const budget = state.budget ?? null;
  const notes = state.notes ?? '';

  const destList = [
    ...(state.destinations ?? []),
    ...(state.otherDestination ? [state.otherDestination] : []),
  ];

  function continueTo() {
    navigate('/build-trip/review');
  }

  return (
    <>
      <BtHero sceneLabel="Scene 3 of 4" title="Direct Your Perfect Escape" />

      <Stepper
        steps={[
          { num: '01', label: 'Trip Type', description: 'Solo, group, or fully bespoke', icon: STEP_ICONS[0] },
          { num: '02', label: 'Destination(s)', description: 'Where the story takes place', icon: STEP_ICONS[1] },
          { num: '03', label: 'Trip Details', description: 'Dates, budget, the finer print', icon: STEP_ICONS[2] },
          { num: '04', label: 'Review', description: "One last look before it's cast", icon: STEP_ICONS[3] },
        ]}
        currentStep={3}
        fillPercent={66.6}
      />

      <section className="wrap" style={{ paddingTop: 0 }}>
        <BtBack to="/build-trip/destinations">Back to Destinations</BtBack>
        <BtRecap
          chips={[
            { label: 'Trip type', value: state.vibe ?? '—' },
            { label: 'Destinations', value: destList.join(', ') || '—' },
          ]}
        />
        <BtContentHead
          title={
            <>
              Fill in the <em>finer print</em>
            </>
          }
        />

        <div className="details-form reveal">
          <div className="df-group">
            <span className="df-label">When are you thinking?</span>
            <div className="df-row">
              <TextField id="date-from" label="Earliest departure" type="date" value={dateFrom} onChange={setDateFrom} />
              <TextField id="date-to" label="Latest return" type="date" value={dateTo} onChange={setDateTo} />
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-soft)' }}>
              Not fixed on exact dates yet? Give us a range and we'll work around it.
            </p>
          </div>

          <div className="df-group">
            <span className="df-label">How long is the story?</span>
            <div className="duration-grid" id="duration-grid">
              {DURATIONS.map((d) => (
                <ChipOption key={d} selected={duration === d} onClick={() => setDuration(d)}>
                  {d.replace(/\s*\([^)]+\)/, '')}
                </ChipOption>
              ))}
            </div>
          </div>

          <div className="df-group">
            <span className="df-label">How many travelers?</span>
            <StepperInput value={travelers} onChange={setTravelers} min={1} max={20} />
          </div>

          <div className="df-group">
            <span className="df-label">Budget per person</span>
            <div className="budget-grid" id="budget-grid">
              {BUDGETS.map((b) => (
                <ChipOption key={b.value} selected={budget === b.value} onClick={() => setBudget(b.value)}>
                  {b.label}
                </ChipOption>
              ))}
            </div>
          </div>

          <div className="df-group" style={{ marginBottom: 10 }}>
            <span className="df-label">Anything that sets the scene?</span>
            <TextAreaField
              id="notes"
              label=""
              value={notes}
              onChange={setNotes}
              placeholder="Dietary needs, accessibility, must-see spots, celebrating something special…"
              rows={4}
            />
          </div>
        </div>

        <BtAction>
          <BtnContinue onClick={continueTo}>Continue to Review</BtnContinue>
        </BtAction>
      </section>
    </>
  );
}
