import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Plus, CreditCard, CheckCircle2, Lock, Edit3, Trash2, Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/bookingUtils';
import {
  computeEventBilling,
  computeEventProfit,
  isBookingFinanciallyEditable,
  splitBookingServices,
} from '../../utils/eventDayUtils';
import { CUSTOM_CHARGE_SUGGESTIONS } from '../../utils/manualPricing';
import { EVENT_EXPENSE_CATEGORIES } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import PaymentModal from '../../components/PaymentModal';
import { printDocument } from '../../utils/printDocument';

function formatTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function EventDayReport() {
  const { id } = useParams();
  const {
    bookings,
    settings,
    currentUser,
    addBookingServiceItem,
    addEventExpense,
    updateEventExpense,
    deleteEventExpense,
    getEventExpensesForBooking,
    updateBookingStatus,
  } = useApp();

  const booking = bookings.find((b) => b.id === id);
  const eventExpenses = booking ? getEventExpensesForBooking(booking.id) : [];

  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closingEvent, setClosingEvent] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [itemForm, setItemForm] = useState({ particular: '', amount: '', guestCount: '' });
  const [expenseForm, setExpenseForm] = useState<{ category: string; amount: string; description: string }>({
    category: EVENT_EXPENSE_CATEGORIES[0],
    amount: '',
    description: '',
  });

  if (!booking) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Booking not found</p>
        <Link to="/office/event-day" className="text-secondary font-semibold mt-2 inline-block">← Event Day</Link>
      </div>
    );
  }

  const editable = isBookingFinanciallyEditable(booking.status);
  const billing = computeEventBilling(booking);
  const profit = computeEventProfit(booking, eventExpenses);
  const { original, additional } = splitBookingServices(booking.services);

  const handleAddItem = async () => {
    const amount = Number(itemForm.amount);
    if (!itemForm.particular.trim() || amount <= 0) return;
    const guestCount = itemForm.guestCount.trim() ? parseInt(itemForm.guestCount, 10) : undefined;
    if (await addBookingServiceItem(booking.id, itemForm.particular, amount, currentUser.name, guestCount)) {
      setShowAddItem(false);
      setItemForm({ particular: '', amount: '', guestCount: '' });
    }
  };

  const handleAddOrUpdateExpense = async () => {
    const amount = Number(expenseForm.amount);
    if (amount <= 0) return;

    if (editingExpenseId) {
      await updateEventExpense(
        editingExpenseId,
        { category: expenseForm.category, amount, description: expenseForm.description || undefined },
        currentUser.name,
      );
      setEditingExpenseId(null);
    } else {
      await addEventExpense({
        bookingId: booking.id,
        category: expenseForm.category,
        amount,
        description: expenseForm.description || undefined,
        addedBy: currentUser.name,
      });
    }
    setShowAddExpense(false);
    setExpenseForm({ category: EVENT_EXPENSE_CATEGORIES[0], amount: '', description: '' });
  };

  const openEditExpense = (expenseId: string) => {
    const exp = eventExpenses.find((e) => e.id === expenseId);
    if (!exp) return;
    setExpenseForm({
      category: exp.category,
      amount: String(exp.amount),
      description: exp.description || '',
    });
    setEditingExpenseId(expenseId);
    setShowAddExpense(true);
  };

  const handleMarkCompleted = async () => {
    setClosingEvent(true);
    try {
      await updateBookingStatus(booking.id, 'completed', currentUser.name);
      setShowCloseConfirm(false);
    } finally {
      setClosingEvent(false);
    }
  };

  const handlePrint = () => printDocument('event-day-report');

  return (
    <div className="animate-fade-in pb-24 lg:pb-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <Link to="/office/event-day" className="text-sm text-muted hover:text-secondary">← Event Day</Link>
          <h1 className="text-2xl font-bold text-primary mt-1">Event Day Workspace</h1>
          <p className="text-sm text-muted">{booking.bookingNumber} · {booking.customer.name} · {booking.programme}</p>
          <p className="text-xs text-muted mt-0.5">{booking.venueName} · {booking.functionDate} ({booking.functionDay})</p>
          <div className="flex gap-2 mt-2">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} type="payment" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
            <Printer size={14} /> Print Report
          </button>
          {editable && (
            <>
              <button onClick={() => setShowPayment(true)} className="btn-secondary flex items-center gap-1 !px-3 !py-2 !rounded-lg text-sm">
                <CreditCard size={14} /> Record Payment
              </button>
              {!['completed'].includes(booking.status) && ['confirmed', 'hold', 'tentative'].includes(booking.status) && (
                <button onClick={() => setShowCloseConfirm(true)} className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold">
                  <CheckCircle2 size={14} /> Close Event
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!editable && (
        <div className="no-print card bg-surface-alt border-border flex items-center gap-2 text-sm mb-6">
          <Lock size={16} className="text-muted" />
          <span>This event is <strong>{booking.status.replace('_', ' ')}</strong>. Financial records are locked.</span>
        </div>
      )}

      <div id="event-day-report" className="print-document space-y-6 print:space-y-4">
        <header className="hidden print:block print-document-header">
          <h1>{settings.companyName}</h1>
          <p className="font-semibold tracking-wide">EVENT DAY REPORT</p>
          <p>{booking.bookingNumber} · {booking.customer.name} · {booking.programme}</p>
          <p>{booking.venueName} · {booking.functionDate} ({booking.functionDay}) · Guests: {booking.numberOfGuests}</p>
          <p>Generated {new Date().toLocaleString('en-PK')}</p>
        </header>

      {/* Customer Billing */}
      <section className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-primary text-lg">Customer Bill</h2>
          {editable && (
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center justify-center gap-1 px-3 py-2.5 bg-secondary text-white rounded-lg text-sm font-semibold print:hidden w-full sm:w-auto"
            >
              <Plus size={14} /> Add Item / Service
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="bg-surface-alt rounded-lg p-3">
            <p className="text-muted text-xs">Original Bill</p>
            <p className="font-bold text-primary text-lg">{formatCurrency(billing.originalBookingAmount)}</p>
          </div>
          <div className="bg-secondary-light/50 rounded-lg p-3">
            <p className="text-muted text-xs">Extra Items Added</p>
            <p className="font-bold text-secondary text-lg">{formatCurrency(billing.additionalItems)}</p>
          </div>
          <div className="bg-primary/5 rounded-lg p-3">
            <p className="text-muted text-xs">Final Bill</p>
            <p className="font-bold text-primary text-lg">{formatCurrency(billing.finalBill)}</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3">
            <p className="text-muted text-xs">Total Paid</p>
            <p className="font-bold text-success text-lg">{formatCurrency(billing.totalPaid)}</p>
          </div>
          <div className="bg-danger/10 rounded-lg p-3">
            <p className="text-muted text-xs">Remaining Balance</p>
            <p className="font-bold text-danger text-lg">{formatCurrency(billing.remainingBalance)}</p>
          </div>
        </div>

        {original.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Original Items</h3>
            <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">Particular</th>
                  <th className="text-right py-2 px-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {original.map((s) => (
                  <tr key={s.serviceId} className="border-b border-gray-50">
                    <td className="py-2 px-2">{s.serviceName}</td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {additional.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Extra Items Added Today</h3>
            <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary-light/30">
                  <th className="text-left py-2 px-2">Particular</th>
                  <th className="text-left py-2 px-2">Added By</th>
                  <th className="text-right py-2 px-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {additional.map((s) => (
                  <tr key={s.serviceId} className="border-b border-gray-50">
                    <td className="py-2 px-2 font-medium">{s.serviceName}</td>
                    <td className="py-2 px-2 text-xs text-muted">
                      {s.enteredBy}
                      {s.enteredAt && <span className="block">{formatTime(s.enteredAt)}</span>}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-secondary">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {booking.discount > 0 && (
          <p className="text-xs text-muted">Discount applied: {formatCurrency(booking.discount)} (prorated in original amount)</p>
        )}
      </section>

      {/* Event Expenses */}
      <section className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-primary text-lg">Office Costs</h2>
            <p className="text-xs text-muted mt-0.5">Internal business costs — not charged to customer</p>
          </div>
          {editable && (
            <button
              onClick={() => {
                setEditingExpenseId(null);
                setExpenseForm({ category: EVENT_EXPENSE_CATEGORIES[0], amount: '', description: '' });
                setShowAddExpense(true);
              }}
              className="flex items-center justify-center gap-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 print:hidden w-full sm:w-auto shrink-0"
            >
              <Plus size={14} /> Add Office Cost
            </button>
          )}
        </div>

        {eventExpenses.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No event expenses recorded yet</p>
        ) : (
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-2">Category</th>
                <th className="text-left py-2 px-2">Description</th>
                <th className="text-right py-2 px-2">Amount</th>
                {editable && <th className="text-right py-2 px-2 print:hidden">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {eventExpenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-50">
                  <td className="py-2 px-2 font-medium">{e.category}</td>
                  <td className="py-2 px-2 text-muted">{e.description || '—'}</td>
                  <td className="py-2 px-2 text-right font-semibold">{formatCurrency(e.amount)}</td>
                  {editable && (
                    <td className="py-2 px-2 text-right print:hidden">
                      <button onClick={() => openEditExpense(e.id)} className="touch-target inline-flex items-center justify-center text-muted hover:text-secondary" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteExpenseId(e.id)}
                        className="touch-target inline-flex items-center justify-center text-muted hover:text-danger ml-1"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-bold">
                <td colSpan={editable ? 2 : 2} className="py-2 px-2">Total Expenses</td>
                <td className="py-2 px-2 text-right">{formatCurrency(profit.totalExpenses)}</td>
                {editable && <td className="print:hidden" />}
              </tr>
            </tfoot>
          </table>
          </div>
        )}
      </section>

      {/* Profit Summary */}
      <section className="card">
        <h2 className="font-bold text-primary text-lg mb-4">Event Profit</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-4 bg-success/10 rounded-xl">
            <p className="text-muted text-xs mb-1">Customer Bill (Revenue)</p>
            <p className="text-xl font-bold text-success">{formatCurrency(profit.totalRevenue)}</p>
            <p className="text-[10px] text-muted mt-1">Final customer bill</p>
          </div>
          <div className="text-center p-4 bg-danger/10 rounded-xl">
            <p className="text-muted text-xs mb-1">Office Costs</p>
            <p className="text-xl font-bold text-danger">{formatCurrency(profit.totalExpenses)}</p>
            <p className="text-[10px] text-muted mt-1">Event business costs</p>
          </div>
          <div className={`text-center p-4 rounded-xl ${profit.grossProfit >= 0 ? 'bg-primary/10' : 'bg-warning/20'}`}>
            <p className="text-muted text-xs mb-1">Event Profit</p>
            <p className={`text-xl font-bold ${profit.grossProfit >= 0 ? 'text-primary' : 'text-warning'}`}>
              {formatCurrency(profit.grossProfit)}
            </p>
            <p className="text-[10px] text-muted mt-1">Revenue − Expenses</p>
          </div>
        </div>
      </section>

        <footer className="hidden print:block print-document-footer">
          {settings.companyName} · {settings.companyPhone} · {settings.companyAddress}
        </footer>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <Modal title="+ Add Item / Service" onClose={() => setShowAddItem(false)}>
          <div className="space-y-3">
            <p className="text-xs text-muted">This item will be added to the customer&apos;s final bill.</p>
            <input
              placeholder="Particular / Service name"
              value={itemForm.particular}
              onChange={(e) => setItemForm({ ...itemForm, particular: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              list="item-suggestions"
            />
            <datalist id="item-suggestions">
              {CUSTOM_CHARGE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Amount (Rs.)"
                value={itemForm.amount}
                onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Guests (optional)"
                value={itemForm.guestCount}
                onChange={(e) => setItemForm({ ...itemForm, guestCount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {CUSTOM_CHARGE_SUGGESTIONS.slice(0, 6).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, particular: s })}
                  className="text-xs px-2 py-1 bg-surface-alt rounded-full hover:bg-secondary-light"
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={handleAddItem} className="btn-secondary w-full !py-2.5 !rounded-lg">Add to Booking</button>
          </div>
        </Modal>
      )}

      {/* Add/Edit Expense Modal */}
      {showAddExpense && (
        <Modal title={editingExpenseId ? 'Edit Event Expense' : 'Add Event Expense'} onClose={() => { setShowAddExpense(false); setEditingExpenseId(null); }}>
          <div className="space-y-3">
            <p className="text-xs text-muted">Business cost only — will NOT change the customer bill.</p>
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {EVENT_EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount (Rs.)"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Description (optional)"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={handleAddOrUpdateExpense} className="btn-primary w-full !py-2.5 !rounded-lg">
              {editingExpenseId ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </Modal>
      )}

      {/* Sticky mobile action bar */}
      {editable && (
        <div className="no-print fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-border p-3 flex gap-2 z-40 shadow-lg">
          <button onClick={() => setShowAddItem(true)} className="flex-1 py-2.5 bg-secondary text-white rounded-lg text-xs font-semibold">
            + Extra Item
          </button>
          <button onClick={() => setShowPayment(true)} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold">
            Payment
          </button>
          <button onClick={() => { setEditingExpenseId(null); setShowAddExpense(true); }} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold">
            + Cost
          </button>
        </div>
      )}

      {showPayment && (
        <PaymentModal booking={booking} onClose={() => setShowPayment(false)} />
      )}

      {deleteExpenseId && (() => {
        const expense = eventExpenses.find((e) => e.id === deleteExpenseId);
        if (!expense) return null;
        return (
          <ConfirmDialog
            title="Delete this expense?"
            message="This office cost will be removed from the event report. This cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Keep"
            icon="delete"
            variant="danger"
            loading={deletingExpense}
            onConfirm={async () => {
              setDeletingExpense(true);
              try {
                await deleteEventExpense(deleteExpenseId, currentUser.name);
                setDeleteExpenseId(null);
              } finally {
                setDeletingExpense(false);
              }
            }}
            onCancel={() => setDeleteExpenseId(null)}
            details={
              <>
                <p className="font-semibold text-primary">{expense.category}</p>
                <p className="text-muted text-xs mt-0.5">{expense.description || 'No description'}</p>
                <p className="text-danger text-sm font-semibold mt-2">{formatCurrency(expense.amount)}</p>
              </>
            }
          />
        );
      })()}

      {showCloseConfirm && (
        <ConfirmDialog
          title="Close this event?"
          message="Financial records will be locked. You won't be able to add items, record payments, or edit expenses after closing."
          confirmLabel="Close Event"
          cancelLabel="Not Yet"
          icon="lock"
          loading={closingEvent}
          onConfirm={handleMarkCompleted}
          onCancel={() => setShowCloseConfirm(false)}
          details={
            <>
              <p className="font-semibold text-primary">{booking.customer.name}</p>
              <p className="text-muted text-xs mt-0.5">
                {booking.bookingNumber} · {booking.functionDate} · {booking.venueName}
              </p>
              {billing.remainingBalance > 0 && (
                <p className="text-warning text-xs mt-2 font-medium">
                  Outstanding balance: {formatCurrency(billing.remainingBalance)}
                </p>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
