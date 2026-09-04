import { api } from './client.js';
import type { Destination } from './types.js';

/** §7 — Public destinations list (active only). */
export function listDestinations(): Promise<Destination[]> {
  return api('/destinations');
}
