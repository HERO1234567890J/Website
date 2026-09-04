import type { ReactNode } from 'react';

interface BtActionProps {
  /** The CTA button (typically a <BtnContinue>). */
  children: ReactNode;
  /** Small italic hint under the button. */
  hint?: ReactNode;
  className?: string;
}

/**
 * Bottom-of-section wrapper for the wizard: divider + CTA + optional hint.
 */
export function BtAction({ children, hint, className = '' }: BtActionProps) {
  return (
    <div className={`bt-action ${className}`.trim()}>
      <div className="bt-divider" aria-hidden />
      {children}
      {hint && <p className="bt-hint">{hint}</p>}
    </div>
  );
}
