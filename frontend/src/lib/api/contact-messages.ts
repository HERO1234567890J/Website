import { api } from './client.js';

/**
 * §24 — public contact form.
 *
 * Persists a ContactMessage row first (DB is the durable record),
 * then fires sendContactMessageReceived to the team inbox.
 *
 * The frontend never gets the email-fire result; on success we
 * just show a thank-you panel. Email failures never propagate —
 * the row is already saved.
 */

export interface ContactMessagePayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
}

export function submitContactMessage(
  payload: ContactMessagePayload,
): Promise<{ id: string; receivedAt: string }> {
  return api('/contact-messages', {
    method: 'POST',
    body: payload,
    skipRefresh: true, // public endpoint — don't trigger auth refresh on 401
  });
}
