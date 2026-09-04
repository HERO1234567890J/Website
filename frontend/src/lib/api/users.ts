import { api } from './client.js';

/**
 * §13 / §15 — customer-facing self-service endpoints.
 *
 * All four endpoints require a valid JWT (the api() client adds the
 * bearer header automatically). The /me shape is the wider UserView
 * — it includes phone + notification preferences that the strict
 * auth-context `User` type doesn't carry.
 */

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface UserView {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  emailVerifiedAt: string | null;
  bookingEmails: boolean;
  marketingEmails: boolean;
  smsReminders: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getMe(): Promise<UserView> {
  return api('/users/me');
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
}

export function updateProfile(payload: UpdateProfilePayload): Promise<UserView> {
  return api('/users/me', {
    method: 'PATCH',
    body: payload,
  });
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function changePassword(payload: ChangePasswordPayload): Promise<{ ok: true }> {
  return api('/users/me/password', {
    method: 'POST',
    body: payload,
  });
}

export interface NotificationPrefsPayload {
  bookingEmails?: boolean;
  marketingEmails?: boolean;
  smsReminders?: boolean;
}

export function updateNotificationPrefs(
  payload: NotificationPrefsPayload,
): Promise<UserView> {
  return api('/users/me/notification-preferences', {
    method: 'PATCH',
    body: payload,
  });
}
