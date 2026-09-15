import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  FileText, CreditCard, Printer, Edit3, History, Lock, CalendarCheck, ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import { formatCurrency } from '../../utils/bookingUtils';
import { isBookingFinanciallyEditable, computeEventBilling } from '../../utils/eventDayUtils';
import { manualRowsToServices, servicesToManualRows, type ManualLineItem } from '../../utils/manualPricing';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import PrintBookingSlip from '../../components/PrintBookingSlip';
import PrintReceipt from '../../components/PrintReceipt';
import ManualPricingTable from '../../components/ManualPricingTable';
import PaymentModal from '../../components/PaymentModal';
import InquiryChecklist from '../../components/InquiryChecklist';

function formatAuditTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function BookingDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bookings, payments, receipts, auditLogs, updateBookingStatus, updateBookingCharges, requestCancellation, currentUser } = useApp();
  const { path, can } = useDashboard();
  const booking = bookings.find((b) => b.id === id);
  const canEdit = can('edit_booking');
  const canManageEventDay = can('manage_event_day');
  const canReceivePayment = can('receive_payment');

  const [showSlip, setShowSlip] = useState(false);
  const [showPayment, setShowPayment] = useState(searchParams.get('action') === 'payment');
  const [showEditCharges, setShowEditCharges] = useState(searchParams.get('action') === 'charges');
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [pricingRows, setPricingRows] = useState<ManualLineItem[]>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editDiscountPct, setEditDiscountPct] = useState('');
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    if (searchParams.get('action') === 'payment') setShowPayment(true);
    if (searchParams.get('action') === 'charges') setShowEditCharges(true);
  }, [searchParams]);

  const clearActionParam = () => {
    if (searchParams.has('action')) {
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const editable = booking ? isBookingFinanciallyEditable(booking.status) : false;
  const billing = booking ? computeEventBilling(booking) : null;
  const isEventActive = booking && ['confirmed', 'hold', 'tentative'].includes(booking.status);
  const today = new Date().toISOString().split('T')[0];
  const isEventDay = booking && booking.functionDate <= today && isEventActive;

  if (!booking) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Booking not found</p>
        <Link to={path('/bookings')} className="text-secondary font-semibold mt-2 inline-block">← Back to Bookings</Link>
      </div>
    );
  }

  const bookingPayments = payments.filter((p) => p.bookingId === booking.id);
  const bookingReceipts = receipts.filter((r) => r.bookingId === booking.id);
  const pricingAudit = auditLogs.filter(
    (log) =>
      log.entityId === booking.bookingNumber &&
      ['Charge Entered', 'Charge Modified', 'Charge Added', 'Amount Changed', 'Discount Changed', 'Discount Applied', 'Payment Received', 'Event Day Item Added'].includes(log.action),
  );

  const openEditCharges = () => {
    setPricingRows(servicesToManualRows(booking.services));
    setEditDiscount(booking.discount);
    setEditDiscountPct(booking.subtotal > 0 && booking.discount > 0 ? ((booking.discount / booking.subtotal) * 100).toFixed(1) : '');
    setEditReason('');
    setShowEditCharges(true);
  };

  const handleSaveCharges = async () => {
    const services = manualRowsToServices(pricingRows, currentUser.name);
    if (services.length === 0) return;
    if (await updateBookingCharges(booking.id, services, editDiscount, currentUser.name, editReason || undefined)) {
      setShowEditCharges(false);
      clearActionParam();
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <Link to={path('/bookings')} className="text-sm text-muted hover:text-secondary">← All Bookings</Link>
          <h1 className="text-2xl font-bold text-primary mt-1">{booking.bookingNumber}</h1>
          <p className="text-xs text-muted mt-0.5">{booking.customer.name} · {booking.functionDate} · {booking.venueName}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} type="payment" />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowSlip(true)} className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold">
            <Printer size={14} /> Print Slip
          </button>
          {canManageEventDay && isEventActive && (
            <Link
              to={path(`/event-day/${booking.id}`)}
              className="flex items-center gap-1 px-3 py-2 bg-secondary text-white rounded-lg text-sm font-semibold"
            >
              <CalendarCheck size={14} />
              {isEventDay ? 'Event Day Workspace' : 'Open Event Day'}
            </Link>
          )}
          {canReceivePayment && editable && booking.remainingBalance > 0 && (
            <button onClick={() => setShowPayment(true)} className="btn-secondary flex items-center gap-1 !px-3 !py-2 !rounded-lg text-sm">
              <CreditCard size={14} /> Record Payment
            </button>
          )}
          {canEdit && editable && (
            <button onClick={openEditCharges} className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
              <Edit3 size={14} /> Edit Full Bill
            </button>
          )}
          {!canEdit && (
            <div className="flex items-center gap-1 text-xs text-muted px-2 py-2"><Lock size={14} /> View only</div>
          )}
          {canEdit && !editable && (
            <div className="flex items-center gap-1 text-xs text-muted px-2 py-2"><Lock size={14} /> Records locked</div>
          )}
        </div>
      </div>

      {booking.status === 'pending_review' && (
        <div className="card bg-warning/10 border border-warning/20 text-sm">
          <strong>Waiting for Manager Approval</strong> — discount exceeds limit. You can still enter charges. Booking will confirm after manager approves.
        </div>
      )}

      {canEdit && (booking.status === 'inquiry' || booking.status === 'pending_review') && (
        <InquiryChecklist
          booking={booking}
          onEnterCharges={openEditCharges}
          onRecordPayment={() => setShowPayment(true)}
          onConfirm={() => updateBookingStatus(booking.id, 'confirmed', currentUser.name)}
        />
      )}

      {canManageEventDay && isEventDay && editable && (
        <div className="card bg-secondary-light/40 border border-secondary/20 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p><strong>Event day today</strong> — use Event Day Workspace to add extra items, take payments, and log office costs.</p>
          <Link to={path(`/event-day/${booking.id}`)} className="text-secondary font-semibold text-sm whitespace-nowrap">
            Go to Event Day →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-3 text-sm">
            <h2 className="font-bold text-primary">Event & Customer</h2>
            <div className="grid grid-cols-2 gap-3">
              <p><span className="text-muted">Customer:</span> <strong>{booking.customer.name}</strong></p>
              <p><span className="text-muted">Phone:</span> {booking.customer.phone}</p>
              <p><span className="text-muted">Venue:</span> {booking.venueName}</p>
              <p><span className="text-muted">Programme:</span> {booking.programme}</p>
              <p><span className="text-muted">Function Date:</span> {booking.functionDate} ({booking.functionDay})</p>
              <p><span className="text-muted">Guests:</span> {booking.numberOfGuests}</p>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold text-primary mb-3 text-sm">Bill Items</h2>
            {booking.services.length === 0 ? (
              <p className="text-sm text-warning bg-warning/10 p-3 rounded-lg">No charges yet — use Edit Full Bill to enter amounts.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2">Item</th>
                    <th className="text-right py-2 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.services.map((s, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${s.isEventDayAddition ? 'bg-secondary-light/20' : ''}`}>
                      <td className="py-2 px-2 font-medium">
                        {s.serviceName}
                        {s.isEventDayAddition && (
                          <span className="ml-1 text-[10px] font-bold uppercase text-secondary">Extra</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold">{formatCurrency(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {billing && billing.additionalItems > 0 && (
              <p className="text-xs text-muted mt-2">Extra items added on event day: {formatCurrency(billing.additionalItems)}</p>
            )}
          </div>

          <div className="card">
            <h2 className="font-bold text-primary mb-3 text-sm">Payment History</h2>
            {bookingPayments.length === 0 ? (
              <p className="text-gray-400 text-sm">No payments yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                    <th className="py-2 px-2">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingPayments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="py-2 px-2">{p.paymentDate}</td>
                      <td className="py-2 px-2 text-right font-bold text-success">{formatCurrency(p.amount)}</td>
                      <td className="py-2 px-2 capitalize">{p.method.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pricingAudit.length > 0 && (
            <div className="card">
              <button
                type="button"
                onClick={() => setShowAudit(!showAudit)}
                className="w-full flex items-center justify-between font-bold text-primary text-sm"
              >
                <span className="flex items-center gap-1"><History size={14} /> Activity Log ({pricingAudit.length})</span>
                <ChevronDown size={16} className={`transition-transform ${showAudit ? 'rotate-180' : ''}`} />
              </button>
              {showAudit && (
                <div className="space-y-2 max-h-64 overflow-y-auto mt-3">
                  {pricingAudit.map((log) => (
                    <div key={log.id} className="text-xs border-b border-gray-50 pb-2">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-primary">{log.action}</span>
                        <span className="text-gray-400 whitespace-nowrap">{formatAuditTime(log.timestamp)}</span>
                      </div>
                      <p className="text-gray-600">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-2 text-sm">
            <h2 className="font-bold text-primary mb-2">Bill Summary</h2>
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(booking.subtotal)}</span></div>
            {booking.discount > 0 && <div className="flex justify-between text-danger"><span>Discount</span><span>-{formatCurrency(booking.discount)}</span></div>}
            <div className="flex justify-between font-bold text-primary border-t pt-2"><span>Final Bill</span><span>{formatCurrency(booking.grandTotal)}</span></div>
            <div className="flex justify-between text-success"><span>Total Paid</span><span>{formatCurrency(booking.advancePaid)}</span></div>
            <div className="flex justify-between font-bold text-danger text-base border-t pt-2">
              <span>Remaining</span>
              <span>{formatCurrency(booking.remainingBalance)}</span>
            </div>
            {canReceivePayment && booking.remainingBalance > 0 && editable && (
              <button onClick={() => setShowPayment(true)} className="w-full mt-2 py-2 bg-secondary text-white rounded-lg text-sm font-semibold">
                Record Payment
              </button>
            )}
          </div>

          {bookingReceipts.length > 0 && (
            <div className="card">
              <h2 className="font-bold text-primary mb-3 text-sm flex items-center gap-1"><FileText size={14} /> Receipts</h2>
              {bookingReceipts.map((r) => (
                <button key={r.id} onClick={() => setShowReceipt(r.id)} className="w-full text-left py-2 text-sm text-secondary hover:text-secondary-hover border-b border-gray-50 last:border-0">
                  {r.receiptNumber} — {formatCurrency(r.amount)}
                </button>
              ))}
            </div>
          )}

          {canEdit && (
            <div className="card">
              <h2 className="font-bold text-primary mb-3 text-sm">Other Actions</h2>
              <div className="space-y-2">
                {booking.status === 'confirmed' && editable && (
                  <button
                    onClick={() => {
                      if (window.confirm('Close this event? Financial records will be locked.')) {
                        updateBookingStatus(booking.id, 'completed', currentUser.name);
                      }
                    }}
                    className="w-full py-2 bg-primary text-white rounded-lg text-sm font-semibold"
                  >
                    Close Event & Lock Records
                  </button>
                )}
                {!['cancelled', 'cancellation_requested', 'completed'].includes(booking.status) && (
                  <button
                    onClick={() => {
                      const reason = window.prompt('Reason for cancellation (optional):') ?? '';
                      if (reason !== null) requestCancellation(booking.id, reason, currentUser.name);
                    }}
                    className="w-full py-2 bg-danger/10 text-danger rounded-lg text-sm font-semibold"
                  >
                    Request Cancellation
                  </button>
                )}
                {booking.status === 'cancellation_requested' && (
                  <p className="text-xs text-warning bg-warning/10 p-2 rounded-lg">
                    Cancellation pending manager approval. Hall remains blocked until approved.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSlip && <Modal title="Booking Slip" onClose={() => setShowSlip(false)} wide><PrintBookingSlip booking={booking} /></Modal>}

      {showEditCharges && (
        <Modal title="Edit Full Bill" onClose={() => { setShowEditCharges(false); clearActionParam(); }} wide>
          <div className="space-y-4">
            <p className="text-xs text-muted">Change original booking items and discount. For extras on event day, use the Event Day Workspace.</p>
            <ManualPricingTable
              rows={pricingRows}
              onChange={setPricingRows}
              discount={editDiscount}
              onDiscountChange={setEditDiscount}
              discountPercent={editDiscountPct}
              onDiscountPercentChange={setEditDiscountPct}
              advancePaid={booking.advancePaid}
              onAdvanceChange={() => {}}
              compact
            />
            <input
              placeholder="Note (optional)"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={handleSaveCharges} className="btn-primary w-full !py-2.5 !rounded-lg">Save Bill</button>
          </div>
        </Modal>
      )}

      {showPayment && (
        <PaymentModal
          booking={booking}
          onClose={() => { setShowPayment(false); clearActionParam(); }}
        />
      )}

      {showReceipt && (
        <Modal title="Receipt" onClose={() => setShowReceipt(null)} wide>
          <PrintReceipt receipt={bookingReceipts.find((r) => r.id === showReceipt)!} />
        </Modal>
      )}
    </div>
  );
}
