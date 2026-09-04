import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

/**
 * §10 — allowed status transitions for a Booking.
 *
 * The matrix is the single source of truth: every status flip
 * goes through `assertTransition()`. Email/notification failures
 * (§12) must never invoke a backward move — the matrix makes that
 * impossible.
 *
 * Future transitions (REFUNDED, etc.) land with Phase 10; until
 * then the matrix is the contract.
 */
const TRANSITIONS: Record<BookingStatus, ReadonlySet<BookingStatus>> = {
  [BookingStatus.DRAFT]: new Set([BookingStatus.PENDING, BookingStatus.CANCELLED]),
  [BookingStatus.PENDING]: new Set([
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.CANCELLED,
    BookingStatus.FAILED,
    BookingStatus.EXPIRED,
  ]),
  [BookingStatus.PAYMENT_PENDING]: new Set([
    BookingStatus.PAID,
    BookingStatus.CANCELLED,
    BookingStatus.FAILED,
    BookingStatus.EXPIRED,
  ]),
  [BookingStatus.PAID]: new Set([BookingStatus.CONFIRMED]),
  [BookingStatus.CONFIRMED]: new Set([BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
  [BookingStatus.CANCELLED]: new Set(),
  [BookingStatus.COMPLETED]: new Set(),
  [BookingStatus.FAILED]: new Set(),
  [BookingStatus.EXPIRED]: new Set(),
};

export function isAllowedTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.has(to) ?? false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!isAllowedTransition(from, to)) {
    throw new BadRequestException(`Illegal booking transition: ${from} → ${to}`);
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].size === 0;
}

/** Statuses the customer is allowed to self-cancel from (§10). */
export const CUSTOMER_CANCELLABLE: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.PENDING,
  BookingStatus.PAYMENT_PENDING,
]);