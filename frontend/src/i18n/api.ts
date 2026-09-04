import { api } from '@/lib/api/client';
import type { Currency, Locale } from './types';

/**
 * §25 / §26 — public i18n bootstrap helpers.
 *
 * One fetch each at app mount. The LocaleProvider caches the result
 * in React state; re-fetching on locale change isn't needed (the
 * server only changes these when the admin toggles languages or
 * refreshes rates, both rare).
 */

export function listEnabledLocales(): Promise<Locale[]> {
  return api('/languages');
}

export function listEnabledCurrencies(): Promise<Currency[]> {
  return api('/currencies');
}

/**
 * §25 — resolve the locale the backend will use for a request.
 * Called once at boot to detect the browser's preferred language
 * from `navigator.language`.
 */
export function resolveLocaleFromBrowser(acceptLanguage: string): Promise<{ locale: string }> {
  return api(`/i18n/resolve?accept-language=${encodeURIComponent(acceptLanguage)}`);
}
