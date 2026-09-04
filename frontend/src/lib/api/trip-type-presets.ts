import { api } from './client.js';
import type { TripTypePreset } from './types.js';

/**
 * §7 — Build-Trip Scene 1.
 *
 * Returns the admin-managed presets (Friends / Family / Honeymoon /
 * Solo / Adventure / University + whatever the business adds). The
 * 6 original slugs from the source are seeded once Phase 13/15G
 * lands the fixture; until then the list may be empty and Scene 1
 * renders the empty state.
 */
export function listTripTypePresets(): Promise<TripTypePreset[]> {
  return api('/trip-type-presets');
}
