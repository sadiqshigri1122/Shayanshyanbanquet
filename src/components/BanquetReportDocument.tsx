import type { BanquetReportData, ExpenseBreakdownRow } from '../utils/reportEngine';
import type { ReportExpenseLine } from '../utils/reportCategories';

interface Props {
  data: BanquetReportData;
}

const fmt = (n: number) =>
  n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Always show amount including zero — avoids blank money cells */
const fmtAmt = (n: number) => fmt(n);

/** Hide zero for optional / breakdown rows only */
const fmtOptional = (n: number) => (n === 0 ? '—' : fmt(n));

const HALLS = ['A', 'B', 'C'] as const;

function expenseAmount(breakdown: ExpenseBreakdownRow[], line: ReportExpenseLine): number {
  return breakdown.find((r) => r.category === line)?.amount ?? 0;
}

const EXPENSE_LINE_LABELS: { line: ReportExpenseLine; label: string }[] = [
  { line: 'Diesel for Generator', label: 'Diesel' },
  { line: 'H/W Daily Wages', label: 'H/W wages' },
  { line: 'Salaries', label: 'Salaries' },
  { line: 'Rental to PAF', label: 'Rental to PAF' },
  { line: 'Electric Bill', label: 'Electric Bill' },
  { line: 'Entertainment', label: 'Entertainment' },
  { line: 'Karakary Purchase', label: 'Karakary Purchase' },
  { line: 'Hall Maintenance', label: 'Hall Maintenance' },
  { line: 'Other Expenses', label: 'Other' },
];

function hasHallData(totals: { amount: number; expense: number; balance: number }): boolean {
  return totals.amount > 0 || totals.expense > 0;
}

