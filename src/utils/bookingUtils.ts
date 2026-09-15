import type { Booking, BookingService, BookingStatus, PaymentStatus, Customer } from '../types';
import { venuesConflict } from './venueConfig';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Default blocking statuses — overridden by SystemSettings.blockingStatuses when available */
export const BLOCKING_STATUSES: BookingStatus[] = [
  'confirmed',
  'hold',
  'tentative',
  'cancellation_requested',
];

export const getDayName = (dateStr: string): string =>
  DAYS[new Date(dateStr + 'T12:00:00').getDay()];

export const daysUntilDate = (isoDate: string, fromDate?: string): number => {
  const from = fromDate ?? new Date().toISOString().split('T')[0];
  const fromMs = new Date(`${from}T12:00:00`).getTime();
  const toMs = new Date(`${isoDate}T12:00:00`).getTime();
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
};

export const formatCurrency = (amount: number): string =>
  `Rs. ${amount.toLocaleString('en-PK')}`;

export const derivePaymentStatus = (grandTotal: number, advancePaid: number): PaymentStatus => {
  if (advancePaid <= 0) return 'pending';
  if (advancePaid >= grandTotal) return 'paid';
  return 'partially_paid';
};

export const calculateLineItemTotal = (quantity: number, unitPrice: number): number =>
  quantity * unitPrice;

export const calculateBookingTotals = (
  services: BookingService[],
  discount: number,
  taxAmount = 0,
) => {
  const subtotal = services.reduce((sum, s) => sum + s.total, 0);
  const grandTotal = Math.max(0, subtotal - discount + taxAmount);
  return { subtotal, grandTotal };
};

export const calculateRemainingBalance = (grandTotal: number, advancePaid: number): number =>
  Math.max(0, grandTotal - advancePaid);

export const checkVenueAvailability = (
  bookings: Booking[],
  venueId: string,
  date: string,
  excludeBookingId?: string,
  blockingStatuses: BookingStatus[] = BLOCKING_STATUSES,
): boolean =>
  !bookings.some(
    (b) =>
      b.functionDate === date &&
      blockingStatuses.includes(b.status) &&
      b.id !== excludeBookingId &&
      venuesConflict(b.venueId, venueId),
  );

export const generateBookingNumber = (serialNumber: number): string =>
  `SB-${1000 + serialNumber}`;

export const searchCustomers = (
  customers: Customer[],
  query: string,
  bookings: Booking[],
): Customer[] => {
  const q = query.toLowerCase().trim();
  if (!q) return customers;
  const bookingMatch = bookings.find(
    (b) => b.bookingNumber.toLowerCase() === q || b.bookingNumber.toLowerCase().includes(q),
  );
  if (bookingMatch) return [bookingMatch.customer];
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.cnic && c.cnic.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)),
  );
};

export const DISCOUNT_APPROVAL_THRESHOLD_PERCENT = 5;

export const needsDiscountApproval = (
  subtotal: number,
  discount: number,
  thresholdPercent: number = DISCOUNT_APPROVAL_THRESHOLD_PERCENT,
): boolean =>
  subtotal > 0 && (discount / subtotal) * 100 > thresholdPercent;

export const getStatusColor = (status: BookingStatus): string => {
  const colors: Record<BookingStatus, string> = {
    inquiry: 'bg-info/15 text-info',
    pending_review: 'bg-warning/20 text-warning',
    tentative: 'bg-secondary-light text-secondary',
    hold: 'bg-warning/20 text-warning',
    confirmed: 'bg-success/15 text-success',
    completed: 'bg-success/15 text-success',
    cancelled: 'bg-danger/15 text-danger',
    rejected: 'bg-danger/15 text-danger',
    cancellation_requested: 'bg-warning/20 text-warning',
  };
  return colors[status];
};

export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const colors: Record<PaymentStatus, string> = {
    pending: 'bg-warning/20 text-warning',
    partially_paid: 'bg-secondary-light text-secondary',
    paid: 'bg-success/15 text-success',
    refunded: 'bg-surface-alt text-muted border border-border',
  };
  return colors[status];
};

export const formatStatus = (status: string): string =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
