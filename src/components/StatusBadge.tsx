import type { BookingStatus, PaymentStatus } from '../types';
import { formatStatus, getStatusColor, getPaymentStatusColor } from '../utils/bookingUtils';
import { staffBookingStatus, staffPaymentStatus } from '../utils/staffLabels';

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus | string;
  type?: 'booking' | 'payment' | 'approval';
}

const approvalColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger',
};

export default function StatusBadge({ status, type = 'booking' }: StatusBadgeProps) {
  let color = 'bg-gray-100 text-gray-800';
  if (type === 'payment') color = getPaymentStatusColor(status as PaymentStatus);
  else if (type === 'approval') color = approvalColors[status] || color;
  else color = getStatusColor(status as BookingStatus);

  const label =
    type === 'payment'
      ? staffPaymentStatus(status as PaymentStatus)
      : type === 'booking'
        ? staffBookingStatus(status as BookingStatus)
        : formatStatus(status);

  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
