import { prisma } from '../lib/prisma.js';
import {
  calculateBookingTotals,
  calculateRemainingBalance,
  checkVenueAvailability,
  derivePaymentStatus,
  generateBookingNumber,
  getDayName,
  isFinanciallyEditable,
  needsDiscountApproval,
  assertValidStatusTransition,
  parseBookingStatus,
  validateAndNormalizeLineItems,
  type BookingStatus,
  type LineItemInput,
} from '../lib/bookingLogic.js';
import { mapBooking } from '../lib/mappers.js';
import { sanitizeText } from '../lib/sanitize.js';
import { appendAuditLog, appendNotification, getSettings } from './stateService.js';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface CreateBookingBody {
  customerId: string;
  venueId: string;
  functionDate: string;
  programme: string;
  numberOfGuests: number;
  specialInstructions?: string;
  internalNotes?: string;
  services: LineItemInput[];
  discount: number;
  advancePaid: number;
  createdBy: string;
}

export async function listBookings() {
  const rows = await prisma.booking.findMany({
    include: { customer: true, lineItems: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapBooking);
}

export async function getBookingById(id: string) {
  const row = await prisma.booking.findUnique({
    where: { id },
    include: { customer: true, lineItems: true },
  });
  if (!row) throw new ApiError('Booking not found', 404);
  return mapBooking(row);
}

export async function checkAvailability(venueId: string, date: string, excludeBookingId?: string) {
  const settings = await getSettings();
  const bookings = await prisma.booking.findMany({
    select: { id: true, venueId: true, functionDate: true, status: true },
  });
  const available = checkVenueAvailability(
    bookings.map((b) => ({ ...b, status: b.status as BookingStatus })),
    venueId,
    date,
    excludeBookingId,
    settings.blockingStatuses as BookingStatus[],
  );
  return { available, venueId, date };
}

export async function createBooking(body: CreateBookingBody) {
  const settings = await getSettings();
  const venue = await prisma.venue.findUnique({ where: { id: body.venueId } });
  if (!venue) throw new ApiError('Venue not found', 404);

  const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
  if (!customer) throw new ApiError('Customer not found', 404);

  const services = validateAndNormalizeLineItems(body.services);

  const existing = await prisma.booking.findMany({
    select: { id: true, venueId: true, functionDate: true, status: true },
  });

  if (
    !checkVenueAvailability(
      existing.map((b) => ({ ...b, status: b.status as BookingStatus })),
      body.venueId,
      body.functionDate,
      undefined,
      settings.blockingStatuses as BookingStatus[],
    )
  ) {
    throw new ApiError('Venue is not available on the selected date', 409);
  }

  const maxSerial = await prisma.booking.aggregate({ _max: { serialNumber: true } });
  const serial = (maxSerial._max.serialNumber ?? 0) + 1;
  const { subtotal, grandTotal } = calculateBookingTotals(services, body.discount);
  const cappedAdvance = Math.min(Math.max(0, body.advancePaid), grandTotal);
  const remainingBalance = calculateRemainingBalance(grandTotal, cappedAdvance);
  const paymentStatus = derivePaymentStatus(grandTotal, cappedAdvance);

  let status: BookingStatus = 'confirmed';
  if (needsDiscountApproval(subtotal, body.discount, settings.discountApprovalThresholdPercent)) {
    status = 'pending_review';
  }

  const now = new Date().toISOString();
  const bookingId = `b${Date.now()}`;
  const bookingNumber = generateBookingNumber(serial);

  const created = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        id: bookingId,
        bookingNumber,
        serialNumber: serial,
        bookingDate: now.split('T')[0],
        customerId: body.customerId,
        venueId: body.venueId,
        venueName: venue.name,
        functionDate: body.functionDate,
        functionDay: getDayName(body.functionDate),
        programme: body.programme,
        numberOfGuests: body.numberOfGuests,
        specialInstructions: body.specialInstructions,
        internalNotes: body.internalNotes,
        subtotal,
        discount: body.discount,
        taxAmount: 0,
        grandTotal,
        advancePaid: cappedAdvance,
        remainingBalance,
        status,
        paymentStatus,
        createdBy: body.createdBy,
        createdAt: now,
        updatedAt: now,
        lineItems: {
          create: services.map((s) => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            guestCount: s.guestCount,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            total: s.total,
            enteredBy: s.enteredBy,
            enteredAt: s.enteredAt,
            isEventDayAddition: s.isEventDayAddition ?? false,
          })),
        },
      },
      include: { customer: true, lineItems: true },
    });

    if (needsDiscountApproval(subtotal, body.discount, settings.discountApprovalThresholdPercent)) {
      await tx.approvalRecord.create({
        data: {
          id: `ap${Date.now()}`,
          entityType: 'Booking',
          entityId: bookingNumber,
          requestType: 'discount',
          requestedBy: body.createdBy,
          status: 'pending',
          reason: `Discount of Rs. ${body.discount.toLocaleString()} exceeds ${settings.discountApprovalThresholdPercent}% threshold`,
          createdAt: now,
          details: `${bookingNumber} — ${customer.name}`,
        },
      });
    }

    if (cappedAdvance > 0) {
      const paymentId = `p${Date.now()}`;
      await tx.paymentRecord.create({
        data: {
          id: paymentId,
          bookingId: booking.id,
          bookingNumber,
          amount: cappedAdvance,
          method: 'cash',
          paymentDate: now.split('T')[0],
          receivedBy: body.createdBy,
          customerName: customer.name,
        },
      });
      const receiptCount = await tx.receiptRecord.count();
      await tx.receiptRecord.create({
        data: {
          id: `r${Date.now()}`,
          receiptNumber: `RCP-${1000 + receiptCount + 1}`,
          bookingId: booking.id,
          bookingNumber,
          customerName: customer.name,
          functionDate: body.functionDate,
          venueName: venue.name,
          amount: cappedAdvance,
          previousBalance: grandTotal,
          newBalance: remainingBalance,
          method: 'cash',
          paymentDate: now.split('T')[0],
          receivedBy: body.createdBy,
          createdAt: now,
        },
      });
    }

    return booking;
  });

  await appendAuditLog({
    action: 'Created',
    entity: 'Booking',
    entityId: bookingNumber,
    performedBy: body.createdBy,
    details: `New booking for ${customer.name} at ${venue.name} on ${body.functionDate}`,
  });

  if (status === 'pending_review') {
    await appendNotification({
      title: 'Discount Approval Required',
      message: `Booking ${bookingNumber} requires manager approval.`,
      type: 'warning',
      link: '/manager/approvals',
    });
  }

  return mapBooking(created);
}

