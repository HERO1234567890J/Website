import type { ReactNode } from 'react';

interface Step {
  num: string;
  label: string;
  description?: string;
  icon: ReactNode;
}

interface StepperProps {
  steps: Step[];
  /** 1-based current step. Steps before it become "done". */
  currentStep: number;
  /** 0–100, controls the width of the sun-yellow fill bar. */
  fillPercent?: number;
  className?: string;
}

/**
 * 4-step horizontal progress used by the build-trip wizard.
 * Visual parity with Website/build-trip.html + child pages.
 */
export function Stepper({ steps, currentStep, fillPercent, className = '' }: StepperProps) {
  const fillStyle = fillPercent !== undefined ? { width: `${fillPercent}%` } : undefined;
  return (
    <div className={`stepper ${className}`.trim()}>
      <div className="stepper-line" />
      <div className="stepper-fill" style={fillStyle} />
      <div className="stepper-row">
        {steps.map((s, i) => {
          const stepNum = i + 1;
          const state = stepNum < currentStep ? 'done' : stepNum === currentStep ? 'active' : '';
          return (
            <div key={i} className={`step ${state}`.trim()}>
              <div className="step-dot">{s.icon}</div>
              <div className="step-num">{s.num}</div>
              <div className="step-label">{s.label}</div>
              {s.description && <p className="step-desc">{s.description}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
