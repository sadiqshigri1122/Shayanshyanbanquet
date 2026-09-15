import { CheckCircle2, Circle } from 'lucide-react';
import type { Booking } from '../types';
import { formatCurrency } from '../utils/bookingUtils';

interface Props {
  booking: Booking;
  onEnterCharges: () => void;
  onRecordPayment: () => void;
  onConfirm: () => void;
}

export default function InquiryChecklist({ booking, onEnterCharges, onRecordPayment, onConfirm }: Props) {
  const hasCharges = booking.services.length > 0 && booking.grandTotal > 0;
  const hasPayment = booking.advancePaid > 0;
  const isInquiry = booking.status === 'inquiry';
  const isPendingReview = booking.status === 'pending_review';

  if (!isInquiry && !isPendingReview && hasCharges) return null;

  const steps = [
    {
      done: hasCharges,
      label: 'Enter booking charges',
      hint: hasCharges ? formatCurrency(booking.grandTotal) : 'Add hall, food, decoration amounts',
      action: !hasCharges ? onEnterCharges : undefined,
      actionLabel: 'Enter Charges',
    },
    {
      done: hasPayment || booking.paymentStatus === 'paid',
      label: 'Record advance payment',
      hint: hasPayment ? `${formatCurrency(booking.advancePaid)} received` : 'Optional but recommended',
      action: hasCharges && booking.remainingBalance > 0 ? onRecordPayment : undefined,
      actionLabel: 'Record Payment',
    },
    {
      done: booking.status === 'confirmed' || booking.status === 'completed',
      label: isPendingReview ? 'Waiting for manager approval' : 'Confirm booking',
      hint: isPendingReview
        ? 'Discount needs manager approval before confirming'
        : booking.status === 'confirmed'
          ? 'Booking confirmed'
          : 'Mark as confirmed when ready',
      action: isInquiry && hasCharges ? onConfirm : undefined,
      actionLabel: 'Confirm Booking',
    },
  ];

  return (
    <div className="card bg-warning/5 border border-warning/20 space-y-3">
      <h2 className="font-bold text-primary text-sm">
        {isInquiry ? 'Complete This Inquiry' : 'Booking Setup Checklist'}
      </h2>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            {step.done ? (
              <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-0.5" />
            ) : (
              <Circle size={18} className="text-muted flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${step.done ? 'text-muted line-through' : 'text-primary'}`}>{step.label}</p>
              <p className="text-xs text-muted">{step.hint}</p>
              {step.action && (
                <button
                  type="button"
                  onClick={step.action}
                  className="mt-1 text-xs font-semibold text-secondary hover:text-secondary-hover"
                >
                  → {step.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
