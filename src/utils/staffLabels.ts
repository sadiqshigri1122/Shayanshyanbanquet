import type { BookingStatus, PaymentStatus } from '../types';

/** Plain-language labels for office staff */
export const bookingStatusLabels: Partial<Record<BookingStatus, string>> = {
  inquiry: 'New Inquiry',
  pending_review: 'Waiting for Manager',
  tentative: 'Tentative Hold',
  hold: 'On Hold',
  confirmed: 'Confirmed',
  completed: 'Event Closed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  cancellation_requested: 'Cancellation Requested',
};

export const paymentStatusLabels: Partial<Record<PaymentStatus, string>> = {
  pending: 'No Payment Yet',
  partially_paid: 'Partially Paid',
  paid: 'Fully Paid',
  refunded: 'Refunded',
};

export function staffBookingStatus(status: BookingStatus): string {
  return bookingStatusLabels[status] ?? status.replace(/_/g, ' ');
}

export function staffPaymentStatus(status: PaymentStatus): string {
  return paymentStatusLabels[status] ?? status.replace(/_/g, ' ');
}