export async function updateBookingStatus(id: string, status: BookingStatus, by: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError('Booking not found', 404);

  const nextStatus = parseBookingStatus(status);
  assertValidStatusTransition(booking.status as BookingStatus, nextStatus);

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: nextStatus, lastUpdatedBy: by, updatedAt: new Date().toISOString() },
    include: { customer: true, lineItems: true },
  });

  await appendAuditLog({
    action: 'Status Changed',
    entity: 'Booking',
    entityId: booking.bookingNumber,
    performedBy: by,
    details: `Status: ${booking.status} → ${nextStatus}`,
  });

  return mapBooking(updated);
}

export async function updateBookingCharges(
  id: string,
  services: LineItemInput[],
  discount: number,
  by: string,
  reason?: string,
) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError('Booking not found', 404);
  if (!isFinanciallyEditable(booking.status as BookingStatus)) {
    throw new ApiError('Booking is locked for financial edits', 403);
  }
  const normalizedServices = validateAndNormalizeLineItems(services);

  const { subtotal, grandTotal } = calculateBookingTotals(normalizedServices, discount);
  const remainingBalance = calculateRemainingBalance(grandTotal, booking.advancePaid);
  const paymentStatus = derivePaymentStatus(grandTotal, booking.advancePaid);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.bookingLineItem.deleteMany({ where: { bookingId: id } });
    return tx.booking.update({
      where: { id },
      data: {
        subtotal,
        discount,
        grandTotal,
        remainingBalance,
        paymentStatus,
        lastUpdatedBy: by,
        updatedAt: new Date().toISOString(),
        lineItems: {
          create: normalizedServices.map((s) => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            guestCount: s.guestCount,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            total: s.total,
            enteredBy: s.enteredBy,
            enteredAt: s.enteredAt,
            isEventDayAddition: s.isEventDayAddition ?? false,
          })),
        },
      },
      include: { customer: true, lineItems: true },
    });
  });

  await appendAuditLog({
    action: 'Amount Changed',
    entity: 'Booking',
    entityId: booking.bookingNumber,
    performedBy: by,
    details: reason || `Booking total updated`,
    oldValue: `Rs. ${booking.grandTotal.toLocaleString()}`,
    newValue: `Rs. ${grandTotal.toLocaleString()}`,
    reason,
  });

  return mapBooking(updated);
}

