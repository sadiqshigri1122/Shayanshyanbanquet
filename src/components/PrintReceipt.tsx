import type { Receipt } from '../types';
import { formatCurrency, formatStatus } from '../utils/bookingUtils';
import { printDocument } from '../utils/printDocument';
import { useApp } from '../context/AppContext';

interface PrintReceiptProps {
  receipt: Receipt;
  onClose?: () => void;
}

export default function PrintReceipt({ receipt, onClose }: PrintReceiptProps) {
  const { settings } = useApp();

  const handlePrint = () => printDocument();

  return (
    <div>
      <div className="no-print flex gap-2 mb-4">
        <button onClick={handlePrint} className="btn-secondary !px-4 !py-2 !rounded-lg text-sm">
          Print / Save PDF
        </button>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
            Close
          </button>
        )}
      </div>

      <div id="print-area" className="bg-white p-8 max-w-md mx-auto border border-gray-200 rounded-xl print:border-0 print:shadow-none">
        <div className="text-center border-b-2 border-secondary pb-4 mb-6">
          <h1 className="text-xl font-bold text-primary">{settings.companyName}</h1>
          <p className="text-secondary text-sm tracking-widest">PAYMENT RECEIPT</p>
        </div>

        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between"><span className="text-muted">Receipt No</span><strong>{receipt.receiptNumber}</strong></div>
          <div className="flex justify-between"><span className="text-muted">Booking No</span><strong>{receipt.bookingNumber}</strong></div>
          <div className="flex justify-between"><span className="text-muted">Date</span><span>{receipt.paymentDate}</span></div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm space-y-1">
          <p><strong>{receipt.customerName}</strong></p>
          <p>Function: {receipt.functionDate}</p>
          <p>Venue: {receipt.venueName}</p>
        </div>

        <div className="text-center py-4 mb-4 bg-success/10 rounded-lg">
          <p className="text-xs text-muted">Amount Received</p>
          <p className="text-3xl font-bold text-success">{formatCurrency(receipt.amount)}</p>
          <p className="text-xs text-muted mt-1">via {formatStatus(receipt.method)}</p>
        </div>

        <div className="space-y-1 text-sm border-t pt-4">
          <div className="flex justify-between"><span>Previous Balance</span><span>{formatCurrency(receipt.previousBalance)}</span></div>
          <div className="flex justify-between font-bold text-primary"><span>New Balance</span><span>{formatCurrency(receipt.newBalance)}</span></div>
        </div>

        <div className="mt-8 pt-8 border-t text-sm">
          <div className="border-t border-gray-400 pt-1 mt-12">Receiver: {receipt.receivedBy}</div>
        </div>
      </div>
    </div>
  );
}
