import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { listEnabledCurrencies, listEnabledLocales } from './api';
import type { Currency, DateLocale, Locale } from './types';

/**
 * Phase 15F — LocaleProvider.
 *
 * Holds two pieces of state site-wide:
 *   - `locale`  — active content language ('en' / 'ar' / future).
 *                 Persisted to localStorage so reloads preserve the
 *                 choice. Initial value: stored → browser preference
 *                 → default-locale from the backend → 'en' fallback.
 *   - `displayCurrency` — display-only currency. The server still
 *                         charges in EGP per §8/§26; the toggle just
 *                         re-renders prices in the chosen currency
 *                         using the rate from /api/currencies.
 *
 * Side effects:
 *   - Sets `<html lang={locale.code}>` and
 *     `<html dir={locale.isRtl ? 'rtl' : 'ltr'}>` on every locale
 *     change so the CSS layout mirrors naturally (§25 hard rule).
 *   - Adds/removes `dir="rtl"` on `<html>` (the `dir` attribute is
 *     the same as the lang attribute but on a different element; CSS
 *     uses `[dir="rtl"]` selectors).
 *
 * §25 — RTL must mirror the WHOLE layout, not just flip text
 * direction. The CSS block in `styles/globals.css` keyed on
 * `[dir="rtl"]` handles inline-style + asymmetric-property cases
 * (margin-left/right, padding-left/right, left/right, float,
 * transform, etc.) that don't auto-mirror. Flex + Grid layouts
 * flip natively because the document direction flipped.
 *
 * The toggle components (`LocaleToggle`, `CurrencyToggle`) read
 * from this context — no prop drilling.
 */

const LS_LOCALE = 'dtrips.locale';
const LS_CURRENCY = 'dtrips.displayCurrency';

interface LocaleContextValue {
  /** Current locale (code + direction + name). */
  locale: Locale;
  /** All enabled locales for the toggle. */
  availableLocales: Locale[];
  /** True if the current locale is RTL. */
  isRtl: boolean;
  /** Switch the active locale. Persists to localStorage. */
  setLocale: (code: string) => void;
  /** Date locale for Intl formatters (BCP-47). */
  dateLocale: DateLocale;

  /** Enabled display currencies for the toggle. */
  availableCurrencies: Currency[];
  /** Currently-selected display currency. */
  displayCurrency: Currency;
  /** Switch the display currency. Persists to localStorage. */
  setDisplayCurrency: (code: string) => void;

  /**
   * §8 / §26 — convert an EGP minor-units amount into the chosen
   * display currency's major units, formatted with the right symbol.
   * INFROMATIONAL ONLY — the server charges in EGP regardless.
   *
   * `amountEgpMinor` is the canonical value from the backend
   * (e.g. `booking.startingPrice` from /api/tours, or `booking.total`
   * from /api/bookings). `currencyCode` defaults to the active
   * display currency.
   */
  formatPrice: (amountEgpMinor: number, currencyCode?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(LS_LOCALE) : null;
  } catch {
    return null;
  }
}

function readStoredCurrency(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(LS_CURRENCY) : null;
  } catch {
    return null;
  }
}

function bestBrowserLocale(available: Locale[]): string {
  if (typeof navigator === 'undefined') return available.find((l) => l.isDefault)?.code ?? 'en';
  const tags = (navigator.languages ?? [navigator.language]).map((t) => t.toLowerCase().split(';')[0].trim());
  for (const tag of tags) {
    const exact = tag.split('-')[0];
    if (available.some((l) => l.code === exact)) return exact;
  }
  return available.find((l) => l.isDefault)?.code ?? 'en';
}