export async function requestCancellation(id: string, reason: string, by: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { customer: true } });
  if (!booking) throw new ApiError('Booking not found', 404);
  if (['cancelled', 'cancellation_requested', 'completed'].includes(booking.status)) {
    throw new ApiError('Cancellation cannot be requested for this booking', 400);
  }

  const now = new Date().toISOString();
  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: {
        status: 'cancellation_requested',
        lastUpdatedBy: by,
        updatedAt: now,
      },
    }),
    prisma.approvalRecord.create({
      data: {
        id: `ap${Date.now()}`,
        entityType: 'Booking',
        entityId: booking.bookingNumber,
        requestType: 'cancellation',
        requestedBy: by,
        status: 'pending',
        reason: reason || `Cancellation requested`,
        createdAt: now,
        details: `${booking.bookingNumber} — ${booking.customer.name}`,
      },
    }),
  ]);

  await appendAuditLog({
    action: 'Cancellation Requested',
    entity: 'Booking',
    entityId: booking.bookingNumber,
    performedBy: by,
    details: reason || 'Cancellation requested',
  });

  await appendNotification({
    title: 'Cancellation Approval Required',
    message: `${booking.bookingNumber} needs manager approval.`,
    type: 'warning',
    link: '/manager/approvals',
  });

  return getBookingById(id);
}

export async function addPayment(body: {
  bookingId: string;
  amount: number;
  method: string;
  receivedBy: string;
  transactionRef?: string;
  notes?: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: body.bookingId },
    include: { customer: true },
  });
  if (!booking) throw new ApiError('Booking not found', 404);
  if (!isFinanciallyEditable(booking.status as BookingStatus)) {
    throw new ApiError('Booking is locked for payments', 403);
  }
  if (booking.remainingBalance <= 0) throw new ApiError('Booking is fully paid', 400);

  const amount = Math.min(body.amount, booking.remainingBalance);
  if (amount <= 0) throw new ApiError('Invalid payment amount', 400);

  const previousBalance = booking.remainingBalance;
  const newAdvance = booking.advancePaid + amount;
  const newBalance = calculateRemainingBalance(booking.grandTotal, newAdvance);
  const paymentStatus = derivePaymentStatus(booking.grandTotal, newAdvance);
  const now = new Date().toISOString();
  const paymentId = `p${Date.now()}`;

  const receiptCount = await prisma.receiptRecord.count();
  const receipt = {
    id: `r${Date.now()}`,
    receiptNumber: `RCP-${1000 + receiptCount + 1}`,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    customerName: booking.customer.name,
    functionDate: booking.functionDate,
    venueName: booking.venueName,
    amount,
    previousBalance,
    newBalance,
    method: body.method,
    paymentDate: now.split('T')[0],
    receivedBy: body.receivedBy,
    createdAt: now,
  };

  await prisma.$transaction([
    prisma.paymentRecord.create({
      data: {
        id: paymentId,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount,
        method: body.method,
        paymentDate: now.split('T')[0],
        receivedBy: body.receivedBy,
        transactionRef: body.transactionRef,
        notes: body.notes,
        customerName: booking.customer.name,
      },
    }),
    prisma.receiptRecord.create({ data: receipt }),
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        advancePaid: newAdvance,
        remainingBalance: newBalance,
        paymentStatus,
        updatedAt: now,
      },
    }),
  ]);

  await appendAuditLog({
    action: 'Payment Received',
    entity: 'Payment',
    entityId: paymentId,
    performedBy: body.receivedBy,
    details: `Rs. ${amount.toLocaleString()} received for ${booking.bookingNumber}`,
  });

  return {
    payment: {
      id: paymentId,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      amount,
      method: body.method,
      paymentDate: now.split('T')[0],
      receivedBy: body.receivedBy,
      transactionRef: body.transactionRef,
      notes: body.notes,
      customerName: booking.customer.name,
    },
    receipt,
  };
}

