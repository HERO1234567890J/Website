import { api } from './client.js';

/**
 * §25 — admin language management.
 *
 * Base URL /api/admin/languages — the public frontend reads only
 * enabled languages (`isEnabled`); the admin can also flip RTL and
 * designate the default locale.
 */

export interface AdminLanguage {
  code: string;
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
  isRtl: boolean;
}

export interface AdminLanguageCreate {
  code: string;
  name: string;
  isEnabled?: boolean;
  isDefault?: boolean;
  isRtl?: boolean;
}

export interface AdminLanguageUpdate {
  name?: string;
  isEnabled?: boolean;
  isRtl?: boolean;
}

/** GET /api/admin/languages — all rows (default-first). */
export function listAdminLanguages(): Promise<AdminLanguage[]> {
  return api('/admin/languages');
}

/** POST /api/admin/languages — add a new enabled language. */
export function createAdminLanguage(dto: AdminLanguageCreate): Promise<AdminLanguage> {
  return api('/admin/languages', { method: 'POST', body: dto });
}

/** PATCH /api/admin/languages/:code — edit name / enabled / rtl. */
export function updateAdminLanguage(
  code: string,
  dto: AdminLanguageUpdate,
): Promise<AdminLanguage> {
  return api(`/admin/languages/${encodeURIComponent(code)}`, { method: 'PATCH', body: dto });
}

/** PATCH /api/admin/languages/:code/default — promote to default locale. */
export function setAdminLanguageDefault(code: string): Promise<AdminLanguage> {
  return api(`/admin/languages/${encodeURIComponent(code)}/default`, { method: 'PATCH' });
}