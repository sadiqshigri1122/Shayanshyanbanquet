import type { BanquetReportData, ExpenseBreakdownRow } from './reportEngine';
import type { ReportExpenseLine } from './reportCategories';

function escapeCsvField(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells: (string | number | boolean)[]): string {
  return cells.map(escapeCsvField).join(',');
}

function blankRow(): string {
  return '';
}

function sectionTitle(title: string): string {
  return row([title]);
}

function expenseAmount(breakdown: ExpenseBreakdownRow[], line: ReportExpenseLine): number {
  return breakdown.find((r) => r.category === line)?.amount ?? 0;
}

function hasHallData(totals: { amount: number; expense: number; balance: number }): boolean {
  return totals.amount > 0 || totals.expense > 0;
}

export function buildReportCsv(data: BanquetReportData, _companyName: string): string {
  const lines: string[] = [];
  const { period, financialSummary: fs, totals, reportRemarks } = data;
  const eb = fs.expenseBreakdown;

  const partyIds = new Set(data.partiesOfDay.map((p) => p.bookingId));
  const bookingsOverlapEvents =
    data.bookingParties.length > 0 &&
    data.bookingParties.length === data.partiesOfDay.length &&
    data.bookingParties.every((b) => partyIds.has(b.bookingId));

  const showNewBookings = data.bookingParties.length > 0 && !bookingsOverlapEvents;
  const showCatering = hasHallData(totals.catering);
  const showEntrySound = hasHallData(totals.entrySound);

  const expenseLines = [
    { label: 'Diesel', amt: expenseAmount(eb, 'Diesel for Generator') },
    { label: 'H/W wages', amt: expenseAmount(eb, 'H/W Daily Wages') },
    { label: 'Salaries', amt: expenseAmount(eb, 'Salaries') },
    { label: 'Rental to PAF', amt: expenseAmount(eb, 'Rental to PAF') },
    { label: 'Electric Bill', amt: expenseAmount(eb, 'Electric Bill') },
    { label: 'Entertainment', amt: expenseAmount(eb, 'Entertainment') },
    { label: 'Karakary Purchase', amt: expenseAmount(eb, 'Karakary Purchase') },
    { label: 'Hall Maintenance', amt: expenseAmount(eb, 'Hall Maintenance') },
    { label: 'Other', amt: expenseAmount(eb, 'Other Expenses') },
  ].filter((item) => item.amt > 0);

  // ── 1. EVENT REPORT ──────────────────────────────────────────────────────
  lines.push(sectionTitle('EVENT REPORT'));
  lines.push(row(['Period', period.label]));
  if (period.dayName) lines.push(row(['Day', period.dayName]));
  lines.push(blankRow());

  if (showNewBookings) {
    lines.push(row(['NEW BOOKINGS']));
    lines.push(row([
      'S/No.', 'Booking', 'Booked', 'Event Date', 'Customer', 'Venue',
      'Original', 'Additional', 'Total Bill', 'Advance', 'Due',
    ]));
    data.bookingParties.forEach((r, i) => {
      lines.push(row([
        i + 1, r.bookingNumber, r.bookingDate, r.eventDate, r.customerName, r.venueName,
        r.bookingAmount, r.additionalCharges || '', r.totalAmount, r.advance, r.balance,
      ]));
    });
    if (data.bookingParties.length > 1) {
      lines.push(row([
        'TOTAL', '', '', '', '', '',
        totals.bookingParties.bookingAmount,
        totals.bookingParties.additionalCharges || '',
        totals.bookingParties.totalAmount,
        totals.bookingParties.advance,
        totals.bookingParties.balance,
      ]));
    }
    lines.push(blankRow());
  }

  if (data.partiesOfDay.length > 0) {
    lines.push(row([bookingsOverlapEvents ? "TODAY'S EVENTS" : 'EVENTS IN PERIOD']));
    lines.push(row([
      'S/No.', 'Booking', 'Date', 'Customer', 'Venue',
      'Original', 'Additional', 'Total Bill', 'Paid', 'In Period', 'Due', 'Event Costs', 'Profit',
    ]));
    data.partiesOfDay.forEach((r, i) => {
      lines.push(row([
        i + 1, r.bookingNumber, r.date, r.customerName, r.venueName,
        r.bookingAmount, r.additionalCharges || '', r.totalBill,
        r.totalPaid, r.receivedInPeriod, r.outstandingBalance,
        r.eventExpenses || '', r.eventGrossProfit,
      ]));
    });
    if (data.partiesOfDay.length > 1) {
      lines.push(row([
        'TOTAL', '', '', '', '',
        totals.partiesOfDay.bookingAmount,
        totals.partiesOfDay.additionalCharges || '',
        totals.partiesOfDay.totalBill,
        totals.partiesOfDay.totalPaid,
        totals.partiesOfDay.receivedInPeriod,
        totals.partiesOfDay.outstandingBalance,
        totals.partiesOfDay.eventExpenses || '',
        totals.partiesOfDay.eventGrossProfit,
      ]));
    }
    lines.push(blankRow());
  } else if (!showNewBookings) {
    lines.push(row(['No events scheduled for this period.']));
    lines.push(blankRow());
  }

  if (showCatering) {
    lines.push(row(['COLD DRINK / CATERING']));
    lines.push(row(['Hall', 'Billed', 'Event Cost', 'Net']));
    data.catering.forEach((r) => {
      if (r.amount > 0 || r.expense > 0) {
        lines.push(row([`Hall ${r.hall}`, r.amount, r.expense, r.balance]));
      }
    });
    lines.push(row(['TOTAL', totals.catering.amount, totals.catering.expense, totals.catering.balance]));
    lines.push(blankRow());
  }

  if (showEntrySound) {
    lines.push(row(['ENTRY & SOUND']));
    lines.push(row(['Hall', 'Billed', 'Event Cost', 'Net']));
    data.entrySound.forEach((r) => {
      if (r.amount > 0 || r.expense > 0) {
        lines.push(row([`Hall ${r.hall}`, r.amount, r.expense, r.balance]));
      }
    });
    lines.push(row(['TOTAL', totals.entrySound.amount, totals.entrySound.expense, totals.entrySound.balance]));
    lines.push(blankRow());
  }

  if (reportRemarks) {
    lines.push(row(['Remarks', reportRemarks]));
    lines.push(blankRow());
  }

  // ── 2. CASH & EXPENSE LEDGER ─────────────────────────────────────────────
  lines.push(sectionTitle('CASH & EXPENSE LEDGER'));
  lines.push(row(['Period', period.label]));
  lines.push(row(['Previous balance', fs.openingBalance]));
  lines.push(blankRow());

  if (data.paymentLedger.length > 0) {
    lines.push(row(['PAYMENTS RECEIVED']));
    lines.push(row(['Date', 'Booking', 'Customer', 'Type', 'Method', 'Amount']));
    data.paymentLedger.forEach((p) => {
      lines.push(row([p.paymentDate, p.bookingNumber, p.customerName, p.paymentType, p.method, p.amount]));
    });
    lines.push(row(['TOTAL', '', '', '', '', fs.cashReceivedInPeriod]));
    lines.push(blankRow());
  }

  if (data.expenseLedger.length > 0) {
    lines.push(row(['EXPENSES']));
    lines.push(row(['Date', 'Source', 'Category', 'Description', 'Linked Event', 'Amount']));
    data.expenseLedger.forEach((e) => {
      lines.push(row([
        e.date, e.source, e.category, e.description,
        e.linkedBooking ? `${e.linkedBooking} · ${e.linkedVenue}` : '',
        e.amount,
      ]));
    });
    lines.push(row(['TOTAL', '', '', '', '', fs.totalExpenses]));
    lines.push(blankRow());
  }

  if (expenseLines.length > 0) {
    lines.push(row(['EXPENSE SUMMARY BY CATEGORY']));
    lines.push(row(['Category', 'Amount']));
    expenseLines.forEach(({ label, amt }) => lines.push(row([label, amt])));
    lines.push(row(['TOTAL', fs.totalExpenses]));
    lines.push(blankRow());
  }

  lines.push(row(['Closing balance', fs.closingBalance]));
  lines.push(blankRow());

  // ── 3. FINANCIAL SUMMARY ───────────────────────────────────────────────────
  lines.push(sectionTitle('FINANCIAL SUMMARY'));
  lines.push(row(['Period', period.label]));
  lines.push(row(['Events in period', fs.eventCount]));
  if (fs.bookingsEnteredCount > 0) {
    lines.push(row(['New bookings entered', fs.bookingsEnteredCount]));
  }
  lines.push(blankRow());

  lines.push(row(['Billing', '']));
  lines.push(row(['Original booking amount', fs.totalOriginalBookingAmount]));
  if (fs.totalAdditionalCharges > 0) {
    lines.push(row(['Event-day additional charges', fs.totalAdditionalCharges]));
  }
  lines.push(row(['Total billed', fs.totalBilled]));
  lines.push(row(['Outstanding on events', fs.totalOutstandingOnEvents]));
  lines.push(blankRow());

  lines.push(row(['Cash received', '']));
  if (fs.cashReceivedBreakdown.bookingAdvances > 0) {
    lines.push(row(['Booking advances', fs.cashReceivedBreakdown.bookingAdvances]));
  }
  if (fs.cashReceivedBreakdown.eventDayPayments > 0) {
    lines.push(row(['Event-day payments', fs.cashReceivedBreakdown.eventDayPayments]));
  }
  if (fs.cashReceivedBreakdown.installments > 0) {
    lines.push(row(['Installments / other', fs.cashReceivedBreakdown.installments]));
  }
  lines.push(row(['Total cash received in period', fs.cashReceivedInPeriod]));
  lines.push(blankRow());

  lines.push(row(['Expenses & profit', '']));
  if (fs.totalEventExpenses > 0) {
    lines.push(row(['Event costs', fs.totalEventExpenses]));
  }
  if (fs.totalOfficeExpenses > 0) {
    lines.push(row(['Office / overhead', fs.totalOfficeExpenses]));
  }
  lines.push(row(['Total expenses', fs.totalExpenses]));
  lines.push(row(['Event gross profit', fs.totalEventGrossProfit]));
  lines.push(row(['Net business profit', fs.netBusinessProfit]));
  lines.push(row(['Net cash movement', fs.netCashMovement]));
  lines.push(row(['Closing balance', fs.closingBalance]));

  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadReportCsv(data: BanquetReportData, companyName: string): void {
  const csv = buildReportCsv(data, companyName);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeLabel = data.period.label.replace(/[^\w\-]+/g, '_').slice(0, 40);
  link.href = url;
  link.download = `shayan-daily-report_${safeLabel}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
