import { describe, expect, it } from 'vitest';
import type { Booking, EventExpense, Expense, Payment } from '../types';
import { buildReportPeriod, generateBanquetReport } from './reportEngine';
import { demoToday } from '../data/initialData';

const customer = {
  id: 'c1',
  name: 'Test Customer',
  phone: '0300-0000000',
  address: 'Karachi',
  createdAt: '2026-01-01',
};

const baseBooking = (overrides: Partial<Booking>): Booking =>
  ({
    id: 'b-test',
    bookingNumber: 'SB-9001',
    serialNumber: 9001,
    bookingDate: demoToday,
    customer,
    venueId: 'va-red',
    venueName: 'A Red',
    functionDate: demoToday,
    functionDay: 'Friday',
    programme: 'Wedding',
    numberOfGuests: 200,
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 100000, total: 100000 },
      { serviceId: 's4', serviceName: 'Cold Drinks', quantity: 100, unitPrice: 150, total: 15000 },
    ],
    subtotal: 115000,
    discount: 0,
    taxAmount: 0,
    grandTotal: 115000,
    advancePaid: 50000,
    remainingBalance: 65000,
    status: 'confirmed',
    paymentStatus: 'partially_paid',
    createdBy: 'Test',
    createdAt: `${demoToday}T09:00:00`,
    updatedAt: `${demoToday}T09:00:00`,
    ...overrides,
  }) as Booking;

