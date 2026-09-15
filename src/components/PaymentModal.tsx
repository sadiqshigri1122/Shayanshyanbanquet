import { useState, useEffect } from 'react';
import type { Booking, PaymentMethod, Receipt } from '../types';
import { formatCurrency } from '../utils/bookingUtils';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import PrintReceipt from './PrintReceipt';

interface PaymentModalProps {
  booking: Booking;
  onClose: () => void;
  /** Called after payment recorded; receipt modal opens automatically unless disabled */
  onSuccess?: (receipt: Receipt) => void;
}

export default function PaymentModal({ booking, onClose, onSuccess }: PaymentModalProps) {
  const { addPayment, currentUser } = useApp();
  const [amount, setAmount] = useState(booking.remainingBalance);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [savedReceipt, setSavedReceipt] = useState<Receipt | null>(null);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    setAmount(booking.remainingBalance);
    setPayError('');
  }, [booking.remainingBalance, booking.id]);

  const handlePayFull = () => setAmount(booking.remainingBalance);

  const handleSubmit = async () => {
    setPayError('');
    if (amount <= 0) {
      setPayError('Enter a valid payment amount.');
      return;
    }
    if (amount > booking.remainingBalance) {
      setPayError(`Amount cannot exceed remaining balance (${formatCurrency(booking.remainingBalance)}).`);
      return;
    }
    const result = await addPayment({
      bookingId: booking.id,
      amount,
      method,
      receivedBy: currentUser.name,
      transactionRef: transactionRef || undefined,
    });
    if (!result) {
      setPayError('Could not record payment. Booking may be locked or already fully paid.');
      return;
    }
    onSuccess?.(result.receipt);
    if (printReceipt) {
      setSavedReceipt(result.receipt);
    } else {
      onClose();
    }
  };

  if (savedReceipt) {
    return (
      <Modal title="Payment Recorded — Print Receipt" onClose={onClose} wide>
        <div className="space-y-4">
          <div className="no-print bg-success/10 border border-success/20 rounded-lg p-3 text-sm text-success">
            <strong>{formatCurrency(savedReceipt.amount)}</strong> received from {booking.customer.name}.
            Remaining balance: <strong>{formatCurrency(savedReceipt.newBalance)}</strong>
          </div>
          <PrintReceipt receipt={savedReceipt} />
          <button onClick={onClose} className="btn-primary w-full !py-2.5 !rounded-lg no-print">
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Record Payment" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-surface-alt rounded-lg p-3 text-sm space-y-1">
          <p className="font-bold text-primary">{booking.bookingNumber} — {booking.customer.name}</p>
          <p className="text-muted text-xs">{booking.venueName} · {booking.functionDate}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">
            Outstanding: <strong className="text-danger">{formatCurrency(booking.remainingBalance)}</strong>
          </p>
          {booking.remainingBalance > 0 && (
            <button
              type="button"
              onClick={handlePayFull}
              className="text-xs font-semibold text-secondary hover:text-secondary-hover whitespace-nowrap"
            >
              Pay Full Balance
            </button>
          )}
        </div>

        <input
          type="number"
          placeholder="Amount (Rs.)"
          min={1}
          max={booking.remainingBalance}
          value={amount || ''}
          onChange={(e) => setAmount(+e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {payError && <p className="text-xs text-danger">{payError}</p>}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          {['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'card'].map((m) => (
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          ))}
        </select>
        <input
          placeholder="Transaction Ref (optional)"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={printReceipt} onChange={(e) => setPrintReceipt(e.target.checked)} />
          Show receipt after saving
        </label>
        <button onClick={handleSubmit} className="btn-secondary w-full !py-2.5 !rounded-lg">
          Record Payment
        </button>
      </div>
    </Modal>
  );
}

/** Global receive payment — pick booking first, then same payment flow */
export function ReceivePaymentModal({
  onClose,
  initialBookingId,
}: {
  onClose: () => void;
  initialBookingId?: string;
}) {
  const { bookings } = useApp();
  const outstanding = bookings.filter((b) => b.remainingBalance > 0);
  const [bookingId, setBookingId] = useState(initialBookingId ?? '');

  const selected = bookings.find((b) => b.id === bookingId);

  if (selected) {
    return <PaymentModal booking={selected} onClose={onClose} />;
  }

  return (
    <Modal title="Receive Payment" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-muted">Select the booking to record payment for.</p>
        <select
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select booking...</option>
          {outstanding.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bookingNumber} — {b.customer.name} ({b.customer.phone}) · Bal: {formatCurrency(b.remainingBalance)}
            </option>
          ))}
        </select>
        {outstanding.length === 0 && (
          <p className="text-sm text-muted text-center py-4">No bookings with outstanding balance.</p>
        )}
      </div>
    </Modal>
  );
}
