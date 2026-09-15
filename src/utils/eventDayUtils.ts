import type { Booking, BookingService, EventExpense } from '../types';

/** Bookings whose financial records can still be edited */
export function isBookingFinanciallyEditable(status: Booking['status']): boolean {
  return !['completed', 'cancelled', 'rejected'].includes(status);
}

export function splitBookingServices(services: BookingService[]) {
  const original = services.filter((s) => !s.isEventDayAddition);
  const additional = services.filter((s) => s.isEventDayAddition);
  return { original, additional };
}

export function sumServiceTotals(services: BookingService[]): number {
  return services.reduce((sum, s) => sum + s.total, 0);
}

export interface EventBillingSummary {
  originalSubtotal: number;
  additionalSubtotal: number;
  discount: number;
  originalBookingAmount: number;
  additionalItems: number;
  finalBill: number;
  totalPaid: number;
  remainingBalance: number;
}

/** Customer billing breakdown for Event Day Report */
export function computeEventBilling(booking: Booking): EventBillingSummary {
  const { original, additional } = splitBookingServices(booking.services);
  const originalSubtotal = sumServiceTotals(original);
  const additionalSubtotal = sumServiceTotals(additional);
  const subtotal = originalSubtotal + additionalSubtotal;

  const originalDiscountShare =
    subtotal > 0 && booking.discount > 0
      ? Math.round((booking.discount * originalSubtotal) / subtotal)
      : booking.discount;

  const originalBookingAmount = Math.max(0, originalSubtotal - originalDiscountShare);
  const additionalItems = additionalSubtotal;
  const finalBill = booking.grandTotal;

  return {
    originalSubtotal,
    additionalSubtotal,
    discount: booking.discount,
    originalBookingAmount,
    additionalItems,
    finalBill,
    totalPaid: booking.advancePaid,
    remainingBalance: booking.remainingBalance,
  };
}

export interface EventProfitSummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
}

export function computeEventProfit(
  booking: Booking,
  eventExpenses: EventExpense[],
): EventProfitSummary {
  const totalRevenue = booking.grandTotal;
  const totalExpenses = eventExpenses.reduce((sum, e) => sum + e.amount, 0);
  return {
    totalRevenue,
    totalExpenses,
    grossProfit: totalRevenue - totalExpenses,
  };
}

export function createEventDayService(
  particular: string,
  amount: number,
  enteredBy: string,
  guestCount?: number,
): BookingService {
  const now = new Date().toISOString();
  return {
    serviceId: `event-day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    serviceName: particular.trim(),
    guestCount,
    quantity: 1,
    unitPrice: amount,
    total: amount,
    enteredBy,
    enteredAt: now,
    isEventDayAddition: true,
  };
}
