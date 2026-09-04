import { useEffect, useState } from 'react';
import { readConsent, writeConsent, type ConsentState } from '@/lib/analytics/consent';
import { initAnalytics } from '@/lib/analytics/analytics';

/**
 * §31 — Cookie / tracking consent banner.
 *
 * Shows once on first visit (no stored consent) and gates whether
 * non-essential tracking (GA4) is initialised. Non-blocking: the
 * banner is a fixed overlay that does not halt page rendering.
 */
export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(readConsent);

  // On mount, if consent was previously granted, ensure GA is ready
  // for this session.
  useEffect(() => {
    if (consent === 'granted') initAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nothing to show if the visitor already answered.
  if (consent !== null) return null;

  const accept = () => {
    writeConsent('granted');
    setConsent('granted');
    initAnalytics();
  };

  const decline = () => {
    writeConsent('denied');
    setConsent('denied');
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: '16px 20px',
        fontSize: 13.5,
        lineHeight: 1.5,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
        maxHeight: '100%',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0 }}>
          We use cookies and similar technologies to understand how visitors use our site and to
          improve your experience. Essential functionality (like booking and payment) works without
          them; analytics tracking only runs if you agree.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={accept}
            style={btnStyle(true)}
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={decline}
            style={btnStyle(false)}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    background: primary ? 'var(--sun)' : 'transparent',
    color: primary ? 'var(--ink)' : 'var(--paper)',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.6)',
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 4,
  };
}

export function withConsentGate(
  loadAnalyticsFn: () => void,
): void {
  if (readConsent() === 'granted') loadAnalyticsFn();
}