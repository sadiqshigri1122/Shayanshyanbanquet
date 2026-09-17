import { venuesConflict } from './venueConfig.js';

export const BOOKING_STATUSES = [
  'inquiry',
  'pending_review',
  'tentative',
  'hold',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
  'cancellation_requested',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const STATUS_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  inquiry: ['pending_review', 'tentative', 'hold', 'confirmed', 'rejected', 'cancelled'],
  pending_review: ['confirmed', 'rejected'],
  tentative: ['hold', 'confirmed', 'cancelled'],
  hold: ['confirmed', 'tentative', 'cancelled'],
  confirmed: ['completed', 'cancellation_requested'],
  cancellation_requested: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: ['inquiry', 'pending_review'],
};

export class BookingStatusValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingStatusValidationError';
  }
}

export function parseBookingStatus(value: string): BookingStatus {
  if (!(BOOKING_STATUSES as readonly string[]).includes(value)) {
    throw new BookingStatusValidationError(`Invalid booking status: ${value}`);
  }
  return value as BookingStatus;
}

export function assertValidStatusTransition(from: BookingStatus, to: BookingStatus): void {
  if (from === to) return;
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new BookingStatusValidationError(`Cannot change status from "${from}" to "${to}"`);
  }
}

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

export function calculateLineItemTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export class LineItemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LineItemValidationError';
  }
}

/** Reject client totals that do not match quantity × unitPrice; return normalized line items. */
export function validateAndNormalizeLineItems(services: LineItemInput[]): LineItemInput[] {
  if (services.length === 0) {
    throw new LineItemValidationError('At least one charge is required');
  }

  return services.map((item, index) => {
    const label = item.serviceName.trim() || `Line item ${index + 1}`;

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new LineItemValidationError(`${label}: quantity must be greater than zero`);
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new LineItemValidationError(`${label}: unit price cannot be negative`);
    }

    const expectedTotal = calculateLineItemTotal(item.quantity, item.unitPrice);
    if (item.total !== expectedTotal) {
      throw new LineItemValidationError(
        `${label}: total (${item.total}) must equal quantity × unit price (${expectedTotal})`,
      );
    }

    return { ...item, total: expectedTotal };
  });
}

export function calculateBookingTotals(services: LineItemInput[], discount: number, taxAmount = 0) {
  const subtotal = services.reduce(
    (sum, s) => sum + calculateLineItemTotal(s.quantity, s.unitPrice),
    0,
  );
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