function applyDocumentDirection(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale.code;
  document.documentElement.dir = locale.isRtl ? 'rtl' : 'ltr';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [availableLocales, setAvailableLocales] = useState<Locale[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [localeCode, setLocaleCodeState] = useState<string | null>(readStoredLocale);
  const [currencyCode, setCurrencyCodeState] = useState<string | null>(readStoredCurrency);
  const [ready, setReady] = useState(false);

  // ─── bootstrap ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.all([listEnabledLocales(), listEnabledCurrencies()])
      .then(([locales, currencies]) => {
        if (cancelled) return;
        setAvailableLocales(locales);
        setAvailableCurrencies(currencies);

        // Locale: stored → browser → default → 'en'
        const stored = readStoredLocale();
        const initialLocale =
          (stored && locales.some((l) => l.code === stored) && stored) ||
          bestBrowserLocale(locales);
        setLocaleCodeState(initialLocale);

        // Currency: stored → base (EGP) if stored missing
        const storedCur = readStoredCurrency();
        const initialCurrency =
          (storedCur && currencies.some((c) => c.code === storedCur) && storedCur) ||
          currencies.find((c) => c.isBase)?.code ||
          currencies[0]?.code ||
          'EGP';
        setCurrencyCodeState(initialCurrency);

        setReady(true);
      })
      .catch(() => {
        // Network failure → fall back to 'en' so the page still renders.
        if (cancelled) return;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── side effects on locale change ─────────────────────────────
  const locale = useMemo<Locale>(() => {
    const found = availableLocales.find((l) => l.code === localeCode);
    return (
      found ?? {
        code: localeCode ?? 'en',
        name: localeCode ?? 'English',
        isRtl: false,
        isDefault: true,
      }
    );
  }, [availableLocales, localeCode]);

  useEffect(() => {
    if (!ready) return;
    applyDocumentDirection(locale);
    try {
      window.localStorage.setItem(LS_LOCALE, locale.code);
    } catch {
      /* private browsing — silently skip */
    }
  }, [locale, ready]);

  const setLocale = useCallback((code: string) => {
    setLocaleCodeState(code);
  }, []);

  // ─── currency state ────────────────────────────────────────────
  const displayCurrency = useMemo<Currency>(() => {
    const found = availableCurrencies.find((c) => c.code === currencyCode);
    return (
      found ?? {
        code: 'EGP',
        symbol: 'E£',
        exchangeRateToEgp: 1,
        isBase: true,
        isEnabled: true,
        displayOrder: 0,
      }
    );
  }, [availableCurrencies, currencyCode]);

  const setDisplayCurrency = useCallback((code: string) => {
    setCurrencyCodeState(code);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(LS_CURRENCY, displayCurrency.code);
    } catch {
      /* private browsing — silently skip */
    }
  }, [displayCurrency, ready]);

  // ─── price formatter ───────────────────────────────────────────
  /**
   * Convert EGP minor units (integer piasters) → display currency
   * major units (rounded to integer), format with the right symbol.
   *
   * For EGP: minor / 100 → "LE 13,000".
   * For USD with rate=50: minor / 100 / 50 → round → "USD 260".
   *
   * The backend's `/api/tours/:slug/price` returns `subtotal /
   * total` in the same minor-units convention (server-authoritative
   * per §8). Frontend never multiplies anything itself — only the
   * currency conversion is done here.
   */
  const formatPrice = useCallback(
    (amountEgpMinor: number, currencyCodeOverride?: string): string => {
      const target =
        availableCurrencies.find((c) => c.code === currencyCodeOverride) ??
        displayCurrency;
      const amountMajor = amountEgpMinor / 100; // piasters → EGP major
      let converted: number;
      if (target.isBase || target.exchangeRateToEgp === 1) {
        converted = amountMajor;
      } else {
        converted = amountMajor / target.exchangeRateToEgp;
      }
      const rounded = Math.round(converted);
      const formatted = rounded.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      if (target.code === 'EGP') return `LE ${formatted}`;
      return `${target.code} ${formatted}`;
    },
    [availableCurrencies, displayCurrency],
  );

  // ─── date locale mapping ───────────────────────────────────────
  const dateLocale: DateLocale = locale.code === 'ar' ? 'ar-EG' : 'en-US';

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      availableLocales,
      isRtl: locale.isRtl,
      setLocale,
      dateLocale,
      availableCurrencies,
      displayCurrency,
      setDisplayCurrency,
      formatPrice,
    }),
    [
      locale,
      availableLocales,
      setLocale,
      dateLocale,
      availableCurrencies,
      displayCurrency,
      setDisplayCurrency,
      formatPrice,
    ],
  );

  // Don't block the first paint — children render immediately
  // even before the bootstrap fetches resolve. `locale` falls
  // back to a sensible default in the meantime (see useMemo).
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used inside <LocaleProvider>.');
  }
  return ctx;
}

/** Convenience selector: just the current locale. */
export function useCurrentLocale(): Locale {
  return useLocale().locale;
}

/** Convenience selector: just the display currency. */
export function useDisplayCurrency(): Currency {
  return useLocale().displayCurrency;
}
