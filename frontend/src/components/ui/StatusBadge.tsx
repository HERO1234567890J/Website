import type { ReactNode } from 'react';

export type BadgeStatus =
  | 'upcoming'
  | 'pending'
  | 'completed'
  | 'paid'
  | 'refunded'
  | 'draft'
  | 'active'
  | 'blocked'
  | 'published';

interface StatusBadgeProps {
  status: BadgeStatus;
  children: ReactNode;
}

/**
 * Status pill — for trip cards (upcoming/pending/completed), admin bookings
 * (paid/pending/refunded), admin tours (published/draft), admin users
 * (active/blocked). Variant class is the status name itself.
 */
export function StatusBadge({ status, children }: StatusBadgeProps) {
  return <span className={`status-badge ${status}`}>{children}</span>;
}
