import { api } from './client.js';

export interface AdminTourDate {
  id: string;
  tourId: string;
  startDate: string;
  endDate: string;
  capacity: number;
  remainingCapacity: number;
}

export interface CreateTourDatePayload {
  startDate: string;
  endDate: string;
  capacity: number;
}

export type UpdateTourDatePayload = Partial<CreateTourDatePayload>;

export function listTourDates(tourId: string): Promise<AdminTourDate[]> {
  return api(`/admin/tours/${encodeURIComponent(tourId)}/dates`);
}

export function createTourDate(tourId: string, payload: CreateTourDatePayload): Promise<AdminTourDate> {
  return api(`/admin/tours/${encodeURIComponent(tourId)}/dates`, { method: 'POST', body: payload });
}

export function updateTourDate(id: string, patch: UpdateTourDatePayload): Promise<AdminTourDate> {
  return api(`/admin/tour-dates/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
}

export function deleteTourDate(id: string): Promise<{ ok: true; id: string }> {
  return api(`/admin/tour-dates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function cancelTourDate(id: string): Promise<{ ok: true; id: string; cancelledBookings: number }> {
  return api(`/admin/tour-dates/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}
