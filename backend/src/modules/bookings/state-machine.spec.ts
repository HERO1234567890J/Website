import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import {
  isAllowedTransition,
  assertTransition,
  isTerminal,
  CUSTOMER_CANCELLABLE,
} from './state-machine.js';

describe('booking state machine', () => {
  it('allows DRAFT → PENDING and DRAFT → CANCELLED', () => {
    expect(isAllowedTransition(BookingStatus.DRAFT, BookingStatus.PENDING)).toBe(true);
    expect(isAllowedTransition(BookingStatus.DRAFT, BookingStatus.CANCELLED)).toBe(true);
  });

  it('forbids DRAFT → CONFIRMED (must go through PAID + PAYMENT_PENDING)', () => {
    expect(isAllowedTransition(BookingStatus.DRAFT, BookingStatus.CONFIRMED)).toBe(false);
  });

  it('forbids PAID → PENDING (no backward moves)', () => {
    expect(isAllowedTransition(BookingStatus.PAID, BookingStatus.PENDING)).toBe(false);
    expect(isAllowedTransition(BookingStatus.PAID, BookingStatus.PAYMENT_PENDING)).toBe(false);
    expect(isAllowedTransition(BookingStatus.CONFIRMED, BookingStatus.PAID)).toBe(false);
  });

  it('allows PENDING → PAYMENT_PENDING → PAID → CONFIRMED → COMPLETED', () => {
    expect(isAllowedTransition(BookingStatus.PENDING, BookingStatus.PAYMENT_PENDING)).toBe(true);
    expect(isAllowedTransition(BookingStatus.PAYMENT_PENDING, BookingStatus.PAID)).toBe(true);
    expect(isAllowedTransition(BookingStatus.PAID, BookingStatus.CONFIRMED)).toBe(true);
    expect(isAllowedTransition(BookingStatus.CONFIRMED, BookingStatus.COMPLETED)).toBe(true);
  });

  it('treats CANCELLED, COMPLETED, FAILED, EXPIRED as terminal', () => {
    for (const s of [
      BookingStatus.CANCELLED,
      BookingStatus.COMPLETED,
      BookingStatus.FAILED,
      BookingStatus.EXPIRED,
    ]) {
      expect(isTerminal(s)).toBe(true);
    }
  });

  it('assertTransition throws BadRequestException on illegal moves', () => {
    expect(() => assertTransition(BookingStatus.PAID, BookingStatus.PENDING)).toThrow(
      BadRequestException,
    );
  });

  it('CUSTOMER_CANCELLABLE only contains PENDING and PAYMENT_PENDING', () => {
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.PENDING)).toBe(true);
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.PAYMENT_PENDING)).toBe(true);
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.PAID)).toBe(false);
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.CONFIRMED)).toBe(false);
  });
});