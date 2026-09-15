import type { Booking, Payment, Expense, EventExpense } from '../types';
import { computeEventBilling } from './eventDayUtils';
import {
  type HallKey,
  isCateringService,
  isEntrySoundService,
  REPORT_EXPENSE_LINES,
  type ReportExpenseLine,
  mapExpenseToReportLine,
  mapEventExpenseToReportLine,
} from './reportCategories';
import { mapVenueToHallGroup } from './venueConfig';

export type ReportPeriodType = 'daily' | 'monthly' | 'annual' | 'custom';
export type PaymentType = 'Booking Advance' | 'Event Day Payment' | 'Installment';

export interface ReportPeriod {
  type: ReportPeriodType;
  startDate: string;
  endDate: string;
  label: string;
  dayName?: string;
}

export interface BookingPartyRow {
  serialNo: number;
  bookingDate: string;
  eventDate: string;
  venueName: string;
  hallLabel: string;
  customerName: string;
  programme: string;
  hallA: number;
  hallB: number;
  hallC: number;
  bookingAmount: number;
  additionalCharges: number;
  totalAmount: number;
  advance: number;
  balance: number;
  remarks: string;
  bookingNumber: string;
  bookingId: string;
}

export interface PartyOfDayRow {
  serialNo: number;
  date: string;
  venueName: string;
  hallLabel: string;
  customerName: string;
  programme: string;
  hallA: number;
  hallB: number;
  hallC: number;
  /** Original contract amount (before event-day additions) */
  bookingAmount: number;
  /** Event-day additional charges added to the bill */
  additionalCharges: number;
  /** Final customer bill (grand total) */
  totalBill: number;
  /** @deprecated alias for totalBill */
  receivableAmount: number;
  /** All payments received for this event up to period end */
  totalPaid: number;
  /** Payments received during this report period only */
  receivedInPeriod: number;
  /** @deprecated use totalPaid — kept for legacy CSV columns */
  received: number;
  /** Amount still due on the bill */
  outstandingBalance: number;
  /** @deprecated alias for outstandingBalance */
  balance: number;
  /** Business costs logged against this event */
  eventExpenses: number;
  /** Bill minus event costs (margin on paper) */
  eventGrossProfit: number;
  /** Cash collected minus event costs */
  eventCashProfit: number;
  /** @deprecated alias for eventGrossProfit */
  eventProfit: number;
  remarks: string;
  bookingNumber: string;
  bookingId: string;
}

export interface HallIncomeRow {
  hall: HallKey;
  amount: number;
  expense: number;
  balance: number;
}

export interface ServiceDetailRow {
  bookingNumber: string;
  customerName: string;
  venueName: string;
  functionDate: string;
  serviceName: string;
  amount: number;
}

export interface PaymentLedgerRow {
  paymentDate: string;
  bookingNumber: string;
  customerName: string;
  venueName: string;
  functionDate: string;
  amount: number;
  method: string;
  paymentType: PaymentType;
  receivedBy: string;
  notes?: string;
}

export interface ExpenseLedgerRow {
  date: string;
  category: string;
  description: string;
  amount: number;
  source: 'Office Expense' | 'Event Cost';
  linkedBooking?: string;
  linkedCustomer?: string;
  linkedVenue?: string;
  linkedEventDate?: string;
}

export interface EventProfitRow {
  bookingNumber: string;
  customerName: string;
  venueName: string;
  functionDate: string;
  bookingAmount: number;
  additionalCharges: number;
  finalBill: number;
  totalPaid: number;
  receivedInPeriod: number;
  eventExpenses: number;
  outstandingBalance: number;
  eventGrossProfit: number;
  eventCashProfit: number;
  /** @deprecated */
  paymentsReceived: number;
  /** @deprecated */
  eventProfit: number;
}

export interface ExpenseBreakdownRow {
  category: ReportExpenseLine;
  amount: number;
}

export interface DailySummaryRow {
  date: string;
  cashReceived: number;
  expenses: number;
  netMovement: number;
}

