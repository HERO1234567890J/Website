/**
 * Shared types for the LocaleProvider.
 *
 * Mirrors the backend's /api/languages + /api/currencies response
 * shapes (`Language` and `Currency` Prisma models). Hand-written
 * here instead of imported from `@prisma/client` so the frontend
 * stays decoupled from the backend's generated client.
 */

export interface Locale {
  /** ISO code, e.g. "en" / "ar". */
  code: string;
  /** Display name (in its own script), e.g. "العربية". */
  name: string;
  /** True if the locale renders right-to-left. */
  isRtl: boolean;
  isDefault: boolean;
}

export interface Currency {
  /** ISO 4217 code, e.g. "EGP" / "USD". */
  code: string;
  /** Display symbol, e.g. "E£" / "$". */
  symbol: string;
  /** Multiplier to EGP (1 USD = N EGP). Refreshed by cron (§26). */
  exchangeRateToEgp: number;
  /** Exactly one row has this true — the base settlement currency. */
  isBase: boolean;
  isEnabled: boolean;
  displayOrder: number;
}

/** BCP-47 tag for the date formatter's first argument. */
export type DateLocale = 'en-US' | 'ar-EG';
