import type { ReactNode } from 'react';

interface ConfirmAction {
  label: string;
  href?: string;
  /** "outline" renders the secondary-style button (transparent bg, ink text). */
  variant?: 'solid' | 'outline';
  onClick?: () => void;
}

interface ConfirmPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Pre-formatted reference string, e.g. "Booking Ref: DT-483920". */
  refLabel?: string;
  actions: ConfirmAction[];
  className?: string;
  children?: ReactNode;
}

/**
 * Success panel — sun-circle ✓ icon + script title + ref chip + action buttons.
 * Used on build-trip-review (request sent) and checkout (booking confirmed).
 *
 * Visibility is controlled by the parent adding/removing the `.show` class.
 */
export function ConfirmPanel({
  eyebrow,
  title,
  description,
  refLabel,
  actions,
  className = '',
  children,
}: ConfirmPanelProps) {
  return (
    <section className={`confirm-panel ${className}`.trim()}>
      <div className="confirm-icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div className="eyebrow" style={{ justifyContent: 'center' }}>{eyebrow}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="confirm-ref">{refLabel}</div>
      {children}
      <div className="confirm-actions">
        {actions.map((a, i) => {
          const style = a.variant === 'outline' ? { background: 'transparent', color: 'var(--ink)' } : undefined;
          if (a.href) {
            return (
              <a
                key={i}
                href={a.href}
                className="btn-ink"
                style={style}
              >
                {a.label}
              </a>
            );
          }
          return (
            <button key={i} type="button" className="btn-ink" style={style} onClick={a.onClick}>
              {a.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