export interface MonthlySummaryRow {
  month: string;
  monthLabel: string;
  cashReceived: number;
  expenses: number;
  netMovement: number;
}

export interface BanquetReportData {
  period: ReportPeriod;
  generatedAt: string;
  bookingParties: BookingPartyRow[];
  partiesOfDay: PartyOfDayRow[];
  catering: HallIncomeRow[];
  entrySound: HallIncomeRow[];
  cateringDetails: ServiceDetailRow[];
  entrySoundDetails: ServiceDetailRow[];
  paymentLedger: PaymentLedgerRow[];
  expenseLedger: ExpenseLedgerRow[];
  eventProfitSummary: EventProfitRow[];
  financialSummary: {
    openingBalance: number;
    openingBalanceDefinition: string;
    /** Count of events occurring in this period */
    eventCount: number;
    /** Count of new bookings entered in this period */
    bookingsEnteredCount: number;
    /** Sum of original booking amounts for events in period */
    totalOriginalBookingAmount: number;
    /** Sum of event-day additional charges on period events */
    totalAdditionalCharges: number;
    /** Total billed to customers for events in period (= sum of grand totals) */
    totalBilled: number;
    /** Total still outstanding on period events */
    totalOutstandingOnEvents: number;
    /** Total business costs logged against period events */
    totalEventExpenses: number;
    /** Total billed − event costs (accrual margin on events) */
    totalEventGrossProfit: number;
    /** All cash received during the period (single source of truth) */
    cashReceivedInPeriod: number;
    cashReceivedBreakdown: {
      bookingAdvances: number;
      eventDayPayments: number;
      installments: number;
    };
    totalOfficeExpenses: number;
    totalExpenses: number;
    expenseBreakdown: ExpenseBreakdownRow[];
    netCashMovement: number;
    closingBalance: number;
    closingBalanceDefinition: string;
    /** Event gross profit minus office overheads in period */
    netBusinessProfit: number;
    netBusinessProfitDefinition: string;
    /** Advances collected when new bookings were entered in period */
    bookingPaymentsReceived: number;
    /** Non-advance payments collected in period for events occurring in period */
    partyPaymentsReceived: number;
    /** Service breakdown — amounts already included in event bills (not extra cash) */
    cateringServiceTotal: number;
    entrySoundServiceTotal: number;
    /** @deprecated use cashReceivedInPeriod */
    cateringIncome: number;
    /** @deprecated use cashReceivedInPeriod */
    entrySoundIncome: number;
    /** @deprecated use totalBilled */
    totalBookingValue: number;
    /** @deprecated use cashReceivedInPeriod */
    totalReceipts: number;
    /** @deprecated use netCashMovement */
    netProfitLoss: number;
  };
  dailyBreakdown: DailySummaryRow[];
  monthlyBreakdown: MonthlySummaryRow[];
  reportRemarks: string;
  totals: {
    bookingParties: {
      hallA: number;
      hallB: number;
      hallC: number;
      bookingAmount: number;
      additionalCharges: number;
      totalAmount: number;
      advance: number;
      balance: number;
    };
    partiesOfDay: {
      hallA: number;
      hallB: number;
      hallC: number;
      bookingAmount: number;
      additionalCharges: number;
      totalBill: number;
      /** @deprecated */
      receivable: number;
      totalPaid: number;
      receivedInPeriod: number;
      /** @deprecated */
      received: number;
      eventExpenses: number;
      eventGrossProfit: number;
      eventCashProfit: number;
      /** @deprecated */
      eventProfit: number;
      outstandingBalance: number;
      /** @deprecated */
      balance: number;
    };
    catering: { amount: number; expense: number; balance: number };
    entrySound: { amount: number; expense: number; balance: number };
  };
}

export interface ReportDataSources {
  bookings: Booking[];
  payments: Payment[];
  expenses: Expense[];
  eventExpenses: EventExpense[];
}

const ACTIVE_BOOKING_STATUSES = new Set([
  'inquiry',
  'pending_review',
  'tentative',
  'hold',
  'confirmed',
  'completed',
]);

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function isBeforeDate(date: string, before: string): boolean {
  return date < before;
}

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

