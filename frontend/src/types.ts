export type TripStatus = 'upcoming' | 'pending' | 'completed';
export type BookingStatus = 'paid' | 'pending' | 'refunded';
export type TourStatus = 'published' | 'draft';
export type UserStatus = 'active' | 'blocked';

export interface FaqItem {
  q: string;
  a: React.ReactNode;
  defaultOpen?: boolean;
}

export interface NavItem {
  to: string;
  label: string;
}