function hallIncomeTable(
  title: string,
  rows: BanquetReportData['catering'],
  totals: BanquetReportData['totals']['catering'],
) {
  const activeHalls = HALLS.filter((h) => {
    const row = rows.find((r) => r.hall === h);
    return row && (row.amount > 0 || row.expense > 0);
  });

  return (
    <table className="report-table report-table--compact">
      <thead>
        <tr>
          <th colSpan={4} className="report-section-title">{title}</th>
        </tr>
        <tr>
          <th colSpan={4} className="report-section-subtitle">
            Included in event bills above — not extra cash
          </th>
        </tr>
        <tr>
          <th>Hall</th>
          <th>Billed</th>
          <th>Event Cost</th>
          <th>Net</th>
        </tr>
      </thead>
      <tbody>
        {(activeHalls.length > 0 ? activeHalls : HALLS).map((h) => {
          const row = rows.find((r) => r.hall === h) ?? { hall: h, amount: 0, expense: 0, balance: 0 };
          return (
            <tr key={h}>
              <td>Hall {h}</td>
              <td className="num">{fmtOptional(row.amount)}</td>
              <td className="num">{fmtOptional(row.expense)}</td>
              <td className="num">{fmtOptional(row.balance)}</td>
            </tr>
          );
        })}
        <tr className="total-row">
          <td>TOTAL</td>
          <td className="num">{fmtAmt(totals.amount)}</td>
          <td className="num">{fmtAmt(totals.expense)}</td>
          <td className="num">{fmtAmt(totals.balance)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function EmptySection({ message }: { message: string }) {
  return <p className="report-empty-section">{message}</p>;
}

export function BanquetReportDocument({ data }: Props) {
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

  const expenseLines = EXPENSE_LINE_LABELS.filter(
    ({ line }) => expenseAmount(eb, line) > 0,
  );

  const showLedger =
    data.paymentLedger.length > 0 ||
    data.expenseLedger.length > 0 ||
    expenseLines.length > 0;

  return (
    <div id="banquet-report" className="banquet-report">
      <section className="report-page report-page--landscape">
        <header className="report-header">
          <h1>EVENT REPORT</h1>
          <div className="report-meta">
            <span>{period.label}</span>
            {period.dayName && <span>{period.dayName}</span>}
          </div>
        </header>

        {showNewBookings && (
          <>
            <p className="report-section-note">New contracts signed in this period.</p>
            <table className="report-table">
              <thead>
                <tr><th colSpan={11} className="report-section-title">NEW BOOKINGS</th></tr>
                <tr>
                  <th>#</th>
                  <th>Booking</th>
                  <th>Booked</th>
                  <th>Event</th>
                  <th>Customer</th>
                  <th>Venue</th>
                  <th>Original</th>
                  <th>Add&apos;l</th>
                  <th>Total</th>
                  <th>Advance</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {data.bookingParties.map((row, i) => (
                  <tr key={row.bookingId}>
                    <td className="center">{i + 1}</td>
                    <td>{row.bookingNumber}</td>
                    <td>{row.bookingDate}</td>
                    <td>{row.eventDate}</td>
                    <td>{row.customerName}</td>
                    <td>{row.venueName}</td>
                    <td className="num">{fmtAmt(row.bookingAmount)}</td>
                    <td className="num">{fmtOptional(row.additionalCharges)}</td>
                    <td className="num">{fmtAmt(row.totalAmount)}</td>
                    <td className="num">{fmtAmt(row.advance)}</td>
                    <td className="num">{fmtAmt(row.balance)}</td>
                  </tr>
                ))}
                {data.bookingParties.length > 1 && (
                  <tr className="total-row">
                    <td colSpan={6}>TOTAL</td>
                    <td className="num">{fmtAmt(totals.bookingParties.bookingAmount)}</td>
                    <td className="num">{fmtOptional(totals.bookingParties.additionalCharges)}</td>
                    <td className="num">{fmtAmt(totals.bookingParties.totalAmount)}</td>
                    <td className="num">{fmtAmt(totals.bookingParties.advance)}</td>
                    <td className="num">{fmtAmt(totals.bookingParties.balance)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {data.partiesOfDay.length > 0 ? (
          <>
            <p className="report-section-note">
              {bookingsOverlapEvents
                ? 'Events occurring in this period (also entered as new bookings today).'
                : 'Events occurring in this period.'}
            </p>
            <table className="report-table">
              <thead>
                <tr>
                  <th colSpan={13} className="report-section-title">
                    {bookingsOverlapEvents ? "TODAY'S EVENTS" : 'EVENTS IN PERIOD'}
                  </th>
                </tr>
                <tr>
                  <th>#</th>
                  <th>Booking</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Venue</th>
                  <th>Original</th>
                  <th>Add&apos;l</th>
                  <th>Total Bill</th>
                  <th>Paid</th>
                  <th>In Period</th>
                  <th>Due</th>
                  <th>Costs</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.partiesOfDay.map((row, i) => (
                  <tr key={row.bookingId}>
                    <td className="center">{i + 1}</td>
                    <td>{row.bookingNumber}</td>
                    <td>{row.date}</td>
                    <td>{row.customerName}</td>
                    <td>{row.venueName}</td>
                    <td className="num">{fmtAmt(row.bookingAmount)}</td>
                    <td className="num">{fmtOptional(row.additionalCharges)}</td>
                    <td className="num">{fmtAmt(row.totalBill)}</td>
                    <td className="num">{fmtAmt(row.totalPaid)}</td>
                    <td className="num">{fmtAmt(row.receivedInPeriod)}</td>
                    <td className="num">{fmtAmt(row.outstandingBalance)}</td>
                    <td className="num">{fmtOptional(row.eventExpenses)}</td>
                    <td className="num">{fmtAmt(row.eventGrossProfit)}</td>
                  </tr>
                ))}
                {data.partiesOfDay.length > 1 && (
                  <tr className="total-row">
                    <td colSpan={5}>TOTAL ({data.partiesOfDay.length} events)</td>
                    <td className="num">{fmtAmt(totals.partiesOfDay.bookingAmount)}</td>
                    <td className="num">{fmtOptional(totals.partiesOfDay.additionalCharges)}</td>
                    <td className="num">{fmtAmt(totals.partiesOfDay.totalBill)}</td>
                    <td className="num">{fmtAmt(totals.partiesOfDay.totalPaid)}</td>
                    <td className="num">{fmtAmt(totals.partiesOfDay.receivedInPeriod)}</td>
                    <td className="num">{fmtAmt(totals.partiesOfDay.outstandingBalance)}</td>
                    <td className="num">{fmtOptional(totals.partiesOfDay.eventExpenses)}</td>
                    <td className="num">{fmtAmt(totals.partiesOfDay.eventGrossProfit)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        ) : (
          !showNewBookings && <EmptySection message="No events scheduled for this period." />
        )}

        {(showCatering || showEntrySound) && (
          <div className={`report-hall-grid ${!(showCatering && showEntrySound) ? 'report-hall-grid--single' : ''}`}>
            {showCatering && hallIncomeTable('COLD DRINK / CATERING', data.catering, totals.catering)}
            {showEntrySound && hallIncomeTable('ENTRY & SOUND', data.entrySound, totals.entrySound)}
          </div>
        )}

        {reportRemarks && (
          <div className="report-remarks">
            <strong>Remarks:</strong> {reportRemarks}
          </div>
        )}
      </section>

      {showLedger && (
        <section className="report-page report-page--portrait report-page-break">
          <header className="report-header">
            <h1>CASH &amp; EXPENSE LEDGER</h1>
            <div className="report-meta"><span>{period.label}</span></div>
          </header>

          <table className="report-table report-table--cash">
            <tbody>
              <tr>
                <td className="label">Previous balance</td>
                <td className="num">{fmtAmt(fs.openingBalance)}</td>
              </tr>
            </tbody>
          </table>

          {data.paymentLedger.length > 0 && (
            <table className="report-table">
              <thead>
                <tr><th colSpan={6} className="report-section-title">PAYMENTS RECEIVED</th></tr>
                <tr>
                  <th>Date</th>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentLedger.map((p) => (
                  <tr key={`${p.bookingNumber}-${p.paymentDate}-${p.amount}`}>
                    <td>{p.paymentDate}</td>
                    <td>{p.bookingNumber}</td>
                    <td>{p.customerName}</td>
                    <td>{p.paymentType}</td>
                    <td>{p.method}</td>
                    <td className="num">{fmtAmt(p.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={5}>Total</td>
                  <td className="num">{fmtAmt(fs.cashReceivedInPeriod)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {data.expenseLedger.length > 0 && (
            <table className="report-table">
              <thead>
                <tr><th colSpan={6} className="report-section-title">EXPENSES</th></tr>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Linked event</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenseLedger.map((e) => (
                  <tr key={`${e.date}-${e.category}-${e.amount}-${e.linkedBooking ?? 'office'}`}>
                    <td>{e.date}</td>
                    <td>{e.source}</td>
                    <td>{e.category}</td>
                    <td>{e.description}</td>
                    <td>
                      {e.linkedBooking
                        ? `${e.linkedBooking} · ${e.linkedCustomer} · ${e.linkedVenue}`
                        : '—'}
                    </td>
                    <td className="num">{fmtAmt(e.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={5}>Total</td>
                  <td className="num">{fmtAmt(fs.totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {expenseLines.length > 0 && (
            <table className="report-table report-table--cash">
              <thead>
                <tr><th colSpan={2} className="report-section-title">EXPENSE SUMMARY BY CATEGORY</th></tr>
              </thead>
              <tbody>
                {expenseLines.map(({ line, label }) => (
                  <tr key={line}>
                    <td>{label}</td>
                    <td className="num">{fmtAmt(expenseAmount(eb, line))}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total expenses</td>
                  <td className="num">{fmtAmt(fs.totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          )}

          <table className="report-table report-table--cash">
            <tbody>
              <tr className="closing-row">
                <td className="label">Closing balance</td>
                <td className="num">{fmtAmt(fs.closingBalance)}</td>
              </tr>
            </tbody>
          </table>

          <div className="report-signatures">
            <div>Prepared by: _______________</div>
            <div>Checked by: _______________</div>
          </div>
        </section>
      )}

      <section className="report-page report-page-break">
        <header className="report-header">
          <h1>FINANCIAL SUMMARY</h1>
          <div className="report-meta">
            <span>Period: {period.label}</span>
            {period.dayName && <span>{period.dayName}</span>}
            <span>{fs.eventCount} event{fs.eventCount !== 1 ? 's' : ''}</span>
            {fs.bookingsEnteredCount > 0 && (
              <span>{fs.bookingsEnteredCount} new booking{fs.bookingsEnteredCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </header>

        <table className="report-table report-table--cash">
          <tbody>
            <tr><td colSpan={2} className="report-group-header">Billing</td></tr>
            <tr><td>Original booking amount</td><td className="num">{fmtAmt(fs.totalOriginalBookingAmount)}</td></tr>
            {fs.totalAdditionalCharges > 0 && (
              <tr><td>Event-day additional charges</td><td className="num">{fmtAmt(fs.totalAdditionalCharges)}</td></tr>
            )}
            <tr className="subtotal-row">
              <td><strong>Total billed</strong></td>
              <td className="num"><strong>{fmtAmt(fs.totalBilled)}</strong></td>
            </tr>
            <tr><td>Outstanding</td><td className="num">{fmtAmt(fs.totalOutstandingOnEvents)}</td></tr>

            <tr><td colSpan={2} className="report-group-header">Cash received</td></tr>
            {fs.cashReceivedBreakdown.bookingAdvances > 0 && (
              <tr><td>Booking advances</td><td className="num">{fmtAmt(fs.cashReceivedBreakdown.bookingAdvances)}</td></tr>
            )}
            {fs.cashReceivedBreakdown.eventDayPayments > 0 && (
              <tr><td>Event-day payments</td><td className="num">{fmtAmt(fs.cashReceivedBreakdown.eventDayPayments)}</td></tr>
            )}
            {fs.cashReceivedBreakdown.installments > 0 && (
              <tr><td>Installments / other</td><td className="num">{fmtAmt(fs.cashReceivedBreakdown.installments)}</td></tr>
            )}
            <tr className="subtotal-row">
              <td><strong>Total cash received</strong></td>
              <td className="num"><strong>{fmtAmt(fs.cashReceivedInPeriod)}</strong></td>
            </tr>

            <tr><td colSpan={2} className="report-group-header">Expenses &amp; profit</td></tr>
            {fs.totalEventExpenses > 0 && (
              <tr><td>Event costs</td><td className="num">{fmtAmt(fs.totalEventExpenses)}</td></tr>
            )}
            {fs.totalOfficeExpenses > 0 && (
              <tr><td>Office / overhead</td><td className="num">{fmtAmt(fs.totalOfficeExpenses)}</td></tr>
            )}
            <tr className="subtotal-row">
              <td><strong>Total expenses</strong></td>
              <td className="num"><strong>{fmtAmt(fs.totalExpenses)}</strong></td>
            </tr>
            <tr><td>Event gross profit</td><td className="num">{fmtAmt(fs.totalEventGrossProfit)}</td></tr>
            <tr><td>Net business profit</td><td className="num">{fmtAmt(fs.netBusinessProfit)}</td></tr>
            <tr><td>Net cash movement</td><td className="num">{fmtAmt(fs.netCashMovement)}</td></tr>
            <tr className="closing-row">
              <td><strong>Closing balance</strong></td>
              <td className="num"><strong>{fmtAmt(fs.closingBalance)}</strong></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default BanquetReportDocument;
