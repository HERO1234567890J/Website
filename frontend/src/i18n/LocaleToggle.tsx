import { useLocale } from './LocaleProvider';

/**
 * LocaleToggle — visible pill-style switcher.
 *
 * Shows each enabled locale as a chip. The current locale gets
 * the sun-yellow border + filled text. Clicking any chip flips
 * the document direction immediately (CSS-driven via
 * `<html dir>`) and persists to localStorage.
 */
export function LocaleToggle() {
  const { locale, availableLocales, setLocale } = useLocale();
  if (availableLocales.length < 2) return null;

  return (
    <div
      style={{ display: 'inline-flex', gap: 6 }}
      role="group"
      aria-label="Language"
    >
      {availableLocales.map((l) => {
        const isActive = l.code === locale.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            aria-pressed={isActive}
            title={l.name}
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              border: '1.5px solid',
              borderColor: isActive ? 'var(--sun)' : 'var(--line)',
              background: isActive ? 'var(--sun)' : 'transparent',
              color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
              fontWeight: isActive ? 600 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              lineHeight: 1.2,
            }}
          >
            {l.code === 'ar' ? 'العربية' : l.name}
          </button>
        );
      })}
    </div>
  );
}
