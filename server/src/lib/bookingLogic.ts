import { venuesConflict } from './venueConfig.js';

export type BookingStatus =
  | 'inquiry'
  | 'pending_review'
  | 'tentative'
  | 'hold'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'cancellation_requested';

export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'refunded';

export interface LineItemInput {
  serviceId: string;
  serviceName: string;
  guestCount?: number;
  quantity: number;
  unitPrice: number;
  total: number;
  enteredBy?: string;
  enteredAt?: string;
  isEventDayAddition?: boolean;
}

export interface AvailabilityBooking {
  id: string;
  venueId: string;
  functionDate: string;
  status: BookingStatus;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DEFAULT_BLOCKING: BookingStatus[] = [
  'confirmed',
  'hold',
  'tentative',
  'cancellation_requested',
];

export function getDayName(dateStr: string): string {
  return DAYS[new Date(`${dateStr}T12:00:00`).getDay()];
}

export function derivePaymentStatus(grandTotal: number, advancePaid: number): PaymentStatus {
  if (advancePaid <= 0) return 'pending';
  if (advancePaid >= grandTotal) return 'paid';
  return 'partially_paid';
}

export function calculateBookingTotals(services: LineItemInput[], discount: number, taxAmount = 0) {
  const subtotal = services.reduce((sum, s) => sum + s.total, 0);
  const grandTotal = Math.max(0, subtotal - discount + taxAmount);
  return { subtotal, grandTotal };
}

export function calculateRemainingBalance(grandTotal: number, advancePaid: number): number {
  return Math.max(0, grandTotal - advancePaid);
}

export function checkVenueAvailability(
  bookings: AvailabilityBooking[],
  venueId: string,
  date: string,
  excludeBookingId?: string,
  blockingStatuses: BookingStatus[] = DEFAULT_BLOCKING,
): boolean {
  return !bookings.some(
    (b) =>
      b.functionDate === date &&
      blockingStatuses.includes(b.status) &&
      b.id !== excludeBookingId &&
      venuesConflict(b.venueId, venueId),
  );
}

export function generateBookingNumber(serialNumber: number): string {
  return `SB-${1000 + serialNumber}`;
}

export function needsDiscountApproval(
  subtotal: number,
  discount: number,
  thresholdPercent = 5,
): boolean {
  return subtotal > 0 && (discount / subtotal) * 100 > thresholdPercent;
}

export function isFinanciallyEditable(status: BookingStatus): boolean {
  return !['completed', 'cancelled', 'rejected'].includes(status);
}
