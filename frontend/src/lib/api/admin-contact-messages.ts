import { api } from './client.js';

/**
 * §24 — admin contact-messages inbox.
 *
 * Base URL /api/admin/contact-messages.
 *
 *   GET   ?page=&pageSize=&status=   paginated inbox (NEW / REPLIED / ARCHIVED)
 *   PATCH :id                        status transition + optional reply / note
 */

export type ContactMessageStatus = 'NEW' | 'REPLIED' | 'ARCHIVED';

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  body: string;
  status: ContactMessageStatus;
  receivedAt: string;
  repliedAt: string | null;
  repliedBy: string | null;
}

export interface AdminContactMessageUpdate {
  status: ContactMessageStatus;
  reply?: string;
  internalNote?: string;
}

/** GET /api/admin/contact-messages — newest first, optional status filter. */
export function listAdminContactMessages(
  query: { page?: number; pageSize?: number; status?: ContactMessageStatus } = {},
): Promise<{ items: AdminContactMessage[]; total: number }> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('pageSize', String(query.pageSize ?? 50));
  if (query.status) qs.set('status', query.status);
  return api(`/admin/contact-messages?${qs.toString()}`);
}

/** PATCH /api/admin/contact-messages/:id — transition status + reply/note. */
export function updateAdminContactMessage(
  id: string,
  dto: AdminContactMessageUpdate,
): Promise<AdminContactMessage> {
  return api(`/admin/contact-messages/${encodeURIComponent(id)}`, { method: 'PATCH', body: dto });
}