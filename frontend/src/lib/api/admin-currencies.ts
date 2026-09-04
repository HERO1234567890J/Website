import { api } from './client.js';

/**
 * §26 — admin currency management.
 *
 * Base URL /api/admin/currencies. EGP is always the base currency
 * (`isBase`) — the seed enforces exactly one base row. `value`-style
 * editing is not allowed on the base row via UpdateCurrencyDto, so
 * the admin UI guards against editing EGP's rate.
 */

export interface AdminCurrency {
  code: string;
  symbol: string;
  exchangeRateToEgp: number;
  isEnabled: boolean;
  isBase: boolean;
  displayOrder: number;
}

export interface AdminCurrencyCreate {
  code: string;
  symbol: string;
  exchangeRateToEgp: number;
  displayOrder?: number;
  isEnabled?: boolean;
}

export interface AdminCurrencyUpdate {
  symbol?: string;
  exchangeRateToEgp?: number;
  displayOrder?: number;
  isEnabled?: boolean;
}

/** GET /api/admin/currencies — all rows. */
export function listAdminCurrencies(): Promise<AdminCurrency[]> {
  return api('/admin/currencies');
}

/** POST /api/admin/currencies — add a currency (never base). */
export function createAdminCurrency(dto: AdminCurrencyCreate): Promise<AdminCurrency> {
  return api('/admin/currencies', { method: 'POST', body: dto });
}

/** PATCH /api/admin/currencies/:code — edit symbol / rate / order / enabled. */
export function updateAdminCurrency(
  code: string,
  dto: AdminCurrencyUpdate,
): Promise<AdminCurrency> {
  return api(`/admin/currencies/${encodeURIComponent(code)}`, { method: 'PATCH', body: dto });
}