const HALL_GROUPS: HallKey[] = ['A', 'B', 'C'];

function hallAmountColumns(
  venueName: string,
  amount: number,
): { hallA: number; hallB: number; hallC: number } {
  const group = mapVenueToHallGroup(venueName);
  return {
    hallA: group === 'A' ? amount : 0,
    hallB: group === 'B' ? amount : 0,
    hallC: group === 'C' ? amount : 0,
  };
}

function buildReportRemarks(bookingParties: BookingPartyRow[], partiesOfDay: PartyOfDayRow[]): string {
  const lines: string[] = [];
  partiesOfDay.forEach((p) => {
    lines.push(`${p.venueName} — ${p.customerName} — ${p.programme} (${p.bookingNumber})`);
  });
  bookingParties.forEach((b) => {
    if (!partiesOfDay.some((p) => p.bookingId === b.bookingId)) {
      lines.push(`New booking: ${b.venueName} — ${b.customerName} — Event ${b.eventDate} (${b.bookingNumber})`);
    }
  });
  return lines.join(' · ') || '';
}

function hallLabel(venueName: string): string {
  return venueName;
}

function buildRemarks(booking: Booking): string {
  const parts: string[] = [];
  if (booking.internalNotes) parts.push(booking.internalNotes);
  if (booking.specialInstructions) parts.push(booking.specialInstructions);
  return parts.join(' · ') || '—';
}

function sumPayments(payments: Payment[], filter: (p: Payment) => boolean): number {
  return payments.filter(filter).reduce((sum, p) => sum + p.amount, 0);
}

function getBookingById(bookings: Booking[], id: string): Booking | undefined {
  return bookings.find((b) => b.id === id);
}

function classifyPayment(booking: Booking, payment: Payment, allPayments: Payment[]): PaymentType {
  const bookingPayments = allPayments
    .filter((p) => p.bookingId === booking.id)
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate) || a.id.localeCompare(b.id));

  const isFirst = bookingPayments[0]?.id === payment.id;

  // Later payments on event day — including balance cleared same day as booking
  if (payment.paymentDate === booking.functionDate && (!isFirst || booking.bookingDate !== booking.functionDate)) {
    return 'Event Day Payment';
  }

  // Initial advance — first payment on booking date, or first payment overall
  if (isFirst) return 'Booking Advance';

  return 'Installment';
}

function getBookingAdvance(booking: Booking, payments: Payment[]): number {
  return sumPayments(
    payments,
    (p) => p.bookingId === booking.id && p.paymentDate === booking.bookingDate,
  );
}

function getTotalPaidForBooking(booking: Booking, payments: Payment[], asOfDate?: string): number {
  return sumPayments(payments, (p) => {
    if (p.bookingId !== booking.id) return false;
    if (asOfDate && p.paymentDate > asOfDate) return false;
    return true;
  });
}

function getPaymentsInPeriodForBooking(
  booking: Booking,
  payments: Payment[],
  period: ReportPeriod,
): Payment[] {
  return payments.filter(
    (p) =>
      p.bookingId === booking.id &&
      isDateInRange(p.paymentDate, period.startDate, period.endDate),
  );
}

function buildPaymentLedger(
  bookings: Booking[],
  payments: Payment[],
  period: ReportPeriod,
): PaymentLedgerRow[] {
  return payments
    .filter((p) => isDateInRange(p.paymentDate, period.startDate, period.endDate))
    .map((p) => {
      const booking = getBookingById(bookings, p.bookingId);
      return {
        paymentDate: p.paymentDate,
        bookingNumber: p.bookingNumber,
        customerName: p.customerName,
        venueName: booking?.venueName ?? '—',
        functionDate: booking?.functionDate ?? '—',
        amount: p.amount,
        method: p.method,
        paymentType: booking ? classifyPayment(booking, p, payments) : 'Installment',
        receivedBy: p.receivedBy,
        notes: p.notes,
      };
    })
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate) || a.bookingNumber.localeCompare(b.bookingNumber));
}

