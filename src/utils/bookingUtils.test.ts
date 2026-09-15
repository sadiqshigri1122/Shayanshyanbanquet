import { describe, expect, it } from 'vitest';
import {
  calculateBookingTotals,
  calculateRemainingBalance,
  checkVenueAvailability,
  derivePaymentStatus,
  needsDiscountApproval,
} from './bookingUtils';
import type { Booking } from '../types';

const baseBooking = (overrides: Partial<Booking>): Booking =>
  ({
    id: 'b-test',
    bookingNumber: 'SB-9999',
    serialNumber: 9999,
    bookingDate: '2026-01-01',
    customer: { id: 'c1', name: 'Test', phone: '0300', address: 'Karachi', createdAt: '2026-01-01' },
    venueId: 'va-full',
    venueName: 'A Full',
    functionDate: '2026-12-01',
    functionDay: 'Tuesday',
    programme: 'Wedding',
    numberOfGuests: 100,
    services: [],
    subtotal: 100000,
    discount: 0,
    taxAmount: 0,
    grandTotal: 100000,
    advancePaid: 0,
    remainingBalance: 100000,
    status: 'confirmed',
    paymentStatus: 'pending',
    createdBy: 'Test',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }) as Booking;

describe('bookingUtils', () => {
  it('calculates booking totals with discount', () => {
    const services = [{ serviceId: 's1', serviceName: 'Hall', quantity: 1, unitPrice: 100000, total: 100000 }];
    expect(calculateBookingTotals(services, 10000)).toEqual({ subtotal: 100000, grandTotal: 90000 });
  });

  it('derives payment status correctly', () => {
    expect(derivePaymentStatus(100000, 0)).toBe('pending');
    expect(derivePaymentStatus(100000, 50000)).toBe('partially_paid');
    expect(derivePaymentStatus(100000, 100000)).toBe('paid');
  });

  it('calculates remaining balance without going negative', () => {
    expect(calculateRemainingBalance(100000, 120000)).toBe(0);
    expect(calculateRemainingBalance(100000, 40000)).toBe(60000);
  });

  it('flags discount above threshold', () => {
    expect(needsDiscountApproval(100000, 6000, 5)).toBe(true);
    expect(needsDiscountApproval(100000, 5000, 5)).toBe(false);
  });

  it('blocks same hall on same date', () => {
    const bookings = [baseBooking({ id: 'b1', venueId: 'va-red', functionDate: '2026-12-01', status: 'confirmed' })];
    expect(checkVenueAvailability(bookings, 'va-red', '2026-12-01')).toBe(false);
    expect(checkVenueAvailability(bookings, 'va-gold', '2026-12-01')).toBe(true);
  });

  it('blocks section when full hall is booked', () => {
    const bookings = [baseBooking({ id: 'b1', venueId: 'va-full', functionDate: '2026-12-01', status: 'confirmed' })];
    expect(checkVenueAvailability(bookings, 'va-red', '2026-12-01')).toBe(false);
    expect(checkVenueAvailability(bookings, 'va-gold', '2026-12-01')).toBe(false);
  });

  it('blocks full hall when section is booked', () => {
    const bookings = [baseBooking({ id: 'b1', venueId: 'va-red', functionDate: '2026-12-01', status: 'confirmed' })];
    expect(checkVenueAvailability(bookings, 'va-full', '2026-12-01')).toBe(false);
  });

  it('does not block cancelled bookings', () => {
    const bookings = [baseBooking({ id: 'b1', venueId: 'va-red', functionDate: '2026-12-01', status: 'cancelled' })];
    expect(checkVenueAvailability(bookings, 'va-red', '2026-12-01')).toBe(true);
  });
});