describe('reportEngine', () => {
  it('does not double-count service lines in cash receipts', () => {
    const booking = baseBooking({});
    const payments: Payment[] = [
      {
        id: 'p1',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 50000,
        method: 'cash',
        paymentDate: demoToday,
        receivedBy: 'Staff',
        customerName: customer.name,
      },
    ];
    const period = buildReportPeriod('daily', demoToday);
    const report = generateBanquetReport(
      { bookings: [booking], payments, expenses: [], eventExpenses: [] },
      period,
    );

    expect(report.financialSummary.totalBilled).toBe(115000);
    expect(report.financialSummary.cashReceivedInPeriod).toBe(50000);
    expect(report.financialSummary.totalReceipts).toBe(50000);
    expect(report.financialSummary.cateringServiceTotal).toBe(15000);
    // Cash received must NOT include catering service totals
    expect(report.financialSummary.cashReceivedInPeriod).toBeLessThan(
      report.financialSummary.totalBilled + report.financialSummary.cateringServiceTotal,
    );
  });

  it('separates billed amount, paid, and outstanding on events today', () => {
    const booking = baseBooking({
      services: [
        { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 100000, total: 100000 },
        {
          serviceId: 'ed1',
          serviceName: 'Extra Chairs',
          quantity: 1,
          unitPrice: 10000,
          total: 10000,
          isEventDayAddition: true,
        },
      ],
      subtotal: 110000,
      grandTotal: 110000,
      advancePaid: 40000,
      remainingBalance: 70000,
    });
    const payments: Payment[] = [
      {
        id: 'p1',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 40000,
        method: 'cash',
        paymentDate: demoToday,
        receivedBy: 'Staff',
        customerName: customer.name,
      },
    ];
    const eventExpenses: EventExpense[] = [
      {
        id: 'ee1',
        bookingId: booking.id,
        category: 'Staff',
        amount: 5000,
        addedBy: 'Staff',
        addedAt: `${demoToday}T14:00:00`,
      },
    ];

    const period = buildReportPeriod('daily', demoToday);
    const report = generateBanquetReport(
      { bookings: [booking], payments, expenses: [], eventExpenses },
      period,
    );

    const party = report.partiesOfDay[0];
    expect(party.bookingAmount).toBe(100000);
    expect(party.additionalCharges).toBe(10000);
    expect(party.totalBill).toBe(110000);
    expect(party.totalPaid).toBe(40000);
    expect(party.outstandingBalance).toBe(70000);
    expect(party.eventExpenses).toBe(5000);
    expect(party.eventGrossProfit).toBe(105000);
    expect(party.eventCashProfit).toBe(35000);

    expect(report.financialSummary.totalBilled).toBe(110000);
    expect(report.financialSummary.totalOutstandingOnEvents).toBe(70000);
    expect(report.financialSummary.totalEventExpenses).toBe(5000);
  });

  it('links event expenses to the correct booking in the ledger', () => {
    const booking = baseBooking({});
    const eventExpenses: EventExpense[] = [
      {
        id: 'ee1',
        bookingId: booking.id,
        category: 'Decoration',
        amount: 8000,
        description: 'Flowers',
        addedBy: 'Staff',
        addedAt: `${demoToday}T12:00:00`,
      },
    ];
    const period = buildReportPeriod('daily', demoToday);
    const report = generateBanquetReport(
      { bookings: [booking], payments: [], expenses: [], eventExpenses },
      period,
    );

    const row = report.expenseLedger.find((e) => e.source === 'Event Cost');
    expect(row?.linkedBooking).toBe('SB-9001');
    expect(row?.category).toBe('Decoration');
    expect(row?.amount).toBe(8000);
  });

  it('labels first payment as advance and later same-day balance as event day payment', () => {
    const booking = baseBooking({
      grandTotal: 180000,
      advancePaid: 180000,
      remainingBalance: 0,
      paymentStatus: 'paid',
    });
    const payments: Payment[] = [
      {
        id: 'p1',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 80000,
        method: 'cash',
        paymentDate: demoToday,
        receivedBy: 'Staff',
        customerName: customer.name,
      },
      {
        id: 'p2',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 100000,
        method: 'cash',
        paymentDate: demoToday,
        receivedBy: 'Staff',
        customerName: customer.name,
      },
    ];

    const period = buildReportPeriod('daily', demoToday);
    const report = generateBanquetReport(
      { bookings: [booking], payments, expenses: [], eventExpenses: [] },
      period,
    );

    const types = report.paymentLedger.map((p) => p.paymentType);
    expect(types).toEqual(['Booking Advance', 'Event Day Payment']);
  });

  it('labels intermediate payments as installments', () => {
    const booking = baseBooking({
      bookingDate: '2026-09-01',
      functionDate: demoToday,
      grandTotal: 180000,
    });
    const payments: Payment[] = [
      {
        id: 'p1',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 80000,
        method: 'cash',
        paymentDate: '2026-09-01',
        receivedBy: 'Staff',
        customerName: customer.name,
      },
      {
        id: 'p2',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 50000,
        method: 'cash',
        paymentDate: '2026-09-05',
        receivedBy: 'Staff',
        customerName: customer.name,
      },
      {
        id: 'p3',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 50000,
        method: 'cash',
        paymentDate: demoToday,
        receivedBy: 'Staff',
        customerName: customer.name,
      },
    ];

    const period = buildReportPeriod('monthly', demoToday);
    const report = generateBanquetReport(
      { bookings: [booking], payments, expenses: [], eventExpenses: [] },
      period,
    );

    expect(report.paymentLedger.map((p) => p.paymentType)).toEqual([
      'Booking Advance',
      'Installment',
      'Event Day Payment',
    ]);
  });

  it('computes net cash movement from payments minus all expenses', () => {
    const booking = baseBooking({});
    const payments: Payment[] = [
      {
        id: 'p1',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount: 50000,
        method: 'cash',
        paymentDate: demoToday,
        receivedBy: 'Staff',
        customerName: customer.name,
      },
    ];
    const expenses: Expense[] = [
      {
        id: 'e1',
        category: 'Electricity',
        amount: 10000,
        date: demoToday,
        description: 'Bill',
        method: 'cash',
        addedBy: 'Manager',
        approvalStatus: 'approved',
      },
    ];
    const eventExpenses: EventExpense[] = [
      {
        id: 'ee1',
        bookingId: booking.id,
        category: 'Staff',
        amount: 3000,
        addedBy: 'Staff',
        addedAt: `${demoToday}T12:00:00`,
      },
    ];

    const period = buildReportPeriod('daily', demoToday);
    const report = generateBanquetReport(
      { bookings: [booking], payments, expenses, eventExpenses },
      period,
    );

    expect(report.financialSummary.cashReceivedInPeriod).toBe(50000);
    expect(report.financialSummary.totalExpenses).toBe(13000);
    expect(report.financialSummary.netCashMovement).toBe(37000);
  });
});