export async function approveRequest(id: string, approved: boolean, notes: string, by: string) {
  const approval = await prisma.approvalRecord.findUnique({ where: { id } });
  if (!approval) throw new ApiError('Approval not found', 404);
  if (approval.status !== 'pending') throw new ApiError('Approval already processed', 400);

  const now = new Date().toISOString();
  await prisma.approvalRecord.update({
    where: { id },
    data: {
      status: approved ? 'approved' : 'rejected',
      decisionNotes: notes,
      approvedBy: by,
      approvedAt: now,
    },
  });

  if (approval.entityType === 'Booking' && approval.requestType === 'discount') {
    await prisma.booking.updateMany({
      where: { bookingNumber: approval.entityId },
      data: { status: approved ? 'confirmed' : 'rejected', updatedAt: now },
    });
  }

  if (approval.entityType === 'Booking' && approval.requestType === 'cancellation') {
    await prisma.booking.updateMany({
      where: { bookingNumber: approval.entityId },
      data: { status: approved ? 'cancelled' : 'confirmed', updatedAt: now },
    });
  }

  if (approval.entityType === 'Expense') {
    await prisma.expenseRecord.update({
      where: { id: approval.entityId },
      data: { approvalStatus: approved ? 'approved' : 'rejected' },
    });
  }

  await appendAuditLog({
    action: approved ? 'Approved' : 'Rejected',
    entity: 'Approval',
    entityId: id,
    performedBy: by,
    details: notes || `Approval ${approved ? 'granted' : 'denied'}`,
  });
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  address: string;
  fatherHusbandName?: string;
  cnic?: string;
  email?: string;
}) {
  const customer = await prisma.customer.create({
    data: {
      id: `c${Date.now()}`,
      name: sanitizeText(data.name, 200),
      phone: data.phone.trim(),
      address: sanitizeText(data.address, 500),
      fatherHusbandName: data.fatherHusbandName ? sanitizeText(data.fatherHusbandName, 200) : undefined,
      cnic: data.cnic?.trim(),
      email: data.email?.trim().toLowerCase(),
      createdAt: new Date().toISOString().split('T')[0],
    },
  });
  return customer;
}

function lineItemsToInput(
  items: { serviceId: string; serviceName: string; guestCount: number | null; quantity: number; unitPrice: number; total: number; enteredBy: string | null; enteredAt: string | null; isEventDayAddition: boolean }[],
): LineItemInput[] {
  return items.map((s) => ({
    serviceId: s.serviceId,
    serviceName: s.serviceName,
    guestCount: s.guestCount ?? undefined,
    quantity: s.quantity,
    unitPrice: s.unitPrice,
    total: s.total,
    enteredBy: s.enteredBy ?? undefined,
    enteredAt: s.enteredAt ?? undefined,
    isEventDayAddition: s.isEventDayAddition,
  }));
}

export async function addExpense(data: {
  category: string;
  amount: number;
  date: string;
  description: string;
  method: string;
  addedBy: string;
}) {
  const approvalStatus = data.amount > 50000 ? 'pending' : 'approved';
  const expenseId = `e${Date.now()}`;
  const now = new Date().toISOString();

  await prisma.expenseRecord.create({
    data: {
      id: expenseId,
      category: data.category,
      amount: data.amount,
      date: data.date,
      description: data.description,
      method: data.method,
      addedBy: data.addedBy,
      approvalStatus,
    },
  });

  if (approvalStatus === 'pending') {
    await prisma.approvalRecord.create({
      data: {
        id: `ap${Date.now()}`,
        entityType: 'Expense',
        entityId: expenseId,
        requestType: 'expense',
        requestedBy: data.addedBy,
        status: 'pending',
        reason: `Expense above threshold: ${data.description}`,
        createdAt: now,
        details: `${data.category} — Rs. ${data.amount.toLocaleString()}`,
      },
    });
  }

  return {
    id: expenseId,
    ...data,
    approvalStatus,
  };
}

