import type {
  ApprovalRequest,
  Booking,
  Customer,
  Expense,
  EventExpense,
  Payment,
  Receipt,
  SystemSettings,
  User,
} from '../types';
import { calculateRemainingBalance, derivePaymentStatus } from './bookingUtils';

export function upsertBooking(bookings: Booking[], booking: Booking): Booking[] {
  return bookings.some((b) => b.id === booking.id)
    ? bookings.map((b) => (b.id === booking.id ? booking : b))
    : [...bookings, booking];
}

export function appendCustomer(customers: Customer[], customer: Customer): Customer[] {
  return customers.some((c) => c.id === customer.id)
    ? customers.map((c) => (c.id === customer.id ? customer : c))
    : [...customers, customer];
}

export function appendExpense(expenses: Expense[], expense: Expense): Expense[] {
  return expenses.some((e) => e.id === expense.id)
    ? expenses.map((e) => (e.id === expense.id ? expense : e))
    : [...expenses, expense];
}

export function appendEventExpense(eventExpenses: EventExpense[], expense: EventExpense): EventExpense[] {
  return eventExpenses.some((e) => e.id === expense.id)
    ? eventExpenses.map((e) => (e.id === expense.id ? expense : e))
    : [...eventExpenses, expense];
}

export function upsertUser(users: User[], user: User): User[] {
  return users.some((u) => u.id === user.id)
    ? users.map((u) => (u.id === user.id ? user : u))
    : [...users, user];
}

export function removeUser(users: User[], userId: string): User[] {
  return users.filter((u) => u.id !== userId);
}

export function applyPaymentResult(
  bookings: Booking[],
  payments: Payment[],
  receipts: Receipt[],
  result: { payment: Payment; receipt: Receipt },
) {
  const { payment, receipt } = result;
  const nextPayments = [...payments, payment];
  const nextReceipts = [...receipts, receipt];
  const nextBookings = bookings.map((b) => {
    if (b.id !== payment.bookingId) return b;
    const advancePaid = b.advancePaid + payment.amount;
    return {
      ...b,
      advancePaid,
      remainingBalance: receipt.newBalance,
      paymentStatus: derivePaymentStatus(b.grandTotal, advancePaid),
      updatedAt: new Date().toISOString(),
    };
  });
  return { bookings: nextBookings, payments: nextPayments, receipts: nextReceipts };
}

export function bookingAdvanceSideEffects(
  booking: Booking,
  createdBy: string,
  payments: Payment[],
  receipts: Receipt[],
) {
  if (booking.advancePaid <= 0) {
    return { payments, receipts };
  }

  const payment: Payment = {
    id: `p-local-${booking.id}`,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    amount: booking.advancePaid,
    method: 'cash',
    paymentDate: booking.bookingDate,
    receivedBy: createdBy,
    customerName: booking.customer.name,
  };

  const receipt: Receipt = {
    id: `r-local-${booking.id}`,
    receiptNumber: `RCP-${1000 + receipts.length + 1}`,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    customerName: booking.customer.name,
    functionDate: booking.functionDate,
    venueName: booking.venueName,
    amount: booking.advancePaid,
    previousBalance: booking.grandTotal,
    newBalance: booking.remainingBalance,
    method: 'cash',
    paymentDate: booking.bookingDate,
    receivedBy: createdBy,
    createdAt: new Date().toISOString(),
  };

  return {
    payments: [...payments, payment],
    receipts: [...receipts, receipt],
  };
}

export function discountApprovalRequest(
  booking: Booking,
  requestedBy: string,
  reason: string,
): ApprovalRequest {
  return {
    id: `ap-local-${booking.id}`,
    entityType: 'Booking',
    entityId: booking.bookingNumber,
    requestType: 'discount',
    requestedBy,
    status: 'pending',
    reason,
    createdAt: new Date().toISOString(),
    details: `${booking.bookingNumber} — ${booking.customer.name}`,
  };
}

export function cancellationApprovalRequest(
  booking: Booking,
  requestedBy: string,
  reason: string,
): ApprovalRequest {
  return {
    id: `ap-local-${booking.id}-cancel`,
    entityType: 'Booking',
    entityId: booking.bookingNumber,
    requestType: 'cancellation',
    requestedBy,
    status: 'pending',
    reason,
    createdAt: new Date().toISOString(),
    details: `${booking.bookingNumber} — ${booking.customer.name} · ${booking.venueName} · ${booking.functionDate}`,
  };
}

export function expenseApprovalRequest(expense: Expense): ApprovalRequest {
  return {
    id: `ap-local-${expense.id}`,
    entityType: 'Expense',
    entityId: expense.id,
    requestType: 'expense',
    requestedBy: expense.addedBy,
    status: 'pending',
    reason: `Expense above threshold: ${expense.description}`,
    createdAt: new Date().toISOString(),
    details: `${expense.category} — Rs. ${expense.amount.toLocaleString()}`,
  };
}

export function applyApprovalDecision(
  approvals: ApprovalRequest[],
  bookings: Booking[],
  expenses: Expense[],
  id: string,
  approved: boolean,
  notes: string,
  by: string,
) {
  const approval = approvals.find((a) => a.id === id);
  if (!approval) {
    return { approvals, bookings, expenses };
  }

  const updatedApprovals = approvals.map((a) =>
    a.id === id
      ? {
          ...a,
          status: approved ? ('approved' as const) : ('rejected' as const),
          decisionNotes: notes,
          approvedBy: by,
          approvedAt: new Date().toISOString(),
        }
      : a,
  );

  let updatedBookings = bookings;
  let updatedExpenses = expenses;

  if (approval.entityType === 'Booking' && approval.requestType === 'discount') {
    updatedBookings = bookings.map((b) =>
      b.bookingNumber === approval.entityId
        ? {
            ...b,
            status: approved ? ('confirmed' as const) : ('rejected' as const),
            updatedAt: new Date().toISOString(),
          }
        : b,
    );
  }

  if (approval.entityType === 'Booking' && approval.requestType === 'cancellation') {
    updatedBookings = bookings.map((b) =>
      b.bookingNumber === approval.entityId
        ? {
            ...b,
            status: approved ? ('cancelled' as const) : ('confirmed' as const),
            updatedAt: new Date().toISOString(),
          }
        : b,
    );
  }

  if (approval.entityType === 'Expense') {
    updatedExpenses = expenses.map((e) =>
      e.id === approval.entityId
        ? { ...e, approvalStatus: approved ? ('approved' as const) : ('rejected' as const) }
        : e,
    );
  }

  return {
    approvals: updatedApprovals,
    bookings: updatedBookings,
    expenses: updatedExpenses,
  };
}

export function mergeSettings(current: SystemSettings, patch: Partial<SystemSettings>): SystemSettings {
  return { ...current, ...patch };
}

export function recalculateBookingBalances(booking: Booking): Booking {
  const remainingBalance = calculateRemainingBalance(booking.grandTotal, booking.advancePaid);
  return {
    ...booking,
    remainingBalance,
    paymentStatus: derivePaymentStatus(booking.grandTotal, booking.advancePaid),
  };
}
