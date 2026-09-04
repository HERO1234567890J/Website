import { api } from './client.js';

/**
 * * §27 — DB-driven site content (per-locale).
 *
 * Backend stores the (key, locale) row in `SiteContent` and seeds
 * defaults for the legal / about / hero / contact keys.
 *
 * Public read returns either the requested locale OR the default
 * locale's row as a fallback — so a missing Arabic translation
 * never 404s the page; it falls back to English.
 */

export interface SiteContentRow {
  id: string;
  key: string;
  locale: string;
  content: Record<string, unknown>;
  updatedAt: string;
  updatedBy: string | null;
}

export async function getSiteContent(
  key: string,
  locale: string,
): Promise<SiteContentRow | null> {
  const qs = new URLSearchParams({ key, locale }).toString();
  // Backend returns null when even the default-locale fallback is
  // missing — api() would throw on 404, so handle explicitly.
  try {
    return await api<SiteContentRow>(`/site-content?${qs}`);
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err as { status?: number }).status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getSiteContentBatch(
  keys: string[],
  locale: string,
): Promise<Array<{ key: string; row: SiteContentRow | null }>> {
  const qs = new URLSearchParams({ keys: keys.join(','), locale }).toString();
  return api(`/site-content/batch?${qs}`);
}