export async function addBookingServiceItem(
  bookingId: string,
  particular: string,
  amount: number,
  by: string,
  guestCount?: number,
) {
  if (!particular.trim() || amount <= 0) throw new ApiError('Invalid item', 400);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { lineItems: true, customer: true },
  });
  if (!booking) throw new ApiError('Booking not found', 404);
  if (!isFinanciallyEditable(booking.status as BookingStatus)) {
    throw new ApiError('Booking is locked for financial edits', 403);
  }

  const now = new Date().toISOString();
  const services = validateAndNormalizeLineItems([
    ...lineItemsToInput(booking.lineItems),
    {
      serviceId: `event-day-${Date.now()}`,
      serviceName: particular.trim(),
      guestCount,
      quantity: 1,
      unitPrice: amount,
      total: amount,
      enteredBy: by,
      enteredAt: now,
      isEventDayAddition: true,
    },
  ]);

  const { subtotal, grandTotal } = calculateBookingTotals(services, booking.discount);
  const remainingBalance = calculateRemainingBalance(grandTotal, booking.advancePaid);
  const paymentStatus = derivePaymentStatus(grandTotal, booking.advancePaid);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.bookingLineItem.deleteMany({ where: { bookingId } });
    return tx.booking.update({
      where: { id: bookingId },
      data: {
        subtotal,
        grandTotal,
        remainingBalance,
        paymentStatus,
        lastUpdatedBy: by,
        updatedAt: now,
        lineItems: {
          create: services.map((s) => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            guestCount: s.guestCount,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            total: s.total,
            enteredBy: s.enteredBy,
            enteredAt: s.enteredAt,
            isEventDayAddition: s.isEventDayAddition ?? false,
          })),
        },
      },
      include: { customer: true, lineItems: true },
    });
  });

  await appendAuditLog({
    action: 'Event Day Item Added',
    entity: 'BookingCharge',
    entityId: booking.bookingNumber,
    performedBy: by,
    details: `${particular.trim()} — Rs. ${amount.toLocaleString()} added on event day`,
    newValue: `Rs. ${amount.toLocaleString()}`,
  });

  return mapBooking(updated);
}

export async function addEventExpense(data: {
  bookingId: string;
  category: string;
  amount: number;
  description?: string;
  addedBy: string;
}) {
  if (data.amount <= 0 || !data.category.trim()) throw new ApiError('Invalid expense', 400);

  const booking = await prisma.booking.findUnique({ where: { id: data.bookingId } });
  if (!booking) throw new ApiError('Booking not found', 404);
  if (!isFinanciallyEditable(booking.status as BookingStatus)) {
    throw new ApiError('Booking is locked', 403);
  }

  const now = new Date().toISOString();
  const expense = await prisma.eventExpenseRecord.create({
    data: {
      id: `ee${Date.now()}`,
      bookingId: data.bookingId,
      category: data.category,
      amount: data.amount,
      description: data.description,
      addedBy: data.addedBy,
      addedAt: now,
    },
  });

  await appendAuditLog({
    action: 'Event Expense Added',
    entity: 'EventExpense',
    entityId: booking.bookingNumber,
    performedBy: data.addedBy,
    details: `${data.category} — Rs. ${data.amount.toLocaleString()} for ${booking.bookingNumber}`,
    newValue: `Rs. ${data.amount.toLocaleString()}`,
  });

  return expense;
}

export async function updateEventExpense(
  id: string,
  data: { category?: string; amount?: number; description?: string },
  by: string,
) {
  const expense = await prisma.eventExpenseRecord.findUnique({ where: { id } });
  if (!expense) throw new ApiError('Event expense not found', 404);
  if (data.amount !== undefined && data.amount <= 0) throw new ApiError('Invalid amount', 400);

  const booking = await prisma.booking.findUnique({ where: { id: expense.bookingId } });
  if (!booking) throw new ApiError('Booking not found', 404);
  if (!isFinanciallyEditable(booking.status as BookingStatus)) {
    throw new ApiError('Booking is locked', 403);
  }

  const updated = await prisma.eventExpenseRecord.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date().toISOString(),
    },
  });

  await appendAuditLog({
    action: 'Event Expense Updated',
    entity: 'EventExpense',
    entityId: booking.bookingNumber,
    performedBy: by,
    details: `Updated ${expense.category} expense for ${booking.bookingNumber}`,
    oldValue: `Rs. ${expense.amount.toLocaleString()}`,
    newValue: data.amount != null ? `Rs. ${data.amount.toLocaleString()}` : undefined,
  });

  return updated;
}

export async function deleteEventExpense(id: string, by: string) {
  const expense = await prisma.eventExpenseRecord.findUnique({ where: { id } });
  if (!expense) throw new ApiError('Event expense not found', 404);

  const booking = await prisma.booking.findUnique({ where: { id: expense.bookingId } });
  if (!booking) throw new ApiError('Booking not found', 404);
  if (!isFinanciallyEditable(booking.status as BookingStatus)) {
    throw new ApiError('Booking is locked', 403);
  }

  await prisma.eventExpenseRecord.delete({ where: { id } });

  await appendAuditLog({
    action: 'Event Expense Deleted',
    entity: 'EventExpense',
    entityId: booking.bookingNumber,
    performedBy: by,
    details: `Removed ${expense.category} — Rs. ${expense.amount.toLocaleString()}`,
  });

  return { ok: true };
}
