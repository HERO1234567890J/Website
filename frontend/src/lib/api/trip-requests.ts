import { api } from './client.js';

/**
 * §7 — Build-Trip wizard Scene 4 submission.
 *
 * Public POST `/api/trip-requests` — guests can submit without an
 * account per §28. The backend persists the row, fires
 * `sendTripRequestReceived` so the trip director's inbox gets a
 * notification, and returns `{ id, ref }`.
 *
 * `ref` is the human-friendly "DT-XXXXXXXX" string the wizard's
 * confirm panel renders. `id` is the DB UUID for any programmatic
 * follow-up.
 */

export interface TripRequestPayload {
  /** TripTypePreset.slug (e.g. "friends-trip") — resolved server-side. */
  tripTypePresetSlug: string;
  /** Destination slugs the customer picked in Scene 2. */
  destinations: string[];
  /** Free-text "somewhere else" — required if destinations is empty. */
  otherDestination?: string;
  /** ISO-8601 date strings from Scene 3. */
  dateFrom?: string;
  dateTo?: string;
  /** Free-text label like "4–6 days" — kept as text until the
   *  backend exposes an enum (Phase 15G admin). */
  duration?: string;
  /** Number of travelers (1-20). */
  travelers?: number;
  /** Free-text label like "LE 10,000 – 20,000". */
  budget?: string;
  /** Free-form notes (≤ 4,000 chars). */
  notes?: string;
  // Contact (required — Scene 4 form fields).
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface TripRequestResult {
  /** DB UUID. */
  id: string;
  /** "DT-XXXXXXXX" — shown in the ConfirmPanel. */
  ref: string;
}

export function submitTripRequest(
  payload: TripRequestPayload,
): Promise<TripRequestResult> {
  return api('/trip-requests', {
    method: 'POST',
    body: payload,
    skipRefresh: true, // public endpoint — don't trigger auth refresh on 401
  });
}