function buildExpenseLedger(
  bookings: Booking[],
  expenses: Expense[],
  eventExpenses: EventExpense[],
  period: ReportPeriod,
): ExpenseLedgerRow[] {
  const rows: ExpenseLedgerRow[] = [];

  expenses
    .filter(
      (e) =>
        e.approvalStatus === 'approved' &&
        isDateInRange(e.date, period.startDate, period.endDate),
    )
    .forEach((e) => {
      rows.push({
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount,
        source: 'Office Expense',
      });
    });

  eventExpenses.forEach((e) => {
    const booking = getBookingById(bookings, e.bookingId);
    if (!booking) return;
    rows.push({
      date: e.addedAt.split('T')[0],
      category: e.category,
      description: e.description ?? '—',
      amount: e.amount,
      source: 'Event Cost',
      linkedBooking: booking.bookingNumber,
      linkedCustomer: booking.customer.name,
      linkedVenue: booking.venueName,
      linkedEventDate: booking.functionDate,
    });
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function buildServiceDetails(
  bookings: Booking[],
  matcher: (name: string) => boolean,
): ServiceDetailRow[] {
  const rows: ServiceDetailRow[] = [];
  bookings.forEach((booking) => {
    booking.services.filter((s) => matcher(s.serviceName)).forEach((s) => {
      rows.push({
        bookingNumber: booking.bookingNumber,
        customerName: booking.customer.name,
        venueName: booking.venueName,
        functionDate: booking.functionDate,
        serviceName: s.serviceName,
        amount: s.total,
      });
    });
  });
  return rows;
}

function sumServiceAmountByGroup(
  bookings: Booking[],
  matcher: (name: string) => boolean,
  group: HallKey,
): number {
  return bookings.reduce((total, booking) => {
    if (mapVenueToHallGroup(booking.venueName) !== group) return total;
    return (
      total +
      booking.services.filter((s) => matcher(s.serviceName)).reduce((sum, s) => sum + s.total, 0)
    );
  }, 0);
}

function sumGroupEventExpenses(
  eventExpenses: EventExpense[],
  bookings: Booking[],
  group: HallKey,
  matcher: (category: string, description?: string) => boolean,
): number {
  const bookingIds = new Set(
    bookings.filter((b) => mapVenueToHallGroup(b.venueName) === group).map((b) => b.id),
  );
  return eventExpenses
    .filter((e) => bookingIds.has(e.bookingId) && matcher(e.category, e.description))
    .reduce((sum, e) => sum + e.amount, 0);
}

function buildGroupHallIncomeRows(
  bookings: Booking[],
  eventExpenses: EventExpense[],
  serviceMatcher: (name: string) => boolean,
  expenseMatcher: (category: string, description?: string) => boolean,
): HallIncomeRow[] {
  return HALL_GROUPS.map((hall) => {
    const amount = sumServiceAmountByGroup(bookings, serviceMatcher, hall);
    const expense = sumGroupEventExpenses(eventExpenses, bookings, hall, expenseMatcher);
    return { hall, amount, expense, balance: amount - expense };
  });
}

function isCateringExpense(category: string, description?: string): boolean {
  const text = `${category} ${description ?? ''}`.toLowerCase();
  return text.includes('catering') || text.includes('food') || text.includes('drink');
}

function isEntrySoundExpense(category: string, description?: string): boolean {
  const text = `${category} ${description ?? ''}`.toLowerCase();
  return text.includes('sound') || text.includes('entry') || text.includes('audio');
}

function computeOpeningBalance(payments: Payment[], expenses: Expense[], startDate: string): number {
  const receiptsBefore = sumPayments(payments, (p) => isBeforeDate(p.paymentDate, startDate));
  const expensesBefore = expenses
    .filter((e) => e.approvalStatus === 'approved' && isBeforeDate(e.date, startDate))
    .reduce((sum, e) => sum + e.amount, 0);
  return receiptsBefore - expensesBefore;
}

function buildExpenseBreakdown(
  expenses: Expense[],
  eventExpenses: EventExpense[],
  period: ReportPeriod,
): ExpenseBreakdownRow[] {
  const totals = new Map<ReportExpenseLine, number>();
  REPORT_EXPENSE_LINES.forEach((line) => totals.set(line, 0));

  expenses
    .filter(
      (e) =>
        e.approvalStatus === 'approved' &&
        isDateInRange(e.date, period.startDate, period.endDate),
    )
    .forEach((e) => {
      const line = mapExpenseToReportLine(e.category, e.description);
      totals.set(line, (totals.get(line) ?? 0) + e.amount);
    });

  eventExpenses.forEach((e) => {
    const line = mapEventExpenseToReportLine(e.category, e.description);
    totals.set(line, (totals.get(line) ?? 0) + e.amount);
  });

  return REPORT_EXPENSE_LINES.map((category) => ({
    category,
    amount: totals.get(category) ?? 0,
  }));
}

function buildBookingRow(
  booking: Booking,
  payments: Payment[],
  period: ReportPeriod,
  index: number,
): BookingPartyRow {
  const billing = computeEventBilling(booking);
  const hallCols = hallAmountColumns(booking.venueName, booking.grandTotal);
  const totalPaid = getTotalPaidForBooking(booking, payments, period.endDate);

  return {
    serialNo: index + 1,
    bookingDate: booking.bookingDate,
    eventDate: booking.functionDate,
    venueName: booking.venueName,
    hallLabel: hallLabel(booking.venueName),
    customerName: booking.customer.name,
    programme: booking.programme,
    ...hallCols,
    bookingAmount: billing.originalBookingAmount,
    additionalCharges: billing.additionalItems,
    totalAmount: booking.grandTotal,
    advance: getBookingAdvance(booking, payments),
    balance: Math.max(0, booking.grandTotal - totalPaid),
    remarks: buildRemarks(booking),
    bookingNumber: booking.bookingNumber,
    bookingId: booking.id,
  };
}

function buildPartyRow(
  booking: Booking,
  payments: Payment[],
  eventExpenses: EventExpense[],
  period: ReportPeriod,
  index: number,
): PartyOfDayRow {
  const billing = computeEventBilling(booking);
  const bookingEventExpenses = eventExpenses.filter((e) => e.bookingId === booking.id);
  const eventExpenseTotal = bookingEventExpenses.reduce((sum, e) => sum + e.amount, 0);
  const hallCols = hallAmountColumns(booking.venueName, booking.grandTotal);
  const totalPaid = getTotalPaidForBooking(booking, payments, period.endDate);
  const receivedInPeriod = getPaymentsInPeriodForBooking(booking, payments, period).reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const outstandingBalance = Math.max(0, booking.grandTotal - totalPaid);
  const eventGrossProfit = booking.grandTotal - eventExpenseTotal;
  const eventCashProfit = totalPaid - eventExpenseTotal;

  return {
    serialNo: index + 1,
    date: booking.functionDate,
    venueName: booking.venueName,
    hallLabel: hallLabel(booking.venueName),
    customerName: booking.customer.name,
    programme: booking.programme,
    ...hallCols,
    bookingAmount: billing.originalBookingAmount,
    additionalCharges: billing.additionalItems,
    totalBill: booking.grandTotal,
    receivableAmount: booking.grandTotal,
    totalPaid,
    receivedInPeriod,
    received: totalPaid,
    outstandingBalance,
    balance: outstandingBalance,
    eventExpenses: eventExpenseTotal,
    eventGrossProfit,
    eventCashProfit,
    eventProfit: eventGrossProfit,
    remarks: buildRemarks(booking),
    bookingNumber: booking.bookingNumber,
    bookingId: booking.id,
  };
}

function buildEventProfitRows(parties: PartyOfDayRow[]): EventProfitRow[] {
  return parties.map((p) => ({
    bookingNumber: p.bookingNumber,
    customerName: p.customerName,
    venueName: p.venueName,
    functionDate: p.date,
    bookingAmount: p.bookingAmount,
    additionalCharges: p.additionalCharges,
    finalBill: p.totalBill,
    totalPaid: p.totalPaid,
    receivedInPeriod: p.receivedInPeriod,
    eventExpenses: p.eventExpenses,
    outstandingBalance: p.outstandingBalance,
    eventGrossProfit: p.eventGrossProfit,
    eventCashProfit: p.eventCashProfit,
    paymentsReceived: p.totalPaid,
    eventProfit: p.eventGrossProfit,
  }));
}

function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function enumerateMonths(start: string, end: string): string[] {
  const months: string[] = [];
  const current = new Date(`${start}T12:00:00`);
  current.setDate(1);
  const last = new Date(`${end}T12:00:00`);
  while (current <= last) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function monthBounds(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function buildReportPeriod(
  type: ReportPeriodType,
  anchorDate: string,
  customEnd?: string,
): ReportPeriod {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  const y = anchor.getFullYear();
  const m = anchor.getMonth();

  if (type === 'daily') {
    const dayName = new Date(`${anchorDate}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'long',
    });
    return { type, startDate: anchorDate, endDate: anchorDate, label: formatDateLabel(anchorDate), dayName };
  }
  if (type === 'monthly') {
    const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return {
      type,
      startDate,
      endDate,
      label: formatMonthLabel(`${y}-${String(m + 1).padStart(2, '0')}`),
    };
  }
  if (type === 'annual') {
    return { type, startDate: `${y}-01-01`, endDate: `${y}-12-31`, label: String(y) };
  }
  const startDate = anchorDate;
  const endDate = customEnd ?? anchorDate;
  return {
    type,
    startDate,
    endDate,
    label: `${formatDateLabel(startDate)} — ${formatDateLabel(endDate)}`,
  };
}

function computeReportCore(
  sources: ReportDataSources,
  period: ReportPeriod,
): Omit<BanquetReportData, 'dailyBreakdown' | 'monthlyBreakdown'> {
  const { bookings, payments, expenses, eventExpenses } = sources;
  const { startDate, endDate } = period;

  const activeBookings = bookings.filter((b) => ACTIVE_BOOKING_STATUSES.has(b.status));
  const bookingPartiesSource = activeBookings.filter((b) =>
    isDateInRange(b.bookingDate, startDate, endDate),
  );
  const partiesOfDaySource = activeBookings.filter((b) =>
    isDateInRange(b.functionDate, startDate, endDate),
  );
  const partyBookingIds = new Set(partiesOfDaySource.map((b) => b.id));

  const bookingParties = bookingPartiesSource.map((b, i) =>
    buildBookingRow(b, payments, period, i),
  );
  const partiesOfDay = partiesOfDaySource.map((b, i) =>
    buildPartyRow(b, payments, eventExpenses, period, i),
  );

  const periodEventExpenses = eventExpenses.filter((e) => partyBookingIds.has(e.bookingId));

  const catering = buildGroupHallIncomeRows(
    partiesOfDaySource,
    periodEventExpenses,
    isCateringService,
    isCateringExpense,
  );
  const entrySound = buildGroupHallIncomeRows(
    partiesOfDaySource,
    periodEventExpenses,
    isEntrySoundService,
    isEntrySoundExpense,
  );

  const cateringDetails = buildServiceDetails(partiesOfDaySource, isCateringService);
  const entrySoundDetails = buildServiceDetails(partiesOfDaySource, isEntrySoundService);
  const paymentLedger = buildPaymentLedger(bookings, payments, period);
  const expenseLedger = buildExpenseLedger(bookings, expenses, periodEventExpenses, period);
  const eventProfitSummary = buildEventProfitRows(partiesOfDay);

  const totalOfficeExpenses = expenseLedger
    .filter((e) => e.source === 'Office Expense')
    .reduce((s, e) => s + e.amount, 0);
  const totalEventExpenses = expenseLedger
    .filter((e) => e.source === 'Event Cost')
    .reduce((s, e) => s + e.amount, 0);
  const expenseBreakdown = buildExpenseBreakdown(expenses, periodEventExpenses, period);
  const totalExpenses = totalOfficeExpenses + totalEventExpenses;

  const openingBalance = computeOpeningBalance(payments, expenses, startDate);

  // ── Billing totals (events occurring in period) ──
  const totalOriginalBookingAmount = partiesOfDay.reduce((s, p) => s + p.bookingAmount, 0);
  const totalAdditionalCharges = partiesOfDay.reduce((s, p) => s + p.additionalCharges, 0);
  const totalBilled = partiesOfDay.reduce((s, p) => s + p.totalBill, 0);
  const totalOutstandingOnEvents = partiesOfDay.reduce((s, p) => s + p.outstandingBalance, 0);
  const totalEventGrossProfit = partiesOfDay.reduce((s, p) => s + p.eventGrossProfit, 0);

  // ── Cash totals (payments in period — single source of truth) ──
  const cashReceivedInPeriod = paymentLedger.reduce((s, p) => s + p.amount, 0);
  const cashReceivedBreakdown = {
    bookingAdvances: paymentLedger
      .filter((p) => p.paymentType === 'Booking Advance')
      .reduce((s, p) => s + p.amount, 0),
    eventDayPayments: paymentLedger
      .filter((p) => p.paymentType === 'Event Day Payment')
      .reduce((s, p) => s + p.amount, 0),
    installments: paymentLedger
      .filter((p) => p.paymentType === 'Installment')
      .reduce((s, p) => s + p.amount, 0),
  };

  const bookingPaymentsReceived = bookingParties.reduce((s, r) => s + r.advance, 0);
  const partyPaymentsReceived = partiesOfDay.reduce((s, p) => s + p.receivedInPeriod, 0);

  const cateringServiceTotal = catering.reduce((s, r) => s + r.amount, 0);
  const entrySoundServiceTotal = entrySound.reduce((s, r) => s + r.amount, 0);

  const netCashMovement = cashReceivedInPeriod - totalExpenses;
  const closingBalance = openingBalance + netCashMovement;
  const netBusinessProfit = totalEventGrossProfit - totalOfficeExpenses;

  return {
    period,
    generatedAt: new Date().toISOString(),
    bookingParties,
    partiesOfDay,
    catering,
    entrySound,
    cateringDetails,
    entrySoundDetails,
    paymentLedger,
    expenseLedger,
    eventProfitSummary,
    reportRemarks: buildReportRemarks(bookingParties, partiesOfDay),
    financialSummary: {
      openingBalance,
      openingBalanceDefinition: 'Cash in hand at the start of this period (prior receipts − prior office expenses).',
      eventCount: partiesOfDay.length,
      bookingsEnteredCount: bookingParties.length,
      totalOriginalBookingAmount,
      totalAdditionalCharges,
      totalBilled,
      totalOutstandingOnEvents,
      totalEventExpenses,
      totalEventGrossProfit,
      cashReceivedInPeriod,
      cashReceivedBreakdown,
      totalOfficeExpenses,
      totalExpenses,
      expenseBreakdown,
      netCashMovement,
      closingBalance,
      closingBalanceDefinition: 'Closing Balance = Previous Balance + Cash Received − Total Expenses.',
      netBusinessProfit,
      netBusinessProfitDefinition:
        'Net business profit = Event gross profit (billed − event costs) − office overheads in period.',
      bookingPaymentsReceived,
      partyPaymentsReceived,
      cateringServiceTotal,
      entrySoundServiceTotal,
      cateringIncome: cateringServiceTotal,
      entrySoundIncome: entrySoundServiceTotal,
      totalBookingValue: totalOriginalBookingAmount,
      totalReceipts: cashReceivedInPeriod,
      netProfitLoss: netCashMovement,
    },
    totals: {
      bookingParties: {
        hallA: bookingParties.reduce((s, r) => s + r.hallA, 0),
        hallB: bookingParties.reduce((s, r) => s + r.hallB, 0),
        hallC: bookingParties.reduce((s, r) => s + r.hallC, 0),
        bookingAmount: bookingParties.reduce((s, r) => s + r.bookingAmount, 0),
        additionalCharges: bookingParties.reduce((s, r) => s + r.additionalCharges, 0),
        totalAmount: bookingParties.reduce((s, r) => s + r.totalAmount, 0),
        advance: bookingParties.reduce((s, r) => s + r.advance, 0),
        balance: bookingParties.reduce((s, r) => s + r.balance, 0),
      },
      partiesOfDay: {
        hallA: partiesOfDay.reduce((s, r) => s + r.hallA, 0),
        hallB: partiesOfDay.reduce((s, r) => s + r.hallB, 0),
        hallC: partiesOfDay.reduce((s, r) => s + r.hallC, 0),
        bookingAmount: partiesOfDay.reduce((s, r) => s + r.bookingAmount, 0),
        additionalCharges: partiesOfDay.reduce((s, r) => s + r.additionalCharges, 0),
        totalBill: partiesOfDay.reduce((s, r) => s + r.totalBill, 0),
        receivable: partiesOfDay.reduce((s, r) => s + r.totalBill, 0),
        totalPaid: partiesOfDay.reduce((s, r) => s + r.totalPaid, 0),
        receivedInPeriod: partiesOfDay.reduce((s, r) => s + r.receivedInPeriod, 0),
        received: partiesOfDay.reduce((s, r) => s + r.totalPaid, 0),
        eventExpenses: partiesOfDay.reduce((s, r) => s + r.eventExpenses, 0),
        eventGrossProfit: partiesOfDay.reduce((s, r) => s + r.eventGrossProfit, 0),
        eventCashProfit: partiesOfDay.reduce((s, r) => s + r.eventCashProfit, 0),
        eventProfit: partiesOfDay.reduce((s, r) => s + r.eventGrossProfit, 0),
        outstandingBalance: partiesOfDay.reduce((s, r) => s + r.outstandingBalance, 0),
        balance: partiesOfDay.reduce((s, r) => s + r.outstandingBalance, 0),
      },
      catering: {
        amount: catering.reduce((s, r) => s + r.amount, 0),
        expense: catering.reduce((s, r) => s + r.expense, 0),
        balance: catering.reduce((s, r) => s + r.balance, 0),
      },
      entrySound: {
        amount: entrySound.reduce((s, r) => s + r.amount, 0),
        expense: entrySound.reduce((s, r) => s + r.expense, 0),
        balance: entrySound.reduce((s, r) => s + r.balance, 0),
      },
    },
  };
}

export function generateBanquetReport(
  sources: ReportDataSources,
  period: ReportPeriod,
): BanquetReportData {
  const core = computeReportCore(sources, period);
  const { startDate, endDate } = period;

  const dailyBreakdown: DailySummaryRow[] =
    period.type === 'daily'
      ? []
      : enumerateDates(startDate, endDate)
          .map((date) => {
            const dayPeriod = buildReportPeriod('daily', date);
            const dayCore = computeReportCore(sources, dayPeriod);
            return {
              date,
              cashReceived: dayCore.financialSummary.cashReceivedInPeriod,
              expenses: dayCore.financialSummary.totalExpenses,
              netMovement: dayCore.financialSummary.netCashMovement,
            };
          })
          .filter((row) => row.cashReceived > 0 || row.expenses > 0);

  const monthlyBreakdown: MonthlySummaryRow[] =
    period.type === 'annual'
      ? enumerateMonths(startDate, endDate).map((yearMonth) => {
          const bounds = monthBounds(yearMonth);
          const monthPeriod: ReportPeriod = {
            type: 'monthly',
            startDate: bounds.start,
            endDate: bounds.end,
            label: formatMonthLabel(yearMonth),
          };
          const monthCore = computeReportCore(sources, monthPeriod);
          return {
            month: yearMonth,
            monthLabel: monthPeriod.label,
            cashReceived: monthCore.financialSummary.cashReceivedInPeriod,
            expenses: monthCore.financialSummary.totalExpenses,
            netMovement: monthCore.financialSummary.netCashMovement,
          };
        })
      : [];

  return { ...core, dailyBreakdown, monthlyBreakdown };
}
