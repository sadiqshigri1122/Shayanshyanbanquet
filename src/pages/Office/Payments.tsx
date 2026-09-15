import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import { formatCurrency } from '../../utils/bookingUtils';
import Modal from '../../components/Modal';
import PrintReceipt from '../../components/PrintReceipt';
import { ReceivePaymentModal } from '../../components/PaymentModal';

type Tab = 'payments' | 'receipts';

export default function Payments() {
  const { payments, receipts } = useApp();
  const { can } = useDashboard();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'receipts' ? 'receipts' : 'payments') as Tab;
  const initialBooking = searchParams.get('booking') ?? undefined;

  const [tab, setTab] = useState<Tab>(initialTab);
  const [showForm, setShowForm] = useState(!!initialBooking);
  const [showReceipt, setShowReceipt] = useState<string | null>(null);

  const sortedPayments = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  const sortedReceipts = [...receipts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Payments & Receipts</h1>
          <p className="text-sm text-muted mt-0.5">
            {can('receive_payment') ? 'Record payments and reprint receipts' : 'Review payment history and reprint receipts'}
          </p>
        </div>
        {tab === 'payments' && can('receive_payment') && (
          <button onClick={() => setShowForm(true)} className="btn-secondary !px-4 !py-2 !rounded-lg text-sm">
            + Receive Payment
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['payments', 'receipts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-secondary text-secondary' : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {t === 'payments' ? 'Payment History' : 'All Receipts'}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-success/10 rounded-xl p-5 border border-success/20">
              <p className="text-xs text-muted">Total Received</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}</p>
            </div>
            <div className="bg-secondary-light rounded-xl p-5 border border-secondary/20">
              <p className="text-xs text-muted">Transactions</p>
              <p className="text-2xl font-bold text-secondary">{payments.length}</p>
            </div>
          </div>

          <div className="card !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-muted">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted">Booking</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted">Method</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedPayments.map((p) => {
                  const receipt = receipts.find(
                    (r) => r.bookingId === p.bookingId && r.amount === p.amount && r.paymentDate === p.paymentDate,
                  );
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">{p.paymentDate}</td>
                      <td className="px-4 py-3 font-bold text-primary">{p.bookingNumber}</td>
                      <td className="px-4 py-3">{p.customerName}</td>
                      <td className="px-4 py-3 capitalize">{p.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right font-bold text-success">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3">
                        {receipt && (
                          <button onClick={() => setShowReceipt(receipt.id)} className="text-xs text-secondary font-semibold">
                            Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'receipts' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedReceipts.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setShowReceipt(r.id)}
              className="card hover:shadow-premium transition-all text-left"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-primary">{r.receiptNumber}</p>
                  <p className="text-xs text-muted">{r.paymentDate}</p>
                </div>
                <p className="text-lg font-bold text-success">{formatCurrency(r.amount)}</p>
              </div>
              <p className="text-sm text-gray-700">{r.customerName}</p>
              <p className="text-xs text-muted">{r.bookingNumber} · {r.venueName}</p>
              <p className="text-xs text-gray-400 mt-2">Balance after: {formatCurrency(r.newBalance)}</p>
            </button>
          ))}
          {sortedReceipts.length === 0 && (
            <p className="text-center py-12 text-gray-400 col-span-full">No receipts yet</p>
          )}
        </div>
      )}

      {showForm && (
        <ReceivePaymentModal
          initialBookingId={initialBooking}
          onClose={() => setShowForm(false)}
        />
      )}

      {showReceipt && (
        <Modal title="Receipt" onClose={() => setShowReceipt(null)} wide>
          <PrintReceipt receipt={receipts.find((r) => r.id === showReceipt)!} />
        </Modal>
      )}
    </div>
  );
}
