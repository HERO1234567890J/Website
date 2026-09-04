import type { ReactNode } from 'react';

interface OrderLine {
  label: string;
  value: string;
  /** Bold the value (used for subtotal, total, etc.). */
  bold?: boolean;
}

interface OrderSummaryProps {
  tripName: string;
  tripDate: string;
  tripImageSrc: string;
  tripImageAlt: string;
  lines: OrderLine[];
  totalLabel: string;
  totalValue: string;
  ctaLabel: string;
  /** Render the CTA as a link (preferred when checkout route is known). */
  ctaHref?: string;
  ctaOnClick?: () => void;
  /** Disable the CTA — used to enforce T&C consent + price-ready state. */
  ctaDisabled?: boolean;
  /** Small consent micro-copy shown below the CTA. */
  consentText?: string;
  /** Render a custom consent control (e.g. the §8 T&C checkbox). */
  consentControl?: ReactNode;
  /** Inline error under the consent control (e.g. "accept to continue"). */
  consentError?: string;
  className?: string;
}

/**
 * Sticky order-summary aside used by checkout. Renders the trip thumb
 * + name, a stack of lines (price / travelers / subtotal / discount),
 * a total row, and the confirm CTA.
 *
 * §8 — the caller is responsible for sourcing `lines` and `totalValue`
 * from the backend's price-preview response. This component never
 * multiplies anything itself.
 */
export function OrderSummary({
  tripName,
  tripDate,
  tripImageSrc,
  tripImageAlt,
  lines,
  totalLabel,
  totalValue,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  ctaDisabled,
  consentText,
  consentControl,
  consentError,
  className = '',
}: OrderSummaryProps) {
  const disabled = !!ctaDisabled;
  const CtaInner = (
    <>
      {ctaLabel}
      <span className="arrow-dot" aria-hidden>
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
    </>
  );

  return (
    <div className={`order-summary ${className}`.trim()}>
      <div className="order-trip">
        <img src={tripImageSrc} alt={tripImageAlt} />
        <div>
          <h4>{tripName}</h4>
          <span>{tripDate}</span>
        </div>
      </div>

      {lines.length === 0 ? (
        <div className="order-line">
          <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Calculating total…</span>
        </div>
      ) : (
        lines.map((line, i) => (
          <div key={i} className="order-line">
            <span>{line.label}</span>
            {line.bold ? <b>{line.value}</b> : <span>{line.value}</span>}
          </div>
        ))
      )}

      <div className="order-total">
        <span>{totalLabel}</span>
        <span>{totalValue}</span>
      </div>

      {ctaHref ? (
        <a
          href={disabled ? undefined : ctaHref}
          className="btn-full"
          style={{ marginTop: 22, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
          aria-disabled={disabled}
          onClick={disabled ? undefined : ctaOnClick}
        >
          {CtaInner}
        </a>
      ) : (
        <button
          type="button"
          className="btn-full"
          style={{ marginTop: 22, opacity: disabled ? 0.5 : 1 }}
          onClick={ctaOnClick}
          disabled={disabled}
          aria-busy={disabled ? undefined : false}
        >
          {CtaInner}
        </button>
      )}

      {consentControl}
      {consentError && (
        <p
          role="alert"
          style={{
            fontSize: 12,
            color: 'var(--error)',
            marginTop: 6,
            textAlign: 'left',
            lineHeight: 1.4,
          }}
        >
          {consentError}
        </p>
      )}
      {consentText && !consentControl && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--ink-soft)',
            marginTop: 16,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {consentText}
        </p>
      )}
    </div>
  );
}
