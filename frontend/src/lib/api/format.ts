/**
 * Display formatters for API data.
 *
 * Money: backend stores integer minor units (EGP piasters per §8/§11).
 * `formatPrice(minor, currency)` divides by 100 and renders with the
 * right symbol. For multi-currency display conversion (USD/EUR at
 * user-chosen rates), use the LocaleProvider's `formatPrice` —
 * it's authoritative on the rates and on which currencies are
 * enabled. These helpers stay here for cases that don't have access
 * to the provider context (e.g. module-level formatters).
 */

/** Convert integer piasters → major-unit string for display. */
export function formatPrice(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  const formatted = major.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (currency === 'EGP') return `LE ${formatted}`;
  return `${currency} ${formatted}`;
}

/** "4 days" / "1 day" — used in TripCard where the source page had no real date. */
export function formatDuration(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

/** Group size label — derived from `durationDays` until the backend adds a real field. */
export function groupTypeLabel(days: number): string {
  return days === 1 ? 'Day Trip' : 'Group Trip';
}

/**
 * "23 – 26 Jul, 2026" — locale-aware (Phase 15F).
 *
 * `locale` is a BCP-47 tag — pass the active `dateLocale` from
 * `useLocale()` (e.g. 'ar-EG' for Arabic, 'en-US' for English). The
 * hardcoded 'en-US' default exists so module-level call sites that
 * don't have a Provider handy still work; consumers that have a
 * locale in scope should pass it explicitly.
 */
export function formatTourDate(iso: string, locale: string = 'en-US'): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "23 – 26 Jul, 2026" — for the booking-widget select options. */
export function formatDateRange(startIso: string, endIso: string, locale: string = 'en-US'): string {
  return `${formatTourDate(startIso, locale)} – ${formatTourDate(endIso, locale)}`;
}
