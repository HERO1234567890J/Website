import { api } from './client.js';

/**
 * §29 — admin promo codes (admin CRUD + redemption ledger).
 *
 * Base URL /api/admin/promo-codes. Hard delete is intentionally NOT
 * exposed (codes are kept for audit history) — deactivation flips
 * `isActive` via DELETE :id.
 */

export type PromoCodeType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromoCodeScope = 'ALL' | 'TOURS' | 'CATEGORIES';

export interface AdminPromoCode {
  id: string;
  code: string;
  type: PromoCodeType;
  /** PERCENTAGE: integer percent 1..100 · FIXED_AMOUNT: EGP piasters */
  value: number;
  minBookingAmount: number | null;
  scope: PromoCodeScope;
  scopeTourIds: string[];
  scopeCategoryIds: string[];
  startDate: string | null;
  endDate: string | null;
  totalUsageLimit: number | null;
  perCustomerUsageLimit: number | null;
  isActive: boolean;
  redeemedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPromoRedemption {
  id: string;
  promoCodeId: string;
  bookingId: string;
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  discountAmount: number;
  redeemedAt: string;
}

export interface AdminPromoCodeCreate {
  code: string;
  type: PromoCodeType;
  value: number;
  minBookingAmount?: number;
  scope?: PromoCodeScope;
  scopeTourIds?: string[];
  scopeCategoryIds?: string[];
  startDate?: string;
  endDate?: string;
  totalUsageLimit?: number;
  perCustomerUsageLimit?: number;
  isActive?: boolean;
}

export interface AdminPromoCodeUpdate {
  value?: number;
  minBookingAmount?: number;
  scope?: PromoCodeScope;
  scopeTourIds?: string[];
  scopeCategoryIds?: string[];
  startDate?: string;
  endDate?: string;
  totalUsageLimit?: number;
  perCustomerUsageLimit?: number;
  isActive?: boolean;
}

/** GET /api/admin/promo-codes — newest first. */
export function listAdminPromoCodes(): Promise<AdminPromoCode[]> {
  return api('/admin/promo-codes');
}

/** GET /api/admin/promo-codes/:id/redemptions?page=&pageSize= */
export function listAdminPromoRedemptions(
  id: string,
  query: { page?: number; pageSize?: number } = {},
): Promise<{ items: AdminPromoRedemption[]; total: number }> {
  const qs = new URLSearchParams(
    Object.entries({ page: '1', pageSize: '50', ...query }).reduce<Record<string, string>>(
      (acc, [k, v]) => {
        acc[k] = String(v);
        return acc;
      },
      {},
    ),
  ).toString();
  return api(`/admin/promo-codes/${encodeURIComponent(id)}/redemptions?${qs}`);
}

/** POST /api/admin/promo-codes — create (code stored uppercased). */
export function createAdminPromoCode(dto: AdminPromoCodeCreate): Promise<AdminPromoCode> {
  return api('/admin/promo-codes', { method: 'POST', body: dto });
}

/** PATCH /api/admin/promo-codes/:id — edit terms / limits / active flag. */
export function updateAdminPromoCode(
  id: string,
  dto: AdminPromoCodeUpdate,
): Promise<AdminPromoCode> {
  return api(`/admin/promo-codes/${encodeURIComponent(id)}`, { method: 'PATCH', body: dto });
}

/** DELETE /api/admin/promo-codes/:id — deactivate (soft). */
export function deactivateAdminPromoCode(id: string): Promise<AdminPromoCode> {
  return api(`/admin/promo-codes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}