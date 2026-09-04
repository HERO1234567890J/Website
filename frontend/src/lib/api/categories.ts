import { api } from './client.js';
import type { Category } from './types.js';

/**
 * §7 — Public categories list (active only). Used by the public
 * site for filter pills and by the Build-Trip wizard.
 */
export function listCategories(): Promise<Category[]> {
  return api('/categories');
}
