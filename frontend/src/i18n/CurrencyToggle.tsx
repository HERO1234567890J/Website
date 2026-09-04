import { useLocale } from './LocaleProvider';

/**
 * CurrencyToggle — dropdown of enabled display currencies.
 *
 * §26 — EGP stays the charge currency server-side. This toggle
 * just re-renders the visible price labels in the chosen
 * currency using the rate from /api/currencies. The conversion
 * happens in `useLocale().formatPrice`.
 *
 * Hidden if the backend only exposes the base currency.
 */
export function CurrencyToggle() {
  const { displayCurrency, availableCurrencies, setDisplayCurrency } = useLocale();
  if (availableCurrencies.length < 2) return null;

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        color: 'var(--ink-soft)',
      }}
    >
      <span aria-hidden style={{ opacity: 0.7 }}>
        Currency
      </span>
      <select
        value={displayCurrency.code}
        onChange={(e) => setDisplayCurrency(e.target.value)}
        aria-label="Display currency"
        style={{
          padding: '4px 8px',
          borderRadius: 999,
          border: '1.5px solid var(--line)',
          background: 'transparent',
          color: 'var(--ink)',
          fontSize: 12.5,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {availableCurrencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {c.symbol}
          </option>
        ))}
      </select>
    </label>
  );
}
