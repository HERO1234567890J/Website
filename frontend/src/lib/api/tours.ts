import { api } from './client.js';
import type {
  ListToursQuery,
  PagedResult,
  TourDate,
  TourDetail,
  TourSummary,
} from './types.js';

/**
 * §7 / §8 — Public tour catalog.
 *
 * `listTours()` hits the server-side filter/sort/paginate endpoint;
 * never download the full catalog client-side.
 *
 * `getTourBySlug()` returns the detail view (with images + future
 * availability dates); `getAvailability()` is the dedicated endpoint
 * used by the booking widget to refresh the date picker without
 * re-fetching the full tour document.
 *
 * `getPricePreview()` is the server-authoritative price breakdown
 * for the checkout OrderSummary. The frontend never multiplies
 * `pricePerPerson × travelers` itself (§8 hard rule) — it
 * delegates to this endpoint.
 */

export function listTours(query: ListToursQuery = {}): Promise<PagedResult<TourSummary>> {
  const qs = buildQueryString(query);
  return api(`/tours${qs}`);
}

export function getTourBySlug(slug: string): Promise<TourDetail> {
  return api(`/tours/${encodeURIComponent(slug)}`);
}

export function getAvailability(slug: string): Promise<TourDate[]> {
  return api(`/tours/${encodeURIComponent(slug)}/availability`);
}

/** §8 — server-authoritative price breakdown for the checkout. */
export interface PricePreview {
  /** Integer EGP (or tour's currency) piasters — per person. */
  pricePerPerson: number;
  /** `pricePerPerson × travelerCount`, server-side. */
  subtotal: number;
  /** Always 0 in Phase 15D — promo wiring lands in 15E. */
  discountAmount: number;
  /** Authoritative total to charge. Equals `subtotal − discountAmount`. */
  total: number;
  currency: string;
  capacity: number;
  remainingCapacity: number;
}

export function getPricePreview(
  slug: string,
  tourDateId: string,
  travelerCount: number,
): Promise<PricePreview> {
  const params = new URLSearchParams({
    dateId: tourDateId,
    travelers: String(travelerCount),
  });
  return api(`/tours/${encodeURIComponent(slug)}/price?${params}`);
}

function buildQueryString(query: ListToursQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}
